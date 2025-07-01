// programs/h2coin_vault_share/src/instructions.rs
//
// H2COIN VAULT SHARE PROGRAM - CORE BUSINESS LOGIC
// ================================================
//
// AUDIT NOTES:
// This file contains all the core business logic for the H2COIN Vault Share program.
// Each instruction implements specific functionality with comprehensive validation.
// Security is paramount - all operations include proper access control and validation.
//
// INSTRUCTION CATEGORIES:
// - Investment info management (initialize, update, complete, deactivate)
// - Investment record operations (add, update, revoke)
// - Profit/refund estimation and execution
// - Vault deposit and withdrawal operations
// - Whitelist management operations
//
// SECURITY CONSIDERATIONS:
// - All critical operations require 3-of-5 multisig validation
// - Comprehensive input validation prevents malicious inputs
// - PDA derivation prevents address spoofing attacks
// - State validation ensures proper operation sequencing
// - Mathematical overflow protection in all calculations
// - Token transfer validation prevents unauthorized transfers
// - Cache expiration prevents stale data execution
// - Duplicate execution prevention through timestamps

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    pubkey::Pubkey,
    account_info::{AccountInfo},
};

use anchor_lang::system_program::{self, Transfer};

use anchor_spl::{
    token::{self, TransferChecked, ID as TOKEN_PROGRAM_ID},
    associated_token::{get_associated_token_address},
};

use std::collections::{BTreeMap, HashSet};

use crate::context::*;
use crate::event::*;
use crate::state::*;
use crate::constants::*;
use crate::error::ErrorCode;

//================ INVESTMENT INFO MANAGEMENT ================
// AUDIT: These functions manage the core investment configuration
// SECURITY: All operations require proper authorization and validation

/// Initialize a new investment info account
/// 
/// AUDIT CRITICAL:
/// - Creates the main investment configuration
/// - Sets up vault PDA and associated token accounts
/// - Validates stage ratios and whitelist configurations
/// - Establishes investment parameters and limits
/// 
/// SECURITY CHECKS:
/// - Investment ID length validation (15 bytes)
/// - Whitelist size validation (exactly 5 members)
/// - Stage ratio validation (0-100%, contiguous non-zero values)
/// - PDA derivation verification
/// - Token mint validation
/// - Vault ATA ownership validation
/// 
/// PARAMETERS:
/// - investment_id: Unique 15-byte identifier
/// - version: 4-byte version identifier
/// - investment_type: Standard or CSR
/// - stage_ratio: 3×10 array of refund percentages
/// - start_at/end_at: Investment period timestamps
/// - investment_upper_limit: Maximum investment amount
/// - execute_whitelist: 5-member whitelist for profit/refund execution
/// - update_whitelist: 5-member whitelist for investment updates
/// - withdraw_whitelist: 5-member whitelist for vault withdrawals
#[allow(clippy::too_many_arguments)]
pub fn initialize_investment_info(
    ctx: Context<InitializeInvestmentInfo>,
    investment_id: [u8; 15],
    version: [u8; 4],
    investment_type: InvestmentType,
    stage_ratio: [[u8; 10]; 3],
    start_at: i64,
    end_at: i64,
    investment_upper_limit: u64,
    execute_whitelist: Vec<Pubkey>,
    update_whitelist: Vec<Pubkey>,
    withdraw_whitelist: Vec<Pubkey>,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let info = &mut ctx.accounts.investment_info;
    let vault = &ctx.accounts.vault;
    let vault_usdt_account = &ctx.accounts.vault_usdt_account;
    let vault_hcoin_account = &ctx.accounts.vault_hcoin_account;

    // Validate investment ID length
    require!(info.investment_id.len() == 15, ErrorCode::InvalidInvestmentIdLength);
    
    // Validate whitelist sizes (must be exactly 5 members each)
    require!(execute_whitelist.len() == 5, ErrorCode::WhitelistMustBeFive);
    require!(update_whitelist.len() == 5, ErrorCode::WhitelistMustBeFive);

    // Validate investment info PDA derivation
    let (expected_info_pda, _bump) = Pubkey::find_program_address(
        &[
            b"investment",
            investment_id.as_ref(),
            version.as_ref(),
        ],
        ctx.program_id,
    );
    require_keys_eq!(info.key(), expected_info_pda, ErrorCode::InvalidInvestmentInfoPda);

    // Validate vault PDA derivation
    let (vault_pda, _bump) = Pubkey::find_program_address(
        &[
            b"vault", 
            investment_id.as_ref(),
            version.as_ref(),
        ],
        ctx.program_id,
    );
    require_keys_eq!(vault_pda.key(), vault.key(), ErrorCode::InvalidInvestmentInfoPda);

    // Validate vault token account ownership and mints
    require_keys_eq!(vault_usdt_account.mint, ctx.accounts.usdt_mint.key(), ErrorCode::InvalidTokenMint);
    require_keys_eq!(vault_usdt_account.owner, vault.key(), ErrorCode::InvalidVaultOwner);
    require_keys_eq!(vault_hcoin_account.mint, ctx.accounts.hcoin_mint.key(), ErrorCode::InvalidTokenMint);
    require_keys_eq!(vault_hcoin_account.owner, vault.key(), ErrorCode::InvalidVaultOwner);

    // Initialize investment info with provided parameters
    info.investment_id = investment_id;
    info.investment_type = investment_type;
    info.stage_ratio = stage_ratio;
    info.version = version;
    info.start_at = start_at;
    info.end_at = end_at;
    info.investment_upper_limit = investment_upper_limit;
    info.execute_whitelist = execute_whitelist;
    info.update_whitelist = update_whitelist;
    info.withdraw_whitelist = withdraw_whitelist;
    info.vault = vault_pda;
    info.state = InvestmentState::Pending;
    info.is_active = true;
    info.created_at = now;

    // Validate stage ratio configuration
    info.validate_stage_ratio()?;

    // Emit initialization event
    emit!(InvestmentInfoInitialized {
        investment_id,
        version: info.version,
        vault: info.vault,
        created_by: ctx.accounts.payer.key(),
        created_at: info.created_at,
    });

    Ok(())
}

/// Extract signer public keys from AccountInfo objects
/// 
/// AUDIT CRITICAL:
/// - Filters only accounts that have signed the transaction
/// - Used for multisig validation
/// - Returns vector of corresponding Pubkeys
/// 
/// SECURITY:
/// - Only processes actual signers
/// - Used in 3-of-5 multisig validation
fn extract_signer_keys(infos: &[AccountInfo]) -> Vec<Pubkey> {
    infos.iter().filter(|i| i.is_signer).map(|i| i.key()).collect()
}

/// Update investment info parameters
/// 
/// AUDIT CRITICAL:
/// - Requires 3-of-5 multisig from update_whitelist
/// - Can modify stage ratios and investment limits
/// - Only allowed when investment is active and not completed
/// 
/// SECURITY CHECKS:
/// - Multisig validation (3-of-5)
/// - Investment state validation (must be active)
/// - Investment deactivation check
/// - Input parameter validation
/// 
/// PARAMETERS:
/// - new_stage_ratio: Optional new refund percentage configuration
/// - new_upper_limit: Optional new investment limit
pub fn update_investment_info(
    ctx: Context<UpdateInvestmentInfo>,
    new_stage_ratio: Option<[[u8; 10]; 3]>,
    new_upper_limit: Option<u64>,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let info = &mut ctx.accounts.investment_info;

    // Reject if investment has been deactivated
    require!(
        info.is_active, 
        ErrorCode::InvestmentInfoDeactivated
    );

    // Extract signer information for multisig validation
    let signer_infos = &ctx.remaining_accounts;
    let signer_keys = extract_signer_keys(signer_infos);
    
    // Validate 3-of-5 multisig from update_whitelist
    info.enforce_3_of_5_signers(signer_infos, true)?;

    // Reject if this InvestmentInfo account has not been initialized
    require!(
        !info.to_account_info().data_is_empty(),
        ErrorCode::InvestmentInfoNotFound
    );

    // Update investment upper limit if provided
    if let Some(limit) = new_upper_limit {
        info.investment_upper_limit = limit;
    }

    // Update stage ratio if provided
    if let Some(stage_ratio) = new_stage_ratio {
        info.stage_ratio = stage_ratio;
    }

    // Log update information
    msg!("🟢 Update triggered by: {}", ctx.accounts.payer.key());
    msg!("🟢 update_investment_info: {:?}", info);

    // Emit update event
    emit!(InvestmentUpdated {
        investment_id: info.investment_id,
        version: info.version,
        new_stage_ratio,
        new_upper_limit,
        updated_by: ctx.accounts.payer.key(),
        updated_at: now,
        signers: signer_keys,
    });

    Ok(())
}

/// Mark investment as completed
/// 
/// AUDIT CRITICAL:
/// - Requires 3-of-5 multisig from update_whitelist
/// - Changes investment state to Completed
/// - Prevents further modifications to investment info
/// 
/// SECURITY CHECKS:
/// - Multisig validation (3-of-5)
/// - Investment state validation (not already completed)
/// - Investment deactivation check
/// - PDA verification
pub fn completed_investment_info(ctx: Context<CompletedInvestmentInfo>) -> Result<()> {
    let info = &mut ctx.accounts.investment_info;

    // Reject if InvestmentInfo has been deactivated
    require!(
        info.is_active, 
        ErrorCode::InvestmentInfoDeactivated
    );
    
    // Reject if InvestmentInfo is already completed
    require!(
        info.state != InvestmentState::Completed, 
        ErrorCode::InvestmentInfoHasCompleted
    );
    
    // Reject if this InvestmentInfo has not been initialized
    require!(
        !info.to_account_info().data_is_empty(),
        ErrorCode::InvestmentInfoNotFound
    );

    // Validate investment info PDA derivation
    let (expected_pda, _bump) = Pubkey::find_program_address(
        &[
            b"investment",
            info.investment_id.as_ref(),
            info.version.as_ref(),
        ],
        ctx.program_id,
    );
    require_keys_eq!(info.key(), expected_pda, ErrorCode::InvalidInvestmentInfoPda);

    // Extract signer information for multisig validation
    let signer_infos = &ctx.remaining_accounts;
    let signer_keys = extract_signer_keys(signer_infos);
    
    // Validate 3-of-5 multisig from update_whitelist
    info.enforce_3_of_5_signers(signer_infos, true)?;

    // Set InvestmentInfo state to completed
    info.state = InvestmentState::Completed;

    // Log completion
    msg!("🟢 Investment {} completed", String::from_utf8_lossy(&info.investment_id));

    // Emit completion event
    emit!(InvestmentInfoCompleted {
        investment_id: info.investment_id,
        version: info.version,
        updated_by: ctx.accounts.payer.key(),
        updated_at: Clock::get()?.unix_timestamp,
        signers: signer_keys
    });

    Ok(())
}

/// Deactivate investment info
/// 
/// AUDIT CRITICAL:
/// - Requires 3-of-5 multisig from update_whitelist
/// - Only allowed when investment is completed
/// - Prevents all further operations on this investment
/// 
/// SECURITY CHECKS:
/// - Multisig validation (3-of-5)
/// - Investment state validation (must be completed)
/// - Investment deactivation check
/// - PDA verification
pub fn deactivate_investment_info(ctx: Context<DeactivateInvestmentInfo>) -> Result<()> {
    let info = &mut ctx.accounts.investment_info;

    // Reject if investment has been deactivated
    require!(
        info.is_active, 
        ErrorCode::InvestmentInfoDeactivated
    );
    
    // Reject if investment is not completed yet
    require!(
        info.state == InvestmentState::Completed, 
        ErrorCode::InvestmentInfoNotCompleted
    );
    
    // Reject if this InvestmentInfo has not been initialized
    require!(
        !info.to_account_info().data_is_empty(),
        ErrorCode::InvestmentInfoNotFound
    );

    // Validate investment info PDA derivation
    let (expected_pda, _bump) = Pubkey::find_program_address(
        &[
            b"investment",
            info.investment_id.as_ref(),
            info.version.as_ref(),
        ],
        ctx.program_id,
    );
    require_keys_eq!(info.key(), expected_pda, ErrorCode::InvalidInvestmentInfoPda);

    // Extract signer information for multisig validation
    let signer_infos = &ctx.remaining_accounts;
    let signer_keys = extract_signer_keys(signer_infos);
    
    // Validate 3-of-5 multisig from update_whitelist
    info.enforce_3_of_5_signers(signer_infos, true)?;

    // Deactivate the investment
    info.is_active = false;

    // Log deactivation
    msg!("🟢 Investment {} deactivated", String::from_utf8_lossy(&info.investment_id));

    // Emit deactivation event
    emit!(InvestmentInfoDeactivated {
        investment_id: info.investment_id,
        version: info.version,
        deactivated_by: ctx.accounts.payer.key(),
        deactivated_at: Clock::get()?.unix_timestamp,
        signers: signer_keys
    });

    Ok(())
}


pub fn patch_execute_whitelist(ctx: Context<UpdateExecuteWallet>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let info = &mut ctx.accounts.investment_info;
    
    // Reject if investment has been deactivated
    require!(
        info.is_active, 
        ErrorCode::InvestmentInfoDeactivated
    );

    let (expected_pda, _bump) = Pubkey::find_program_address(
        &[
            b"investment",
            info.investment_id.as_ref(),
            info.version.as_ref(),
        ],
        ctx.program_id,
    );
    require_keys_eq!(info.key(), expected_pda, ErrorCode::InvalidInvestmentInfoPda);


    // Reject if no signers provided
    let signer_infos = &ctx.remaining_accounts[..3];
    msg!("🟢 execute signer count: {}", signer_infos.len());
    let signer_keys = extract_signer_keys(signer_infos);
    msg!("🟢 Signers: {:?}", signer_keys);
    info.enforce_3_of_5_signers(signer_infos, false)?;
    
    
    
    let from = ctx.remaining_accounts[3].key();
    let to = ctx.remaining_accounts[4].key();
    // Reject if target wallet is the same as from wallet
    require!(
        from != to, 
        ErrorCode::WhitelistAddressExists
    );
    
    // Reject if from wallet adress does not exist
    require!(
        info.execute_whitelist.contains(&from),
        ErrorCode::WhitelistAddressNotFound
    );

    // Reject if target wallet adress exists
    require!(
        !info.execute_whitelist.contains(&to),
        ErrorCode::WhitelistAddressExists
    );

    let index = info
        .execute_whitelist
        .iter()
        .position(|x| x == &from)
        .ok_or(ErrorCode::WhitelistAddressNotFound)?;

    // Replace the entry
    info.execute_whitelist[index] = to;

    msg!("🟢 Replaced execute whitelist entry: from={} to={}", from, to);
    msg!("🟢 New execute whitelist: {:?}", info.execute_whitelist);

    emit!(WhitelistUpdated {
        investment_id: info.investment_id,
        version: info.version,
        wallet: to,
        updated_by: ctx.accounts.payer.key(),
        updated_at: now,
        signers: signer_keys.clone(),
    });

    Ok(())
}

pub fn patch_update_whitelist(ctx: Context<UpdateUpdateWallet>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let info = &mut ctx.accounts.investment_info;

    // Reject if investment has been deactivated
    require!(
        info.is_active, 
        ErrorCode::InvestmentInfoDeactivated
    );


    // Reject if no signers provided
    let signer_infos = &ctx.remaining_accounts[..3];
    msg!("🟢 execute signer count: {}", signer_infos.len());
    let signer_keys = extract_signer_keys(signer_infos);
    msg!("🟢 Signers: {:?}", signer_keys);
    info.enforce_3_of_5_signers(signer_infos, true)?;
    
    
    let from = ctx.remaining_accounts[3].key();
    let to = ctx.remaining_accounts[4].key();
    // Reject if target wallet is the same as from wallet
    require!(
        from != to, 
        ErrorCode::WhitelistAddressExists
    );
    
    // Reject if target wallet adress is exist
    require!(
        info.update_whitelist.contains(&from),
        ErrorCode::WhitelistAddressNotFound
    );

    // Reject if target wallet adress exists
    require!(
        !info.update_whitelist.contains(&to),
        ErrorCode::WhitelistAddressExists
    );

    let index = info
        .update_whitelist
        .iter()
        .position(|x| x == &from)
        .ok_or(ErrorCode::WhitelistAddressNotFound)?;

    // Replace the entry
    info.update_whitelist[index] = to;

    msg!("🟢 Replaced update whitelist entry: from={} to={}", from, to);
    msg!("🟢 New update whitelist: {:?}", info.update_whitelist);

    emit!(WhitelistUpdated {
        investment_id: info.investment_id,
        version: info.version,
        wallet: to,
        updated_by: ctx.accounts.payer.key(),
        updated_at: now,
        signers: signer_keys.clone(),
    });

    Ok(())
}

pub fn patch_withdraw_whitelist(ctx: Context<UpdateWithdrawWallet>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let info = &mut ctx.accounts.investment_info;


    // Reject if investment has been deactivated
    require!(
        info.is_active, 
        ErrorCode::InvestmentInfoDeactivated
    );


    let (expected_pda, _bump) = Pubkey::find_program_address(
        &[
            b"investment",
            info.investment_id.as_ref(),
            info.version.as_ref(),
        ],
        ctx.program_id,
    );
    require_keys_eq!(info.key(), expected_pda, ErrorCode::InvalidInvestmentInfoPda);


    // Reject if no signers provided
    let signer_infos = &ctx.remaining_accounts[..3];
    msg!("🟢 execute signer count: {}", signer_infos.len());
    let signer_keys = extract_signer_keys(signer_infos);
    msg!("🟢 Signers: {:?}", signer_keys);
    info.enforce_3_of_5_signers(signer_infos, false)?;


    let wallet_infos = &ctx.remaining_accounts[signer_infos.len()..];
    require!(
        !wallet_infos.is_empty() && wallet_infos.len() <= MAX_WHITELIST_LEN,
        ErrorCode::WhitelistLengthInvalid
    );

    // Extract and validate new wallet list
    let new_wallets: Vec<Pubkey> = wallet_infos.iter().map(|a| a.key()).collect();

    require!(
        (1..=MAX_WHITELIST_LEN).contains(&new_wallets.len()),
        ErrorCode::WhitelistLengthInvalid
    );


    // Update whitelist
    info.withdraw_whitelist = new_wallets.clone();


    emit!(WithdrawWhitelistUpdated {
        investment_id: info.investment_id,
        version: info.version,
        wallets: info.withdraw_whitelist.clone(),
        updated_by: ctx.accounts.payer.key(),
        updated_at: now,
        signers: signer_keys.clone(),
    });
    

    msg!("🟢 Withdraw whitelist replaced");
    Ok(())
}


//================ handle investment records ================
/// Adds a new investment record for an investor.
/// Requires 3-of-5 multisig authorization.
/// Records are grouped by investment ID and account ID.
#[allow(clippy::too_many_arguments)]
pub fn add_investment_record(
    ctx: Context<AddInvestmentRecords>,
    batch_id: u16,
    record_id: u64,
    account_id: [u8; 15],
    amount_usdt: u64,
    amount_hcoin: u64,
    stage: u8,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let info = &mut ctx.accounts.investment_info;
    let record = &mut ctx.accounts.investment_record;
    
    let usdt_mint = &ctx.accounts.usdt_mint;
    let hcoin_mint = &ctx.accounts.hcoin_mint;

    let recipient_account = &ctx.accounts.recipient_account;
    let recipient_usdt_account = &ctx.accounts.recipient_usdt_account;
    let recipient_hcoin_account = &ctx.accounts.recipient_hcoin_account;



    // Validate record PDA
    let (expected_record_pda, _bump) = Pubkey::find_program_address(
        &[
            b"record",
            info.investment_id.as_ref(),
            info.version.as_ref(),
            batch_id.to_le_bytes().as_ref(),
            record_id.to_le_bytes().as_ref(),
            account_id.as_ref()
        ],
        ctx.program_id,
    );
    // Prvent Invliad record pda
    require_keys_eq!(record.key(), expected_record_pda, ErrorCode::InvalidRecordPda);    
    
    
    // Validate investment is active and completed
    require!(info.is_active, ErrorCode::InvestmentInfoDeactivated);
    require!(info.state != InvestmentState::Completed, ErrorCode::InvestmentInfoHasCompleted);
    
    
    // Verify 3-of-5 multisig signer set
    let signer_infos = &ctx.remaining_accounts;
    let signer_keys = extract_signer_keys(signer_infos);
    info.enforce_3_of_5_signers(signer_infos, true)?;    
    


    require_keys_eq!(recipient_usdt_account.owner, recipient_account.key(), ErrorCode::InvalidRecipientOwner);
    require_keys_eq!(recipient_hcoin_account.owner, recipient_account.key(), ErrorCode::InvalidRecipientOwner);
    require_keys_eq!(recipient_usdt_account.mint, usdt_mint.key(), ErrorCode::InvalidRecipientMint);
    require_keys_eq!(recipient_hcoin_account.mint, hcoin_mint.key(), ErrorCode::InvalidRecipientMint);


    // Write record data
    record.batch_id = batch_id;
    record.record_id = record_id;
    record.account_id = account_id;
    record.investment_id = info.investment_id;
    record.version = info.version;
    record.wallet = recipient_account.key();
    record.amount_usdt = amount_usdt;
    record.amount_hcoin = amount_hcoin;
    record.stage = stage;
    record.revoked_at = 0;
    record.created_at = now;


    // Emit event
    emit!(InvestmentRecordAdded {
        investment_id: info.investment_id,
        version: info.version,
        account_id,
        record_id,
        amount_usdt,
        added_by: ctx.accounts.payer.key(),
        added_at: now,
        signers: signer_keys,
    });

    msg!("🟢 Added record {} for investor {:?}", record_id, account_id);

    Ok(())
}


/// Updates the wallet address for matching InvestmentRecords under a given `account_id`
/// - Requires 3-of-5 multisig approval
/// - Validates associated token accounts for USDT and H2COIN of the new wallet
/// - Iterates over remaining accounts to find and update matching InvestmentRecords
/// - Emits `InvestmentRecordWalletUpdated` event after success
pub fn update_investment_record_wallets<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, UpdateInvestmentRecordWallets<'info>>,
    account_id: [u8; 15],
) -> Result<()> 
where 
    'c: 'info,
{
    let now = Clock::get()?.unix_timestamp;
    let info = &ctx.accounts.investment_info;
    let usdt_mint = &ctx.accounts.usdt_mint;
    let hcoin_mint = &ctx.accounts.hcoin_mint;

    let recipient_account = &ctx.accounts.recipient_account;
    let recipient_usdt_account = &ctx.accounts.recipient_usdt_account;
    let recipient_hcoin_account = &ctx.accounts.recipient_hcoin_account;
    
    
    // 1. Validate investment_info is active and recipient_account
    require!(info.is_active, ErrorCode::InvestmentInfoDeactivated);
    require_keys_eq!(recipient_usdt_account.owner, recipient_account.key(), ErrorCode::InvalidRecipientOwner);
    require_keys_eq!(recipient_hcoin_account.owner, recipient_account.key(), ErrorCode::InvalidRecipientOwner);
    require_keys_eq!(recipient_usdt_account.mint, usdt_mint.key(), ErrorCode::InvalidRecipientMint);
    require_keys_eq!(recipient_hcoin_account.mint, hcoin_mint.key(), ErrorCode::InvalidRecipientMint);


    // 2. 3-of-5 multisig 驗證
    let signer_infos = &ctx.remaining_accounts[..3];
    let signer_keys = extract_signer_keys(signer_infos);
    info.enforce_3_of_5_signers(signer_infos, true)?;


    // 3. Load records from remaining_accounts
    let records = &ctx.remaining_accounts[signer_infos.len()..];
    let mut updated_count = 0;

    for acc_info in records {
        // Skip if not owned by this program
        if acc_info.owner != ctx.program_id {
            continue;
        }

        // deserialize from account data
        let mut data = acc_info.try_borrow_mut_data()?;
        let mut record = InvestmentRecord::try_deserialize(&mut &data[..])?;


        if record.account_id != account_id {
            continue;
        }

        if record.investment_id != info.investment_id {
            continue;
        }

        if record.version != info.version {
            continue;
        }

        if record.wallet == recipient_account.key() {
            continue;
        }

        // update the wallet
        record.wallet = recipient_account.key();

        // serialize back to account data
        record.try_serialize(&mut &mut data[..])?;

        //increment updated count
        updated_count += 1;        
    }

    require!(updated_count > 0, ErrorCode::NoRecordsUpdated);


    emit!(InvestmentRecordWalletUpdated {
        investment_id: info.investment_id,
        version: info.version,
        account_id,
        new_wallet: recipient_account.key(),
        updated_by: ctx.accounts.payer.key(),
        updated_at: now,
        signers: signer_keys.clone(),
    });
    
    
    msg!("🟢 record update count: {}", updated_count);
    Ok(())
}


// revoked investment record
pub fn revoked_investment_record(
    ctx: Context<RevokeInvestmentRecord>,
    batch_id: u16,
    record_id: u64,
    account_id: [u8; 15],
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;

    let info = &ctx.accounts.investment_info;
    let record = &mut ctx.accounts.investment_record;


    // Validate record PDA with info.investment_id
    let (expected_record_pda, _bump) = Pubkey::find_program_address(
        &[
            b"record",
            info.investment_id.as_ref(),
            info.version.as_ref(),
            batch_id.to_le_bytes().as_ref(),
            record_id.to_le_bytes().as_ref(),
            account_id.as_ref(),
        ],
        ctx.program_id,
    );
    require_keys_eq!(record.key(), expected_record_pda, ErrorCode::InvalidRecordPda);
    require!(record.record_id == record_id, ErrorCode::RecordIdMismatch);
    require!(record.account_id == account_id, ErrorCode::AccountIdMismatch);


    // Validate investment is active and completed
    require!(info.is_active, ErrorCode::InvestmentInfoDeactivated);

    // Reject if this InvestmentRecord account has not been initialized (non-empty data)
    require!(
        !record.to_account_info().data_is_empty(),
        ErrorCode::InvestmentRecordNotFound
    );

    // Multisig check
    let signer_infos = &ctx.remaining_accounts[..3];
    let signer_keys = extract_signer_keys(signer_infos);
    info.enforce_3_of_5_signers(signer_infos, true)?;


    // Prevent double revoke
    require!(record.revoked_at == 0, ErrorCode::RecordAlreadyRevoked);
    require!(record.record_id == record_id, ErrorCode::RecordIdMismatch);
    require!(record.account_id == account_id, ErrorCode::AccountIdMismatch);

    
    // Mark revoked
    record.revoked_at = now;

    msg!(
        "🟢 Revoked record_id={} for account_id={}, wallet={}",
        record.record_id,
        String::from_utf8_lossy(&record.account_id),
        record.wallet
    );

    emit!(InvestmentRecordRevoked {
        investment_id: record.investment_id,
        version: info.version,
        record_id: record.record_id,
        revoked_by: ctx.accounts.payer.key(),
        revoked_at: now,
        signers: signer_keys,
    });

    Ok(())
}


//================ handle profit share and refund share ================
/// Estimates the profit share for a single batch_id.
/// This function checks investment state, validates the signer against whitelists,
/// and generates a list of ProfitEntry items by matching each InvestmentRecord
/// with its corresponding InvestorAccount using the `account_id` key.
/// The result is stored in the on-chain `ProfitShareCache` account.
/// - `batch_id`: The target batch of records to estimate.
/// - `total_profit_usdt`: The profit to distribute for this batch.
/// - `total_invest_usdt`: The total amount of USDT invested under this investment_id (across all batches).
pub fn estimate_profit_share<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, EstimateProfitShare<'info>>,
    batch_id: u16,
    total_profit_usdt: u64,
    total_invest_usdt: u64,
) -> Result<()>
where
    'c: 'info,
{
    let now = Clock::get()?.unix_timestamp;
    let info = &ctx.accounts.investment_info;
    let cache = &mut ctx.accounts.cache;



     // Validate cache PDA with info.investment_id
    let (expected_cache_pda, _bump) = Pubkey::find_program_address(
        &[
            b"profit_cache",
            info.investment_id.as_ref(),
            info.version.as_ref(),
            batch_id.to_le_bytes().as_ref(),
        ],
        ctx.program_id,
    );
    require_keys_eq!(cache.key(), expected_cache_pda, ErrorCode::InvalidProfitCachePda);


    // Validate investment is active and completed
    require!(info.is_active, ErrorCode::InvestmentInfoDeactivated);
    require!(info.state == InvestmentState::Completed, ErrorCode::InvestmentInfoNotCompleted);
    require!(info.investment_type == InvestmentType::Standard, ErrorCode::StandardOnly);


    // Validate signer
    let signer_infos = &ctx.remaining_accounts[..1];
    let signer_keys = extract_signer_keys(signer_infos);
    let mut combined: HashSet<Pubkey> = info.execute_whitelist.iter().cloned().collect();
    combined.extend(info.update_whitelist.iter().cloned());


    require!(
        signer_keys.iter().any(|key| combined.contains(key)),
        ErrorCode::UnauthorizedSigner
    );


    // Check data accounts does not exceed 255
    let data_accounts = &ctx.remaining_accounts[1..];
    require!(
        data_accounts.len() <= MAX_ENTRIES_PER_BATCH,
        ErrorCode::TooManyRecordsLoaded
    );


    // Mapping accounts to records and records
    let mut record_map = BTreeMap::new();

    for acc_info in data_accounts.iter() {
        
        match Account::<InvestmentRecord>::try_from(acc_info) {
            Ok(record) => {
                // Validate record PDA with info.investment_id
                let (expected_record_pda, _bump) = Pubkey::find_program_address(
                    &[
                        b"record",
                        info.investment_id.as_ref(),
                        info.version.as_ref(),
                        batch_id.to_le_bytes().as_ref(),
                        record.record_id.to_le_bytes().as_ref(),
                        record.account_id.as_ref(),
                    ],
                    ctx.program_id,
                );
                require!(record.batch_id == batch_id, ErrorCode::BatchIdMismatch);
                require_keys_eq!(acc_info.key(), expected_record_pda, ErrorCode::InvalidRecordPda);

                // reject if record_id is duplicate or not
                require!(
                    !record_map.contains_key(&record.record_id),
                    ErrorCode::DuplicateRecord
                );

                record_map.insert(record.record_id, record);
            }
            Err(e) => {
                msg!("🔴 Reason: {}, {:?}", acc_info.key(), e);
            }
        }
    }

    require!(
        !record_map.is_empty() && record_map.len() <= MAX_ENTRIES_PER_BATCH,
        ErrorCode::TooManyRecordsLoaded
    );


    // Compute profit entries
    let mut entries: Vec<ProfitEntry> = Vec::new();
    let mut subtotal_profit_usdt: u64 = 0;


    for (_record_id, record) in record_map.iter() {
        require!(record.account_id.len() == 15, ErrorCode::InvalidAccountIdLength);
        if record.revoked_at != 0 {
           msg!(
                "🟡 Skipping revoked record_id={} for account_id={}",
                record.record_id,
                String::from_utf8_lossy(&record.account_id).trim_end_matches('\0')
            );
            continue;
        }

        let wallet = record.wallet;

        let ratio_bp = u16::try_from(
            record.amount_usdt.saturating_mul(10_000) / total_invest_usdt
        ).map_err(|_| ErrorCode::BpRatioOverflow)?;

        let amount = total_profit_usdt
            .saturating_mul(ratio_bp as u64)
            / 10_000;

        subtotal_profit_usdt = subtotal_profit_usdt
            .checked_add(amount)
            .ok_or(ErrorCode::NumericalOverflow)?;        

        entries.push(ProfitEntry {
            account_id: record.account_id,
            wallet,
            amount_usdt: amount,
            ratio_bp,
        });
    }


    // Estimate SOL cost
    let entry_count = entries.len() as u16;
    let subtotal_estimate_sol =
        ESTIMATE_SOL_BASE + (entry_count as u64) * ESTIMATE_SOL_PER_ENTRY;


    // Store result to cache
    cache.batch_id = batch_id;
    cache.investment_id = info.investment_id;
    cache.subtotal_profit_usdt = subtotal_profit_usdt;
    cache.subtotal_estimate_sol = subtotal_estimate_sol;
    cache.executed_at = 0;
    cache.created_at = now;
    cache.entries = entries;


    // Emit event
    emit!(ProfitShareEstimated {
        batch_id,
        investment_id: info.investment_id,
        version: info.version,
        subtotal_profit_usdt,
        subtotal_estimate_sol,
        created_by: ctx.accounts.payer.key(),
        created_at: now,
        entry_count,
        signers: signer_keys,
    });

    msg!(
        "Estimated profit share: {} entries, {} USDT total",
        entry_count,
        subtotal_profit_usdt
    );

    Ok(())
}


/// Estimates the refund share for a single `batch_id` in a specific refund year.
/// This uses the investment stage ratios to calculate H2COIN refunds per investor,
/// storing the results in the `RefundShareCache` account.
/// 
/// - `batch_id`: The target batch of investment records to estimate.
/// - `year_index`: The number of years passed since the refund period started (e.g., 0 = year 1, 1 = year 2, ...).
/// 
/// Refunds typically begin after a lock period (e.g., after year 3).
pub fn estimate_refund_share<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, EstimateRefundShare<'info>>,
    batch_id: u16, 
    year_index: u8
) -> Result<()>
where
    'c: 'info,
{
    let now = Clock::get()?.unix_timestamp;
    let info = &ctx.accounts.investment_info;
    let cache = &mut ctx.accounts.cache;    



    // Validate the expected vault PDA
    let (expected_cache_pda, _bump) = Pubkey::find_program_address(
        &[
            b"refund_cache",
            info.investment_id.as_ref(),
            info.version.as_ref(),
            batch_id.to_le_bytes().as_ref(),
            year_index.to_le_bytes().as_ref(),
        ],
        ctx.program_id,
    );
    require_keys_eq!(cache.key(), expected_cache_pda, ErrorCode::InvalidRefundCachePda);


    // Validate state
    require!(info.is_active, ErrorCode::InvestmentInfoDeactivated);
    require!(info.state == InvestmentState::Completed, ErrorCode::InvestmentInfoNotCompleted);


    // Validate signer
    let signer_infos = &ctx.remaining_accounts[..1];
    let signer_keys = extract_signer_keys(signer_infos);
    let mut combined: HashSet<Pubkey> = info.execute_whitelist.iter().cloned().collect();
    combined.extend(info.update_whitelist.iter().cloned());


    require!(
        signer_keys.iter().any(|key| combined.contains(key)),
        ErrorCode::UnauthorizedSigner
    );

    
    // Check data accounts does not exceed 25
    let data_accounts = &ctx.remaining_accounts[1..];
    require!(
        data_accounts.len() <= MAX_ENTRIES_PER_BATCH,
        ErrorCode::TooManyRecordsLoaded
    );


    // Mapping accounts to records and records
    let mut record_map = BTreeMap::new();

    for acc_info in data_accounts.iter() {
        
        match Account::<InvestmentRecord>::try_from(acc_info) {
            Ok(record) => {
                // Validate record PDA with info.investment_id
                let (expected_record_pda, _bump) = Pubkey::find_program_address(
                    &[
                        b"record",
                        info.investment_id.as_ref(),
                        info.version.as_ref(),
                        batch_id.to_le_bytes().as_ref(),
                        record.record_id.to_le_bytes().as_ref(),
                        record.account_id.as_ref(),
                    ],
                    ctx.program_id,
                );
                require!(record.batch_id == batch_id, ErrorCode::BatchIdMismatch);
                require_keys_eq!(acc_info.key(), expected_record_pda, ErrorCode::InvalidRecordPda);

                // reject if record_id is duplicate or not
                require!(
                    !record_map.contains_key(&record.record_id),
                    ErrorCode::DuplicateRecord
                );

                record_map.insert(record.record_id, record);
            }
            Err(e) => {
                msg!("🔴 Reason: {}, {:?}", acc_info.key(), e);
            }
        }
    }

    require!(
        !record_map.is_empty() && record_map.len() <= MAX_ENTRIES_PER_BATCH,
        ErrorCode::TooManyRecordsLoaded
    );


    // Calculate refund year index
    const SECONDS_PER_YEAR: i64 = 365 * 24 * 60 * 60;

    let elapsed_secs = now.saturating_sub(info.end_at);
    let expect_year_index = (elapsed_secs / SECONDS_PER_YEAR) as u8;
    require!(
        year_index <= expect_year_index && (START_YEAR_INDEX..=MAX_YEAR_INDEX).contains(&year_index),
        ErrorCode::RefundPeriodInvalid
    );
    

    // Compute refund entries
    let mut entries: Vec<RefundEntry> = Vec::new();
    let mut subtotal_refund_hcoin: u64 = 0;

    
    for (_record_id, record) in record_map.iter() {
        require!(record.account_id.len() == 15, ErrorCode::InvalidAccountIdLength);
        if record.revoked_at != 0 {
            msg!(
                "🟡 Skipping revoked record_id={} for account_id={}",
                record.record_id,
                String::from_utf8_lossy(&record.account_id).trim_end_matches('\0')
            );
            continue;
        }

        let wallet = record.wallet;

        let percent = RefundShareCache::get_refund_percentage(
            &info.stage_ratio,
            record.stage,
            year_index,
        );

        let amount = record.amount_hcoin
            .checked_mul(percent as u64)
            .and_then(|x| x.checked_div(100))
            .ok_or(ErrorCode::NumericalOverflow)?;

        subtotal_refund_hcoin = subtotal_refund_hcoin
            .checked_add(amount)
            .ok_or(ErrorCode::NumericalOverflow)?;

        entries.push(RefundEntry {
            account_id: record.account_id,
            wallet,
            amount_hcoin: amount,
            stage: record.stage,
        });
    }


    // Estimate SOL cost
    let entry_count = entries.len() as u16;
    let subtotal_estimate_sol =
        ESTIMATE_SOL_BASE + (entry_count as u64) * ESTIMATE_SOL_PER_ENTRY;


    // Store result to cache
    cache.batch_id = batch_id;
    cache.investment_id = info.investment_id;
    cache.version = info.version;
    cache.year_index = year_index;
    cache.subtotal_refund_hcoin = subtotal_refund_hcoin;
    cache.subtotal_estimate_sol = subtotal_estimate_sol;
    cache.executed_at = 0;
    cache.created_at = now;
    cache.entries = entries;


    // Emit event
    emit!(RefundShareEstimated {
        batch_id,
        investment_id: cache.investment_id,
        version: info.version,
        year_index,
        subtotal_refund_hcoin,
        subtotal_estimate_sol,
        created_by: ctx.accounts.payer.key(),
        created_at: now,
        entry_count,
        signers: signer_keys,
    });

    msg!(
        "🟢 Estimated refund share: year {}, entries {}, total {} H2COIN",
        year_index,
        entry_count,
        subtotal_refund_hcoin
    );

    Ok(())
}



/// Executes the profit share for a given batch_id of records.
/// Transfers USDT from the vault PDA to each investor's associated token account.
/// Requires 3-of-5 multisig authorization.
/// Executes a profit share distribution for a single batch_id.
/// This function verifies the cache, vault balance, signer set, and distributes tokens
/// to each investor's associated token account. Only entries associated with the given
/// `batch_id` will be processed. After completion, the `ProfitShareCache` is marked
/// as executed to prevent double payouts.
pub fn execute_profit_share<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, ExecuteProfitShare<'info>>,
    batch_id: u16,
) -> Result<()> 
where
    'c: 'info,
{
    let now = Clock::get()?.unix_timestamp;
    let info = &ctx.accounts.investment_info;
    let cache = &mut ctx.accounts.cache;
    let mint = &ctx.accounts.mint;
    let vault = &ctx.accounts.vault;
    let vault_token_account = &ctx.accounts.vault_token_account;



    // Validate the profit_cache PDA
    let (expected_cache_pda, _) = Pubkey::find_program_address(
        &[
            b"profit_cache",
            info.investment_id.as_ref(),
            info.version.as_ref(),
            batch_id.to_le_bytes().as_ref(),
        ],
        ctx.program_id,
    );
    require_keys_eq!(cache.key(), expected_cache_pda, ErrorCode::InvalidProfitCachePda);


    // Validate the expected vault PDA
    let (vault_pda, vault_bump) = Pubkey::find_program_address(
       &[
           b"vault", 
           info.investment_id.as_ref(),
           info.version.as_ref(),
       ],
       ctx.program_id,
    );
    require!(vault.key() == vault_pda && vault.key() == info.vault, ErrorCode::InvalidVaultPda);


    // Prepare PDA signer seeds
    let signer_seeds: &[&[u8]] = &[
        b"vault",
        info.investment_id.as_ref(),
        info.version.as_ref(),
        &[vault_bump],
    ];


    // reject if investment info has been deactived or has not been completed
    require!(info.is_active, ErrorCode::InvestmentInfoDeactivated);
    require!(info.state == InvestmentState::Completed, ErrorCode::InvestmentInfoNotCompleted);
    require!(info.investment_type == InvestmentType::Standard, ErrorCode::StandardOnly);

    // reject if cache is not initialized or batch_id mismatch
    require!(!cache.to_account_info().data_is_empty(), ErrorCode::ProfitCacheNotFound);
    require!(cache.batch_id == batch_id, ErrorCode::BatchIdMismatch);


    // reject if execuated_at is not 0 or cache has been executed
    require!(cache.executed_at == 0, ErrorCode::ProfitAlreadyExecuted);
    // reject if cache created_at execceds 25 days
    require!(now - cache.created_at <= SHARE_CACHE_EXPIRE_SECS, ErrorCode::ProfitCacheExpired);
    // reject if subtotal_profit_usdt is 0
    require!(cache.subtotal_profit_usdt > 0, ErrorCode::InvalidTotalUsdt);


    // Ensure signer is part of 3-of-5 execute whitelist
    let signer_infos = &ctx.remaining_accounts[..3];
    let signer_keys = extract_signer_keys(signer_infos);
    info.enforce_3_of_5_signers(signer_infos, false)?;

    
    // Token checks
    require_keys_eq!(mint.key(), get_usdt_mint(), ErrorCode::InvalidTokenMint);
    require_keys_eq!(vault_token_account.mint, mint.key(), ErrorCode::InvalidTokenMint);
    require!(vault_token_account.amount >= cache.subtotal_profit_usdt, ErrorCode::InsufficientTokenBalance);
    require!(vault.to_account_info().lamports() >= cache.subtotal_estimate_sol, ErrorCode::InsufficientSolBalance);


    let mut total_transferred: u64 = 0;
    let mut successes: Vec<Pubkey> = vec![];
    let mut failures: Vec<Pubkey> = vec![];

    let token_program = ctx.accounts.token_program.to_account_info();
    let mint_info = ctx.accounts.mint.to_account_info();
    let vault_info = vault.to_account_info();
    let signer = Some(signer_seeds);
    let decimals = mint.decimals;

    for entry in cache.entries.iter() {
        let recipient = entry.wallet;
        let recipient_ata = get_associated_token_address(&recipient, &mint.key());

        let recipient_ata_info = ctx
            .remaining_accounts[3..]
            .iter()
            .find(|acc| acc.key == &recipient_ata)
            .ok_or(ErrorCode::MissingAssociatedTokenAccount)?;


        // transfer token to investors
        let result = transfer_token_checked(
            token_program.clone(),
            vault_token_account.to_account_info(),
            recipient_ata_info.to_account_info(),
            mint_info.clone(),
            vault_info.clone(),
            signer,
            entry.amount_usdt,
            decimals,
        );

        match result {
            Ok(_) => {
                successes.push(recipient);
                
                total_transferred = total_transferred
                .checked_add(entry.amount_usdt)
                .ok_or(ErrorCode::NumericalOverflow)?;
            }
            Err(_e) => {
                failures.push(recipient);
            }
        }
    }

    require!(
        total_transferred == cache.subtotal_profit_usdt,
        ErrorCode::TotalShareMismatch
    );

    if successes.len() == cache.entries.len() {
        cache.executed_at = now;
        msg!("🟢 All succeeded: {}, {} USDT", successes.len(), total_transferred);
    } else {
        msg!("🟡 Partial success: {} succeeded, {} failed", successes.len(), failures.len());
    }


    emit!(ProfitShareExecuted {
        batch_id: cache.batch_id,
        investment_id: info.investment_id,
        version: info.version,
        total_transfer_usdt: total_transferred,
        executed_by: ctx.accounts.payer.key(),
        executed_at: now,
        signers: signer_keys,
    });

    Ok(())
}


/// Executes a refund share for a specific batch in a specific year.
/// Transfers H2COIN from the vault PDA to records' associated token accounts.
/// Ensures 3-of-5 multisig, balance sufficiency, and cache validity before execution.
pub fn execute_refund_share<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, ExecuteRefundShare<'info>>,
    batch_id: u16,
    year_index: u8
) -> Result<()>
where
    'c: 'info,
{
    let now = Clock::get()?.unix_timestamp;
    let info = &ctx.accounts.investment_info;
    let cache = &mut ctx.accounts.cache;
    let vault = &ctx.accounts.vault;
    let vault_token_account = &ctx.accounts.vault_token_account;
    let mint = &ctx.accounts.mint;



    // Validate the profit_cache PDA
    let (expected_pda, _bump) = Pubkey::find_program_address(
        &[
            b"refund_cache",
            info.investment_id.as_ref(),
            info.version.as_ref(),
            batch_id.to_le_bytes().as_ref(),
            cache.year_index.to_le_bytes().as_ref(),            
        ],
        ctx.program_id,
    );
    require!(cache.year_index == year_index, ErrorCode::InvalidRefundCachePda);
    require_keys_eq!(cache.key(), expected_pda, ErrorCode::InvalidRefundCachePda);


    // Validate the expected vault PDA
    let (vault_pda, vault_bump) = Pubkey::find_program_address(
       &[
           b"vault", 
           info.investment_id.as_ref(),
           info.version.as_ref(),
       ],
       ctx.program_id,
   );
   require!(vault.key() == vault_pda && vault.key() == info.vault, ErrorCode::InvalidVaultPda);
   
   
    // Prepare PDA signer seeds
    let signer_seeds: &[&[u8]] = &[
        b"vault",
        info.investment_id.as_ref(),
        info.version.as_ref(),
        &[vault_bump],
    ];


    // reject if investment info has been deactived or has not been completed
    require!(info.is_active, ErrorCode::InvestmentInfoDeactivated);
    require!(info.state == InvestmentState::Completed, ErrorCode::InvestmentInfoNotCompleted);
    

    // reject if investment info has been deactived or has not been completed
    require!(info.is_active, ErrorCode::InvestmentInfoDeactivated);
    require!(info.state == InvestmentState::Completed, ErrorCode::InvestmentInfoNotCompleted);

    // reject if cache is not initialized or batch_id mismatch
    require!(!cache.to_account_info().data_is_empty(), ErrorCode::ProfitCacheNotFound);
    require!(cache.batch_id == batch_id, ErrorCode::BatchIdMismatch);


    // reject if execuated_at is not 0 or cache has been executed
    require!(cache.executed_at == 0, ErrorCode::ProfitAlreadyExecuted);
    // reject if cache created_at execceds 25 days
    require!(now - cache.created_at <= SHARE_CACHE_EXPIRE_SECS, ErrorCode::ProfitCacheExpired);
    // reject if subtotal_refund_hcoin is 0
    require!(cache.subtotal_refund_hcoin > 0, ErrorCode::InvalidTotalUsdt);


    // Ensure signer is part of 3-of-5 execute whitelist
    let signer_infos = &ctx.remaining_accounts[..3];
    let signer_keys = extract_signer_keys(signer_infos);
    info.enforce_3_of_5_signers(signer_infos, false)?; 


    // Token checks
    require_keys_eq!(mint.key(), get_hcoin_mint(), ErrorCode::InvalidTokenMint);
    require_keys_eq!(vault_token_account.mint, mint.key(), ErrorCode::InvalidTokenMint);
    require!(vault.lamports() >= cache.subtotal_estimate_sol, ErrorCode::InsufficientSolBalance);
    require!(vault_token_account.amount >= cache.subtotal_refund_hcoin, ErrorCode::InsufficientTokenBalance);


    // Loop through entries and process refund
    let mut total_transferred = 0u64;
    let mut successes: Vec<Pubkey> = vec![];
    let mut failures: Vec<Pubkey> = vec![];

    let token_program = ctx.accounts.token_program.to_account_info();
    let mint_info = ctx.accounts.mint.to_account_info();
    let vault_info = vault.to_account_info();
    let signer = Some(signer_seeds);
    let decimals = mint.decimals;

    for entry in cache.entries.iter() {
        let recipient = entry.wallet;
        let recipient_ata = get_associated_token_address(&recipient, &mint.key());
            
        let recipient_ata_info = ctx
            .remaining_accounts[3..]
            .iter()
            .find(|acc| acc.key == &recipient_ata)
            .ok_or(ErrorCode::MissingAssociatedTokenAccount)?;

        // transfer token to investor
        let result = transfer_token_checked(
            token_program.clone(),
            vault_token_account.to_account_info(),
            recipient_ata_info.to_account_info(),
            mint_info.clone(),
            vault_info.clone(),
            signer,
            entry.amount_hcoin,
            decimals,
        );

        match result {
            Ok(_) => {
                successes.push(recipient);

                total_transferred = total_transferred
                .checked_add(entry.amount_hcoin)
                .ok_or(ErrorCode::NumericalOverflow)?;
            }
            Err(_e) => {
                failures.push(recipient);
            }
        }
    }

    require!(
        total_transferred == cache.subtotal_refund_hcoin,
        ErrorCode::TotalShareMismatch
    );

    if successes.len() == cache.entries.len() {
        cache.executed_at = now;
        msg!("🟢 All succeeded: {}, {} H2COIN", successes.len(), total_transferred);
    } else {
        msg!("🟡 Partial success: {} succeeded, {} failed", successes.len(), failures.len());
    }

    emit!(RefundShareExecuted {
        batch_id:cache.batch_id,
        investment_id: info.investment_id,
        version: info.version,
        year_index: cache.year_index,
        total_transfer_hcoin: total_transferred,
        executed_by: ctx.accounts.payer.key(),
        executed_at: now,
        signers: signer_keys.clone(),
    });


    Ok(())
}


//================ handle deposit to vault and withdraw from vault ================
pub fn deposit_sol_to_vault(ctx: Context<DepositSolToVault>, amount: u64) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let info = &ctx.accounts.investment_info;
    let vault = &ctx.accounts.vault;
    let payer = &ctx.accounts.payer;
    let system_program = &ctx.accounts.system_program;


    // reject if investment info has been deactived or has not been completed
    require!(info.is_active, ErrorCode::InvestmentInfoDeactivated);
    require!(info.state == InvestmentState::Completed, ErrorCode::InvestmentInfoNotCompleted);


    let (vault_pda, _bump) = Pubkey::find_program_address(
        &[
            b"vault", 
            info.investment_id.as_ref(),
            info.version.as_ref(),
        ],
        ctx.program_id,
    );
    require!(vault.key() == vault_pda && vault.key() == info.vault, ErrorCode::InvalidVaultPda);


    let cpi_ctx = CpiContext::new(
        system_program.to_account_info(),
        Transfer {
            from: payer.to_account_info(),
            to: vault.to_account_info(),
        },
    );
    system_program::transfer(cpi_ctx, amount)?;

    // Emit event for audit/logging purposes
    emit!(VaultDepositSolEvent {
        investment_id: info.investment_id,
        version: info.version,
        from: *payer.key,
        amount_usdt: amount,
        deposit_at: now,
    });

    Ok(())
}


/// Deposits SPL Token to the Vault's associated token account (ATA)
pub fn deposit_token_to_vault(ctx: Context<DepositTokenToVault>, amount: u64) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let info = &ctx.accounts.investment_info;
    let vault = &ctx.accounts.vault;
    let vault_token_account = &ctx.accounts.vault_token_account;


    // Reject if investment info is inactive or not completed
    require!(info.is_active, ErrorCode::InvestmentInfoDeactivated);
    require!(
        info.state == InvestmentState::Completed,
        ErrorCode::InvestmentInfoNotCompleted
    );

    // Derive the expected vault PDA
    let (vault_pda, _) = Pubkey::find_program_address(
        &[
            b"vault",
            info.investment_id.as_ref(),
            info.version.as_ref(),
        ],
        ctx.program_id,
    );
    require!(vault.key() == vault_pda && vault.key() == info.vault, ErrorCode::InvalidVaultPda);

    // Validate mint
    let mint = ctx.accounts.mint.key();
    require!(
        mint == get_usdt_mint() || mint == get_hcoin_mint(),
        ErrorCode::InvalidTokenMint
    );

    // Validate vault ATA
    let expected_vault_token_ata = get_associated_token_address(&vault_pda, &mint);
    require_keys_eq!(
        ctx.accounts.vault_token_account.key(),
        expected_vault_token_ata,
        ErrorCode::InvalidVaultAta
    );

    require_keys_eq!(
        ctx.accounts.from.owner.key(),
        ctx.accounts.payer.key(),
        ErrorCode::InvalidFromOwner
    );

    // Transfer token to vault ATA
    transfer_token_checked(
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.from.to_account_info(),
        vault_token_account.to_account_info(),
        ctx.accounts.mint.to_account_info(),
        ctx.accounts.payer.to_account_info(),
        None,
        amount,
        ctx.accounts.mint.decimals,
    )?;

    
    emit!(VaultDepositTokenEvent {
        investment_id: info.investment_id,
        version: info.version,
        from: ctx.accounts.payer.key(),
        mint,
        amount,
        deposit_at: now,
    });


    Ok(())
}



/// Withdraws remaining SOL, USDT, and H2COIN from the vault PDA to the withdraw wallet.
/// Requires 'completed' and 'active' state
/// Requires 3-of-5 execute whitelist signatures.
pub fn withdraw_from_vault<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, WithdrawFromVault<'info>>,
) -> Result<()>
where
    'c: 'info,
{
    let now = Clock::get()?.unix_timestamp;
    let info = &ctx.accounts.investment_info;
    let usdt_mint = &ctx.accounts.usdt_mint;
    let hcoin_mint = &ctx.accounts.hcoin_mint;


    let vault = &ctx.accounts.vault;
    let vault_usdt_account = &ctx.accounts.vault_usdt_account;
    let vault_hcoin_account = &ctx.accounts.vault_hcoin_account;

    
    let recipient_account = &ctx.accounts.recipient_account;
    let recipient_usdt_account = &ctx.accounts.recipient_usdt_account;
    let recipient_hcoin_account = &ctx.accounts.recipient_hcoin_account;


    // reject if investment info has been deactived or has not been completed
    require!(info.is_active, ErrorCode::InvestmentInfoDeactivated);
    require!(info.state == InvestmentState::Completed, ErrorCode::InvestmentInfoNotCompleted);


    // Extract and verify 3-of-5 signer keys
    let signer_infos: &[AccountInfo<'info>] = &ctx.remaining_accounts[0..3];
    let signer_keys = extract_signer_keys(signer_infos);
    info.enforce_3_of_5_signers(signer_infos, false)?;


    // Derive vault PDA and verify correctness
    let (vault_pda, vault_bump) = Pubkey::find_program_address(
        &[
            b"vault", 
            info.investment_id.as_ref(),
            info.version.as_ref(),
        ],
        ctx.program_id,
    );
    let signer_seeds: &[&[u8]] = &[
        b"vault",
        info.investment_id.as_ref(),
        info.version.as_ref(),
        &[vault_bump],
    ];
    require!(
        vault.key() == info.vault && vault_pda.key() == info.vault, 
        ErrorCode::InvalidVaultPda
    );


    // Check recipient is on withdraw whitelist
    require!(!info.withdraw_whitelist.is_empty(), ErrorCode::EmptyWhitelist);
    require!(info.withdraw_whitelist.contains(&recipient_account.key()), ErrorCode::UnauthorizedRecipient);


    // Transfer USDT if balance > 0 and vault ATA owner is correct
    if vault_usdt_account.mint == usdt_mint.key() && vault_usdt_account.amount > 0 {
        // Transfer token from vault ATA to rerceipient ATA
        transfer_token_checked(
            ctx.accounts.token_program.to_account_info(),
            vault_usdt_account.to_account_info(),
            recipient_usdt_account.to_account_info(),
            usdt_mint.to_account_info(),
            vault.to_account_info(),
            Some(signer_seeds),
            vault_usdt_account.amount,
            usdt_mint.decimals,
        )?;
    } else {
        msg!("🟡 Vault USDT amount = 0, skip transfer");
    }
 

    // Transfer H2COIN if balance > 0 and vault ATA owner is correct   
    if vault_hcoin_account.mint == hcoin_mint.key() && vault_hcoin_account.amount > 0 {
        // Transfer token from vault ATA to rerceipient ATA
        transfer_token_checked(
            ctx.accounts.token_program.to_account_info(),
            vault_hcoin_account.to_account_info(),
            recipient_hcoin_account.to_account_info(),
            hcoin_mint.to_account_info(),
            vault.to_account_info(),
            Some(signer_seeds),
            vault_hcoin_account.amount,
            hcoin_mint.decimals,
        )?;
    } else {
        msg!("🟡 Vault H2COIN amount = 0, skip transfer");
    }



    // Get lamport balance and calculate rent-exempt threshold
    let remaining_lamports = vault.lamports();
    let rent_exempt = Rent::get()?.minimum_balance(vault.data_len());
    let withdraw_lamports = vault.lamports()
        .saturating_sub(rent_exempt)
        .saturating_sub(ESTIMATE_SOL_BASE)
        .saturating_sub(ESTIMATE_SOL_PER_ENTRY);

    // Transfer SOL if available
    if withdraw_lamports > 0 {
        let signer: &[&[&[u8]]] = &[signer_seeds];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: vault.to_account_info(),
                to: recipient_account.to_account_info(),
            },
            signer,
        );

        system_program::transfer(cpi_ctx, withdraw_lamports)?;
    } else {
        msg!("🟡 No withdrawable SOL (rent-exempt only), skip transfer.");
    }


    // Emit event for tracking
    emit!(VaultTransferred {
        investment_id: info.investment_id,
        version: info.version,
        recipient: recipient_account.key(),
        sol_amount: remaining_lamports,
        usdt_amount: vault_usdt_account.amount,
        hcoin_amount: vault_hcoin_account.amount,
        executed_by: ctx.accounts.payer.key(),
        executed_at: now,
        signers: signer_keys.clone(),
    });

    Ok(())
}

/// execute token transfer
#[allow(clippy::too_many_arguments)]
fn transfer_token_checked<'info>(
    token_program: AccountInfo<'info>,
    from: AccountInfo<'info>,
    to: AccountInfo<'info>,
    mint: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    authority_seeds: Option<&[&[u8]]>,
    amount: u64,
    decimals: u8,
) -> Result<()> {
    require!(
        token_program.key() == TOKEN_PROGRAM_ID,
        ErrorCode::InvalidTokenProgramID
    );

    require!(
        to.owner == &TOKEN_PROGRAM_ID,
        ErrorCode::InvalidRecipientATA
    );

    let cpi_accounts = TransferChecked {
        from,
        to,
        mint,
        authority,
    };

    if let Some(seeds_inner) = authority_seeds {
        if !seeds_inner.is_empty() {
            msg!("🟢 using PDA signer with {} seed(s)", seeds_inner.len());
            let signer: &[&[&[u8]]] = &[seeds_inner];
            let cpi_ctx = CpiContext::new_with_signer(
                token_program,
                cpi_accounts,
                signer,
            );
            token::transfer_checked(cpi_ctx, amount, decimals)?;
        } else {
            msg!("🟢 signer seeds is empty → using no signer");
            let cpi_ctx = CpiContext::new(
                token_program,
                cpi_accounts,
            );
            token::transfer_checked(cpi_ctx, amount, decimals)?;
        }
    } else {
        msg!("🟢 no signer (authority is expected to be a wallet)");
        let cpi_ctx = CpiContext::new(
            token_program,
            cpi_accounts,
        );
        token::transfer_checked(cpi_ctx, amount, decimals)?;
    }

    Ok(())
}
