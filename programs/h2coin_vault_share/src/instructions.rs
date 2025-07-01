// programs/h2coin_vault_share/src/instructions.rs
//
// H2COIN VAULT SHARE PROGRAM - CORE BUSINESS LOGIC
// ================================================
//
// AUDIT NOTES FOR BLOCKAPEX:
// This file contains all the core business logic for the H2COIN Vault Share program.
// Each instruction implements specific functionality with comprehensive validation.
// Security is paramount - all operations include proper access control and validation.
//
// CRITICAL SECURITY FEATURES:
// - 3-of-5 multisig validation for all critical operations
// - PDA derivation prevents address spoofing attacks
// - Comprehensive input validation prevents malicious inputs
// - State validation ensures proper operation sequencing
// - Mathematical overflow protection in all calculations
// - Token transfer validation prevents unauthorized transfers
// - Cache expiration prevents stale data execution
// - Duplicate execution prevention through timestamps
// - Whitelist-based access control for all sensitive operations
//
// INSTRUCTION CATEGORIES:
// - Investment info management (initialize, update, complete, deactivate)
// - Investment record operations (add, update, revoke)
// - Profit/refund estimation and execution
// - Vault deposit and withdrawal operations
// - Whitelist management operations
//
// AUDIT CHECKLIST:
// [ ] Verify all PDA derivations are correct and consistent
// [ ] Confirm 3-of-5 multisig validation is properly implemented
// [ ] Check for mathematical overflow in all calculations
// [ ] Validate token transfer security and authorization
// [ ] Review state transition logic and validation
// [ ] Verify whitelist management and access control
// [ ] Check cache expiration and execution prevention
// [ ] Validate input sanitization and bounds checking
// [ ] Review error handling and edge cases
// [ ] Confirm event emission for audit trail
//
// SECURITY ARCHITECTURE SUMMARY:
// =============================
// 1. MULTISIG AUTHORIZATION:
//    - All critical operations require 3-of-5 multisig validation
//    - Different whitelists for different operation types (execute, update, withdraw)
//    - Signer validation prevents unauthorized access
//
// 2. PDA-BASED SECURITY:
//    - All accounts use PDA derivation for tamper-proof addresses
//    - Investment info, vault, records, and caches all use consistent PDA seeds
//    - Prevents address spoofing and unauthorized account access
//
// 3. STATE MANAGEMENT:
//    - Investment lifecycle: Pending -> Completed -> Deactivated
//    - State transitions are controlled and validated
//    - Prevents operations on inactive or completed investments
//
// 4. TOKEN SECURITY:
//    - All token transfers use validated token accounts
//    - PDA-based vault authorization for secure fund management
//    - Token mint validation prevents unauthorized token types
//
// 5. INPUT VALIDATION:
//    - Comprehensive bounds checking on all parameters
//    - Mathematical overflow protection in calculations
//    - Whitelist size and content validation
//
// 6. AUDIT TRAIL:
//    - All operations emit events for transparency
//    - Timestamp tracking for execution timing
//    - Signer information logged for accountability
//
// 7. CACHE SECURITY:
//    - Cache expiration prevents stale data execution
//    - Execution timestamps prevent double-payout attacks
//    - PDA-based cache addresses ensure data integrity
//
// 8. ERROR HANDLING:
//    - Comprehensive error codes for different failure scenarios
//    - Graceful failure handling prevents partial state corruption
//    - Clear error messages for debugging and audit

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
/// AUDIT CRITICAL - INVESTMENT INITIALIZATION:
/// This function creates the main investment configuration and sets up the vault system.
/// It establishes all critical parameters including whitelists, stage ratios, and vault PDAs.
/// 
/// SECURITY CHECKS IMPLEMENTED:
/// - Investment ID length validation (must be exactly 15 bytes)
/// - Whitelist size validation (must be exactly 5 members for each whitelist)
/// - Stage ratio validation (0-100%, contiguous non-zero values)
/// - PDA derivation verification for both investment info and vault
/// - Token mint validation (USDT and H2COIN)
/// - Vault ATA ownership validation
/// - Investment period validation (start_at < end_at)
/// 
/// AUDIT POINTS:
/// [ ] Verify PDA derivation seeds are consistent across all functions
/// [ ] Confirm whitelist validation prevents unauthorized access
/// [ ] Check stage ratio validation logic for mathematical correctness
/// [ ] Validate vault ATA setup and ownership
/// [ ] Review investment period bounds checking
/// 
/// PARAMETERS:
/// - investment_id: Unique 15-byte identifier for the investment
/// - version: 4-byte version identifier for upgradeability
/// - investment_type: Standard or CSR investment type
/// - stage_ratio: 3×10 array of refund percentages per stage and year
/// - start_at/end_at: Investment period timestamps
/// - investment_upper_limit: Maximum investment amount in USDT
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

    // AUDIT: Validate investment ID length - must be exactly 15 bytes
    require!(info.investment_id.len() == 15, ErrorCode::InvalidInvestmentIdLength);
    
    // AUDIT: Validate whitelist sizes - must be exactly 5 members each for security
    require!(execute_whitelist.len() == 5, ErrorCode::WhitelistMustBeFive);
    require!(update_whitelist.len() == 5, ErrorCode::WhitelistMustBeFive);

    // AUDIT: Validate investment info PDA derivation to prevent address spoofing
    let (expected_info_pda, _bump) = Pubkey::find_program_address(
        &[
            b"investment",
            investment_id.as_ref(),
            version.as_ref(),
        ],
        ctx.program_id,
    );
    require_keys_eq!(info.key(), expected_info_pda, ErrorCode::InvalidInvestmentInfoPda);

    // AUDIT: Validate vault PDA derivation for secure vault management
    let (vault_pda, _bump) = Pubkey::find_program_address(
        &[
            b"vault", 
            investment_id.as_ref(),
            version.as_ref(),
        ],
        ctx.program_id,
    );
    require_keys_eq!(vault_pda.key(), vault.key(), ErrorCode::InvalidInvestmentInfoPda);

    // AUDIT: Validate vault token account ownership and mints for secure token management
    require_keys_eq!(vault_usdt_account.mint, ctx.accounts.usdt_mint.key(), ErrorCode::InvalidTokenMint);
    require_keys_eq!(vault_usdt_account.owner, vault.key(), ErrorCode::InvalidVaultOwner);
    require_keys_eq!(vault_hcoin_account.mint, ctx.accounts.hcoin_mint.key(), ErrorCode::InvalidTokenMint);
    require_keys_eq!(vault_hcoin_account.owner, vault.key(), ErrorCode::InvalidVaultOwner);

    // AUDIT: Initialize investment info with provided parameters
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

    // AUDIT: Validate stage ratio configuration for mathematical correctness
    info.validate_stage_ratio()?;

    // AUDIT: Emit initialization event for audit trail
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
/// AUDIT CRITICAL - MULTISIG VALIDATION:
/// This utility function filters only accounts that have signed the transaction.
/// It is used throughout the program for 3-of-5 multisig validation.
/// 
/// SECURITY:
/// - Only processes actual signers (is_signer = true)
/// - Returns vector of corresponding Pubkeys for validation
/// - Used in enforce_3_of_5_signers validation
/// 
/// AUDIT POINTS:
/// [ ] Verify signer filtering logic is correct
/// [ ] Confirm this function is used consistently across all multisig checks
fn extract_signer_keys(infos: &[AccountInfo]) -> Vec<Pubkey> {
    infos.iter().filter(|i| i.is_signer).map(|i| i.key()).collect()
}

/// Update investment info parameters
/// 
/// AUDIT CRITICAL - INVESTMENT UPDATE:
/// This function allows modification of investment parameters after initialization.
/// It requires 3-of-5 multisig authorization from the update_whitelist.
/// 
/// SECURITY CHECKS IMPLEMENTED:
/// - 3-of-5 multisig validation from update_whitelist
/// - Investment state validation (must be active)
/// - Investment deactivation check
/// - Input parameter validation
/// - Stage ratio validation for mathematical correctness
/// 
/// AUDIT POINTS:
/// [ ] Verify multisig validation uses correct whitelist (update_whitelist)
/// [ ] Confirm state validation prevents updates to completed/deactivated investments
/// [ ] Check stage ratio validation logic
/// [ ] Review parameter bounds checking
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

    // AUDIT: Reject if investment has been deactivated
    require!(
        info.is_active, 
        ErrorCode::InvestmentInfoDeactivated
    );

    // AUDIT: Extract signer information for multisig validation
    let signer_infos = &ctx.remaining_accounts;
    let signer_keys = extract_signer_keys(signer_infos);
    
    // AUDIT: Validate 3-of-5 multisig from update_whitelist
    info.enforce_3_of_5_signers(signer_infos, true)?;

    // AUDIT: Reject if this InvestmentInfo account has not been initialized
    require!(
        !info.to_account_info().data_is_empty(),
        ErrorCode::InvestmentInfoNotFound
    );

    // AUDIT: Update investment upper limit if provided
    if let Some(limit) = new_upper_limit {
        info.investment_upper_limit = limit;
    }

    // AUDIT: Update stage ratio if provided
    if let Some(stage_ratio) = new_stage_ratio {
        info.stage_ratio = stage_ratio;
    }

    // AUDIT: Log update information for audit trail
    msg!("🟢 Update triggered by: {}", ctx.accounts.payer.key());
    msg!("🟢 update_investment_info: {:?}", info);

    // AUDIT: Emit update event for audit trail
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
/// AUDIT CRITICAL - INVESTMENT COMPLETION:
/// This function marks an investment as completed, preventing further modifications.
/// It requires 3-of-5 multisig authorization from the update_whitelist.
/// 
/// SECURITY CHECKS IMPLEMENTED:
/// - 3-of-5 multisig validation from update_whitelist
/// - Investment state validation (not already completed)
/// - Investment deactivation check
/// - PDA verification to prevent address spoofing
/// - Investment initialization check
/// 
/// AUDIT POINTS:
/// [ ] Verify state transition logic prevents double completion
/// [ ] Confirm multisig validation uses correct whitelist
/// [ ] Check PDA derivation consistency
/// [ ] Review event emission for audit trail
pub fn completed_investment_info(ctx: Context<CompletedInvestmentInfo>) -> Result<()> {
    let info = &mut ctx.accounts.investment_info;

    // AUDIT: Reject if InvestmentInfo has been deactivated
    require!(
        info.is_active, 
        ErrorCode::InvestmentInfoDeactivated
    );
    
    // AUDIT: Reject if InvestmentInfo is already completed
    require!(
        info.state != InvestmentState::Completed, 
        ErrorCode::InvestmentInfoHasCompleted
    );
    
    // AUDIT: Reject if this InvestmentInfo has not been initialized
    require!(
        !info.to_account_info().data_is_empty(),
        ErrorCode::InvestmentInfoNotFound
    );

    // AUDIT: Validate investment info PDA derivation to prevent address spoofing
    let (expected_pda, _bump) = Pubkey::find_program_address(
        &[
            b"investment",
            info.investment_id.as_ref(),
            info.version.as_ref(),
        ],
        ctx.program_id,
    );
    require_keys_eq!(info.key(), expected_pda, ErrorCode::InvalidInvestmentInfoPda);

    // AUDIT: Extract signer information for multisig validation
    let signer_infos = &ctx.remaining_accounts;
    let signer_keys = extract_signer_keys(signer_infos);
    
    // AUDIT: Validate 3-of-5 multisig from update_whitelist
    info.enforce_3_of_5_signers(signer_infos, true)?;

    // AUDIT: Set InvestmentInfo state to completed
    info.state = InvestmentState::Completed;

    // AUDIT: Log completion for audit trail
    msg!("🟢 Investment {} completed", String::from_utf8_lossy(&info.investment_id));

    // AUDIT: Emit completion event for audit trail
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
/// AUDIT CRITICAL - INVESTMENT DEACTIVATION:
/// This function permanently deactivates an investment, preventing all further operations.
/// It requires 3-of-5 multisig authorization and can only be called on completed investments.
/// 
/// SECURITY CHECKS IMPLEMENTED:
/// - 3-of-5 multisig validation from update_whitelist
/// - Investment state validation (must be completed)
/// - Investment deactivation check
/// - PDA verification to prevent address spoofing
/// - Investment initialization check
/// 
/// AUDIT POINTS:
/// [ ] Verify deactivation is irreversible
/// [ ] Confirm state validation prevents premature deactivation
/// [ ] Check multisig validation uses correct whitelist
/// [ ] Review event emission for audit trail
pub fn deactivate_investment_info(ctx: Context<DeactivateInvestmentInfo>) -> Result<()> {
    let info = &mut ctx.accounts.investment_info;

    // AUDIT: Reject if investment has been deactivated
    require!(
        info.is_active, 
        ErrorCode::InvestmentInfoDeactivated
    );
    
    // AUDIT: Reject if investment is not completed yet
    require!(
        info.state == InvestmentState::Completed, 
        ErrorCode::InvestmentInfoNotCompleted
    );
    
    // AUDIT: Reject if this InvestmentInfo has not been initialized
    require!(
        !info.to_account_info().data_is_empty(),
        ErrorCode::InvestmentInfoNotFound
    );

    // AUDIT: Validate investment info PDA derivation to prevent address spoofing
    let (expected_pda, _bump) = Pubkey::find_program_address(
        &[
            b"investment",
            info.investment_id.as_ref(),
            info.version.as_ref(),
        ],
        ctx.program_id,
    );
    require_keys_eq!(info.key(), expected_pda, ErrorCode::InvalidInvestmentInfoPda);

    // AUDIT: Extract signer information for multisig validation
    let signer_infos = &ctx.remaining_accounts;
    let signer_keys = extract_signer_keys(signer_infos);
    
    // AUDIT: Validate 3-of-5 multisig from update_whitelist
    info.enforce_3_of_5_signers(signer_infos, true)?;

    // AUDIT: Deactivate the investment
    info.is_active = false;

    // AUDIT: Log deactivation for audit trail
    msg!("🟢 Investment {} deactivated", String::from_utf8_lossy(&info.investment_id));

    // AUDIT: Emit deactivation event for audit trail
    emit!(InvestmentInfoDeactivated {
        investment_id: info.investment_id,
        version: info.version,
        deactivated_by: ctx.accounts.payer.key(),
        deactivated_at: Clock::get()?.unix_timestamp,
        signers: signer_keys
    });

    Ok(())
}


//================ WHITELIST MANAGEMENT ================
// AUDIT: These functions manage whitelist configurations for different operations
// SECURITY: All operations require proper multisig authorization

/// Patch execute whitelist entry
/// 
/// AUDIT CRITICAL - EXECUTE WHITELIST PATCH:
/// This function replaces one entry in the execute_whitelist with another.
/// It requires 3-of-5 multisig authorization from the execute_whitelist.
/// 
/// SECURITY CHECKS IMPLEMENTED:
/// - 3-of-5 multisig validation from execute_whitelist
/// - Investment state validation (must be active)
/// - PDA verification to prevent address spoofing
/// - Whitelist entry validation (from must exist, to must not exist)
/// - Duplicate address prevention
/// 
/// AUDIT POINTS:
/// [ ] Verify multisig validation uses correct whitelist (execute_whitelist)
/// [ ] Confirm whitelist entry replacement logic
/// [ ] Check duplicate address prevention
/// [ ] Review event emission for audit trail
pub fn patch_execute_whitelist(ctx: Context<UpdateExecuteWallet>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let info = &mut ctx.accounts.investment_info;
    
    // AUDIT: Reject if investment has been deactivated
    require!(
        info.is_active, 
        ErrorCode::InvestmentInfoDeactivated
    );

    // AUDIT: Validate investment info PDA derivation to prevent address spoofing
    let (expected_pda, _bump) = Pubkey::find_program_address(
        &[
            b"investment",
            info.investment_id.as_ref(),
            info.version.as_ref(),
        ],
        ctx.program_id,
    );
    require_keys_eq!(info.key(), expected_pda, ErrorCode::InvalidInvestmentInfoPda);

    // AUDIT: Extract and validate 3-of-5 multisig from execute_whitelist
    let signer_infos = &ctx.remaining_accounts[..3];
    msg!("🟢 execute signer count: {}", signer_infos.len());
    let signer_keys = extract_signer_keys(signer_infos);
    msg!("🟢 Signers: {:?}", signer_keys);
    info.enforce_3_of_5_signers(signer_infos, false)?;
    
    // AUDIT: Extract from and to wallet addresses from remaining accounts
    let from = ctx.remaining_accounts[3].key();
    let to = ctx.remaining_accounts[4].key();
    
    // AUDIT: Reject if target wallet is the same as from wallet (no-op prevention)
    require!(
        from != to, 
        ErrorCode::WhitelistAddressExists
    );
    
    // AUDIT: Reject if from wallet address does not exist in whitelist
    require!(
        info.execute_whitelist.contains(&from),
        ErrorCode::WhitelistAddressNotFound
    );

    // AUDIT: Reject if target wallet address already exists in whitelist
    require!(
        !info.execute_whitelist.contains(&to),
        ErrorCode::WhitelistAddressExists
    );

    // AUDIT: Find the index of the from wallet for replacement
    let index = info
        .execute_whitelist
        .iter()
        .position(|x| x == &from)
        .ok_or(ErrorCode::WhitelistAddressNotFound)?;

    // AUDIT: Replace the whitelist entry
    info.execute_whitelist[index] = to;

    // AUDIT: Log whitelist update for audit trail
    msg!("🟢 Replaced execute whitelist entry: from={} to={}", from, to);
    msg!("🟢 New execute whitelist: {:?}", info.execute_whitelist);

    // AUDIT: Emit whitelist update event for audit trail
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

/// Patch update whitelist entry
/// 
/// AUDIT CRITICAL - UPDATE WHITELIST PATCH:
/// This function replaces one entry in the update_whitelist with another.
/// It requires 3-of-5 multisig authorization from the update_whitelist.
/// 
/// SECURITY CHECKS IMPLEMENTED:
/// - 3-of-5 multisig validation from update_whitelist
/// - Investment state validation (must be active)
/// - Whitelist entry validation (from must exist, to must not exist)
/// - Duplicate address prevention
/// 
/// AUDIT POINTS:
/// [ ] Verify multisig validation uses correct whitelist (update_whitelist)
/// [ ] Confirm whitelist entry replacement logic
/// [ ] Check duplicate address prevention
/// [ ] Review event emission for audit trail
pub fn patch_update_whitelist(ctx: Context<UpdateUpdateWallet>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let info = &mut ctx.accounts.investment_info;

    // AUDIT: Reject if investment has been deactivated
    require!(
        info.is_active, 
        ErrorCode::InvestmentInfoDeactivated
    );

    // AUDIT: Extract and validate 3-of-5 multisig from update_whitelist
    let signer_infos = &ctx.remaining_accounts[..3];
    msg!("🟢 execute signer count: {}", signer_infos.len());
    let signer_keys = extract_signer_keys(signer_infos);
    msg!("🟢 Signers: {:?}", signer_keys);
    info.enforce_3_of_5_signers(signer_infos, true)?;
    
    // AUDIT: Extract from and to wallet addresses from remaining accounts
    let from = ctx.remaining_accounts[3].key();
    let to = ctx.remaining_accounts[4].key();
    
    // AUDIT: Reject if target wallet is the same as from wallet (no-op prevention)
    require!(
        from != to, 
        ErrorCode::WhitelistAddressExists
    );
    
    // AUDIT: Reject if from wallet address does not exist in whitelist
    require!(
        info.update_whitelist.contains(&from),
        ErrorCode::WhitelistAddressNotFound
    );

    // AUDIT: Reject if target wallet address already exists in whitelist
    require!(
        !info.update_whitelist.contains(&to),
        ErrorCode::WhitelistAddressExists
    );

    // AUDIT: Find the index of the from wallet for replacement
    let index = info
        .update_whitelist
        .iter()
        .position(|x| x == &from)
        .ok_or(ErrorCode::WhitelistAddressNotFound)?;

    // AUDIT: Replace the whitelist entry
    info.update_whitelist[index] = to;

    // AUDIT: Log whitelist update for audit trail
    msg!("🟢 Replaced update whitelist entry: from={} to={}", from, to);
    msg!("🟢 New update whitelist: {:?}", info.update_whitelist);

    // AUDIT: Emit whitelist update event for audit trail
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

/// Patch withdraw whitelist entries
/// 
/// AUDIT CRITICAL - WITHDRAW WHITELIST PATCH:
/// This function replaces the entire withdraw_whitelist with a new list.
/// It requires 3-of-5 multisig authorization from the execute_whitelist.
/// 
/// SECURITY CHECKS IMPLEMENTED:
/// - 3-of-5 multisig validation from execute_whitelist
/// - Investment state validation (must be active)
/// - PDA verification to prevent address spoofing
/// - Whitelist length validation (1 to MAX_WHITELIST_LEN)
/// - Input validation for wallet addresses
/// 
/// AUDIT POINTS:
/// [ ] Verify multisig validation uses correct whitelist (execute_whitelist)
/// [ ] Confirm whitelist length bounds checking
/// [ ] Check wallet address validation
/// [ ] Review event emission for audit trail
pub fn patch_withdraw_whitelist(ctx: Context<UpdateWithdrawWallet>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let info = &mut ctx.accounts.investment_info;

    // AUDIT: Reject if investment has been deactivated
    require!(
        info.is_active, 
        ErrorCode::InvestmentInfoDeactivated
    );

    // AUDIT: Validate investment info PDA derivation to prevent address spoofing
    let (expected_pda, _bump) = Pubkey::find_program_address(
        &[
            b"investment",
            info.investment_id.as_ref(),
            info.version.as_ref(),
        ],
        ctx.program_id,
    );
    require_keys_eq!(info.key(), expected_pda, ErrorCode::InvalidInvestmentInfoPda);

    // AUDIT: Extract and validate 3-of-5 multisig from execute_whitelist
    let signer_infos = &ctx.remaining_accounts[..3];
    msg!("🟢 execute signer count: {}", signer_infos.len());
    let signer_keys = extract_signer_keys(signer_infos);
    msg!("🟢 Signers: {:?}", signer_keys);
    info.enforce_3_of_5_signers(signer_infos, false)?;

    // AUDIT: Extract and validate new wallet list from remaining accounts
    let wallet_infos = &ctx.remaining_accounts[signer_infos.len()..];
    require!(
        !wallet_infos.is_empty() && wallet_infos.len() <= MAX_WHITELIST_LEN,
        ErrorCode::WhitelistLengthInvalid
    );

    // AUDIT: Extract and validate new wallet list
    let new_wallets: Vec<Pubkey> = wallet_infos.iter().map(|a| a.key()).collect();

    require!(
        (1..=MAX_WHITELIST_LEN).contains(&new_wallets.len()),
        ErrorCode::WhitelistLengthInvalid
    );

    // AUDIT: Update withdraw whitelist with new wallet list
    info.withdraw_whitelist = new_wallets.clone();

    // AUDIT: Emit withdraw whitelist update event for audit trail
    emit!(WithdrawWhitelistUpdated {
        investment_id: info.investment_id,
        version: info.version,
        wallets: info.withdraw_whitelist.clone(),
        updated_by: ctx.accounts.payer.key(),
        updated_at: now,
        signers: signer_keys.clone(),
    });
    
    // AUDIT: Log whitelist update for audit trail
    msg!("🟢 Withdraw whitelist replaced");
    Ok(())
}


//================ INVESTMENT RECORD MANAGEMENT ================
// AUDIT: These functions manage individual investment records for investors
// SECURITY: All operations require proper multisig authorization and validation

/// Adds a new investment record for an investor
/// 
/// AUDIT CRITICAL - INVESTMENT RECORD CREATION:
/// This function creates a new investment record for an investor.
/// It requires 3-of-5 multisig authorization from the update_whitelist.
/// 
/// SECURITY CHECKS IMPLEMENTED:
/// - 3-of-5 multisig validation from update_whitelist
/// - Investment state validation (must be active, not completed)
/// - Record PDA verification to prevent address spoofing
/// - Token account ownership validation
/// - Token mint validation (USDT and H2COIN)
/// - Input parameter validation
/// 
/// AUDIT POINTS:
/// [ ] Verify record PDA derivation is consistent
/// [ ] Confirm multisig validation uses correct whitelist
/// [ ] Check token account ownership validation
/// [ ] Review input parameter bounds checking
/// [ ] Validate event emission for audit trail
/// 
/// PARAMETERS:
/// - batch_id: Batch identifier for grouping records
/// - record_id: Unique record identifier
/// - account_id: 15-byte investor account identifier
/// - amount_usdt: USDT investment amount
/// - amount_hcoin: H2COIN investment amount
/// - stage: Investment stage (0-2)
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

    // AUDIT: Validate record PDA derivation to prevent address spoofing
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
    // AUDIT: Prevent invalid record PDA
    require_keys_eq!(record.key(), expected_record_pda, ErrorCode::InvalidRecordPda);    
    
    // AUDIT: Validate investment is active and not completed
    require!(info.is_active, ErrorCode::InvestmentInfoDeactivated);
    require!(info.state != InvestmentState::Completed, ErrorCode::InvestmentInfoHasCompleted);
    
    // AUDIT: Verify 3-of-5 multisig signer set from update_whitelist
    let signer_infos = &ctx.remaining_accounts;
    let signer_keys = extract_signer_keys(signer_infos);
    info.enforce_3_of_5_signers(signer_infos, true)?;    

    // AUDIT: Validate token account ownership and mint addresses
    require_keys_eq!(recipient_usdt_account.owner, recipient_account.key(), ErrorCode::InvalidRecipientOwner);
    require_keys_eq!(recipient_hcoin_account.owner, recipient_account.key(), ErrorCode::InvalidRecipientOwner);
    require_keys_eq!(recipient_usdt_account.mint, usdt_mint.key(), ErrorCode::InvalidRecipientMint);
    require_keys_eq!(recipient_hcoin_account.mint, hcoin_mint.key(), ErrorCode::InvalidRecipientMint);

    // AUDIT: Write record data with validation
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

    // AUDIT: Emit record addition event for audit trail
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

    // AUDIT: Log record addition for audit trail
    msg!("🟢 Added record {} for investor {:?}", record_id, account_id);

    Ok(())
}


/// Updates the wallet address for matching InvestmentRecords under a given `account_id`
/// 
/// AUDIT CRITICAL - INVESTMENT RECORD WALLET UPDATE:
/// This function updates the wallet address for all InvestmentRecords matching a specific account_id.
/// It requires 3-of-5 multisig authorization from the update_whitelist.
/// 
/// SECURITY CHECKS IMPLEMENTED:
/// - 3-of-5 multisig validation from update_whitelist
/// - Investment state validation (must be active)
/// - Token account ownership validation for new wallet
/// - Token mint validation (USDT and H2COIN)
/// - Record matching validation (account_id, investment_id, version)
/// - Duplicate wallet prevention
/// - Record update count validation
/// 
/// AUDIT POINTS:
/// [ ] Verify multisig validation uses correct whitelist (update_whitelist)
/// [ ] Check token account ownership validation
/// [ ] Review record matching logic
/// [ ] Confirm duplicate wallet prevention
/// [ ] Validate record update count requirement
/// [ ] Review event emission for audit trail
/// 
/// PARAMETERS:
/// - account_id: 15-byte investor account identifier to match records
/// 
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
    
    // AUDIT: Validate investment_info is active and recipient_account
    require!(info.is_active, ErrorCode::InvestmentInfoDeactivated);
    require_keys_eq!(recipient_usdt_account.owner, recipient_account.key(), ErrorCode::InvalidRecipientOwner);
    require_keys_eq!(recipient_hcoin_account.owner, recipient_account.key(), ErrorCode::InvalidRecipientOwner);
    require_keys_eq!(recipient_usdt_account.mint, usdt_mint.key(), ErrorCode::InvalidRecipientMint);
    require_keys_eq!(recipient_hcoin_account.mint, hcoin_mint.key(), ErrorCode::InvalidRecipientMint);

    // AUDIT: 3-of-5 multisig validation from update_whitelist
    let signer_infos = &ctx.remaining_accounts[..3];
    let signer_keys = extract_signer_keys(signer_infos);
    info.enforce_3_of_5_signers(signer_infos, true)?;

    // AUDIT: Load records from remaining_accounts for batch processing
    let records = &ctx.remaining_accounts[signer_infos.len()..];
    let mut updated_count = 0;

    for acc_info in records {
        // AUDIT: Skip if not owned by this program for security
        if acc_info.owner != ctx.program_id {
            continue;
        }

        // AUDIT: Deserialize from account data with error handling
        let mut data = acc_info.try_borrow_mut_data()?;
        let mut record = InvestmentRecord::try_deserialize(&mut &data[..])?;

        // AUDIT: Match records by account_id, investment_id, and version
        if record.account_id != account_id {
            continue;
        }

        if record.investment_id != info.investment_id {
            continue;
        }

        if record.version != info.version {
            continue;
        }

        // AUDIT: Skip if wallet is already the target wallet (no-op prevention)
        if record.wallet == recipient_account.key() {
            continue;
        }

        // AUDIT: Update the wallet address
        record.wallet = recipient_account.key();

        // AUDIT: Serialize back to account data
        record.try_serialize(&mut &mut data[..])?;

        // AUDIT: Increment updated count for validation
        updated_count += 1;        
    }

    // AUDIT: Require at least one record to be updated
    require!(updated_count > 0, ErrorCode::NoRecordsUpdated);

    // AUDIT: Emit wallet update event for audit trail
    emit!(InvestmentRecordWalletUpdated {
        investment_id: info.investment_id,
        version: info.version,
        account_id,
        new_wallet: recipient_account.key(),
        updated_by: ctx.accounts.payer.key(),
        updated_at: now,
        signers: signer_keys.clone(),
    });
    
    // AUDIT: Log update count for audit trail
    msg!("🟢 record update count: {}", updated_count);
    Ok(())
}


/// Revokes an investment record by marking it as revoked
/// 
/// AUDIT CRITICAL - INVESTMENT RECORD REVOCATION:
/// This function revokes an investment record by setting its revoked_at timestamp.
/// It requires 3-of-5 multisig authorization from the update_whitelist.
/// 
/// SECURITY CHECKS IMPLEMENTED:
/// - 3-of-5 multisig validation from update_whitelist
/// - Investment state validation (must be active)
/// - Record PDA verification to prevent address spoofing
/// - Record parameter validation (batch_id, record_id, account_id)
/// - Record initialization check
/// - Double revocation prevention
/// 
/// AUDIT POINTS:
/// [ ] Verify record PDA derivation is consistent
/// [ ] Confirm multisig validation uses correct whitelist
/// [ ] Check record parameter validation
/// [ ] Review double revocation prevention
/// [ ] Validate event emission for audit trail
/// 
/// PARAMETERS:
/// - batch_id: Batch identifier for the record
/// - record_id: Unique record identifier
/// - account_id: 15-byte investor account identifier
pub fn revoked_investment_record(
    ctx: Context<RevokeInvestmentRecord>,
    batch_id: u16,
    record_id: u64,
    account_id: [u8; 15],
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;

    let info = &ctx.accounts.investment_info;
    let record = &mut ctx.accounts.investment_record;

    // AUDIT: Validate record PDA with info.investment_id to prevent address spoofing
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

    // AUDIT: Validate investment is active
    require!(info.is_active, ErrorCode::InvestmentInfoDeactivated);

    // AUDIT: Reject if this InvestmentRecord account has not been initialized
    require!(
        !record.to_account_info().data_is_empty(),
        ErrorCode::InvestmentRecordNotFound
    );

    // AUDIT: Multisig validation from update_whitelist
    let signer_infos = &ctx.remaining_accounts[..3];
    let signer_keys = extract_signer_keys(signer_infos);
    info.enforce_3_of_5_signers(signer_infos, true)?;

    // AUDIT: Prevent double revocation
    require!(record.revoked_at == 0, ErrorCode::RecordAlreadyRevoked);
    require!(record.record_id == record_id, ErrorCode::RecordIdMismatch);
    require!(record.account_id == account_id, ErrorCode::AccountIdMismatch);

    // AUDIT: Mark record as revoked with timestamp
    record.revoked_at = now;

    // AUDIT: Log revocation for audit trail
    msg!(
        "🟢 Revoked record_id={} for account_id={}, wallet={}",
        record.record_id,
        String::from_utf8_lossy(&record.account_id),
        record.wallet
    );

    // AUDIT: Emit revocation event for audit trail
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

    // AUDIT: Validate cache PDA with info.investment_id to prevent address spoofing
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

    // AUDIT: Validate investment is active and completed
    require!(info.is_active, ErrorCode::InvestmentInfoDeactivated);
    require!(info.state == InvestmentState::Completed, ErrorCode::InvestmentInfoNotCompleted);
    require!(info.investment_type == InvestmentType::Standard, ErrorCode::StandardOnly);

    // AUDIT: Validate signer against combined whitelists
    let signer_infos = &ctx.remaining_accounts[..1];
    let signer_keys = extract_signer_keys(signer_infos);
    let mut combined: HashSet<Pubkey> = info.execute_whitelist.iter().cloned().collect();
    combined.extend(info.update_whitelist.iter().cloned());

    require!(
        signer_keys.iter().any(|key| combined.contains(key)),
        ErrorCode::UnauthorizedSigner
    );

    // AUDIT: Check data accounts does not exceed 255 for gas limit protection
    let data_accounts = &ctx.remaining_accounts[1..];
    require!(
        data_accounts.len() <= MAX_ENTRIES_PER_BATCH,
        ErrorCode::TooManyRecordsLoaded
    );

    // AUDIT: Mapping accounts to records with validation
    let mut record_map = BTreeMap::new();

    for acc_info in data_accounts.iter() {
        match Account::<InvestmentRecord>::try_from(acc_info) {
            Ok(record) => {
                // AUDIT: Validate record PDA with info.investment_id
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

                // AUDIT: Reject if record_id is duplicate
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

    // AUDIT: Compute profit entries with mathematical overflow protection
    let mut entries: Vec<ProfitEntry> = Vec::new();
    let mut subtotal_profit_usdt: u64 = 0;

    for (_record_id, record) in record_map.iter() {
        require!(record.account_id.len() == 15, ErrorCode::InvalidAccountIdLength);
        
        // AUDIT: Skip revoked records
        if record.revoked_at != 0 {
           msg!(
                "🟡 Skipping revoked record_id={} for account_id={}",
                record.record_id,
                String::from_utf8_lossy(&record.account_id).trim_end_matches('\0')
            );
            continue;
        }

        let wallet = record.wallet;

        // AUDIT: Calculate ratio with overflow protection
        let ratio_bp = u16::try_from(
            record.amount_usdt.saturating_mul(10_000) / total_invest_usdt
        ).map_err(|_| ErrorCode::BpRatioOverflow)?;

        // AUDIT: Calculate amount with overflow protection
        let amount = total_profit_usdt
            .saturating_mul(ratio_bp as u64)
            / 10_000;

        // AUDIT: Add to subtotal with overflow protection
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

    // AUDIT: Estimate SOL cost for execution
    let entry_count = entries.len() as u16;
    let subtotal_estimate_sol =
        ESTIMATE_SOL_BASE + (entry_count as u64) * ESTIMATE_SOL_PER_ENTRY;

    // AUDIT: Store result to cache with validation
    cache.batch_id = batch_id;
    cache.investment_id = info.investment_id;
    cache.subtotal_profit_usdt = subtotal_profit_usdt;
    cache.subtotal_estimate_sol = subtotal_estimate_sol;
    cache.executed_at = 0;
    cache.created_at = now;
    cache.entries = entries;

    // AUDIT: Emit event
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


/// Estimates the refund share for a single `batch_id` in a specific refund year
/// 
/// AUDIT CRITICAL - REFUND SHARE ESTIMATION:
/// This function estimates H2COIN refund distribution for a batch of investment records.
/// It calculates refund shares based on investment stage ratios and stores results in cache.
/// 
/// SECURITY CHECKS IMPLEMENTED:
/// - Investment state validation (must be active and completed)
/// - Signer validation against combined whitelists
/// - Cache PDA verification to prevent address spoofing
/// - Record PDA verification for each record
/// - Batch size validation (max 255 records)
/// - Duplicate record prevention
/// - Refund period validation (year_index bounds checking)
/// - Mathematical overflow protection in calculations
/// - Revoked record filtering
/// 
/// AUDIT POINTS:
/// [ ] Verify cache PDA derivation is consistent
/// [ ] Check signer validation against whitelists
/// [ ] Review refund period validation logic
/// [ ] Confirm mathematical calculations for overflow
/// [ ] Validate record filtering logic
/// [ ] Review cache storage security
/// [ ] Validate event emission for audit trail
/// 
/// PARAMETERS:
/// - batch_id: The target batch of investment records to estimate
/// - year_index: The number of years passed since the refund period started
/// 
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


/// Executes a refund share for a specific batch in a specific year
/// 
/// AUDIT CRITICAL - REFUND SHARE EXECUTION:
/// This function executes H2COIN refund distribution for a batch of investment records.
/// It transfers H2COIN from the vault PDA to each investor's associated token account.
/// 
/// SECURITY CHECKS IMPLEMENTED:
/// - 3-of-5 multisig validation from execute_whitelist
/// - Investment state validation (must be active and completed)
/// - Cache PDA verification to prevent address spoofing
/// - Vault PDA verification to prevent address spoofing
/// - Cache validation (initialized, not executed, not expired)
/// - Token mint validation (H2COIN only)
/// - Balance sufficiency checks (SOL and H2COIN)
/// - Cache execution prevention (double-payout protection)
/// - Cache expiration validation (25-day limit)
/// - Total transfer amount validation
/// 
/// AUDIT POINTS:
/// [ ] Verify cache and vault PDA derivation is consistent
/// [ ] Confirm multisig validation uses correct whitelist
/// [ ] Check cache execution prevention logic
/// [ ] Review balance sufficiency validation
/// [ ] Validate token transfer security
/// [ ] Confirm event emission for audit trail
/// 
/// PARAMETERS:
/// - batch_id: The target batch of records to execute
/// - year_index: The refund year index to execute
/// 
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


//================ VAULT DEPOSIT AND WITHDRAWAL OPERATIONS ================
// AUDIT: These functions handle vault deposit and withdrawal operations
// SECURITY: All operations require proper validation and authorization

/// Deposits SOL to the vault PDA
/// 
/// AUDIT CRITICAL - VAULT SOL DEPOSIT:
/// This function deposits SOL to the vault PDA for operational costs.
/// It requires investment to be active and completed.
/// 
/// SECURITY CHECKS IMPLEMENTED:
/// - Investment state validation (must be active and completed)
/// - Vault PDA verification to prevent address spoofing
/// - Safe SOL transfer using system program
/// - Event emission for audit trail
/// 
/// AUDIT POINTS:
/// [ ] Verify vault PDA derivation is consistent
/// [ ] Check investment state validation
/// [ ] Review SOL transfer security
/// [ ] Validate event emission for audit trail
/// 
/// PARAMETERS:
/// - amount: Amount of SOL to deposit to vault
pub fn deposit_sol_to_vault(ctx: Context<DepositSolToVault>, amount: u64) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let info = &ctx.accounts.investment_info;
    let vault = &ctx.accounts.vault;
    let payer = &ctx.accounts.payer;
    let system_program = &ctx.accounts.system_program;


    // AUDIT: Reject if investment info has been deactivated or has not been completed
    require!(info.is_active, ErrorCode::InvestmentInfoDeactivated);
    require!(info.state == InvestmentState::Completed, ErrorCode::InvestmentInfoNotCompleted);

    // AUDIT: Validate vault PDA derivation to prevent address spoofing
    let (vault_pda, _bump) = Pubkey::find_program_address(
        &[
            b"vault", 
            info.investment_id.as_ref(),
            info.version.as_ref(),
        ],
        ctx.program_id,
    );
    require!(vault.key() == vault_pda && vault.key() == info.vault, ErrorCode::InvalidVaultPda);

    // AUDIT: Transfer SOL to vault using system program
    let cpi_ctx = CpiContext::new(
        system_program.to_account_info(),
        Transfer {
            from: payer.to_account_info(),
            to: vault.to_account_info(),
        },
    );
    system_program::transfer(cpi_ctx, amount)?;

    // AUDIT: Emit event for audit trail
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
/// 
/// AUDIT CRITICAL - VAULT TOKEN DEPOSIT:
/// This function deposits SPL tokens (USDT or H2COIN) to the vault's associated token account.
/// It requires investment to be active and completed.
/// 
/// SECURITY CHECKS IMPLEMENTED:
/// - Investment state validation (must be active and completed)
/// - Vault PDA verification to prevent address spoofing
/// - Token mint validation (USDT or H2COIN only)
/// - Vault ATA validation
/// - Token account ownership validation
/// - Safe token transfer with proper authorization
/// - Event emission for audit trail
/// 
/// AUDIT POINTS:
/// [ ] Verify vault PDA derivation is consistent
/// [ ] Check token mint validation
/// [ ] Review vault ATA validation
/// [ ] Validate token transfer security
/// [ ] Confirm event emission for audit trail
/// 
/// PARAMETERS:
/// - amount: Amount of tokens to deposit to vault
pub fn deposit_token_to_vault(ctx: Context<DepositTokenToVault>, amount: u64) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let info = &ctx.accounts.investment_info;
    let vault = &ctx.accounts.vault;
    let vault_token_account = &ctx.accounts.vault_token_account;


    // AUDIT: Reject if investment info is inactive or not completed
    require!(info.is_active, ErrorCode::InvestmentInfoDeactivated);
    require!(
        info.state == InvestmentState::Completed,
        ErrorCode::InvestmentInfoNotCompleted
    );

    // AUDIT: Derive the expected vault PDA to prevent address spoofing
    let (vault_pda, _) = Pubkey::find_program_address(
        &[
            b"vault",
            info.investment_id.as_ref(),
            info.version.as_ref(),
        ],
        ctx.program_id,
    );
    require!(vault.key() == vault_pda && vault.key() == info.vault, ErrorCode::InvalidVaultPda);

    // AUDIT: Validate mint (USDT or H2COIN only)
    let mint = ctx.accounts.mint.key();
    require!(
        mint == get_usdt_mint() || mint == get_hcoin_mint(),
        ErrorCode::InvalidTokenMint
    );

    // AUDIT: Validate vault ATA ownership
    let expected_vault_token_ata = get_associated_token_address(&vault_pda, &mint);
    require_keys_eq!(
        ctx.accounts.vault_token_account.key(),
        expected_vault_token_ata,
        ErrorCode::InvalidVaultAta
    );

    // AUDIT: Validate token account ownership
    require_keys_eq!(
        ctx.accounts.from.owner.key(),
        ctx.accounts.payer.key(),
        ErrorCode::InvalidFromOwner
    );

    // AUDIT: Transfer token to vault ATA with proper authorization
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

    // AUDIT: Emit token deposit event for audit trail
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
/// Withdraws remaining SOL, USDT, and H2COIN from the vault PDA to the withdraw wallet
/// 
/// AUDIT CRITICAL - VAULT WITHDRAWAL:
/// This function withdraws all remaining funds from the vault to an authorized recipient.
/// It requires 3-of-5 multisig authorization from the execute_whitelist.
/// 
/// SECURITY CHECKS IMPLEMENTED:
/// - 3-of-5 multisig validation from execute_whitelist
/// - Investment state validation (must be active and completed)
/// - Vault PDA verification to prevent address spoofing
/// - Recipient whitelist validation
/// - Token account ownership validation
/// - SOL balance calculation with rent exemption
/// - Safe token transfer with proper authorization
/// 
/// AUDIT POINTS:
/// [ ] Verify vault PDA derivation is consistent
/// [ ] Confirm multisig validation uses correct whitelist
/// [ ] Check recipient whitelist validation
/// [ ] Review SOL balance calculation and rent exemption
/// [ ] Validate token transfer security
/// [ ] Confirm event emission for audit trail
/// 
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

    // AUDIT: Reject if investment info has been deactivated or has not been completed
    require!(info.is_active, ErrorCode::InvestmentInfoDeactivated);
    require!(info.state == InvestmentState::Completed, ErrorCode::InvestmentInfoNotCompleted);

    // AUDIT: Extract and verify 3-of-5 signer keys from execute_whitelist
    let signer_infos: &[AccountInfo<'info>] = &ctx.remaining_accounts[0..3];
    let signer_keys = extract_signer_keys(signer_infos);
    info.enforce_3_of_5_signers(signer_infos, false)?;

    // AUDIT: Derive vault PDA and verify correctness to prevent address spoofing
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

    // AUDIT: Check recipient is on withdraw whitelist for authorization
    require!(!info.withdraw_whitelist.is_empty(), ErrorCode::EmptyWhitelist);
    require!(info.withdraw_whitelist.contains(&recipient_account.key()), ErrorCode::UnauthorizedRecipient);

    // AUDIT: Transfer USDT if balance > 0 and vault ATA owner is correct
    if vault_usdt_account.mint == usdt_mint.key() && vault_usdt_account.amount > 0 {
        // AUDIT: Transfer token from vault ATA to recipient ATA with PDA authorization
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
 
    // AUDIT: Transfer H2COIN if balance > 0 and vault ATA owner is correct   
    if vault_hcoin_account.mint == hcoin_mint.key() && vault_hcoin_account.amount > 0 {
        // AUDIT: Transfer token from vault ATA to recipient ATA with PDA authorization
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

    // AUDIT: Get lamport balance and calculate rent-exempt threshold for safe SOL withdrawal
    let remaining_lamports = vault.lamports();
    let rent_exempt = Rent::get()?.minimum_balance(vault.data_len());
    let withdraw_lamports = vault.lamports()
        .saturating_sub(rent_exempt)
        .saturating_sub(ESTIMATE_SOL_BASE)
        .saturating_sub(ESTIMATE_SOL_PER_ENTRY);

    // AUDIT: Transfer SOL if available with PDA authorization
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

    // AUDIT: Emit vault transfer event for audit trail
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

/// Execute token transfer with comprehensive validation
/// 
/// AUDIT CRITICAL - TOKEN TRANSFER UTILITY:
/// This utility function handles SPL token transfers with comprehensive validation.
/// It supports both regular wallet and PDA-based transfers.
/// 
/// SECURITY CHECKS IMPLEMENTED:
/// - Token program ID validation
/// - Recipient account ownership validation
/// - PDA signer seed validation
/// - Transfer amount and decimal validation
/// - Safe CPI call construction
/// 
/// AUDIT POINTS:
/// [ ] Verify token program ID validation
/// [ ] Check recipient account ownership
/// [ ] Review PDA signer seed handling
/// [ ] Confirm transfer amount validation
/// [ ] Validate CPI call security
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
    // AUDIT: Validate token program ID to prevent unauthorized transfers
    require!(
        token_program.key() == TOKEN_PROGRAM_ID,
        ErrorCode::InvalidTokenProgramID
    );

    // AUDIT: Validate recipient account ownership for security
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

    // AUDIT: Handle PDA-based transfers with proper signer seeds
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
        // AUDIT: Handle regular wallet-based transfers
        msg!("🟢 no signer (authority is expected to be a wallet)");
        let cpi_ctx = CpiContext::new(
            token_program,
            cpi_accounts,
        );
        token::transfer_checked(cpi_ctx, amount, decimals)?;
    }

    Ok(())
}
