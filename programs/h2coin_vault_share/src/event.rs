// programs/h2coin_vault_share/src/event.rs
//
// H2COIN VAULT SHARE PROGRAM - EVENT DEFINITIONS
// ==============================================
//
// AUDIT NOTES:
// This file defines all events emitted by the program for off-chain tracking.
// Events provide transparency and audit trail for all critical operations.
// Each event contains relevant data for monitoring and verification.
//
// EVENT CATEGORIES:
// - Investment info management events
// - Whitelist update events
// - Investment record events
// - Profit/refund estimation and execution events
// - Vault deposit and withdrawal events
//
// SECURITY CONSIDERATIONS:
// - Events provide transparency for all operations
// - Include signer information for multisig validation
// - Timestamps enable audit trail verification
// - Event data should not reveal sensitive information
// - Events enable off-chain monitoring and alerting
// - Complete audit trail for compliance and security
// - Events enable off-chain monitoring and alerting
// - Complete audit trail for compliance and security

use anchor_lang::prelude::*;

//
// 🔄 INVESTMENT MANAGEMENT EVENTS
//
// AUDIT: These events track investment configuration changes
// SECURITY: Include signer information for accountability
// TRANSPARENCY: Enable monitoring of investment lifecycle

/// Event emitted when a new investment info is initialized
/// 
/// AUDIT CRITICAL:
/// - Tracks creation of new investment configurations
/// - Includes vault PDA for fund tracking
/// - Records initializer for accountability
/// - Provides audit trail for investment setup
/// - Enables monitoring of new investment creation
/// 
/// SECURITY:
/// - Records who created the investment
/// - Includes vault address for fund tracking
/// - Timestamp for temporal context
/// - Version information for code tracking
#[event]
pub struct InvestmentInfoInitialized {
    /// Investment ID (fixed-length string)
    /// AUDIT: Unique identifier for the investment
    /// SECURITY: Enables tracking of specific investments
    pub investment_id: [u8; 15],
    
    /// Git commit version
    /// AUDIT: Links to specific code version
    /// SECURITY: Enables code audit trail
    pub version: [u8; 4],
    
    /// Vault PDA used to store funds
    /// AUDIT: Address for fund tracking
    /// SECURITY: Enables fund flow monitoring
    pub vault: Pubkey,
    
    /// The initializer of this investment info
    /// AUDIT: Accountable party for investment creation
    /// SECURITY: Records responsible party
    pub created_by: Pubkey,
    
    /// UNIX timestamp
    /// AUDIT: Creation time for audit trail
    /// SECURITY: Provides temporal context
    pub created_at: i64,
}

/// Event emitted when investment info is updated
/// 
/// AUDIT CRITICAL:
/// - Tracks modifications to investment configuration
/// - Includes all signers for multisig accountability
/// - Records specific changes made
/// - Provides audit trail for configuration updates
/// - Enables monitoring of configuration changes
/// 
/// SECURITY:
/// - Records all multisig signers for accountability
/// - Tracks specific configuration changes
/// - Prevents unauthorized modifications
/// - Enables change verification
#[event]
pub struct InvestmentUpdated {
    /// Investment ID (fixed-length string)
    /// AUDIT: Unique identifier for the investment
    /// SECURITY: Enables tracking of specific investments
    pub investment_id: [u8; 15],
    
    /// Git commit version
    /// AUDIT: Links to specific code version
    /// SECURITY: Enables code audit trail
    pub version: [u8; 4],
    
    /// New stage ratio configuration (if updated)
    /// AUDIT: Tracks refund percentage changes
    /// SECURITY: Records critical configuration changes
    pub new_stage_ratio: Option<[[u8; 10]; 3]>,
    
    /// New upper limit (if updated)
    /// AUDIT: Tracks investment limit changes
    /// SECURITY: Records risk management changes
    pub new_upper_limit: Option<u64>,
    
    /// The updater of this investment info
    /// AUDIT: Accountable party for the update
    /// SECURITY: Records responsible party
    pub updated_by: Pubkey,
    
    /// UNIX timestamp
    /// AUDIT: Update time for audit trail
    /// SECURITY: Provides temporal context
    pub updated_at: i64,
    
    /// All signers involved in the multisig operation
    /// AUDIT: Complete signer list for accountability
    /// SECURITY: Records all authorized parties
    pub signers: Vec<Pubkey>,
}

/// Event emitted when investment info is marked as completed
/// 
/// AUDIT CRITICAL:
/// - Tracks investment completion state change
/// - Includes all signers for multisig accountability
/// - Prevents further investment info modifications
/// - Provides audit trail for completion
/// - Enables monitoring of investment lifecycle
/// 
/// SECURITY:
/// - Records completion of investment phase
/// - Prevents further modifications
/// - Records all multisig signers
/// - Enables state transition verification
#[event]
pub struct InvestmentInfoCompleted {
    /// Investment ID (fixed-length string)
    /// AUDIT: Unique identifier for the investment
    /// SECURITY: Enables tracking of specific investments
    pub investment_id: [u8; 15],
    
    /// Git commit version
    /// AUDIT: Links to specific code version
    /// SECURITY: Enables code audit trail
    pub version: [u8; 4],
    
    /// The updater of this investment info
    /// AUDIT: Accountable party for completion
    /// SECURITY: Records responsible party
    pub updated_by: Pubkey,
    
    /// UNIX timestamp
    /// AUDIT: Completion time for audit trail
    /// SECURITY: Provides temporal context
    pub updated_at: i64,
    
    /// All signers involved in the multisig operation
    /// AUDIT: Complete signer list for accountability
    /// SECURITY: Records all authorized parties
    pub signers: Vec<Pubkey>,
}

/// Event emitted when investment info is deactivated
/// 
/// AUDIT CRITICAL:
/// - Tracks final deactivation of investment
/// - Includes all signers for multisig accountability
/// - Prevents all further operations
/// - Provides audit trail for deactivation
/// - Enables monitoring of investment termination
/// 
/// SECURITY:
/// - Records final state of investment
/// - Prevents all further operations
/// - Records all multisig signers
/// - Enables termination verification
#[event]
pub struct InvestmentInfoDeactivated {
    /// Investment ID (fixed-length string)
    /// AUDIT: Unique identifier for the investment
    /// SECURITY: Enables tracking of specific investments
    pub investment_id: [u8; 15],
    
    /// Git commit version
    /// AUDIT: Links to specific code version
    /// SECURITY: Enables code audit trail
    pub version: [u8; 4],
    
    /// The deactivator of this investment info
    /// AUDIT: Accountable party for deactivation
    /// SECURITY: Records responsible party
    pub deactivated_by: Pubkey,
    
    /// UNIX timestamp
    /// AUDIT: Deactivation time for audit trail
    /// SECURITY: Provides temporal context
    pub deactivated_at: i64,
    
    /// All signers involved in the multisig operation
    /// AUDIT: Complete signer list for accountability
    /// SECURITY: Records all authorized parties
    pub signers: Vec<Pubkey>,
}

//
// 📑 WHITELIST UPDATE EVENTS
//
// AUDIT: These events track whitelist membership changes
// SECURITY: Include signer information for accountability
// TRANSPARENCY: Enable monitoring of access control changes

/// Event emitted when whitelist members are updated
/// 
/// AUDIT CRITICAL:
/// - Tracks whitelist membership changes
/// - Includes all signers for multisig accountability
/// - Records specific wallet changes
/// - Provides audit trail for access control changes
/// - Enables monitoring of authorization changes
/// 
/// SECURITY:
/// - Records access control modifications
/// - Records all multisig signers
/// - Tracks specific wallet changes
/// - Enables authorization verification
#[event]
pub struct WhitelistUpdated {
    /// Investment ID (fixed-length string)
    /// AUDIT: Unique identifier for the investment
    /// SECURITY: Enables tracking of specific investments
    pub investment_id: [u8; 15],
    
    /// Git commit version
    /// AUDIT: Links to specific code version
    /// SECURITY: Enables code audit trail
    pub version: [u8; 4],
    
    /// Updated wallet address
    /// AUDIT: Specific wallet that was changed
    /// SECURITY: Records specific authorization change
    pub wallet: Pubkey,
    
    /// The updater of this whitelist
    /// AUDIT: Accountable party for the change
    /// SECURITY: Records responsible party
    pub updated_by: Pubkey,
    
    /// UNIX timestamp
    /// AUDIT: Update time for audit trail
    /// SECURITY: Provides temporal context
    pub updated_at: i64,
    
    /// All signers involved in the multisig operation
    /// AUDIT: Complete signer list for accountability
    /// SECURITY: Records all authorized parties
    pub signers: Vec<Pubkey>,
}

//
// 📄 INVESTMENT RECORD EVENTS
//
// AUDIT: These events track individual investment record operations
// SECURITY: Include signer information for accountability
// TRANSPARENCY: Enable monitoring of individual investments

/// Event emitted when a new investment record is added
/// 
/// AUDIT CRITICAL:
/// - Tracks creation of individual investment records
/// - Records investment amounts and recipient
/// - Includes all signers for multisig accountability
/// - Provides audit trail for investment tracking
/// - Enables monitoring of individual investments
/// 
/// SECURITY:
/// - Records individual investment details
/// - Records all multisig signers
/// - Tracks investment amounts
/// - Enables investment verification
#[event]
pub struct InvestmentRecordAdded {
    /// Investment ID (fixed-length string)
    /// AUDIT: Unique identifier for the investment
    /// SECURITY: Enables tracking of specific investments
    pub investment_id: [u8; 15],
    
    /// Git commit version
    /// AUDIT: Links to specific code version
    /// SECURITY: Enables code audit trail
    pub version: [u8; 4],
    
    /// Unique record identifier
    /// AUDIT: Links to specific investment record
    /// SECURITY: Enables record tracking
    pub record_id: u64,
    
    /// Account identifier (15 bytes)
    /// AUDIT: Links to specific account
    /// SECURITY: Enables account tracking
    pub account_id: [u8; 15],
    
    /// USDT investment amount
    /// AUDIT: Investment amount for profit calculations
    /// SECURITY: Records investment value
    pub amount_usdt: u64,
    
    /// The adder of this investment record
    /// AUDIT: Accountable party for record creation
    /// SECURITY: Records responsible party
    pub added_by: Pubkey,
    
    /// UNIX timestamp
    /// AUDIT: Creation time for audit trail
    /// SECURITY: Provides temporal context
    pub added_at: i64,
    
    /// All signers involved in the multisig operation
    /// AUDIT: Complete signer list for accountability
    /// SECURITY: Records all authorized parties
    pub signers: Vec<Pubkey>,
}

/// Event emitted when investment record wallet is updated
/// 
/// AUDIT CRITICAL:
/// - Tracks wallet address changes for investment records
/// - Includes all signers for multisig accountability
/// - Records specific wallet updates
/// - Provides audit trail for recipient changes
/// - Enables monitoring of recipient updates
/// 
/// SECURITY:
/// - Records recipient address changes
/// - Records all multisig signers
/// - Tracks specific account updates
/// - Enables recipient verification
#[event]
pub struct InvestmentRecordWalletUpdated {
    /// Investment ID (fixed-length string)
    /// AUDIT: Unique identifier for the investment
    /// SECURITY: Enables tracking of specific investments
    pub investment_id: [u8; 15],
    
    /// Git commit version
    /// AUDIT: Links to specific code version
    /// SECURITY: Enables code audit trail
    pub version: [u8; 4],
    
    /// Account identifier (15 bytes)
    /// AUDIT: Links to specific account
    /// SECURITY: Enables account tracking
    pub account_id: [u8; 15],
    
    /// New wallet address
    /// AUDIT: Updated recipient address
    /// SECURITY: Records new recipient
    pub new_wallet: Pubkey,
    
    /// The updater of this wallet
    /// AUDIT: Accountable party for the update
    /// SECURITY: Records responsible party
    pub updated_by: Pubkey,
    
    /// UNIX timestamp
    /// AUDIT: Update time for audit trail
    /// SECURITY: Provides temporal context
    pub updated_at: i64,
    
    /// All signers involved in the multisig operation
    /// AUDIT: Complete signer list for accountability
    /// SECURITY: Records all authorized parties
    pub signers: Vec<Pubkey>,
}

/// Event emitted when an investment record is revoked
/// 
/// AUDIT CRITICAL:
/// - Tracks revocation of investment records
/// - Includes all signers for multisig accountability
/// - Prevents revoked records from distributions
/// - Provides audit trail for record invalidation
/// - Enables monitoring of record revocations
/// 
/// SECURITY:
/// - Records record invalidation
/// - Records all multisig signers
/// - Prevents further operations on revoked records
/// - Enables revocation verification
#[event]
pub struct InvestmentRecordRevoked {
    /// Investment ID (fixed-length string)
    /// AUDIT: Unique identifier for the investment
    /// SECURITY: Enables tracking of specific investments
    pub investment_id: [u8; 15],
    
    /// Git commit version
    /// AUDIT: Links to specific code version
    /// SECURITY: Enables code audit trail
    pub version: [u8; 4],
    
    /// Unique record identifier
    /// AUDIT: Links to specific investment record
    /// SECURITY: Enables record tracking
    pub record_id: u64,
    
    /// The revoker of this investment record
    /// AUDIT: Accountable party for revocation
    /// SECURITY: Records responsible party
    pub revoked_by: Pubkey,
    
    /// UNIX timestamp
    /// AUDIT: Revocation time for audit trail
    /// SECURITY: Provides temporal context
    pub revoked_at: i64,
    
    /// All signers involved in the multisig operation
    /// AUDIT: Complete signer list for accountability
    /// SECURITY: Records all authorized parties
    pub signers: Vec<Pubkey>,
}

/// Event emitted when withdraw whitelist is updated
/// 
/// AUDIT CRITICAL:
/// - Tracks withdraw authorization changes
/// - Includes all signers for multisig accountability
/// - Records complete whitelist update
/// - Provides audit trail for withdrawal access
/// - Enables monitoring of withdrawal authorization
/// 
/// SECURITY:
/// - Records withdrawal authorization changes
/// - Records all multisig signers
/// - Tracks complete whitelist state
/// - Enables authorization verification
#[event]
pub struct WithdrawWhitelistUpdated {
    /// Investment ID (fixed-length string)
    /// AUDIT: Unique identifier for the investment
    /// SECURITY: Enables tracking of specific investments
    pub investment_id: [u8; 15],
    
    /// Git commit version
    /// AUDIT: Links to specific code version
    /// SECURITY: Enables code audit trail
    pub version: [u8; 4],
    
    /// Updated wallet addresses
    /// AUDIT: Complete new whitelist
    /// SECURITY: Records complete authorization state
    pub wallets: Vec<Pubkey>,
    
    /// The updater of this whitelist
    /// AUDIT: Accountable party for the change
    /// SECURITY: Records responsible party
    pub updated_by: Pubkey,
    
    /// UNIX timestamp
    /// AUDIT: Update time for audit trail
    /// SECURITY: Provides temporal context
    pub updated_at: i64,
    
    /// All signers involved in the multisig operation
    /// AUDIT: Complete signer list for accountability
    /// SECURITY: Records all authorized parties
    pub signers: Vec<Pubkey>,
}

//
// 📤 PROFIT/REFUND ESTIMATION AND EXECUTION EVENTS
//
// AUDIT: These events track profit and refund distribution operations
// SECURITY: Include signer information and amounts for transparency
// TRANSPARENCY: Enable monitoring of profit and refund distributions

/// Event emitted when profit share is estimated
/// 
/// AUDIT CRITICAL:
/// - Tracks profit distribution calculations
/// - Includes all signers for multisig accountability
/// - Records estimated amounts and gas costs
/// - Provides audit trail for profit calculations
/// - Enables monitoring of profit estimation
/// 
/// SECURITY:
/// - Records profit calculation details
/// - Records all multisig signers
/// - Tracks estimated amounts and costs
/// - Enables calculation verification
#[event]
pub struct ProfitShareEstimated {
    /// Each batch_id handles up to 30 investment records
    /// AUDIT: Links to specific batch of records
    /// SECURITY: Enables batch tracking
    pub batch_id: u16,
    
    /// Investment ID (fixed-length string)
    /// AUDIT: Unique identifier for the investment
    /// SECURITY: Enables tracking of specific investments
    pub investment_id: [u8; 15],
    
    /// Git commit version
    /// AUDIT: Links to specific code version
    /// SECURITY: Enables code audit trail
    pub version: [u8; 4],
    
    /// Total USDT amount to be distributed
    /// AUDIT: Total profit amount for transparency
    /// SECURITY: Records total distribution amount
    pub subtotal_profit_usdt: u64,
    
    /// Estimated SOL cost for execution
    /// AUDIT: Gas cost estimation for transparency
    /// SECURITY: Records estimated transaction costs
    pub subtotal_estimate_sol: u64,
    
    /// The estimator of this profit share
    /// AUDIT: Accountable party for estimation
    /// SECURITY: Records responsible party
    pub created_by: Pubkey,
    
    /// UNIX timestamp
    /// AUDIT: Estimation time for audit trail
    /// SECURITY: Provides temporal context
    pub created_at: i64,
    
    /// Number of entries in this batch
    /// AUDIT: Batch size for transparency
    /// SECURITY: Records batch complexity
    pub entry_count: u16,
    
    /// All signers involved in the multisig operation
    /// AUDIT: Complete signer list for accountability
    /// SECURITY: Records all authorized parties
    pub signers: Vec<Pubkey>,
}

/// Event emitted when refund share is estimated
/// 
/// AUDIT CRITICAL:
/// - Tracks refund distribution calculations
/// - Includes all signers for multisig accountability
/// - Records estimated amounts and gas costs
/// - Provides audit trail for refund calculations
/// - Enables monitoring of refund estimation
/// 
/// SECURITY:
/// - Records refund calculation details
/// - Records all multisig signers
/// - Tracks estimated amounts and costs
/// - Enables calculation verification
#[event]
pub struct RefundShareEstimated {
    /// Each batch_id handles up to 30 investment records
    /// AUDIT: Links to specific batch of records
    /// SECURITY: Enables batch tracking
    pub batch_id: u16,
    
    /// Investment ID (fixed-length string)
    /// AUDIT: Unique identifier for the investment
    /// SECURITY: Enables tracking of specific investments
    pub investment_id: [u8; 15],
    
    /// Git commit version
    /// AUDIT: Links to specific code version
    /// SECURITY: Enables code audit trail
    pub version: [u8; 4],
    
    /// Year index for this refund (0-9)
    /// AUDIT: Specific year for refund calculation
    /// SECURITY: Records refund timing
    pub year_index: u8,
    
    /// Total H2COIN amount to be distributed
    /// AUDIT: Total refund amount for transparency
    /// SECURITY: Records total distribution amount
    pub subtotal_refund_hcoin: u64,
    
    /// Estimated SOL cost for execution
    /// AUDIT: Gas cost estimation for transparency
    /// SECURITY: Records estimated transaction costs
    pub subtotal_estimate_sol: u64,
    
    /// The estimator of this refund share
    /// AUDIT: Accountable party for estimation
    /// SECURITY: Records responsible party
    pub created_by: Pubkey,
    
    /// UNIX timestamp
    /// AUDIT: Estimation time for audit trail
    /// SECURITY: Provides temporal context
    pub created_at: i64,
    
    /// Number of entries in this batch
    /// AUDIT: Batch size for transparency
    /// SECURITY: Records batch complexity
    pub entry_count: u16,
    
    /// All signers involved in the multisig operation
    /// AUDIT: Complete signer list for accountability
    /// SECURITY: Records all authorized parties
    pub signers: Vec<Pubkey>,
}

/// Event emitted when profit share is executed
/// 
/// AUDIT CRITICAL:
/// - Tracks actual profit distribution execution
/// - Includes all signers for multisig accountability
/// - Records actual transfer amounts
/// - Provides audit trail for profit execution
/// - Enables monitoring of profit distributions
/// 
/// SECURITY:
/// - Records actual distribution execution
/// - Records all multisig signers
/// - Tracks actual transfer amounts
/// - Enables execution verification
#[event]
pub struct ProfitShareExecuted {
    /// Batch identifier for this execution
    /// AUDIT: Links to specific batch of records
    /// SECURITY: Enables batch tracking
    pub batch_id: u16,
    
    /// Investment ID (fixed-length string)
    /// AUDIT: Unique identifier for the investment
    /// SECURITY: Enables tracking of specific investments
    pub investment_id: [u8; 15],
    
    /// Git commit version
    /// AUDIT: Links to specific code version
    /// SECURITY: Enables code audit trail
    pub version: [u8; 4],
    
    /// Total USDT amount actually transferred
    /// AUDIT: Actual distribution amount for transparency
    /// SECURITY: Records actual transfer amount
    pub total_transfer_usdt: u64,
    
    /// The executor of this profit share
    /// AUDIT: Accountable party for execution
    /// SECURITY: Records responsible party
    pub executed_by: Pubkey,
    
    /// UNIX timestamp
    /// AUDIT: Execution time for audit trail
    /// SECURITY: Provides temporal context
    pub executed_at: i64,
    
    /// All signers involved in the multisig operation
    /// AUDIT: Complete signer list for accountability
    /// SECURITY: Records all authorized parties
    pub signers: Vec<Pubkey>,
}

/// Event emitted when refund share is executed
/// 
/// AUDIT CRITICAL:
/// - Tracks actual refund distribution execution
/// - Includes all signers for multisig accountability
/// - Records actual transfer amounts
/// - Provides audit trail for refund execution
/// - Enables monitoring of refund distributions
/// 
/// SECURITY:
/// - Records actual distribution execution
/// - Records all multisig signers
/// - Tracks actual transfer amounts
/// - Enables execution verification
#[event]
pub struct RefundShareExecuted {
    /// Batch identifier for this execution
    /// AUDIT: Links to specific batch of records
    /// SECURITY: Enables batch tracking
    pub batch_id: u16,
    
    /// Investment ID (fixed-length string)
    /// AUDIT: Unique identifier for the investment
    /// SECURITY: Enables tracking of specific investments
    pub investment_id: [u8; 15],
    
    /// Git commit version
    /// AUDIT: Links to specific code version
    /// SECURITY: Enables code audit trail
    pub version: [u8; 4],
    
    /// Year index for this refund (0-9)
    /// AUDIT: Specific year for refund calculation
    /// SECURITY: Records refund timing
    pub year_index: u8,
    
    /// Total H2COIN amount actually transferred
    /// AUDIT: Actual distribution amount for transparency
    /// SECURITY: Records actual transfer amount
    pub total_transfer_hcoin: u64,
    
    /// The executor of this refund share
    /// AUDIT: Accountable party for execution
    /// SECURITY: Records responsible party
    pub executed_by: Pubkey,
    
    /// UNIX timestamp
    /// AUDIT: Execution time for audit trail
    /// SECURITY: Provides temporal context
    pub executed_at: i64,
    
    /// All signers involved in the multisig operation
    /// AUDIT: Complete signer list for accountability
    /// SECURITY: Records all authorized parties
    pub signers: Vec<Pubkey>,
}

//
// 💰 VAULT DEPOSIT AND WITHDRAWAL EVENTS
//
// AUDIT: These events track vault fund movements
// SECURITY: Include amounts and addresses for transparency
// TRANSPARENCY: Enable monitoring of fund movements

/// Event emitted when SOL is deposited to vault
/// 
/// AUDIT CRITICAL:
/// - Tracks SOL deposits to vault
/// - Records depositor for accountability
/// - Provides audit trail for fund inflows
/// - Enables monitoring of vault funding
/// 
/// SECURITY:
/// - Records fund inflows
/// - Records depositor identity
/// - Tracks deposit amounts
/// - Enables fund flow verification
#[event]
pub struct VaultDepositSolEvent {
    /// Investment ID (fixed-length string)
    /// AUDIT: Unique identifier for the investment
    /// SECURITY: Enables tracking of specific investments
    pub investment_id: [u8; 15],
    
    /// Git commit version
    /// AUDIT: Links to specific code version
    /// SECURITY: Enables code audit trail
    pub version: [u8; 4],
    
    /// Depositor wallet address
    /// AUDIT: Source of the deposit
    /// SECURITY: Records fund source
    pub from: Pubkey,
    
    /// SOL amount deposited (in lamports)
    /// AUDIT: Deposit amount for transparency
    /// SECURITY: Records deposit value
    pub amount_usdt: u64,
    
    /// UNIX timestamp
    /// AUDIT: Deposit time for audit trail
    /// SECURITY: Provides temporal context
    pub deposit_at: i64,
}

/// Event emitted when tokens are deposited to vault
/// 
/// AUDIT CRITICAL:
/// - Tracks token deposits to vault
/// - Records depositor and token type
/// - Provides audit trail for token inflows
/// - Enables monitoring of token funding
/// 
/// SECURITY:
/// - Records token inflows
/// - Records depositor identity
/// - Tracks token types and amounts
/// - Enables token flow verification
#[event]
pub struct VaultDepositTokenEvent {
    /// Investment ID (fixed-length string)
    /// AUDIT: Unique identifier for the investment
    /// SECURITY: Enables tracking of specific investments
    pub investment_id: [u8; 15],
    
    /// Git commit version
    /// AUDIT: Links to specific code version
    /// SECURITY: Enables code audit trail
    pub version: [u8; 4],
    
    /// Depositor wallet address
    /// AUDIT: Source of the deposit
    /// SECURITY: Records fund source
    pub from: Pubkey,
    
    /// Token mint address
    /// AUDIT: Type of token deposited
    /// SECURITY: Records token type
    pub mint: Pubkey,
    
    /// Token amount deposited
    /// AUDIT: Deposit amount for transparency
    /// SECURITY: Records deposit value
    pub amount: u64,
    
    /// UNIX timestamp
    /// AUDIT: Deposit time for audit trail
    /// SECURITY: Provides temporal context
    pub deposit_at: i64,
}

/// Event emitted when funds are withdrawn from vault
/// 
/// AUDIT CRITICAL:
/// - Tracks vault withdrawals
/// - Includes all signers for multisig accountability
/// - Records all token types and amounts
/// - Provides audit trail for fund outflows
/// - Enables monitoring of vault withdrawals
/// 
/// SECURITY:
/// - Records fund outflows
/// - Records all multisig signers
/// - Tracks all token types and amounts
/// - Enables withdrawal verification
#[event]
pub struct VaultTransferred {
    /// Investment ID (fixed-length string)
    /// AUDIT: Unique identifier for the investment
    /// SECURITY: Enables tracking of specific investments
    pub investment_id: [u8; 15],
    
    /// Git commit version
    /// AUDIT: Links to specific code version
    /// SECURITY: Enables code audit trail
    pub version: [u8; 4],
    
    /// Recipient wallet address
    /// AUDIT: Destination of the withdrawal
    /// SECURITY: Records fund destination
    pub recipient: Pubkey,
    
    /// USDT amount withdrawn
    /// AUDIT: USDT withdrawal amount for transparency
    /// SECURITY: Records USDT outflow
    pub usdt_amount: u64,
    
    /// H2COIN amount withdrawn
    /// AUDIT: H2COIN withdrawal amount for transparency
    /// SECURITY: Records H2COIN outflow
    pub hcoin_amount: u64,
    
    /// SOL amount withdrawn
    /// AUDIT: SOL withdrawal amount for transparency
    /// SECURITY: Records SOL outflow
    pub sol_amount: u64,
    
    /// The executor of this withdrawal
    /// AUDIT: Accountable party for withdrawal
    /// SECURITY: Records responsible party
    pub executed_by: Pubkey,
    
    /// UNIX timestamp
    /// AUDIT: Withdrawal time for audit trail
    /// SECURITY: Provides temporal context
    pub executed_at: i64,
    
    /// All signers involved in the multisig operation
    /// AUDIT: Complete signer list for accountability
    /// SECURITY: Records all authorized parties
    pub signers: Vec<Pubkey>,
}