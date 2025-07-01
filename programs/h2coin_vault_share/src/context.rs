// programs/h2coin_vault_share/src/context.rs
//
// H2COIN VAULT SHARE PROGRAM - ACCOUNT VALIDATION CONTEXTS
// =======================================================
//
// AUDIT NOTES:
// This file defines all account validation contexts for program instructions.
// Each context specifies required accounts, their relationships, and validation rules.
// Proper account validation is critical for security and prevents unauthorized access.
//
// CONTEXT CATEGORIES:
// - Investment info management contexts
// - Investment record management contexts
// - Profit/refund estimation and execution contexts
// - Vault deposit and withdrawal contexts
//
// SECURITY CONSIDERATIONS:
// - PDA derivation prevents address spoofing
// - Account ownership validation prevents unauthorized access
// - Token account validation ensures correct token operations
// - Multisig validation through remaining_accounts
// - Proper account mutability flags

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::state::*;

/// Account validation context for initializing investment info
/// 
/// AUDIT CRITICAL:
/// - Creates the main investment configuration account
/// - Sets up vault PDA and associated token accounts
/// - Validates token mints and account relationships
/// - Establishes initial investment parameters
/// 
/// SECURITY CHECKS:
/// - PDA derivation for investment info and vault
/// - Token mint validation (USDT and H2COIN)
/// - Vault ATA ownership validation
/// - Account space allocation validation
#[derive(Accounts)]
#[instruction(investment_id: [u8; 15], version: [u8; 4])]
pub struct InitializeInvestmentInfo<'info> {
    /// InvestmentInfo PDA account to be created
    /// 
    /// AUDIT CRITICAL:
    /// - Derived from investment_id and version
    /// - Fixed size allocation prevents overflow
    /// - Initialized with investment parameters
    #[account(
        init,
        payer = payer,
        space = InvestmentInfo::SIZE,
        seeds = [
            b"investment", 
            investment_id.as_ref(), 
            version.as_ref()
        ],
        bump,
    )]
    pub investment_info: Account<'info, InvestmentInfo>,

    /// USDT mint account for validation
    /// 
    /// AUDIT: Must match expected USDT mint address
    pub usdt_mint: Account<'info, Mint>,
    
    /// H2COIN mint account for validation
    /// 
    /// AUDIT: Must match expected H2COIN mint address
    pub hcoin_mint: Account<'info, Mint>,

    /// Vault PDA account for SOL storage
    /// 
    /// AUDIT CRITICAL:
    /// - Derived from investment_id and version
    /// - Holds SOL for transaction fees
    /// - No deserialization needed (UncheckedAccount)
    #[account(
        init_if_needed,
        payer = payer,
        seeds = [
            b"vault", 
            investment_id.as_ref(), 
            version.as_ref(),
        ],
        bump,
        space = 0,
        owner = system_program.key() 
    )]
    /// CHECK: This vault PDA holds SOL, no deserialization needed
    pub vault: UncheckedAccount<'info>,
        
    /// Vault associated token account for USDT
    /// 
    /// AUDIT CRITICAL:
    /// - Derived from vault PDA and USDT mint
    /// - Holds USDT for profit distributions
    /// - Ownership validated against vault PDA
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = usdt_mint,
        associated_token::authority = vault,
        associated_token::token_program = token_program,
    )]
    pub vault_usdt_account: Account<'info, TokenAccount>,
    
    /// Vault associated token account for H2COIN
    /// 
    /// AUDIT CRITICAL:
    /// - Derived from vault PDA and H2COIN mint
    /// - Holds H2COIN for refund distributions
    /// - Ownership validated against vault PDA
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = hcoin_mint,
        associated_token::authority = vault,
        associated_token::token_program = token_program,
    )]
    pub vault_hcoin_account: Account<'info, TokenAccount>,

    /// Transaction payer account
    /// 
    /// AUDIT: Pays for account creation and rent
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// Rent sysvar for account creation
    /// 
    /// AUDIT: Required for account initialization
    pub rent: Sysvar<'info, Rent>,
    
    /// System program for account creation
    /// 
    /// AUDIT: Required for account initialization
    pub system_program: Program<'info, System>,
    
    /// Token program for token account creation
    /// 
    /// AUDIT: Required for ATA creation
    pub token_program: Program<'info, Token>,
    
    /// Associated token program for ATA creation
    /// 
    /// AUDIT: Required for ATA creation
    pub associated_token_program: Program<'info, AssociatedToken>,
}

/// Account validation context for updating investment info
/// 
/// AUDIT CRITICAL:
/// - Requires 3-of-5 multisig from update_whitelist
/// - Validates investment info account
/// - Allows modification of stage ratios and limits
/// 
/// SECURITY CHECKS:
/// - Investment info PDA validation
/// - Investment state validation (must be active)
/// - Multisig validation through remaining_accounts
#[derive(Accounts)]
pub struct UpdateInvestmentInfo<'info> {
    /// InvestmentInfo account to be updated
    /// 
    /// AUDIT CRITICAL:
    /// - Must be mutable for updates
    /// - PDA validation prevents spoofing
    /// - State validation prevents invalid updates
    #[account(
        mut,
        seeds = [
            b"investment",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref()
        ],
        bump
    )]
    pub investment_info: Account<'info, InvestmentInfo>,
    
    /// Transaction payer account
    /// 
    /// AUDIT: Pays for transaction fees
    pub payer: Signer<'info>,
}

/// Account validation context for completing investment info
/// 
/// AUDIT CRITICAL:
/// - Requires 3-of-5 multisig from update_whitelist
/// - Changes investment state to Completed
/// - Prevents further modifications
/// 
/// SECURITY CHECKS:
/// - Investment info PDA validation
/// - Investment state validation
/// - Multisig validation through remaining_accounts
#[derive(Accounts)]
pub struct CompletedInvestmentInfo<'info> {
    /// InvestmentInfo account to be completed
    /// 
    /// AUDIT CRITICAL:
    /// - Must be mutable for state change
    /// - PDA validation prevents spoofing
    /// - State validation prevents invalid completion
    #[account(
        mut,
        seeds = [
            b"investment",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref()
        ],
        bump
    )]
    pub investment_info: Account<'info, InvestmentInfo>,
    
    /// Transaction payer account
    /// 
    /// AUDIT: Pays for transaction fees
    #[account(mut)]
    pub payer: Signer<'info>,
}

/// Account validation context for deactivating investment info
/// 
/// AUDIT CRITICAL:
/// - Requires 3-of-5 multisig from update_whitelist
/// - Only allowed when investment is completed
/// - Prevents all further operations
/// 
/// SECURITY CHECKS:
/// - Investment info PDA validation
/// - Investment state validation (must be completed)
/// - Multisig validation through remaining_accounts
#[derive(Accounts)]
pub struct DeactivateInvestmentInfo<'info> {
    /// InvestmentInfo account to be deactivated
    /// 
    /// AUDIT CRITICAL:
    /// - Must be mutable for deactivation
    /// - PDA validation prevents spoofing
    /// - State validation prevents invalid deactivation
    #[account(
        mut,
        seeds = [
            b"investment",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref()
        ],
        bump
    )]
    pub investment_info: Account<'info, InvestmentInfo>,

    /// Transaction payer account
    /// 
    /// AUDIT: Pays for transaction fees
    #[account(mut)]
    pub payer: Signer<'info>,
}

/// Account validation context for updating execute whitelist
/// 
/// AUDIT CRITICAL:
/// - Requires 3-of-5 multisig from current execute_whitelist
/// - Allows replacement of whitelist members
/// - Affects profit/refund execution authorization
/// 
/// SECURITY CHECKS:
/// - Investment info PDA validation
/// - Investment state validation
/// - Multisig validation through remaining_accounts
#[derive(Accounts)]
pub struct UpdateExecuteWallet<'info> {
    /// InvestmentInfo account containing whitelist
    /// 
    /// AUDIT CRITICAL:
    /// - Must be mutable for whitelist updates
    /// - PDA validation prevents spoofing
    /// - Contains execute_whitelist to be updated
    #[account(
        mut,
        seeds = [
            b"investment",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref()
        ],
        bump
    )]
    pub investment_info: Account<'info, InvestmentInfo>,

    /// Transaction payer account
    /// 
    /// AUDIT: Pays for transaction fees
    #[account(mut)]
    pub payer: Signer<'info>,
}

/// Account validation context for updating update whitelist
/// 
/// AUDIT CRITICAL:
/// - Requires 3-of-5 multisig from current update_whitelist
/// - Allows replacement of whitelist members
/// - Affects investment info update authorization
/// 
/// SECURITY CHECKS:
/// - Investment info PDA validation
/// - Investment state validation
/// - Multisig validation through remaining_accounts
#[derive(Accounts)]
pub struct UpdateUpdateWallet<'info> {
    /// InvestmentInfo account containing whitelist
    /// 
    /// AUDIT CRITICAL:
    /// - Must be mutable for whitelist updates
    /// - PDA validation prevents spoofing
    /// - Contains update_whitelist to be updated
    #[account(
        mut,
        seeds = [
            b"investment",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref()
        ],
        bump
    )]
    pub investment_info: Account<'info, InvestmentInfo>,

    /// Transaction payer account
    /// 
    /// AUDIT: Pays for transaction fees
    #[account(mut)]
    pub payer: Signer<'info>,
}

/// Account validation context for updating withdraw whitelist
/// 
/// AUDIT CRITICAL:
/// - Requires 3-of-5 multisig from current withdraw_whitelist
/// - Allows replacement of whitelist members
/// - Affects vault withdrawal authorization
/// 
/// SECURITY CHECKS:
/// - Investment info PDA validation
/// - Investment state validation
/// - Multisig validation through remaining_accounts
#[derive(Accounts)]
pub struct UpdateWithdrawWallet<'info> {
    /// InvestmentInfo account containing whitelist
    /// 
    /// AUDIT CRITICAL:
    /// - Must be mutable for whitelist updates
    /// - PDA validation prevents spoofing
    /// - Contains withdraw_whitelist to be updated
    #[account(
        mut,
        seeds = [
            b"investment",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref()
        ],
        bump
    )]
    pub investment_info: Account<'info, InvestmentInfo>,

    /// Transaction payer account
    /// 
    /// AUDIT: Pays for transaction fees
    #[account(mut)]
    pub payer: Signer<'info>,
}

/// Account validation context for adding investment records
/// 
/// AUDIT CRITICAL:
/// - Creates individual investment records
/// - Transfers tokens from recipient to vault
/// - Validates token accounts and amounts
/// 
/// SECURITY CHECKS:
/// - Investment info validation
/// - Investment record PDA derivation
/// - Token account ownership validation
/// - Token transfer validation
#[derive(Accounts)]
#[instruction(batch_id: u16, record_id: u64, account_id: [u8; 15])]
pub struct AddInvestmentRecords<'info> {
    /// InvestmentInfo account for validation
    /// 
    /// AUDIT CRITICAL:
    /// - Validates investment exists and is active
    /// - Provides investment parameters
    /// - PDA validation prevents spoofing
    #[account(
        seeds = [
            b"investment",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref()
        ],
        bump
    )]
    pub investment_info: Account<'info, InvestmentInfo>,

    /// InvestmentRecord account to be created
    /// 
    /// AUDIT CRITICAL:
    /// - Derived from investment_id, version, batch_id, record_id, account_id
    /// - Fixed size allocation prevents overflow
    /// - Stores individual investment details
    #[account(
        init,
        payer = payer,
        space = InvestmentRecord::SIZE,
        seeds = [
            b"record",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref(),
            batch_id.to_le_bytes().as_ref(),
            record_id.to_le_bytes().as_ref(),
            account_id.as_ref(),
        ],
        bump,
    )]
    pub investment_record: Account<'info, InvestmentRecord>,

    /// USDT mint account for validation
    /// 
    /// AUDIT: Must match expected USDT mint address
    pub usdt_mint: Account<'info, Mint>,
    
    /// H2COIN mint account for validation
    /// 
    /// AUDIT: Must match expected H2COIN mint address
    pub hcoin_mint: Account<'info, Mint>,
    
    /// Recipient account for token transfers
    /// 
    /// AUDIT CRITICAL:
    /// - Source of token transfers to vault
    /// - Manually validated in instruction
    /// CHECK: recipient lamport target, manually validated
    pub recipient_account: UncheckedAccount<'info>,

    /// Recipient associated token account for USDT
    /// 
    /// AUDIT CRITICAL:
    /// - Source of USDT transfers
    /// - Ownership validated against recipient
    /// - Created if needed
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = usdt_mint,
        associated_token::authority = recipient_account,
        associated_token::token_program = token_program,
    )]
    pub recipient_usdt_account: Account<'info, TokenAccount>,

    /// Recipient associated token account for H2COIN
    /// 
    /// AUDIT CRITICAL:
    /// - Source of H2COIN transfers
    /// - Ownership validated against recipient
    /// - Created if needed
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = hcoin_mint,
        associated_token::authority = recipient_account,
        associated_token::token_program = token_program,
    )]
    pub recipient_hcoin_account: Account<'info, TokenAccount>,

    /// Transaction payer account
    /// 
    /// AUDIT: Pays for account creation and token transfers
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// Rent sysvar for account creation
    /// 
    /// AUDIT: Required for account initialization
    pub rent: Sysvar<'info, Rent>,
    
    /// System program for account creation
    /// 
    /// AUDIT: Required for account initialization
    pub system_program: Program<'info, System>,
    
    /// Token program for token operations
    /// 
    /// AUDIT: Required for token transfers
    pub token_program: Program<'info, Token>,
    
    /// Associated token program for ATA creation
    /// 
    /// AUDIT: Required for ATA creation
    pub associated_token_program: Program<'info, AssociatedToken>,
}

/// Account validation context for updating investment record wallets
/// 
/// AUDIT CRITICAL:
/// - Requires 3-of-5 multisig from update_whitelist
/// - Updates wallet addresses for existing records
/// - Affects future profit/refund distributions
/// 
/// SECURITY CHECKS:
/// - Investment info validation
/// - Record existence validation
/// - Multisig validation through remaining_accounts
/// - Token account validation
#[derive(Accounts)]
#[instruction(account_id: [u8; 15])]
pub struct UpdateInvestmentRecordWallets<'info> {
    /// InvestmentInfo account for validation
    /// 
    /// AUDIT CRITICAL:
    /// - Validates investment exists and is active
    /// - Provides investment parameters
    /// - PDA validation prevents spoofing
    #[account(
        seeds = [
            b"investment",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref()
        ],
        bump
    )]
    pub investment_info: Account<'info, InvestmentInfo>,

    /// USDT mint account for validation
    /// 
    /// AUDIT: Must match expected USDT mint address
    pub usdt_mint: Account<'info, Mint>,
    
    /// H2COIN mint account for validation
    /// 
    /// AUDIT: Must match expected H2COIN mint address
    pub hcoin_mint: Account<'info, Mint>,

    /// New recipient account for token transfers
    /// 
    /// AUDIT CRITICAL:
    /// - New destination for future distributions
    /// - Manually validated in instruction
    /// CHECK: recipient lamport target, manually validated
    pub recipient_account: UncheckedAccount<'info>,

    /// New recipient associated token account for USDT
    /// 
    /// AUDIT CRITICAL:
    /// - New destination for USDT distributions
    /// - Ownership validated against recipient
    /// - Created if needed
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = usdt_mint,
        associated_token::authority = recipient_account,
        associated_token::token_program = token_program,
    )]
    pub recipient_usdt_account: Account<'info, TokenAccount>,

    /// New recipient associated token account for H2COIN
    /// 
    /// AUDIT CRITICAL:
    /// - New destination for H2COIN distributions
    /// - Ownership validated against recipient
    /// - Created if needed
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = hcoin_mint,
        associated_token::authority = recipient_account,
        associated_token::token_program = token_program,
    )]
    pub recipient_hcoin_account: Account<'info, TokenAccount>,

    /// Transaction payer account
    /// 
    /// AUDIT: Pays for ATA creation and transaction fees
    /// CHECK: validated manually via 3-of-5 multisig inside instruction
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// Rent sysvar for account creation
    /// 
    /// AUDIT: Required for ATA initialization
    pub rent: Sysvar<'info, Rent>,
    
    /// System program for account creation
    /// 
    /// AUDIT: Required for account initialization
    pub system_program: Program<'info, System>,
    
    /// Token program for token operations
    /// 
    /// AUDIT: Required for ATA creation
    pub token_program: Program<'info, Token>,
    
    /// Associated token program for ATA creation
    /// 
    /// AUDIT: Required for ATA creation
    pub associated_token_program: Program<'info, AssociatedToken>,
}

/// Account validation context for revoking investment records
/// 
/// AUDIT CRITICAL:
/// - Requires 3-of-5 multisig from update_whitelist
/// - Marks record as revoked with timestamp
/// - Prevents record from distributions
/// 
/// SECURITY CHECKS:
/// - Investment info validation
/// - Record existence validation
/// - Record state validation (not already revoked)
/// - Multisig validation through remaining_accounts
#[derive(Accounts)]
#[instruction(batch_id: u16, record_id: u64, account_id: [u8; 15])]
pub struct RevokeInvestmentRecord<'info> {
    /// InvestmentInfo account for validation
    /// 
    /// AUDIT CRITICAL:
    /// - Validates investment exists and is active
    /// - Provides investment parameters
    /// - PDA validation prevents spoofing
    #[account(
        seeds = [
            b"investment",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref()
        ],
        bump
    )]
    pub investment_info: Account<'info, InvestmentInfo>,

    /// InvestmentRecord account to be revoked
    /// 
    /// AUDIT CRITICAL:
    /// - Must be mutable for revocation
    /// - PDA validation prevents spoofing
    /// - State validation prevents double revocation
    #[account(
        mut,
        seeds = [
            b"record",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref(),
            batch_id.to_le_bytes().as_ref(),
            record_id.to_le_bytes().as_ref(),
            account_id.as_ref(),
        ],
        bump
    )]
    pub investment_record: Account<'info, InvestmentRecord>,

    /// Transaction payer account
    /// 
    /// AUDIT: Pays for transaction fees
    pub payer: Signer<'info>,
}

/// Account validation context for estimating profit share
/// 
/// AUDIT CRITICAL:
/// - Requires 3-of-5 multisig from execute_whitelist
/// - Creates profit share cache for batch distribution
/// - Calculates profit distribution amounts
/// 
/// SECURITY CHECKS:
/// - Investment info validation
/// - Investment type validation (Standard only)
/// - Cache PDA derivation
/// - Multisig validation through remaining_accounts
#[derive(Accounts)]
#[instruction(batch_id: u16)]
pub struct EstimateProfitShare<'info> {
    /// InvestmentInfo account for validation
    /// 
    /// AUDIT CRITICAL:
    /// - Validates investment exists and is completed
    /// - Provides investment parameters
    /// - Investment type validation (Standard only)
    #[account(
        seeds = [
            b"investment",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref()
        ],
        bump
    )]
    pub investment_info: Account<'info, InvestmentInfo>,

    /// ProfitShareCache account to be created
    /// 
    /// AUDIT CRITICAL:
    /// - Derived from investment_id, version, and batch_id
    /// - Fixed size allocation prevents overflow
    /// - Stores profit distribution calculations
    #[account(
        init_if_needed,
        payer = payer,
        space = ProfitShareCache::SIZE,
        seeds = [
            b"profit_cache", 
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref(),
            batch_id.to_le_bytes().as_ref(),
        ],
        bump,
    )]
    pub cache: Account<'info, ProfitShareCache>,

    /// Transaction payer account
    /// 
    /// AUDIT: Pays for cache creation and transaction fees
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// Rent sysvar for account creation
    /// 
    /// AUDIT: Required for cache initialization
    pub rent: Sysvar<'info, Rent>,
    
    /// System program for account creation
    /// 
    /// AUDIT: Required for cache initialization
    pub system_program: Program<'info, System>,
}

/// Account validation context for estimating refund share
/// 
/// AUDIT CRITICAL:
/// - Requires 3-of-5 multisig from execute_whitelist
/// - Creates refund share cache for batch distribution
/// - Calculates refund distribution amounts
/// 
/// SECURITY CHECKS:
/// - Investment info validation
/// - Year index validation (3-9)
/// - Cache PDA derivation
/// - Multisig validation through remaining_accounts
#[derive(Accounts)]
#[instruction(batch_id: u16, year_index: u8)]
pub struct EstimateRefundShare<'info> {
    /// InvestmentInfo account for validation
    /// 
    /// AUDIT CRITICAL:
    /// - Validates investment exists and is completed
    /// - Provides investment parameters and stage ratios
    /// - Used for refund percentage calculations
    #[account(
        seeds = [
            b"investment",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref(),
        ],
        bump
    )]
    pub investment_info: Account<'info, InvestmentInfo>,

    /// RefundShareCache account to be created
    /// 
    /// AUDIT CRITICAL:
    /// - Derived from investment_id, version, batch_id, and year_index
    /// - Fixed size allocation prevents overflow
    /// - Stores refund distribution calculations
    #[account(
        init_if_needed,
        payer = payer,
        space = RefundShareCache::SIZE,
        seeds = [
            b"refund_cache",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref(),
            batch_id.to_le_bytes().as_ref(),
            year_index.to_le_bytes().as_ref(),
        ],
        bump,
    )]
    pub cache: Account<'info, RefundShareCache>,
    
    /// Transaction payer account
    /// 
    /// AUDIT: Pays for cache creation and transaction fees
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// Rent sysvar for account creation
    /// 
    /// AUDIT: Required for cache initialization
    pub rent: Sysvar<'info, Rent>,
    
    /// System program for account creation
    /// 
    /// AUDIT: Required for cache initialization
    pub system_program: Program<'info, System>,
}

/// Account validation context for executing profit share
/// 
/// AUDIT CRITICAL:
/// - Requires 3-of-5 multisig from execute_whitelist
/// - Transfers USDT from vault to recipients
/// - Uses pre-calculated profit share cache
/// 
/// SECURITY CHECKS:
/// - Investment info validation
/// - Cache validation (not expired, not executed)
/// - Vault balance validation
/// - Token transfer validation
/// - Multisig validation through remaining_accounts
#[derive(Accounts)]
#[instruction(batch_id: u16)]
pub struct ExecuteProfitShare<'info> {
    /// InvestmentInfo account for validation
    /// 
    /// AUDIT CRITICAL:
    /// - Validates investment exists and is completed
    /// - Provides investment parameters
    /// - Used for vault PDA derivation
    #[account(
        seeds = [
            b"investment",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref()
        ],
        bump
    )]
    pub investment_info: Account<'info, InvestmentInfo>,

    /// ProfitShareCache account for execution
    /// 
    /// AUDIT CRITICAL:
    /// - Must be mutable for execution tracking
    /// - PDA validation prevents spoofing
    /// - Contains profit distribution data
    #[account(mut,
        seeds = [
            b"profit_cache", 
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref(),
            batch_id.to_le_bytes().as_ref(),
        ],
        bump,
    )]
    pub cache: Account<'info, ProfitShareCache>,

    /// USDT mint account for validation
    /// 
    /// AUDIT: Must match expected USDT mint address
    pub mint: Account<'info, Mint>,

    /// Vault PDA account for token transfers
    /// 
    /// AUDIT CRITICAL:
    /// - Derived from investment_id and version
    /// - Used as token transfer authority
    /// - No deserialization needed (AccountInfo)
    #[account(mut,
        seeds = [
            b"vault", 
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref(),
        ],
        bump
    )]
    /// CHECK: This is a derived vault PDA. It is only used as a token transfer authority and validated via seeds.
    pub vault: AccountInfo<'info>,

    /// Vault associated token account for USDT
    /// 
    /// AUDIT CRITICAL:
    /// - Source of USDT transfers
    /// - Ownership validated against vault PDA
    /// - Must have sufficient balance
    #[account(mut,
        associated_token::mint = mint,
        associated_token::authority = vault,
        associated_token::token_program = token_program,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Transaction payer account
    /// 
    /// AUDIT: Pays for transaction fees
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// System program for account operations
    /// 
    /// AUDIT: Required for account operations
    pub system_program: Program<'info, System>,
    
    /// Token program for token transfers
    /// 
    /// AUDIT: Required for token transfers
    pub token_program: Program<'info, Token>,
    
    /// Associated token program for ATA operations
    /// 
    /// AUDIT: Required for ATA operations
    pub associated_token_program: Program<'info, AssociatedToken>,

    // 👉 ProfitShareCache accounts and recipient ATAs will be passed in through `ctx.remaining_accounts`
    // ✅ Each ProfitShareCache will be verified dynamically using batch_id
    // ✅ Each recipient ATA (for token transfer) will be matched by Pubkey
}

/// Account validation context for executing refund share
/// 
/// AUDIT CRITICAL:
/// - Requires 3-of-5 multisig from execute_whitelist
/// - Transfers H2COIN from vault to recipients
/// - Uses pre-calculated refund share cache
/// 
/// SECURITY CHECKS:
/// - Investment info validation
/// - Cache validation (not expired, not executed)
/// - Vault balance validation
/// - Token transfer validation
/// - Multisig validation through remaining_accounts
#[derive(Accounts)]
#[instruction(batch_id: u16, year_index: u8)]
pub struct ExecuteRefundShare<'info> {
    /// InvestmentInfo account for validation
    /// 
    /// AUDIT CRITICAL:
    /// - Validates investment exists and is completed
    /// - Provides investment parameters
    /// - Used for vault PDA derivation
    #[account(
        seeds = [
            b"investment",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref()
        ],
        bump
    )]
    pub investment_info: Account<'info, InvestmentInfo>,

    /// RefundShareCache account for execution
    /// 
    /// AUDIT CRITICAL:
    /// - Must be mutable for execution tracking
    /// - PDA validation prevents spoofing
    /// - Contains refund distribution data
    #[account(mut,
        seeds = [
            b"refund_cache", 
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref(),
            batch_id.to_le_bytes().as_ref(),
            year_index.to_le_bytes().as_ref(),
        ],
        bump,
    )]
    pub cache: Account<'info, RefundShareCache>,

    /// H2COIN mint account for validation
    /// 
    /// AUDIT: Must match expected H2COIN mint address
    pub mint: Account<'info, Mint>,

    /// Vault PDA account for token transfers
    /// 
    /// AUDIT CRITICAL:
    /// - Derived from investment_id and version
    /// - Used as token transfer authority
    /// - No deserialization needed (AccountInfo)
    #[account(mut,
        seeds = [
            b"vault", 
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref(),
        ],
        bump
    )]
    /// CHECK: This is a derived vault PDA. It is only used as a token transfer authority and validated via seeds.
    pub vault: AccountInfo<'info>,

    /// Vault associated token account for H2COIN
    /// 
    /// AUDIT CRITICAL:
    /// - Source of H2COIN transfers
    /// - Ownership validated against vault PDA
    /// - Must have sufficient balance
    #[account(mut,
        associated_token::mint = mint,
        associated_token::authority = vault,
        associated_token::token_program = token_program,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Transaction payer account
    /// 
    /// AUDIT: Pays for transaction fees
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// System program for account operations
    /// 
    /// AUDIT: Required for account operations
    pub system_program: Program<'info, System>,
    
    /// Token program for token transfers
    /// 
    /// AUDIT: Required for token transfers
    pub token_program: Program<'info, Token>,
    
    /// Associated token program for ATA operations
    /// 
    /// AUDIT: Required for ATA operations
    pub associated_token_program: Program<'info, AssociatedToken>,

    // 👉 RefundShareCache accounts and recipient ATAs will be passed in through `ctx.remaining_accounts`
    // ✅ Each RefundShareCache will be verified dynamically using batch_id
    // ✅ Each recipient ATA (for token transfer) will be matched by Pubkey
}

/// Account validation context for depositing SOL to vault
/// 
/// AUDIT CRITICAL:
/// - Transfers SOL from payer to vault PDA
/// - Used for covering transaction fees
/// - No authorization required (anyone can deposit)
/// 
/// SECURITY CHECKS:
/// - Investment info validation
/// - Vault PDA validation
/// - SOL transfer validation
#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct DepositSolToVault<'info> {
    /// InvestmentInfo account for validation
    /// 
    /// AUDIT CRITICAL:
    /// - Validates investment exists and is active
    /// - Provides investment parameters
    /// - Used for vault PDA derivation
    #[account(
        seeds = [
            b"investment",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref()
        ],
        bump
    )]
    pub investment_info: Account<'info, InvestmentInfo>, 

    /// Vault PDA account for SOL storage
    /// 
    /// AUDIT CRITICAL:
    /// - Derived from investment_id and version
    /// - Destination for SOL transfers
    /// - No deserialization needed (AccountInfo)
    #[account(mut,
        seeds = [
            b"vault", 
            investment_info.investment_id.as_ref(), 
            investment_info.version.as_ref()
        ],
        bump
    )]
    /// CHECK: This vault PDA holds SOL, no deserialization needed
    pub vault: AccountInfo<'info>,

    /// Transaction payer account
    /// 
    /// AUDIT: Pays for SOL transfer and transaction fees
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// System program for SOL transfers
    /// 
    /// AUDIT: Required for SOL transfers
    pub system_program: Program<'info, System>,
}

/// Account validation context for depositing tokens to vault
/// 
/// AUDIT CRITICAL:
/// - Transfers USDT/H2COIN from payer to vault
/// - Used for profit/refund distributions
/// - No authorization required (anyone can deposit)
/// 
/// SECURITY CHECKS:
/// - Investment info validation
/// - Token mint validation (USDT/H2COIN only)
/// - Token account ownership validation
/// - Token transfer validation
#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct DepositTokenToVault<'info> {
    /// InvestmentInfo account for validation
    /// 
    /// AUDIT CRITICAL:
    /// - Validates investment exists and is active
    /// - Provides investment parameters
    /// - Used for vault PDA derivation
    #[account(
        seeds = [
            b"investment",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref()
        ],
        bump
    )]
    pub investment_info: Account<'info, InvestmentInfo>,

    /// Token mint account for validation
    /// 
    /// AUDIT: Must be USDT or H2COIN mint
    pub mint: Account<'info, Mint>,

    /// Source token account for transfers
    /// 
    /// AUDIT CRITICAL:
    /// - Source of token transfers to vault
    /// - Must be mutable for transfers
    /// - Ownership validated in instruction
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,

    /// Vault PDA account for token storage
    /// 
    /// AUDIT CRITICAL:
    /// - Derived from investment_id and version
    /// - Used as token account authority
    /// - No deserialization needed (AccountInfo)
    #[account(mut,
        seeds = [
            b"vault", 
            investment_info.investment_id.as_ref(), 
            investment_info.version.as_ref()
        ],
        bump
    )]
    /// CHECK: This vault PDA holds SOL, no deserialization needed
    pub vault: AccountInfo<'info>,

    /// Vault associated token account for destination
    /// 
    /// AUDIT CRITICAL:
    /// - Destination for token transfers
    /// - Ownership validated against vault PDA
    /// - Must be mutable for transfers
    #[account(mut,
        associated_token::mint = mint,
        associated_token::authority = vault,
        associated_token::token_program = token_program,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,    

    /// Transaction payer account
    /// 
    /// AUDIT: Pays for token transfers and transaction fees
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// System program for account operations
    /// 
    /// AUDIT: Required for account operations
    pub system_program: Program<'info, System>,
    
    /// Token program for token transfers
    /// 
    /// AUDIT: Required for token transfers
    pub token_program: Program<'info, Token>,
    
    /// Associated token program for ATA operations
    /// 
    /// AUDIT: Required for ATA operations
    pub associated_token_program: Program<'info, AssociatedToken>,
}

/// Account validation context for withdrawing from vault
/// 
/// AUDIT CRITICAL:
/// - Requires 3-of-5 multisig from withdraw_whitelist
/// - Transfers all vault funds to recipient
/// - Can transfer SOL, USDT, and H2COIN
/// 
/// SECURITY CHECKS:
/// - Investment info validation
/// - Recipient whitelist validation
/// - Vault balance validation
/// - Token transfer validation
/// - Multisig validation through remaining_accounts
#[derive(Accounts)]
pub struct WithdrawFromVault<'info> {
    /// InvestmentInfo account for validation
    /// 
    /// AUDIT CRITICAL:
    /// - Validates investment exists and is active
    /// - Provides investment parameters and withdraw whitelist
    /// - Used for vault PDA derivation
    #[account(
        seeds = [
            b"investment",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref()
        ],
        bump
    )]
    pub investment_info: Account<'info, InvestmentInfo>,

    /// USDT mint account for validation
    /// 
    /// AUDIT: Must match expected USDT mint address
    pub usdt_mint: Account<'info, Mint>,
    
    /// H2COIN mint account for validation
    /// 
    /// AUDIT: Must match expected H2COIN mint address
    pub hcoin_mint: Account<'info, Mint>,

    /// Vault PDA account for fund transfers
    /// 
    /// AUDIT CRITICAL:
    /// - Derived from investment_id and version
    /// - Source of all fund transfers
    /// - No deserialization needed (AccountInfo)
    #[account(mut,
        seeds = [
            b"vault", 
            investment_info.investment_id.as_ref(), 
            investment_info.version.as_ref()
        ],
        bump
    )]
    /// CHECK: This is a derived vault PDA. It is only used as a token transfer authority and validated via seeds.
    pub vault: AccountInfo<'info>,

    /// Vault associated token account for USDT
    /// 
    /// AUDIT CRITICAL:
    /// - Source of USDT transfers
    /// - Ownership validated against vault PDA
    /// - Must be mutable for transfers
    #[account(mut, 
        associated_token::mint = usdt_mint, 
        associated_token::authority = vault,
        associated_token::token_program = token_program,
    )]
    pub vault_usdt_account: Account<'info, TokenAccount>,

    /// Vault associated token account for H2COIN
    /// 
    /// AUDIT CRITICAL:
    /// - Source of H2COIN transfers
    /// - Ownership validated against vault PDA
    /// - Must be mutable for transfers
    #[account(mut, 
        associated_token::mint = hcoin_mint, 
        associated_token::authority = vault,
        associated_token::token_program = token_program,
    )]
    pub vault_hcoin_account: Account<'info, TokenAccount>,

    /// Recipient account for fund transfers
    /// 
    /// AUDIT CRITICAL:
    /// - Destination for all fund transfers
    /// - Must be in withdraw whitelist
    /// - Manually validated in instruction
    #[account(mut)]
    /// CHECK: recipient passed and manually verified
    pub recipient_account: UncheckedAccount<'info>,

    /// Recipient associated token account for USDT
    /// 
    /// AUDIT CRITICAL:
    /// - Destination for USDT transfers
    /// - Ownership validated against recipient
    /// - Created if needed
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = usdt_mint,
        associated_token::authority = recipient_account,
        associated_token::token_program = token_program,
    )]
    pub recipient_usdt_account: Account<'info, TokenAccount>,

    /// Recipient associated token account for H2COIN
    /// 
    /// AUDIT CRITICAL:
    /// - Destination for H2COIN transfers
    /// - Ownership validated against recipient
    /// - Created if needed
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = hcoin_mint,
        associated_token::authority = recipient_account,
        associated_token::token_program = token_program,
    )]
    pub recipient_hcoin_account: Account<'info, TokenAccount>,

    /// Transaction payer account
    /// 
    /// AUDIT: Pays for ATA creation and transaction fees
    /// CHECK: validated manually via 3-of-5 multisig inside instruction
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// Rent sysvar for account creation
    /// 
    /// AUDIT: Required for ATA initialization
    pub rent: Sysvar<'info, Rent>,
    
    /// System program for account operations
    /// 
    /// AUDIT: Required for account operations
    pub system_program: Program<'info, System>,
    
    /// Token program for token transfers
    /// 
    /// AUDIT: Required for token transfers
    pub token_program: Program<'info, Token>,
    
    /// Associated token program for ATA operations
    /// 
    /// AUDIT: Required for ATA operations
    pub associated_token_program: Program<'info, AssociatedToken>,
}
