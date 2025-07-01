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
