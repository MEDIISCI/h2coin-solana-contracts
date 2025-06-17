// programs/h2coin_vault_share/src/error.rs

use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    // ────────────────────────────────
    // 📦 General Errors
    // ────────────────────────────────
    
    #[msg("🔴 Math overflow.")]
    NumericalOverflow,

    #[msg("🔴 Unauthorized signer or not enough signatures.")]
    UnauthorizedSigner,

    #[msg("🔴 Withdraw whitelist must be between 1 and 5 entries.")]
    WhitelistLengthInvalid,

    // ────────────────────────────────
    // 🏗️ Investment info
    // ────────────────────────────────
    #[msg("🔴 Investment ID is too long or too short, must be 15 bytes.")]
    InvalidInvestmentIdLength,

    #[msg("🔴 stage_ratio length per stage must be exactly 10 elements.")]
    InvalidStageRatioLength,

    #[msg("🔴 Stage ratio value must be between 0 and 100.")]
    InvalidStageRatioValue,

    #[msg("🔴 Stage ratio sum for a single stage must not exceed 100.")]
    InvalidStageRatioSum,

    #[msg("🔴 Stage ratio must be contiguous once non-zero values begin.")]
    NonContiguousStage,

    #[msg("🔴 All stage ratio values are zero.")]
    EmptyStageRatio,

    #[msg("🔴 Investment info not exists.")]
    InvestmentInfoNotFound,

    #[msg("🔴 Investment info has not completed yet.")]
    InvestmentInfoNotCompleted,

    #[msg("🔴 Investment info has completed already.")]
    InvestmentInfoHasCompleted,

    #[msg("🔴 Investment info has been deactivated and can no longer be modified.")]
    InvestmentInfoDeactivated,

    #[msg("🔴 The derived PDA does not match the expected investment info PDA.")]
    InvalidInvestmentInfoPda,


    // ────────────────────────────────
    // 📄 Investment Records
    // ────────────────────────────────
    #[msg("🔴 Record ID mismatch.")]
    RecordIdMismatch,
    
    #[msg("🔴 Account ID mismatch.")]
    AccountIdMismatch,

    #[msg("🔴 Account ID is too long or too short, must be 15 bytes.")]
    InvalidAccountIdLength,

    #[msg("🔴 Investment record not found.")]
    InvestmentRecordNotFound,

    #[msg("🔴 The derived PDA does not match the expected investment record PDA.")]
    InvalidRecordPda,

    #[msg("🔴 There are not investment records in remainingAccounts.")]
    NoRecordsInRemainingAccounts,

    #[msg("🔴 This record has been revoked already.")]
    RecordAlreadyRevoked,

    #[msg("🔴 No record has been updated.")]
    NoRecordsUpdated,
    
    // ────────────────────────────────
    // 📋 Whitelist Errors
    // ────────────────────────────────
    #[msg("🔴 Whitelist must contain exactly 5 members")]
    WhitelistMustBeFive,

    #[msg("🔴 Target address already exists in whitelist")]
    WhitelistAddressExists,

    #[msg("🔴 Address to be replaced not found in whitelist")]
    WhitelistAddressNotFound,

    // ────────────────────────────────
    // 💰 Token Validation
    // ────────────────────────────────
    #[msg("🔴 Invalid Vault PDA")]
    InvalidVaultPda,

    #[msg("🔴 Vault token account mint is not USDT")]
    InvalidTokenMint,

    #[msg("🔴 The provided vault ATA does not match the expected associated token address.")]
    InvalidVaultAta,

    #[msg("🔴 Recipient token account mint is not USDT or H2coin")]
    InvalidRecipientMint,

    #[msg("🔴 Vault token account owner mismatch.")]
    InvalidVaultTokenAccount,

    // ────────────────────────────────
    // 📈 Profit Share Cache
    // ────────────────────────────────
    #[msg("🔴 Investment type must be `Standard`.")]
    StandardOnly,

    #[msg("🔴 Total share does not match.")]
    TotalShareMismatch,

    #[msg("🔴 Profit share cache not found.")]
    ProfitCacheNotFound,
    
    #[msg("🔴 Profit share cache has expired (older than 25 days)")]
    ProfitCacheExpired,

    #[msg("🔴 Profit already executed.")]
    ProfitAlreadyExecuted,

    #[msg("🔴 Insufficient USDT token balance in vault")]
    InsufficientTokenBalance,

    #[msg("🔴 Insufficient SOL balance in vault to cover estimated gas cost")]
    InsufficientSolBalance,

    #[msg("🔴 Total USDT cannot be 0 or undefined")]
    InvalidTotalUsdt,

    #[msg("🔴 Batch id does not match expected number.")]
    BatchIdMismatch,

    #[msg("🔴 Too many records have been loaded.")]
    TooManyRecordsLoaded,

    #[msg("🔴 Missing associated token account.")]
    MissingAssociatedTokenAccount,

    #[msg("🔴 The derived PDA does not match the expected profit cache PDA.")]
    InvalidProfitCachePda,

    #[msg("🔴 Bp ratio overflowed u16.")]
    BpRatioOverflow,

    #[msg("🔴 Duplicate record_id detected in input records.")]
    DuplicateRecord,


    // ────────────────────────────────
    // 📈 Refund Share Cache
    // ────────────────────────────────
    #[msg("🔴 Refund share cache has expired (older than 25 days)")]
    RefundCacheExpired,

    #[msg("🔴 Refund share cache not found.")]
    RefundCacheNotFound,

    #[msg("🔴 Refund period is invalid")]
    RefundPeriodInvalid,

    #[msg("🔴 Refund share already executed.")]
    RefundAlreadyExecuted,

    #[msg("🔴 Invalid Recipient ATA")]
    InvalidRecipientATA,

    #[msg("🔴 Total H2coin cannot be 0 or undefined")]
    InvalidTotalH2coin,

    #[msg("🔴 The derived PDA does not match the expected refund cache PDA.")]
    InvalidRefundCachePda,


    // ────────────────────────────────
    // 📈 Deposit / Withdraw
    // ────────────────────────────────
    #[msg("🔴 Whitelist must contain at least one wallet.")]
    EmptyWhitelist,

    #[msg("🔴 Invalid Recipient wallet Address")]
    InvalidRecipientAddress,

    #[msg("🔴 Recipient wallet is not in the withdraw whitelist.")]
    UnauthorizedRecipient,
}

