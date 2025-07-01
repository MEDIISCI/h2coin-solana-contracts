// programs/h2coin_vault_share/src/error.rs
//
// H2COIN VAULT SHARE PROGRAM - ERROR DEFINITIONS
// ==============================================
//
// AUDIT NOTES:
// This file defines all custom error codes used throughout the program.
// Each error represents a specific validation failure or security check.
// Proper error handling is critical for security and user experience.
//
// ERROR CATEGORIES:
// - General validation errors
// - Investment info validation errors
// - Investment record validation errors
// - Whitelist validation errors
// - Token validation errors
// - Profit/refund cache errors
// - Vault operation errors
//
// SECURITY CONSIDERATIONS:
// - Error messages should not reveal sensitive information
// - Error codes must be unique and descriptive
// - Proper error handling prevents program exploitation
// - Error categorization helps with debugging and monitoring
// - Error codes should be consistent across similar operations

use anchor_lang::prelude::*;

/// Custom error codes for the H2COIN Vault Share program
/// 
/// AUDIT CRITICAL:
/// - Each error represents a specific security validation failure
/// - Error messages should not reveal sensitive information
/// - Error codes must be unique and descriptive
/// - Proper error handling prevents program exploitation
/// - Error categorization helps with security auditing
#[error_code]
pub enum ErrorCode {
    // ────────────────────────────────
    // 📦 GENERAL ERRORS
    // ────────────────────────────────
    // AUDIT: These errors cover fundamental validation failures
    // SECURITY: Critical for preventing basic attacks and ensuring data integrity
    
    /// Mathematical overflow detected during calculations
    /// 
    /// AUDIT CRITICAL:
    /// - Prevents integer overflow attacks
    /// - Critical for financial calculations
    /// - Must be checked in all arithmetic operations
    /// - Prevents calculation errors that could lead to fund loss
    /// - Common attack vector in DeFi protocols
    #[msg("🔴 Math overflow.")]
    NumericalOverflow,

    /// Unauthorized signer or insufficient signatures for multisig operation
    /// 
    /// AUDIT CRITICAL:
    /// - Core security validation for all multisig operations
    /// - Prevents unauthorized access to critical functions
    /// - Must validate 3-of-5 signature requirement
    /// - Critical for protecting vault funds and configuration
    /// - Prevents single point of failure attacks
    #[msg("🔴 Unauthorized signer or not enough signatures.")]
    UnauthorizedSigner,

    /// Withdraw whitelist size validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures whitelist has proper size for security
    /// - Prevents empty or oversized whitelists
    /// - Must be between 1 and 5 entries
    /// - Prevents DoS through oversized whitelist validation
    /// - Ensures proper multisig configuration
    #[msg("🔴 Withdraw whitelist must be between 1 and 5 entries.")]
    WhitelistLengthInvalid,

    // ────────────────────────────────
    // 🏗️ INVESTMENT INFO ERRORS
    // ────────────────────────────────
    // AUDIT: These errors validate investment configuration
    // SECURITY: Critical for ensuring proper investment setup and preventing configuration attacks
    
    /// Investment ID length validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures consistent ID format across all operations
    /// - Prevents ID manipulation attacks
    /// - Must be exactly 15 bytes
    /// - Prevents buffer overflow and format confusion
    /// - Ensures proper PDA derivation
    #[msg("🔴 Investment ID is too long or too short, must be 15 bytes.")]
    InvalidInvestmentIdLength,

    /// Stage ratio array length validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures proper stage ratio configuration
    /// - Prevents array out-of-bounds access
    /// - Each stage must have exactly 10 elements
    /// - Prevents memory corruption and calculation errors
    /// - Ensures consistent refund distribution structure
    #[msg("🔴 stage_ratio length per stage must be exactly 10 elements.")]
    InvalidStageRatioLength,

    /// Stage ratio value validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures percentage values are within valid range
    /// - Prevents invalid refund calculations
    /// - Must be between 0 and 100
    /// - Prevents mathematical errors in distribution
    /// - Ensures proper percentage representation
    #[msg("🔴 Stage ratio value must be between 0 and 100.")]
    InvalidStageRatioValue,

    /// Stage ratio sum validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures total percentage doesn't exceed 100%
    /// - Prevents over-allocation of refunds
    /// - Sum for a single stage must not exceed 100
    /// - Prevents fund exhaustion attacks
    /// - Ensures proper allocation distribution
    #[msg("🔴 Stage ratio sum for a single stage must not exceed 100.")]
    InvalidStageRatioSum,

    /// Stage ratio contiguity validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures non-zero values are contiguous
    /// - Prevents gaps in refund distribution
    /// - Once non-zero values begin, must be contiguous
    /// - Prevents confusion in refund timing
    /// - Ensures proper refund schedule
    #[msg("🔴 Stage ratio must be contiguous once non-zero values begin.")]
    NonContiguousStage,

    /// Empty stage ratio validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures at least one stage has non-zero ratios
    /// - Prevents investment with no refund allocation
    /// - At least one stage must have non-zero values
    /// - Prevents investments with no refund mechanism
    /// - Ensures proper investment structure
    #[msg("🔴 All stage ratio values are zero.")]
    EmptyStageRatio,

    /// Investment info account not found
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures investment info exists before operations
    /// - Prevents operations on non-existent investments
    /// - Must validate account existence
    /// - Prevents operations on uninitialized investments
    /// - Ensures proper investment lifecycle
    #[msg("🔴 Investment info not exists.")]
    InvestmentInfoNotFound,

    /// Investment info completion state validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures investment is completed before certain operations
    /// - Prevents premature operations
    /// - Investment must be in completed state
    /// - Prevents operations on active investments
    /// - Ensures proper state transitions
    #[msg("🔴 Investment info has not completed yet.")]
    InvestmentInfoNotCompleted,

    /// Investment info already completed validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Prevents double completion of investments
    /// - Ensures state transitions are valid
    /// - Investment cannot be completed twice
    /// - Prevents state manipulation attacks
    /// - Ensures idempotency of completion
    #[msg("🔴 Investment info has completed already.")]
    InvestmentInfoHasCompleted,

    /// Investment info deactivation state validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Prevents operations on deactivated investments
    /// - Ensures final state is respected
    /// - Deactivated investments cannot be modified
    /// - Prevents operations on terminated investments
    /// - Ensures proper investment lifecycle
    #[msg("🔴 Investment info has been deactivated and can no longer be modified.")]
    InvestmentInfoDeactivated,

    /// Investment info PDA validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures correct PDA derivation
    /// - Prevents address spoofing attacks
    /// - Derived PDA must match expected address
    /// - Prevents unauthorized account access
    /// - Ensures proper account ownership
    #[msg("🔴 The derived PDA does not match the expected investment info PDA.")]
    InvalidInvestmentInfoPda,

    // ────────────────────────────────
    // 📄 INVESTMENT RECORDS ERRORS
    // ────────────────────────────────
    // AUDIT: These errors validate investment record operations
    // SECURITY: Critical for ensuring proper record management and preventing record manipulation
    
    /// Record ID mismatch validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures record ID consistency
    /// - Prevents record manipulation attacks
    /// - Record ID must match expected value
    /// - Prevents record spoofing
    /// - Ensures proper record identification
    #[msg("🔴 Record ID mismatch.")]
    RecordIdMismatch,
    
    /// Account ID mismatch validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures account ID consistency
    /// - Prevents account spoofing attacks
    /// - Account ID must match expected value
    /// - Prevents unauthorized account access
    /// - Ensures proper account ownership
    #[msg("🔴 Account ID mismatch.")]
    AccountIdMismatch,

    /// Account ID length validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures consistent account ID format
    /// - Prevents ID manipulation attacks
    /// - Must be exactly 15 bytes
    /// - Prevents buffer overflow and format confusion
    /// - Ensures proper account identification
    #[msg("🔴 Account ID is too long or too short, must be 15 bytes.")]
    InvalidAccountIdLength,

    /// Investment record not found
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures record exists before operations
    /// - Prevents operations on non-existent records
    /// - Must validate record existence
    /// - Prevents operations on uninitialized records
    /// - Ensures proper record lifecycle
    #[msg("🔴 Investment record not found.")]
    InvestmentRecordNotFound,

    /// Investment record PDA validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures correct PDA derivation for records
    /// - Prevents address spoofing attacks
    /// - Derived PDA must match expected address
    /// - Prevents unauthorized record access
    /// - Ensures proper record ownership
    #[msg("🔴 The derived PDA does not match the expected investment record PDA.")]
    InvalidRecordPda,

    /// No investment records in remaining accounts
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures records are provided for batch operations
    /// - Prevents empty batch processing
    /// - Must have at least one record
    /// - Prevents silent operation failures
    /// - Ensures proper batch validation
    #[msg("🔴 There are not investment records in remainingAccounts.")]
    NoRecordsInRemainingAccounts,

    /// Record already revoked validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Prevents double revocation of records
    /// - Ensures record state consistency
    /// - Record cannot be revoked twice
    /// - Prevents state manipulation attacks
    /// - Ensures idempotency of revocation
    #[msg("🔴 This record has been revoked already.")]
    RecordAlreadyRevoked,

    /// No records updated validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures at least one record was updated
    /// - Prevents silent operation failures
    /// - Must have successful updates
    /// - Prevents operations with no effect
    /// - Ensures proper operation validation
    #[msg("🔴 No record has been updated.")]
    NoRecordsUpdated,
    
    // ────────────────────────────────
    // 📋 WHITELIST ERRORS
    // ────────────────────────────────
    // AUDIT: These errors validate whitelist operations
    // SECURITY: Critical for ensuring proper multisig configuration and preventing whitelist manipulation
    
    /// Whitelist size validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures whitelist has exactly 5 members
    /// - Required for 3-of-5 multisig security
    /// - Prevents invalid multisig configurations
    /// - Prevents DoS through oversized whitelists
    /// - Ensures consistent security model
    #[msg("🔴 Whitelist must contain exactly 5 members")]
    WhitelistMustBeFive,

    /// Whitelist duplicate address validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Prevents duplicate addresses in whitelist
    /// - Ensures unique multisig members
    /// - Prevents multisig manipulation
    /// - Prevents concentration of power
    /// - Ensures proper multisig diversity
    #[msg("🔴 Target address already exists in whitelist")]
    WhitelistAddressExists,

    /// Whitelist address not found validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures address exists before replacement
    /// - Prevents unauthorized whitelist modifications
    /// - Address must exist to be replaced
    /// - Prevents whitelist manipulation attacks
    /// - Ensures proper whitelist management
    #[msg("🔴 Address to be replaced not found in whitelist")]
    WhitelistAddressNotFound,

    // ────────────────────────────────
    // 💰 TOKEN VALIDATION ERRORS
    // ────────────────────────────────
    // AUDIT: These errors validate token operations
    // SECURITY: Critical for ensuring proper token handling and preventing token theft
    
    /// Vault PDA validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures correct vault PDA derivation
    /// - Prevents vault spoofing attacks
    /// - Vault PDA must match expected address
    /// - Prevents unauthorized vault access
    /// - Ensures proper vault ownership
    #[msg("🔴 Invalid Vault PDA")]
    InvalidVaultPda,

    /// Vault token account mint validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures vault holds correct token types
    /// - Prevents unauthorized token operations
    /// - Must be USDT or H2COIN only
    /// - Prevents mixing of unauthorized tokens
    /// - Ensures proper token segregation
    #[msg("🔴 Vault token account mint is not USDT or H2coin.")]
    InvalidTokenMint,

    /// Vault associated token account validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures correct ATA derivation
    /// - Prevents ATA spoofing attacks
    /// - ATA must match expected address
    /// - Prevents unauthorized token account access
    /// - Ensures proper token account ownership
    #[msg("🔴 The provided vault ATA does not match the expected associated token address.")]
    InvalidVaultAta,

    /// Recipient token account mint validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures recipient receives correct token type
    /// - Prevents token type confusion attacks
    /// - Must be USDT or H2COIN only
    /// - Prevents wrong token transfers
    /// - Ensures proper token routing
    #[msg("🔴 Recipient token account mint is not USDT or H2coin.")]
    InvalidRecipientMint,

    /// Vault token account owner validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures vault owns the token account
    /// - Prevents unauthorized token transfers
    /// - Owner must be vault PDA
    /// - Prevents token theft from vault
    /// - Ensures proper vault control
    #[msg("🔴 Vault token account owner mismatch.")]
    InvalidVaultOwner,

    /// From token account owner validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures correct source account ownership
    /// - Prevents unauthorized token transfers
    /// - Owner must match expected signer
    /// - Prevents token theft from users
    /// - Ensures proper authorization
    #[msg("🔴 From token account owner mismatch.")]
    InvalidFromOwner,

    /// Recipient token account owner validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures correct destination account ownership
    /// - Prevents token theft attacks
    /// - Owner must match expected recipient
    /// - Prevents unauthorized token routing
    /// - Ensures proper recipient control
    #[msg("🔴 Recipient token account owner mismatch.")]
    InvalidRecipientOwner,

    // ────────────────────────────────
    // 📈 PROFIT SHARE CACHE ERRORS
    // ────────────────────────────────
    // AUDIT: These errors validate profit distribution operations
    // SECURITY: Critical for ensuring proper profit distribution and preventing financial attacks
    
    /// Investment type validation failure for profit sharing
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures only Standard investments can have profit sharing
    /// - Prevents profit sharing on CSR investments
    /// - Investment type must be Standard
    /// - Prevents unauthorized profit distributions
    /// - Ensures proper investment type handling
    #[msg("🔴 Investment type must be `Standard`.")]
    StandardOnly,

    /// Total share validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures profit distribution totals match expected values
    /// - Prevents mathematical errors in distribution
    /// - Total share must match calculated amount
    /// - Prevents fund exhaustion or under-distribution
    /// - Ensures proper profit allocation
    #[msg("🔴 Total share does not match.")]
    TotalShareMismatch,

    /// Profit share cache not found
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures cache exists before execution
    /// - Prevents execution without estimation
    /// - Cache must exist for execution
    /// - Prevents unauthorized profit distributions
    /// - Ensures proper profit distribution workflow
    #[msg("🔴 Profit share cache not found.")]
    ProfitCacheNotFound,
    
    /// Profit share cache expiration validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Prevents execution of stale cache data
    /// - Forces re-estimation after expiration
    /// - Cache must not be older than 25 days
    /// - Prevents execution of outdated calculations
    /// - Ensures fresh profit distribution data
    #[msg("🔴 Profit share cache has expired (older than 25 days)")]
    ProfitCacheExpired,

    /// Profit already executed validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Prevents double execution of profit distributions
    /// - Ensures idempotency of operations
    /// - Profit cannot be executed twice
    /// - Prevents double-spending attacks
    /// - Ensures proper profit distribution lifecycle
    #[msg("🔴 Profit already executed.")]
    ProfitAlreadyExecuted,

    /// Insufficient USDT balance in vault
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures vault has sufficient funds for distribution
    /// - Prevents failed token transfers
    /// - Vault must have enough USDT
    /// - Prevents partial distribution failures
    /// - Ensures proper fund availability
    #[msg("🔴 Insufficient USDT token balance in vault")]
    InsufficientTokenBalance,

    /// Insufficient SOL balance in vault
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures vault has sufficient SOL for transaction fees
    /// - Prevents failed transactions due to insufficient gas
    /// - Vault must have enough SOL for estimated costs
    /// - Prevents transaction failures
    /// - Ensures proper gas cost coverage
    #[msg("🔴 Insufficient SOL balance in vault to cover estimated gas cost")]
    InsufficientSolBalance,

    /// Invalid total USDT amount
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures valid profit amounts for distribution
    /// - Prevents zero or undefined distributions
    /// - Total USDT must be greater than 0
    /// - Prevents meaningless distributions
    /// - Ensures proper profit amounts
    #[msg("🔴 Total USDT cannot be 0 or undefined")]
    InvalidTotalUsdt,

    /// Batch ID mismatch validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures batch ID consistency across operations
    /// - Prevents batch manipulation attacks
    /// - Batch ID must match expected value
    /// - Prevents cross-batch confusion
    /// - Ensures proper batch identification
    #[msg("🔴 Batch id does not match expected number.")]
    BatchIdMismatch,

    /// Too many records loaded validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Prevents DoS through oversized transactions
    /// - Limits compute unit usage
    /// - Must not exceed MAX_ENTRIES_PER_BATCH
    /// - Prevents transaction size overflow
    /// - Ensures proper batch size limits
    #[msg("🔴 Too many records have been loaded.")]
    TooManyRecordsLoaded,

    /// Missing associated token account
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures recipient has token account for transfers
    /// - Prevents failed token transfers
    /// - ATA must exist for recipient
    /// - Prevents transfer failures
    /// - Ensures proper recipient setup
    #[msg("🔴 Missing associated token account.")]
    MissingAssociatedTokenAccount,

    /// Profit cache PDA validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures correct PDA derivation for profit cache
    /// - Prevents cache spoofing attacks
    /// - Derived PDA must match expected address
    /// - Prevents unauthorized cache access
    /// - Ensures proper cache ownership
    #[msg("🔴 The derived PDA does not match the expected profit cache PDA.")]
    InvalidProfitCachePda,

    /// Basis point ratio overflow validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Prevents mathematical overflow in ratio calculations
    /// - Ensures valid percentage calculations
    /// - Ratio must not overflow u16
    /// - Prevents calculation errors
    /// - Ensures proper mathematical precision
    #[msg("🔴 Bp ratio overflowed u16.")]
    BpRatioOverflow,

    /// Duplicate record ID validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Prevents duplicate records in batch processing
    /// - Ensures unique record processing
    /// - Record IDs must be unique within batch
    /// - Prevents double processing of records
    /// - Ensures proper record uniqueness
    #[msg("🔴 Duplicate record_id detected in input records.")]
    DuplicateRecord,

    // ────────────────────────────────
    // 📈 REFUND SHARE CACHE ERRORS
    // ────────────────────────────────
    // AUDIT: These errors validate refund distribution operations
    // SECURITY: Critical for ensuring proper refund distribution and preventing financial attacks
    
    /// Refund share cache expiration validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Prevents execution of stale cache data
    /// - Forces re-estimation after expiration
    /// - Cache must not be older than 25 days
    /// - Prevents execution of outdated calculations
    /// - Ensures fresh refund distribution data
    #[msg("🔴 Refund share cache has expired (older than 25 days)")]
    RefundCacheExpired,

    /// Refund share cache not found
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures cache exists before execution
    /// - Prevents execution without estimation
    /// - Cache must exist for execution
    /// - Prevents unauthorized refund distributions
    /// - Ensures proper refund distribution workflow
    #[msg("🔴 Refund share cache not found.")]
    RefundCacheNotFound,

    /// Refund period validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures refund is within valid year range
    /// - Prevents invalid refund periods
    /// - Year index must be between START_YEAR_INDEX and MAX_YEAR_INDEX
    /// - Prevents premature or late refunds
    /// - Ensures proper refund timing
    #[msg("🔴 Refund period is invalid")]
    RefundPeriodInvalid,

    /// Refund already executed validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Prevents double execution of refund distributions
    /// - Ensures idempotency of operations
    /// - Refund cannot be executed twice
    /// - Prevents double-spending attacks
    /// - Ensures proper refund distribution lifecycle
    #[msg("🔴 Refund share already executed.")]
    RefundAlreadyExecuted,

    /// Invalid recipient associated token account
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures correct ATA derivation for recipient
    /// - Prevents ATA spoofing attacks
    /// - ATA must match expected address
    /// - Prevents unauthorized token account access
    /// - Ensures proper token account ownership
    #[msg("🔴 Invalid Recipient ATA")]
    InvalidRecipientATA,

    /// Invalid total H2COIN amount
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures valid refund amounts for distribution
    /// - Prevents zero or undefined distributions
    /// - Total H2COIN must be greater than 0
    /// - Prevents meaningless distributions
    /// - Ensures proper refund amounts
    #[msg("🔴 Total H2coin cannot be 0 or undefined")]
    InvalidTotalH2coin,

    /// Refund cache PDA validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures correct PDA derivation for refund cache
    /// - Prevents cache spoofing attacks
    /// - Derived PDA must match expected address
    /// - Prevents unauthorized cache access
    /// - Ensures proper cache ownership
    #[msg("🔴 The derived PDA does not match the expected refund cache PDA.")]
    InvalidRefundCachePda,

    // ────────────────────────────────
    // 📈 DEPOSIT / WITHDRAW ERRORS
    // ────────────────────────────────
    // AUDIT: These errors validate vault deposit and withdrawal operations
    // SECURITY: Critical for ensuring proper fund management and preventing unauthorized access
    
    /// Empty whitelist validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures whitelist has at least one member
    /// - Prevents operations with empty whitelist
    /// - Must have at least one authorized member
    /// - Prevents operations without authorization
    /// - Ensures proper access control
    #[msg("🔴 Whitelist must contain at least one wallet.")]
    EmptyWhitelist,

    /// Invalid recipient wallet address
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures valid recipient address format
    /// - Prevents transfers to invalid addresses
    /// - Address must be valid Pubkey
    /// - Prevents fund loss to invalid addresses
    /// - Ensures proper address validation
    #[msg("🔴 Invalid Recipient wallet Address")]
    InvalidRecipientAddress,

    /// Unauthorized recipient validation failure
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures recipient is in withdraw whitelist
    /// - Prevents unauthorized withdrawals
    /// - Recipient must be authorized
    /// - Prevents fund theft
    /// - Ensures proper withdrawal authorization
    #[msg("🔴 Recipient wallet is not in the withdraw whitelist.")]
    UnauthorizedRecipient,

    /// Invalid associated token account
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures correct ATA derivation
    /// - Prevents ATA spoofing attacks
    /// - ATA must match expected address
    /// - Prevents unauthorized token account access
    /// - Ensures proper token account ownership
    #[msg("🔴 Invalid associated token account.")]
    InvalidAssociatedTokenAccount,

    /// Invalid token program ID
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures correct token program is used
    /// - Prevents unauthorized token operations
    /// - Must be Token 2020 (Legacy) program
    /// - Prevents use of unauthorized token programs
    /// - Ensures proper token program validation
    #[msg("🔴 Invalid token program ID. Must be Token 2020(Legacy).")]
    InvalidTokenProgramID,

    /// Invalid associated token program ID
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures correct ATA program is used
    /// - Prevents unauthorized ATA operations
    /// - Must be Associated Token Program
    /// - Prevents use of unauthorized ATA programs
    /// - Ensures proper ATA program validation
    #[msg("🔴 Invalid associated token program ID.")]
    InvalidAssociatedTokenProgramID,
}
