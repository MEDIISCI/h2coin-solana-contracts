// programs/h2coin_vault_share/src/instructions.rs


use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    pubkey::Pubkey,
    program::{invoke, invoke_signed},
    system_instruction,
    account_info::AccountInfo,
};

use anchor_spl::{
    associated_token::{create, Create, get_associated_token_address},
    token::{self, TokenAccount, TransferChecked},
};

use std::collections::{BTreeMap, HashSet};

use crate::context::*;
use crate::event::*;
use crate::state::*;
use crate::constants::*;
use crate::error::ErrorCode;



//================ handle investment info ================
/// A 30-element refund percentage table, flattened as 3 stages × 10 years (stage0[0..10], stage1[10..25], stage2[25..30])
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

    require!(info.investment_id.len() == 15, ErrorCode::InvalidInvestmentIdLength);
    require!(execute_whitelist.len() == 5, ErrorCode::WhitelistMustBeFive);
    require!(update_whitelist.len() == 5, ErrorCode::WhitelistMustBeFive);


    let (expected_info_pda, _bump) = Pubkey::find_program_address(
        &[
            b"investment",
            investment_id.as_ref(),
            version.as_ref(),
        ],
        ctx.program_id,
    );
    require_keys_eq!(info.key(), expected_info_pda, ErrorCode::InvalidInvestmentInfoPda);


    let (vault_pda, _bump) = Pubkey::find_program_address(
        &[
            b"vault", 
            investment_id.as_ref(),
            version.as_ref(),
        ],
        ctx.program_id,
    );
    msg!("🟢 Vault PDA: {}", vault_pda);


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

    info.validate_stage_ratio()?;

    msg!("🟢 initialize_investment_info: {:?}", info);

    emit!(InvestmentInfoInitialized {
        investment_id,
        version: info.version,
        vault: info.vault,
        created_by: ctx.accounts.payer.key(),
        created_at: info.created_at,
    });

    Ok(())
}


fn extract_signer_keys(infos: &[AccountInfo]) -> Vec<Pubkey> {
    infos.iter().filter(|i| i.is_signer).map(|i| i.key()).collect()
}

// update investment basic info
pub fn update_investment_info(
    ctx: Context<UpdateInvestmentInfo>,
    new_stage_ratio: Option<[[u8; 10]; 3]>,
    new_upper_limit: Option<u64>,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let info = &mut ctx.accounts.investment_info;


    let (expected_pda, _bump) = Pubkey::find_program_address(
        &[
            b"investment",
            info.investment_id.as_ref(),
            info.version.as_ref(),
        ],
        ctx.program_id,
    );
    require_keys_eq!(info.key(), expected_pda, ErrorCode::InvalidInvestmentInfoPda);


    // Reject if investment has been deactivated
    require!(
        info.is_active, 
        ErrorCode::InvestmentInfoDeactivated
    );


    let signer_infos = &ctx.remaining_accounts;
    let signer_keys = extract_signer_keys(signer_infos);
    info.enforce_3_of_5_signers(signer_infos,true)?;


    // Reject if this InvestmentInfo account has not been initialized (non-empty data)
    require!(
        !info.to_account_info().data_is_empty(),
        ErrorCode::InvestmentInfoNotFound
    );

    if let Some(limit) = new_upper_limit {
        info.investment_upper_limit = limit;
    }


    if let Some(stage_ratio) = new_stage_ratio {
        // optional check: require!(stage_ratio.len() == 30, ...)
        info.stage_ratio = stage_ratio;
    }


    msg!("🟢 Update triggered by: {}", ctx.accounts.payer.key());
    msg!("🟢 update_investment_info: {:?}", info);

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

pub fn completed_investment_info(ctx: Context<CompletedInvestmentInfo>) -> Result<()> {
    let info = &mut ctx.accounts.investment_info;

    // Reject if InvestmentInfo has been deactivated
    require!(
        info.is_active, 
        ErrorCode::InvestmentInfoDeactivated
    );
    // Reject if InvestmentInfo is completed already
    require!(
        info.state != InvestmentState::Completed, 
        ErrorCode::InvestmentInfoHasCompleted
    );
    // Reject if this InvestmentInfo has not been initialized (non-empty data)
    require!(
        !info.to_account_info().data_is_empty(),
        ErrorCode::InvestmentInfoNotFound
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


    // require!(
    //     info.end_at < Clock::get()?.unix_timestamp,
    //     ErrorCode::InvestmentInfoNotCompleted
    // );


    let signer_infos = &ctx.remaining_accounts;
    let signer_keys = extract_signer_keys(signer_infos);
    info.enforce_3_of_5_signers(signer_infos,true)?;


    // Set InvestmentInfo state to complete
    info.state = InvestmentState::Completed;

    msg!("🟢 Investment {} completed", String::from_utf8_lossy(&info.investment_id));

    emit!(InvestmentInfoCompleted {
        investment_id: info.investment_id,
        version: info.version,
        updated_by: ctx.accounts.payer.key(),
        updated_at: Clock::get()?.unix_timestamp,
        signers: signer_keys
    });

    Ok(())
}

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
    // Reject if this InvestmentInfo has not been initialized (non-empty data)
    require!(
        !info.to_account_info().data_is_empty(),
        ErrorCode::InvestmentInfoNotFound
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


    let signer_infos = &ctx.remaining_accounts;
    let signer_keys = extract_signer_keys(signer_infos);
    info.enforce_3_of_5_signers(signer_infos,true)?;


    // Set investmentInfo to inactive
    info.is_active = false;


    msg!("🟢 Investment {} deactivated", String::from_utf8_lossy(&info.investment_id));

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
    wallet: Pubkey,
    amount_usdt: u64,
    amount_hcoin: u64,
    stage: u8,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let info = &mut ctx.accounts.investment_info;
    let record = &mut ctx.accounts.investment_record;


    // Validate info PDA
    let (expected_info_pda, _bump) = Pubkey::find_program_address(
        &[
            b"investment",
            info.investment_id.as_ref(),
            info.version.as_ref(),
        ],
        ctx.program_id,
    );
    require_keys_eq!(info.key(), expected_info_pda, ErrorCode::InvalidInvestmentInfoPda);


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
    


    // Write record data
    record.batch_id = batch_id;
    record.record_id = record_id;
    record.account_id = account_id;
    record.investment_id = info.investment_id;
    record.version = info.version;
    record.wallet = wallet;
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

// update an investor wallet
pub fn update_investment_record_wallets<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, UpdateInvestmentRecordWallets<'info>>,
    account_id: [u8; 15],
    new_wallet: Pubkey,
) -> Result<()> 
where 
    'c: 'info,
{
    let now = Clock::get()?.unix_timestamp;
    let info = &ctx.accounts.investment_info;
    
    // 1. Validate investment is active and completed
    require!(info.is_active, ErrorCode::InvestmentInfoDeactivated);


    // 3. multisig check
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

        if record.wallet == new_wallet {
            continue;
        }

        // update the wallet
        record.wallet = new_wallet;

        // serialize back to account data
        record.try_serialize(&mut &mut data[..])?;

        //increment updated count
        updated_count += 1;
        
    }

    emit!(InvestmentRecordWalletUpdated {
        investment_id: info.investment_id,
        version: info.version,
        account_id,
        new_wallet,
        updated_by: ctx.accounts.payer.key(),
        updated_at: now,
        signers: signer_keys.clone(),
    });


    msg!("🟢 record update count: {}", updated_count);
    require!(updated_count > 0, ErrorCode::NoRecordsUpdated);

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
    let mint = &ctx.accounts.mint;
    let cache = &mut ctx.accounts.cache;


    // Validate the expected info vault PDA
    let (expected_info_pda, _bump) = Pubkey::find_program_address(
        &[
            b"investment",
            info.investment_id.as_ref(),
            info.version.as_ref(),
        ],
        ctx.program_id,
    );
    require_keys_eq!(info.key(), expected_info_pda, ErrorCode::InvalidInvestmentInfoPda);


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
    require_keys_eq!(mint.key(), get_usdt_mint(), ErrorCode::InvalidTokenMint);


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

    for (i, acc_info) in data_accounts.iter().enumerate() {
        msg!("🟢 Trying to parse account[{}]: {}", i, acc_info.key());
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
                msg!("🟢 ❌ Failed to parse account[{}]: {}", i, acc_info.key());
                msg!("🟢 Reason: {:?}", e);
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
                "⚠️ Skipping revoked record_id={} for account_id={}",
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


        // Genereate recipient ATA for validate 
        let recipient_ata = get_associated_token_address(&wallet, &mint.key());
        

        entries.push(ProfitEntry {
            account_id: record.account_id,
            wallet,
            amount_usdt: amount,
            ratio_bp,
            recipient_ata
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


/// Estimates the refund share for a single batch_id in a specific refund year.
/// This uses the investment stage ratios to calculate H2COIN refunds per investor,
/// storing the results in the RefundShareCache account.
/// The result is stored in the on-chain `RefundShareCache` account.
/// - `batch_id`: The target batch of records to estimate.
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
    let mint = &ctx.accounts.mint;
    let cache = &mut ctx.accounts.cache;


    // Validate the expected info vault PDA
    let (expected_info_pda, _bump) = Pubkey::find_program_address(
        &[
            b"investment",
            info.investment_id.as_ref(),
            info.version.as_ref(),
        ],
        ctx.program_id,
    );
    require_keys_eq!(info.key(), expected_info_pda, ErrorCode::InvalidInvestmentInfoPda);


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
    require_keys_eq!(mint.key(), get_hcoin_mint(), ErrorCode::InvalidTokenMint);


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
    msg!("🟢 Total accounts received: {}", data_accounts.len());
    require!(
        data_accounts.len() <= MAX_ENTRIES_PER_BATCH,
        ErrorCode::TooManyRecordsLoaded
    );


    // Mapping accounts to records and records
    let mut record_map = BTreeMap::new();

    for (i, acc_info) in data_accounts.iter().enumerate() {
        
        msg!("🟢 Trying to parse account[{}]: {}", i, acc_info.key());
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
                msg!("❌ Failed to parse account[{}]: {}", i, acc_info.key());
                msg!("🟢 Reason: {:?}", e);
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

    // require!(
    //     year_index == expect_year_index && (START_YEAR_INDEX..=MAX_YEAR_INDEX).contains(&year_index),
    //     ErrorCode::RefundPeriodInvalid
    // );
    

    // Compute refund entries
    let mut entries: Vec<RefundEntry> = Vec::new();
    let mut subtotal_refund_hcoin: u64 = 0;

    
    for (_record_id, record) in record_map.iter() {
        require!(record.account_id.len() == 15, ErrorCode::InvalidAccountIdLength);
        if record.revoked_at != 0 {
            msg!(
                "⚠️ Skipping revoked record_id={} for account_id={}",
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


        // Genereate recipient ATA for validate    
        let recipient_ata = get_associated_token_address(&wallet, &mint.key());


        entries.push(RefundEntry {
            account_id: record.account_id,
            wallet,
            amount_hcoin: amount,
            stage: record.stage,
            recipient_ata
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
    let vault = &ctx.accounts.vault;
    let vault_token_account = &ctx.accounts.vault_token_account;
    let mint = &ctx.accounts.mint;


    // Validate the expected info vault PDA
    let (expected_info_pda, _bump) = Pubkey::find_program_address(
        &[
            b"investment",
            info.investment_id.as_ref(),
            info.version.as_ref(),
        ],
        ctx.program_id,
    );
    require_keys_eq!(info.key(), expected_info_pda, ErrorCode::InvalidInvestmentInfoPda);


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
    let signer_seeds = &[
        b"vault".as_ref(),
        info.investment_id.as_ref(),
        info.version.as_ref(),
        &[vault_bump],
    ];


    // reject if investment info has been deactived or has not been completed
    require!(info.is_active, ErrorCode::InvestmentInfoDeactivated);
    require!(info.state == InvestmentState::Completed, ErrorCode::InvestmentInfoNotCompleted);
    require!(info.investment_type == InvestmentType::Standard, ErrorCode::MustStandard);

    // Validate the timestamp
    require!(cache.executed_at == 0, ErrorCode::ProfitAlreadyExecuted);
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
    msg!("🟢 BatchId: {}, Vault Token USDT balance: {}", batch_id, vault_token_account.amount);
    msg!("🟢 BatchId: {}, Required subtotal_profit_usdt: {}", batch_id, cache.subtotal_profit_usdt);
    require!(vault_token_account.amount >= cache.subtotal_profit_usdt, ErrorCode::InsufficientTokenBalance);
    require!(vault.to_account_info().lamports() >= cache.subtotal_estimate_sol, ErrorCode::InsufficientSolBalance);


    let mut total_transferred: u64 = 0;
    let mut successes: Vec<Pubkey> = vec![];
    let mut failures: Vec<(Pubkey, String)> = vec![];

    for entry in cache.entries.iter() {
        let recipient = entry.wallet;
    

        let recipient_ata_info = ctx
            .remaining_accounts[3..]
            .iter()
            .find(|acc| acc.key == &entry.recipient_ata)
            .ok_or(ErrorCode::MissingAssociatedTokenAccount)?;


        // transfer token to investor
        let result = transfer_token_checked(
            ctx.accounts.token_program.to_account_info(),
            vault_token_account.to_account_info(),
            recipient_ata_info.to_account_info(),
            mint.to_account_info(),
            vault.to_account_info(),
            Some(signer_seeds),
            entry.amount_usdt,
            mint.decimals,
        );


        match result {
            Ok(_) => {
                successes.push(recipient);
                total_transferred = total_transferred
                    .checked_add(entry.amount_usdt)
                    .ok_or(ErrorCode::NumericalOverflow)?;

                emit!(ProfitPaidEvent {
                    investment_id: info.investment_id,
                    version: info.version,
                    to: recipient,
                    amount_usdt: entry.amount_usdt,
                    pay_at: now,
                });
            }
            Err(e) => {
                failures.push((recipient, format!("{:?}", e)));
                msg!("❌ Transfer to {} failed: {:?}", recipient, e);
            }
        }
    }

    require!(
        total_transferred == cache.subtotal_profit_usdt,
        ErrorCode::TotalShareMismatch
    );

    if successes.len() == cache.entries.len() {
        cache.executed_at = now;
        msg!("🟢 All {} transfers succeeded", successes.len());
    } else {
        msg!("⚠️ Partial success: {} succeeded, {} failed", successes.len(), failures.len());
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

    msg!(
        "Executed profit share: {} entries, {} USDT",
        cache.entries.len(),
        total_transferred
    );

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

    
    // Validate the expected info vault PDA
    let (expected_info_pda, _bump) = Pubkey::find_program_address(
        &[
            b"investment",
            info.investment_id.as_ref(),
            info.version.as_ref(),
        ],
        ctx.program_id,
    );
    require_keys_eq!(info.key(), expected_info_pda, ErrorCode::InvalidInvestmentInfoPda);


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
    

    // Validate the timestamp
    require!(cache.executed_at == 0, ErrorCode::RefundAlreadyExecuted);
    require!(now - cache.created_at <= SHARE_CACHE_EXPIRE_SECS, ErrorCode::RefundCacheExpired);


    // reject if subtotal_refund_hcoin is 0
    require!(cache.subtotal_refund_hcoin > 0, ErrorCode::InvalidTotalH2coin);


    // Ensure signer is part of 3-of-5 execute whitelist
    let signer_infos = &ctx.remaining_accounts[..3];
    let signer_keys = extract_signer_keys(signer_infos);
    info.enforce_3_of_5_signers(signer_infos, false)?; 


    // Token checks
    require_keys_eq!(mint.key(), get_hcoin_mint(), ErrorCode::InvalidTokenMint);
    require_keys_eq!(vault_token_account.mint, mint.key(), ErrorCode::InvalidTokenMint);
    require!(vault.lamports() >= cache.subtotal_estimate_sol, ErrorCode::InsufficientSolBalance);
    msg!("🟢 BatchId: {}, Vault Token USDT balance: {}", batch_id, vault_token_account.amount);
    msg!("🟢 BatchId: {}, Required subtotal_profit_usdt: {}", batch_id, cache.subtotal_refund_hcoin);
    require!(vault_token_account.amount >= cache.subtotal_refund_hcoin, ErrorCode::InsufficientTokenBalance);


    // Loop through entries and process refund
    let mut total_transferred = 0u64;
    let mut successes: Vec<Pubkey> = vec![];
    let mut failures: Vec<(Pubkey, String)> = vec![];

    for entry in cache.entries.iter() {
        let recipient = entry.wallet;
            
        let recipient_ata_info = ctx
            .remaining_accounts[3..]
            .iter()
            .find(|acc| acc.key == &entry.recipient_ata)
            .ok_or(ErrorCode::MissingAssociatedTokenAccount)?;


        // transfer token to investor
        let result = transfer_token_checked(
            ctx.accounts.token_program.to_account_info(),
            vault_token_account.to_account_info(),
            recipient_ata_info.to_account_info(),
            mint.to_account_info(),
            vault.to_account_info(),
            Some(signer_seeds),
            entry.amount_hcoin,
            mint.decimals,
        );

        match result {
            Ok(_) => {
                successes.push(recipient);

                total_transferred = total_transferred
                    .checked_add(entry.amount_hcoin)
                    .ok_or(ErrorCode::NumericalOverflow)?;

                emit!(RefundPaidEvent {
                    investment_id: info.investment_id,
                    version: info.version,  
                    to: entry.wallet,
                    amount_hcoin: entry.amount_hcoin,
                    pay_at: now,
                });
            }
            Err(e) => {
                failures.push((recipient, format!("{:?}", e)));
                msg!("❌ Transfer to {} failed: {:?}", recipient, e);
            }
        }
    }

    require!(
        total_transferred == cache.subtotal_refund_hcoin,
        ErrorCode::TotalShareMismatch
    );

    if successes.len() == cache.entries.len() {
        cache.executed_at = now;
        msg!("🟢 All {} transfers succeeded", successes.len());
    } else {
        msg!("⚠️ Partial success: {} succeeded, {} failed", successes.len(), failures.len());
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

    msg!(
        "🟢 Executed refund share: {} entries, {} H2COIN",
        cache.entries.len(),
        total_transferred
    );
    

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


    let ix = system_instruction::transfer(
        &payer.key(),
        &vault.key(),
        amount,
    );

    // Transfer SOL from payer to vault using system program
    invoke(
        &ix,
        &[
            payer.to_account_info(),
            vault.to_account_info(),
            system_program.to_account_info(),
        ],
    )?;

    // Emit event for audit/logging purposes
    emit!(VaultDepositSolEvent {
        investment_id: info.investment_id,
        version: info.version,
        from: *payer.key,
        amount_usdt: amount,
        deposit_at: now,
    });

    msg!("🟢 Deposited {} lamports to vault", amount);
    Ok(())
}


/// Deposits SPL Token to the Vault's associated token account (ATA)
pub fn deposit_token_to_vault(ctx: Context<DepositTokenToVault>, amount: u64) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let info = &ctx.accounts.investment_info;
    let payer = &ctx.accounts.payer;
    let from = &ctx.accounts.from;
    let mint = &ctx.accounts.mint;
    let vault = &ctx.accounts.vault;
    let vault_token_account = &ctx.accounts.vault_token_account;


    // reject if investment info has been deactived or has not been completed
    require!(info.is_active, ErrorCode::InvestmentInfoDeactivated);
    require!(info.state == InvestmentState::Completed, ErrorCode::InvestmentInfoNotCompleted);


    // Derive the expected vault PDA
    let (vault_pda, vault_bump) = Pubkey::find_program_address(
        &[
            b"vault", 
            info.investment_id.as_ref(), // [u8; 15]
            info.version.as_ref(),       // [u8; 4]
        ],
        ctx.program_id,
    );

    // Prepare PDA signer seeds
    let signer_seeds: &[&[u8]] = &[
        b"vault",
        info.investment_id.as_ref(),
        info.version.as_ref(),
        &[vault_bump],
    ];

    
    let expected_vault_token_ata = get_associated_token_address(&vault_pda, &mint.key());

    require!(
        mint.key() == get_usdt_mint() || mint.key() == get_hcoin_mint(),
        ErrorCode::InvalidTokenMint
    );
    require_keys_eq!(vault_token_account.key(), expected_vault_token_ata, ErrorCode::InvalidVaultAta);


    // Ensure the vault ATA exists; create it if needed
    ensure_ata_exists(
        payer.to_account_info(),                         // funder
        vault_token_account.to_account_info(),       // ATA of vault PDA
        vault.to_account_info(),          // owner ATA PDA
        mint.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.associated_token_program.to_account_info(),
        signer_seeds,
    )?;

    // Transfer tokens from user ATA to vault ATA
    transfer_token_checked(
        ctx.accounts.token_program.to_account_info(),
        from.to_account_info(),       // user's ATA
        vault_token_account.to_account_info(),     // vault ATA
        mint.to_account_info(),
        payer.to_account_info(),  // authority (payer is signer)
        Some(signer_seeds),
        amount,
        6, // decimals
    )?;

    // Emit event for audit/logging purposes
    emit!(VaultDepositTokenEvent {
        investment_id: info.investment_id,
        version: info.version,
        from: payer.key(),
        mint: mint.key(),
        amount,
        deposit_at: now,
    });

    msg!("🟢 Deposited {} tokens to vault ATA", amount);
    Ok(())
}



/// Withdraws remaining SOL, USDT, and H2COIN from the vault PDA to the withdraw wallet.
/// Requires 'completed' and 'active' state
/// Requires 3-of-5 execute whitelist signatures.
pub fn withdraw_from_vault<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, WithdrawFromVault<'info>>,
    recipient: Pubkey,
) -> Result<()>
where
    'c: 'info,
{
    let now = Clock::get()?.unix_timestamp;
    let info = &ctx.accounts.investment_info;
    let usdt_mint = &ctx.accounts.usdt_mint;
    let hcoin_mint = &ctx.accounts.hcoin_mint;


    // reject if investment info has been deactived or has not been completed
    require!(info.is_active, ErrorCode::InvestmentInfoDeactivated);
    require!(info.state == InvestmentState::Completed, ErrorCode::InvestmentInfoNotCompleted);


    // Extract and verify 3-of-5 signer keys
    let signer_infos: &[AccountInfo<'info>] = &ctx.remaining_accounts[0..3];
    let signer_keys = extract_signer_keys(signer_infos);
    info.enforce_3_of_5_signers(signer_infos, false)?;


    // Load all involved accounts (vault & recipient ATAs)
    let vault_pda_info = &ctx.remaining_accounts[3];
    let vault_usdt_ata_info = &ctx.remaining_accounts[4];
    let vault_hcoin_ata_info = &ctx.remaining_accounts[5];
    let recipient_info = &ctx.remaining_accounts[6];
    let recipient_usdt_ata_info = &ctx.remaining_accounts[7];
    let recipient_hcoin_ata_info = &ctx.remaining_accounts[8];


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
        vault_pda_info.key() == info.vault && vault_pda.key() == info.vault, 
        ErrorCode::InvalidVaultPda
    );


    // Load and validate vault token accounts
    let vault_usdt_ata = Account::<TokenAccount>::try_from(vault_usdt_ata_info)?;
    require!(
        vault_usdt_ata.mint == usdt_mint.key(),
        ErrorCode::InvalidTokenMint
    );

    let vault_hcoin_ata = Account::<TokenAccount>::try_from(vault_hcoin_ata_info)?;
    require!(
        vault_hcoin_ata.mint == hcoin_mint.key(),
        ErrorCode::InvalidTokenMint
    );


    // Check recipient is on withdraw whitelist
    require!(!info.withdraw_whitelist.is_empty(), ErrorCode::EmptyWhitelist);
    require!(info.withdraw_whitelist.contains(&recipient), ErrorCode::UnauthorizedRecipient);
    require_keys_eq!(recipient_info.key(), recipient, ErrorCode::InvalidRecipientAddress);



    // Transfer USDT if balance > 0 and vault ATA owner is correct
    if let Ok(vault_usdt_account) = Account::<TokenAccount>::try_from(vault_usdt_ata_info) {
        require_keys_eq!(
            vault_usdt_ata.owner,
            vault_pda_info.key(),
            ErrorCode::InvalidVaultTokenAccount
        );

        if vault_usdt_account.amount > 0 {
            transfer_token_checked(
                ctx.accounts.token_program.to_account_info(),
                vault_usdt_ata_info.clone(),
                recipient_usdt_ata_info.clone(),
                usdt_mint.to_account_info(),
                vault_pda_info.to_account_info(),
                Some(signer_seeds),
                vault_usdt_account.amount,
                usdt_mint.decimals,
            )?;
        } else {
            msg!("🟡 Vault USDT amount = 0, skip transfer");
        }
    } else {
        msg!("🟡 Vault USDT ATA not initialized, skip transfer");
    }

    // Transfer H2COIN if balance > 0 and vault ATA owner is correct
    if let Ok(vault_hcoin_account) = Account::<TokenAccount>::try_from(vault_hcoin_ata_info) {
        require_keys_eq!(
            vault_hcoin_ata.owner,
            vault_pda_info.key(),
            ErrorCode::InvalidVaultTokenAccount
        );

        if vault_hcoin_account.amount > 0 {
            transfer_token_checked(
                ctx.accounts.token_program.to_account_info(),
                vault_hcoin_ata_info.clone(),
                recipient_hcoin_ata_info.clone(),
                hcoin_mint.to_account_info(),
                vault_pda_info.to_account_info(),
                Some(signer_seeds),
                vault_hcoin_account.amount,
                hcoin_mint.decimals,
            )?;
        } else {
            msg!("🟡 Vault H2COIN amount = 0, skip transfer");
        }
    } else {
        msg!("🟡 Vault H2COIN ATA not initialized, skip transfer");
    }


    // Get lamport balance and calculate rent-exempt threshold
    let remaining_lamports = vault_pda_info.lamports();
    let rent_exempt = Rent::get()?.minimum_balance(vault_pda_info.data_len());
    let withdraw_lamports = vault_pda_info.lamports()
        .saturating_sub(rent_exempt)
        .saturating_sub(ESTIMATE_SOL_BASE)
        .saturating_sub(ESTIMATE_SOL_PER_ENTRY);

    // Transfer SOL if available
    if withdraw_lamports > 0 {
        invoke_signed(
            &system_instruction::transfer(
                &vault_pda_info.key(), 
                &recipient_info.key(), 
                withdraw_lamports
            ),
            &[
                vault_pda_info.clone(),
                recipient_info.clone(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[signer_seeds],
        )?;

        msg!("🟢 Transferred {} lamports from vault to recipient", withdraw_lamports);
    } else {
        msg!("🟡 No withdrawable SOL (rent-exempt only), skip transfer.");
    }


    // Emit event for tracking
    emit!(VaultTransferred {
        investment_id: info.investment_id,
        version: info.version,
        recipient,
        sol_amount: remaining_lamports,
        usdt_amount: vault_usdt_ata.amount,
        hcoin_amount: vault_hcoin_ata.amount,
        executed_by: ctx.accounts.payer.key(),
        executed_at: now,
        signers: signer_keys.clone(),
    });

    Ok(())
}



/// Ensure ATA exists for the given mint and authority.
#[allow(clippy::too_many_arguments)]
pub fn ensure_ata_exists<'info>(
    payer: AccountInfo<'info>,
    associated_token: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    mint: AccountInfo<'info>,
    system_program: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    associated_token_program: AccountInfo<'info>,
    signer_seeds: &[&[u8]],
) -> Result<()> {
    // Box::leak 解法：讓 clone() 的值擁有 'info lifetime
    let associated_token_boxed = Box::new(associated_token.clone());
    let associated_token_ref: &'info AccountInfo<'info> = Box::leak(associated_token_boxed);

    if let Ok(account) = Account::<TokenAccount>::try_from(associated_token_ref) {
        require!(
            account.owner == authority.key(),
            ErrorCode::InvalidRecipientATA
        );
        return Ok(());
    }

    // move 原始 associated_token 到 CPI
    let signer_refs = [signer_seeds];
    let cpi_ctx = CpiContext::new_with_signer(
        associated_token_program,
        Create {
            payer,
            associated_token,
            authority,
            mint,
            system_program,
            token_program,
        },
        &signer_refs,
    );

    create(cpi_ctx)
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
    let cpi_accounts = TransferChecked {
        from,
        to,
        mint,
        authority,
    };

    let signer_seeds_vec;
    let cpi_ctx = match authority_seeds {
        Some(seeds_inner) => {
            signer_seeds_vec = vec![seeds_inner]; // 擁有者為外層的變數
            let signer: &[&[&[u8]]] = &signer_seeds_vec;
            CpiContext::new_with_signer(token_program, cpi_accounts, signer)
        }
        None => CpiContext::new(token_program, cpi_accounts),
    };

    token::transfer_checked(cpi_ctx, amount, decimals)
}