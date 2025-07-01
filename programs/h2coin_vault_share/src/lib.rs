// programs/h2coin_vault_share/src/lib.rs
// 
// H2COIN VAULT SHARE PROGRAM - MAIN ENTRY POINT
// ==============================================
// 
// AUDIT NOTES:
// This program implements a multi-signature investment vault system with the following key features:
// - 3-of-5 multisig authorization for critical operations
// - Investment record management with batch processing
// - Profit and refund distribution mechanisms
// - Token vault management (USDT and H2COIN)
// - Whitelist-based access control
//
// SECURITY CONSIDERATIONS:
// - All critical operations require 3-of-5 multisig validation
// - PDA-based account derivation prevents address spoofing
// - Comprehensive input validation and error handling
// - Reentrancy protection through Anchor framework
// - Access control through whitelist validation
//
// CRITICAL FUNCTIONS:
// - Investment info management (initialize, update, complete, deactivate)
// - Investment record operations (add, update, revoke)
// - Profit/refund estimation and execution
// - Vault deposit/withdrawal operations

#![allow(unexpected_cfgs)]
#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

// Module declarations for program organization
pub mod context;      // Account validation contexts
pub mod instructions; // Core business logic
pub mod state;        // Data structures and state management
pub mod event;        // Event emission for off-chain tracking
pub mod constants;    // Program constants and configuration
pub mod error;        // Custom error definitions

use crate::state::*;
use crate::context::*;

// Program ID - CRITICAL: This must match the deployed program address
// AUDIT: Verify this matches the actual deployed program on target network
declare_id!("ALjifiKwvSzKLfpebFZ185b3mLAxroEvxYXCcy9Lzw2B");

/// Main program module containing all instruction handlers
/// 
/// AUDIT NOTES:
/// - Each instruction has specific access control requirements
/// - Critical operations require 3-of-5 multisig validation
/// - Input validation is performed at instruction level
/// - Error handling follows consistent patterns
#[program]
pub mod h2coin_vault_share {

    use super::*;

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
        instructions::initialize_investment_info(
            ctx,
            investment_id,
            version,
            investment_type,
            stage_ratio,
            start_at,
            end_at,
            investment_upper_limit,
            execute_whitelist,
            update_whitelist,
            withdraw_whitelist,
        )
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
    /// - Investment state validation
    /// - Input parameter validation
    pub fn update_investment_info(
        ctx: Context<UpdateInvestmentInfo>,
        new_stage_ratio: Option<[[u8; 10]; 3]>,
        new_upper_limit: Option<u64>,
    ) -> Result<()> {
        instructions::update_investment_info(ctx, new_stage_ratio, new_upper_limit)
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
    /// - Investment state validation
    /// - PDA verification
    pub fn completed_investment_info(ctx: Context<CompletedInvestmentInfo>) -> Result<()> {
        instructions::completed_investment_info(ctx)
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
    pub fn deactivate_investment_info(ctx: Context<DeactivateInvestmentInfo>) -> Result<()> {
        instructions::deactivate_investment_info(ctx)
    }    

    /// Update execute whitelist members
    /// 
    /// AUDIT CRITICAL:
    /// - Requires 3-of-5 multisig from current execute_whitelist
    /// - Can replace whitelist members one at a time
    /// - Affects authorization for profit/refund execution
    /// 
    /// SECURITY CHECKS:
    /// - Multisig validation (3-of-5)
    /// - Whitelist member validation
    /// - Duplicate address prevention
    pub fn patch_execute_whitelist(ctx: Context<UpdateExecuteWallet>) -> Result<()> {
        instructions::patch_execute_whitelist(ctx)
    }

    /// Update update whitelist members
    /// 
    /// AUDIT CRITICAL:
    /// - Requires 3-of-5 multisig from current update_whitelist
    /// - Can replace whitelist members one at a time
    /// - Affects authorization for investment info updates
    /// 
    /// SECURITY CHECKS:
    /// - Multisig validation (3-of-5)
    /// - Whitelist member validation
    /// - Duplicate address prevention
    pub fn patch_update_whitelist(ctx: Context<UpdateUpdateWallet>) -> Result<()> {
        instructions::patch_update_whitelist(ctx)
    }

    /// Update withdraw whitelist members
    /// 
    /// AUDIT CRITICAL:
    /// - Requires 3-of-5 multisig from current withdraw_whitelist
    /// - Can replace whitelist members one at a time
    /// - Affects authorization for vault withdrawals
    /// 
    /// SECURITY CHECKS:
    /// - Multisig validation (3-of-5)
    /// - Whitelist member validation
    /// - Duplicate address prevention
    pub fn patch_withdraw_whitelist(ctx: Context<UpdateWithdrawWallet>) -> Result<()> {
        instructions::patch_withdraw_whitelist(ctx)
    }

    //================ INVESTMENT RECORD MANAGEMENT ================
    // AUDIT: These functions manage individual investment records
    // SECURITY: Records are immutable once created, can only be revoked
    
    /// Add a new investment record
    /// 
    /// AUDIT CRITICAL:
    /// - Creates individual investment records
    /// - Transfers tokens from recipient to vault
    /// - Records investment amounts and stage information
    /// - Generates unique record identifiers
    /// 
    /// SECURITY CHECKS:
    /// - Investment info validation
    /// - Token transfer validation
    /// - Record ID uniqueness
    /// - Account ID validation
    #[allow(clippy::too_many_arguments)]
    pub fn add_investment_record(
        ctx: Context<AddInvestmentRecords>,
        batch_id: u16,
        record_id: u64,
        account_id: [u8; 15],
        amount_usdt: u64,
        amount_hcoin: u64,
        investment_stage: u8,
    ) -> Result<()> {
        instructions::add_investment_record(ctx, batch_id, record_id, account_id, amount_usdt, amount_hcoin, investment_stage)
    }

    /// Update wallet address for investment records
    /// 
    /// AUDIT CRITICAL:
    /// - Requires 3-of-5 multisig from update_whitelist
    /// - Updates wallet addresses for existing records
    /// - Affects future profit/refund distributions
    /// 
    /// SECURITY CHECKS:
    /// - Multisig validation (3-of-5)
    /// - Record existence validation
    /// - Account ID validation
    pub fn update_investment_record_wallets<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, UpdateInvestmentRecordWallets<'info>>,
        account_id: [u8; 15],
    ) -> Result<()> 
    where 
        'c: 'info,
    {
        instructions::update_investment_record_wallets(ctx, account_id)
    }

    /// Revoke an investment record
    /// 
    /// AUDIT CRITICAL:
    /// - Requires 3-of-5 multisig from update_whitelist
    /// - Marks record as revoked, preventing further operations
    /// - Affects profit/refund calculations
    /// 
    /// SECURITY CHECKS:
    /// - Multisig validation (3-of-5)
    /// - Record existence validation
    /// - Record state validation (not already revoked)
    pub fn revoked_investment_record(
        ctx: Context<RevokeInvestmentRecord>,
        batch_id: u16,
        record_id: u64,
        account_id: [u8; 15],
    ) -> Result<()> {
        instructions::revoked_investment_record(ctx, batch_id, record_id, account_id)
    }

    //================ PROFIT SHARE MANAGEMENT ================
    // AUDIT: These functions handle profit distribution calculations and execution
    // SECURITY: Critical financial operations requiring multisig authorization
    
    /// Estimate profit share distribution
    /// 
    /// AUDIT CRITICAL:
    /// - Calculates profit distribution for all valid records
    /// - Creates profit share cache for batch processing
    /// - Requires 3-of-5 multisig from execute_whitelist
    /// - Affects actual profit distribution amounts
    /// 
    /// SECURITY CHECKS:
    /// - Multisig validation (3-of-5)
    /// - Investment state validation
    /// - Profit amount validation
    /// - Cache existence validation
    pub fn estimate_profit_share<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, EstimateProfitShare<'info>>,
        batch_id: u16,
        total_profit_usdt: u64,
        total_invest_usdt: u64,
    ) -> Result<()>
    where
        'c: 'info,
    {
        instructions::estimate_profit_share(ctx, batch_id, total_profit_usdt, total_invest_usdt)
    }

    /// Execute profit share distribution
    /// 
    /// AUDIT CRITICAL:
    /// - Transfers actual profit tokens to recipients
    /// - Requires 3-of-5 multisig from execute_whitelist
    /// - Uses pre-calculated profit share cache
    /// - Critical financial operation
    /// 
    /// SECURITY CHECKS:
    /// - Multisig validation (3-of-5)
    /// - Cache existence and validation
    /// - Token balance validation
    /// - Transfer amount validation
    pub fn execute_profit_share<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, ExecuteProfitShare<'info>>,
        batch_id: u16,
    ) -> Result<()>
    where
        'c: 'info,
    {
        instructions::execute_profit_share(ctx, batch_id)
    }

    //================ REFUND SHARE MANAGEMENT ================
    // AUDIT: These functions handle refund distribution calculations and execution
    // SECURITY: Critical financial operations requiring multisig authorization
    
    /// Estimate refund share distribution
    /// 
    /// AUDIT CRITICAL:
    /// - Calculates annual refund distribution for all valid records
    /// - Creates refund share cache for batch processing
    /// - Requires 3-of-5 multisig from execute_whitelist
    /// - Affects actual refund distribution amounts
    /// 
    /// SECURITY CHECKS:
    /// - Multisig validation (3-of-5)
    /// - Investment state validation
    /// - Year index validation
    /// - Cache existence validation
    pub fn estimate_refund_share<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, EstimateRefundShare<'info>>,
        batch_id: u16,
        year_index: u8
    ) -> Result<()>
    where
        'c: 'info, 
    {
        instructions::estimate_refund_share(ctx, batch_id, year_index)
    }

    /// Execute refund share distribution
    /// 
    /// AUDIT CRITICAL:
    /// - Transfers actual refund tokens to recipients
    /// - Requires 3-of-5 multisig from execute_whitelist
    /// - Uses pre-calculated refund share cache
    /// - Critical financial operation
    /// 
    /// SECURITY CHECKS:
    /// - Multisig validation (3-of-5)
    /// - Cache existence and validation
    /// - Token balance validation
    /// - Transfer amount validation
    pub fn execute_refund_share<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, ExecuteRefundShare<'info>>,
        batch_id: u16,
        year_index: u8
    ) -> Result<()>
    where
        'c: 'info,
    {
        instructions::execute_refund_share(ctx, batch_id, year_index)
    }

    //================ VAULT MANAGEMENT ================
    // AUDIT: These functions handle vault deposits and withdrawals
    // SECURITY: Critical operations affecting vault balances
    
    /// Deposit SOL to vault
    /// 
    /// AUDIT CRITICAL:
    /// - Transfers SOL from signer to vault
    /// - Updates vault SOL balance
    /// - Requires proper vault account validation
    /// 
    /// SECURITY CHECKS:
    /// - Vault account validation
    /// - Amount validation
    /// - SOL transfer validation
    pub fn deposit_sol_to_vault(ctx: Context<DepositSolToVault>, amount: u64) -> Result<()> {
        instructions::deposit_sol_to_vault(ctx, amount)
    }

    /// Deposit tokens to vault
    /// 
    /// AUDIT CRITICAL:
    /// - Transfers tokens from signer to vault
    /// - Updates vault token balance
    /// - Requires proper vault and token account validation
    /// 
    /// SECURITY CHECKS:
    /// - Vault account validation
    /// - Token account validation
    /// - Amount validation
    /// - Token transfer validation
    pub fn deposit_token_to_vault(ctx: Context<DepositTokenToVault>, amount: u64) -> Result<()> {
        instructions::deposit_token_to_vault(ctx, amount)
    }

    /// Withdraw from vault
    /// 
    /// AUDIT CRITICAL:
    /// - Requires 3-of-5 multisig from withdraw_whitelist
    /// - Transfers tokens/SOL from vault to recipient
    /// - Critical operation affecting vault security
    /// 
    /// SECURITY CHECKS:
    /// - Multisig validation (3-of-5)
    /// - Vault account validation
    /// - Balance validation
    /// - Transfer amount validation
    pub fn withdraw_from_vault<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, WithdrawFromVault<'info>>,
    ) -> Result<()>
    where
        'c: 'info,
    {
        instructions::withdraw_from_vault(ctx)
    }
}