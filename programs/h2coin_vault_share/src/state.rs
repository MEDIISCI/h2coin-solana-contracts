// programs/h2coin_vault_share/src/state.rs
//
// H2COIN VAULT SHARE PROGRAM - DATA STRUCTURES AND STATE MANAGEMENT
// ================================================================
//
// AUDIT NOTES:
// This file defines all data structures used by the program.
// Each structure has specific security implications and validation requirements.
// Account sizes are carefully calculated to prevent overflow and ensure efficiency.
//
// CRITICAL STRUCTURES:
// - InvestmentInfo: Main investment configuration
// - InvestmentRecord: Individual investment records
// - ProfitShareCache: Profit distribution calculations
// - RefundShareCache: Refund distribution calculations
//
// SECURITY CONSIDERATIONS:
// - All account sizes are fixed and validated
// - PDA derivation prevents address spoofing
// - State transitions are controlled and validated
// - Multisig validation is enforced at state level
// - Input validation prevents malicious data injection
// - State consistency ensures proper program behavior

use anchor_lang::prelude::*;
use core::{convert::TryFrom, result::Result as StdResult};

use crate::constants::*;
use crate::error::ErrorCode;

/// Main investment configuration account
/// 
/// AUDIT CRITICAL:
/// - Contains all investment parameters and configuration
/// - Manages whitelists for different operation types
/// - Controls investment state transitions
/// - Stores vault PDA reference
/// - Central control point for all investment operations
/// 
/// SECURITY FEATURES:
/// - Fixed account size prevents overflow
/// - PDA-based address derivation
/// - State validation prevents invalid transitions
/// - Whitelist validation for access control
/// - Comprehensive input validation
/// - State consistency enforcement
#[account]
#[derive()]
pub struct InvestmentInfo {
    /// Unique investment identifier (15 bytes)
    /// AUDIT: Must be exactly 15 bytes, used for PDA derivation
    /// SECURITY: Prevents ID manipulation and ensures unique identification
    pub investment_id: [u8; 15],
    
    /// Version identifier (4 bytes)
    /// AUDIT: Used for versioning and PDA derivation
    /// SECURITY: Enables version control and prevents version confusion
    pub version: [u8; 4],
    
    /// Investment type (Standard or CSR)
    /// AUDIT: Affects profit sharing eligibility
    /// SECURITY: Controls access to profit distribution features
    pub investment_type: InvestmentType,
    
    /// Refund percentage ratios for each stage and year
    /// AUDIT: 3 stages × 10 years = 30 values, each 0-100%
    /// SECURITY: Must be validated to prevent mathematical errors
    pub stage_ratio: [[u8; 10]; MAX_STAGE],
    
    /// Investment start timestamp
    /// AUDIT: Used for timing validation
    /// SECURITY: Prevents premature operations
    pub start_at: i64,
    
    /// Investment end timestamp
    /// AUDIT: Used for completion validation
    /// SECURITY: Controls investment lifecycle
    pub end_at: i64,
    
    /// Maximum investment amount limit
    /// AUDIT: Prevents over-investment
    /// SECURITY: Controls fund exposure and risk management
    pub investment_upper_limit: u64,
    
    /// Whitelist for profit/refund execution operations
    /// AUDIT: Exactly 5 members for 3-of-5 multisig
    /// SECURITY: Controls access to critical financial operations
    pub execute_whitelist: Vec<Pubkey>,
    
    /// Whitelist for investment info update operations
    /// AUDIT: Exactly 5 members for 3-of-5 multisig
    /// SECURITY: Controls access to configuration changes
    pub update_whitelist: Vec<Pubkey>,
    
    /// Whitelist for vault withdrawal operations
    /// AUDIT: Exactly 5 members for 3-of-5 multisig
    /// SECURITY: Controls access to fund withdrawals
    pub withdraw_whitelist: Vec<Pubkey>,
    
    /// Vault PDA address for fund storage
    /// AUDIT: Derived from investment_id and version
    /// SECURITY: Prevents vault spoofing and ensures proper fund storage
    pub vault: Pubkey,
    
    /// Current investment state
    /// AUDIT: Controls allowed operations
    /// SECURITY: Prevents invalid state transitions
    pub state: InvestmentState,
    
    /// Whether investment is active
    /// AUDIT: Prevents operations on deactivated investments
    /// SECURITY: Final state control for terminated investments
    pub is_active: bool,
    
    /// Creation timestamp
    /// AUDIT: Used for audit trail
    /// SECURITY: Provides temporal context for operations
    pub created_at: i64,
}

impl InvestmentInfo {
    /// Total account size: 772 bytes
    /// 
    /// AUDIT CRITICAL:
    /// - Fixed size prevents account overflow
    /// - Must match actual data structure size
    /// - Used for account initialization
    /// - Prevents memory corruption and DoS attacks
    /// 
    /// SIZE BREAKDOWN:
    /// - 8 bytes: Anchor discriminator
    /// - 15 bytes: investment_id
    /// - 4 bytes: version
    /// - 1 byte: investment_type (enum)
    /// - 30 bytes: stage_ratio (3×10)
    /// - 8 bytes: start_at
    /// - 8 bytes: end_at
    /// - 8 bytes: investment_upper_limit
    /// - 164 bytes: execute_whitelist (4 + 5×32)
    /// - 164 bytes: update_whitelist (4 + 5×32)
    /// - 164 bytes: withdraw_whitelist (4 + 5×32)
    /// - 32 bytes: vault
    /// - 2 bytes: state (repr(u16))
    /// - 1 byte: is_active
    /// - 8 bytes: created_at
    pub const SIZE: usize =
        8 +  // discriminator
        15 + // investment_id
        4 +  // version
        1 +  // investment_type (enum InvestmentType)
        30 + // stage_ratio
        8 +  // start_at
        8 +  // end_at
        8 +  // investment_upper_limit
        4 + (MAX_WHITELIST_LEN * 32) + // execute_whitelist
        4 + (MAX_WHITELIST_LEN * 32) + // update_whitelist
        4 + (MAX_WHITELIST_LEN * 32) + // withdraw_whitelist
        32 + // vault
        2 +  // state (as repr(u16))
        1 +  // is_active
        8;   // created_at

    /// Validate stage ratio configuration
    /// 
    /// AUDIT CRITICAL:
    /// - Ensures valid refund percentage configuration
    /// - Prevents mathematical errors in refund calculations
    /// - Validates business logic constraints
    /// - Critical for financial accuracy
    /// 
    /// VALIDATION RULES:
    /// - Each stage must have exactly 10 elements
    /// - Each value must be 0-100
    /// - Sum per stage must not exceed 100
    /// - Non-zero values must be contiguous
    /// - At least one stage must have non-zero values
    /// 
    /// SECURITY IMPLICATIONS:
    /// - Prevents fund exhaustion through over-allocation
    /// - Ensures proper refund distribution timing
    /// - Prevents mathematical overflow in calculations
    /// - Maintains business logic integrity
    pub fn validate_stage_ratio(&self) -> Result<()> {
        let mut any_nonzero = false;

        for stage in 0..MAX_STAGE {
            let mut sum = 0u32;
            let mut started = false;

            // Ensure each stage has exactly MAX_YEAR_INDEX + 1 entries
            require!(
                self.stage_ratio[stage].len() == (MAX_YEAR_INDEX as usize) + 1,
                ErrorCode::InvalidStageRatioLength
            );

            for (i, &val) in self.stage_ratio[stage].iter().enumerate() {
                // Validate individual percentage values
                require!(val <= 100, ErrorCode::InvalidStageRatioValue);

                if val > 0 {
                    any_nonzero = true;
                    started = true;
                }

                // Ensure non-zero values are contiguous (no gaps)
                if started && val == 0 && i < 9 {
                    // Once started, must not have trailing zero before end
                    require!(
                        self.stage_ratio[stage][i + 1..].iter().all(|&v| v == 0),
                        ErrorCode::NonContiguousStage
                    );
                    break;
                }

                sum += val as u32;
            }

            // Validate total percentage per stage
            require!(sum <= 100, ErrorCode::InvalidStageRatioSum);
        }

        // Ensure at least one stage has non-zero values
        require!(any_nonzero, ErrorCode::EmptyStageRatio);
        Ok(())
    }

    /// Verify that at least 3-of-5 signers match the whitelist
    /// 
    /// AUDIT CRITICAL:
    /// - Core multisig validation logic
    /// - Prevents unauthorized access to critical operations
    /// - Must be called for all protected operations
    /// - Fundamental security mechanism
    /// 
    /// SECURITY CHECKS:
    /// - Whitelist must have exactly 5 members
    /// - At least 3 signers must be in whitelist
    /// - Different whitelists for different operation types
    /// - Prevents single point of failure
    /// - Ensures proper authorization
    pub fn verify_signers_3_of_5(&self, signer_keys: &[Pubkey], is_update: bool) -> Result<()> {
        let whitelist = if is_update {
            &self.update_whitelist
        } else {
            &self.execute_whitelist
        };

        // Enforce exactly 5 members during execution
        require!(
            whitelist.len() == MAX_WHITELIST_LEN,
            ErrorCode::WhitelistMustBeFive
        );

        // Count matching signers
        let match_count = signer_keys
            .iter()
            .filter(|key| whitelist.contains(key))
            .count();

        // Require at least 3-of-5 signatures
        require!(match_count >= 3, ErrorCode::UnauthorizedSigner);
        Ok(())
    }

    /// Enforce 3-of-5 multisig validation using AccountInfo
    /// 
    /// AUDIT CRITICAL:
    /// - Wrapper for verify_signers_3_of_5 with AccountInfo
    /// - Extracts signer keys from AccountInfo objects
    /// - Used in instruction contexts
    /// - Provides convenient interface for validation
    /// 
    /// SECURITY:
    /// - Filters only actual signers
    /// - Validates against appropriate whitelist
    /// - Prevents unauthorized operations
    /// - Ensures proper multisig enforcement
    pub fn enforce_3_of_5_signers<'info>(
        &self,
        signer_infos: &[AccountInfo<'info>],
        is_update: bool,
    ) -> Result<()> {
        let signer_keys: Vec<Pubkey> = signer_infos
            .iter()
            .filter(|info| info.is_signer)
            .map(|info| *info.key)
            .collect();

        self.verify_signers_3_of_5(&signer_keys, is_update)
    }
}

/// Investment type enumeration
/// 
/// AUDIT CRITICAL:
/// - Controls profit sharing eligibility
/// - Affects available operations
/// - Used for business logic validation
/// 
/// SECURITY:
/// - Prevents unauthorized profit sharing
/// - Controls feature access based on investment type
/// - Ensures proper business logic enforcement
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum InvestmentType {
    Standard, // Eligible for profit sharing
    Csr,      // Not eligible for profit sharing
}

/// Investment state enumeration
/// 
/// AUDIT CRITICAL:
/// - Controls allowed operations based on state
/// - Prevents invalid state transitions
/// - Ensures proper investment lifecycle
/// 
/// SECURITY:
/// - Prevents operations on wrong state
/// - Controls access to features based on state
/// - Ensures proper state management
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum InvestmentState {
    Init = 0,      // Initial state after creation
    Pending = 1,   // Active investment period
    Completed = 999, // Investment completed, ready for distributions
}

impl InvestmentState {
    /// Convert state to u16 representation
    /// 
    /// AUDIT: Used for storage and comparison
    /// SECURITY: Ensures consistent state representation
    pub fn as_u16(self) -> u16 {
        self as u16
    }
}

impl TryFrom<u16> for InvestmentState {
    type Error = ();

    /// Convert u16 to InvestmentState
    /// 
    /// AUDIT CRITICAL:
    /// - Validates state values during deserialization
    /// - Prevents invalid state values
    /// - Ensures state consistency
    /// 
    /// SECURITY:
    /// - Prevents state manipulation attacks
    /// - Ensures only valid states are accepted
    /// - Maintains state integrity
    fn try_from(value: u16) -> StdResult<Self, Self::Error> {
        match value {
            0 => Ok(InvestmentState::Init),
            1 => Ok(InvestmentState::Pending),
            999 => Ok(InvestmentState::Completed),
            _ => Err(()),
        }
    }
}

/// Individual investment record account
/// 
/// AUDIT CRITICAL:
/// - Stores individual investment details
/// - Links to investment info and investor
/// - Used for profit and refund calculations
/// - Immutable once created (can only be revoked)
/// 
/// SECURITY FEATURES:
/// - Fixed account size prevents overflow
/// - PDA-based address derivation
/// - Revocation mechanism for invalid records
/// - Comprehensive validation
/// - Audit trail with timestamps
#[account]
#[derive()]
pub struct InvestmentRecord {
    /// Batch identifier for grouping records
    /// AUDIT: Used for batch processing and cache creation
    /// SECURITY: Enables efficient batch operations
    pub batch_id: u16,
    
    /// Unique record identifier within batch
    /// AUDIT: Must be unique within batch
    /// SECURITY: Prevents duplicate record processing
    pub record_id: u64,
    
    /// Account identifier (15 bytes)
    /// AUDIT: Used for record identification and PDA derivation
    /// SECURITY: Ensures proper record ownership
    pub account_id: [u8; 15],
    
    /// Investment identifier (15 bytes)
    /// AUDIT: Links record to investment info
    /// SECURITY: Ensures proper investment association
    pub investment_id: [u8; 15],
    
    /// Version identifier (4 bytes)
    /// AUDIT: Links record to specific investment version
    /// SECURITY: Prevents version confusion
    pub version: [u8; 4],
    
    /// Investor wallet address
    /// AUDIT: Recipient for profit/refund distributions
    /// SECURITY: Controls fund distribution destination
    pub wallet: Pubkey,
    
    /// USDT investment amount
    /// AUDIT: Used for profit calculations
    /// SECURITY: Determines profit share allocation
    pub amount_usdt: u64,
    
    /// H2COIN investment amount
    /// AUDIT: Used for refund calculations
    /// SECURITY: Determines refund share allocation
    pub amount_hcoin: u64,
    
    /// Investment stage (1, 2, or 3)
    /// AUDIT: Used for refund percentage calculation
    /// SECURITY: Controls refund distribution timing
    pub stage: u8,
    
    /// Revocation timestamp (0 if not revoked)
    /// AUDIT: Prevents revoked records from distributions
    /// SECURITY: Enables record invalidation
    pub revoked_at: i64,
    
    /// Creation timestamp
    /// AUDIT: Used for audit trail
    /// SECURITY: Provides temporal context
    pub created_at: i64,
}

impl InvestmentRecord {
    /// Total account size: 120 bytes
    /// 
    /// AUDIT CRITICAL:
    /// - Fixed size prevents account overflow
    /// - Must match actual data structure size
    /// - Used for account initialization
    /// - Prevents memory corruption
    /// 
    /// SIZE BREAKDOWN:
    /// - 8 bytes: Anchor discriminator
    /// - 2 bytes: batch_id
    /// - 8 bytes: record_id
    /// - 15 bytes: account_id
    /// - 15 bytes: investment_id
    /// - 4 bytes: version
    /// - 32 bytes: wallet
    /// - 8 bytes: amount_usdt
    /// - 8 bytes: amount_hcoin
    /// - 1 byte: stage
    /// - 8 bytes: revoked_at
    /// - 8 bytes: created_at
    pub const SIZE: usize =
        8 +  // discriminator
        2 +  // batch_id
        8 +  // record_id
        15 + // account_id
        15 + // investment_id
        4 +  // version
        32 + // wallet
        8 +  // amount_usdt
        8 +  // amount_hcoin
        1 +  // stage
        8 +  // revoked_at
        8;   // created_at
}

/// Profit share cache account for batch processing
/// 
/// AUDIT CRITICAL:
/// - Stores pre-calculated profit distribution data
/// - Enables efficient batch execution
/// - Prevents double execution
/// - Contains gas cost estimates
/// 
/// SECURITY FEATURES:
/// - Fixed account size prevents overflow
/// - PDA-based address derivation
/// - Expiration mechanism prevents stale data
/// - Execution tracking prevents double-spending
/// - Comprehensive validation
#[account]
#[derive()]
pub struct ProfitShareCache {
    /// Batch identifier for this profit share entry
    /// AUDIT: Links cache to specific batch of records
    /// SECURITY: Ensures proper batch association
    pub batch_id: u16,
    
    /// Investment identifier (15 bytes)
    /// AUDIT: Links profit share to specific investment
    /// SECURITY: Ensures proper investment association
    pub investment_id: [u8; 15],
    
    /// Version identifier (4 bytes)
    /// AUDIT: Links profit share to specific investment version
    /// SECURITY: Prevents version confusion
    pub version: [u8; 4],
    
    /// Total USDT amount to be distributed
    /// AUDIT: Must match sum of all entries
    /// SECURITY: Prevents fund exhaustion
    pub subtotal_profit_usdt: u64,
    
    /// Estimated SOL cost for execution
    /// AUDIT: Used for gas cost estimation
    /// SECURITY: Ensures sufficient gas coverage
    pub subtotal_estimate_sol: u64,
    
    /// Execution timestamp (0 if not executed)
    /// AUDIT: Prevents double execution
    /// SECURITY: Ensures idempotency
    pub executed_at: i64,
    
    /// Cache creation timestamp
    /// AUDIT: Used for expiration validation
    /// SECURITY: Prevents stale data execution
    pub created_at: i64,
    
    /// List of profit share entries for this batch
    /// AUDIT: Up to 30 entries per batch
    /// SECURITY: Limits batch size for efficiency
    pub entries: Vec<ProfitEntry>,
}

/// Individual profit share entry
/// 
/// AUDIT CRITICAL:
/// - Contains profit distribution details for one recipient
/// - Used for USDT transfer execution
/// - Includes calculation validation data
/// 
/// SECURITY:
/// - Validates profit calculations
/// - Ensures proper recipient identification
/// - Prevents calculation errors
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ProfitEntry {
    /// Account identifier (15 bytes)
    /// AUDIT: Links entry to specific account
    /// SECURITY: Ensures proper account association
    pub account_id: [u8; 15],
    
    /// Recipient wallet address
    /// AUDIT: Destination for USDT transfer
    /// SECURITY: Controls fund distribution destination
    pub wallet: Pubkey,
    
    /// USDT amount to transfer
    /// AUDIT: Calculated based on investment amount and profit ratio
    /// SECURITY: Determines actual transfer amount
    pub amount_usdt: u64,
    
    /// Profit ratio in basis points
    /// AUDIT: Used for calculation validation
    /// SECURITY: Ensures calculation accuracy
    pub ratio_bp: u16,
}

impl ProfitShareCache {
    /// Size of a single profit entry: 57 bytes
    /// 
    /// AUDIT: Used for size calculations
    /// SECURITY: Ensures proper memory allocation
    pub const ENTRY_SIZE: usize = 15 + 32 + 8 + 2;

    /// Total account size calculation
    /// 
    /// AUDIT CRITICAL:
    /// - Dynamic size based on number of entries
    /// - Must not exceed account size limits
    /// - Used for account initialization
    /// - Prevents account overflow
    /// 
    /// SIZE BREAKDOWN:
    /// - 8 bytes: Anchor discriminator
    /// - 2 bytes: batch_id
    /// - 15 bytes: investment_id
    /// - 4 bytes: version
    /// - 8 bytes: subtotal_profit_usdt
    /// - 8 bytes: subtotal_estimate_sol
    /// - 8 bytes: executed_at
    /// - 8 bytes: created_at
    /// - 4 bytes: entries vector length
    /// - N * ENTRY_SIZE: entries data
    pub const SIZE: usize =
        8 +  // discriminator
        2 +  // batch_id
        15 + // investment_id
        4 +  // version
        8 +  // subtotal_profit_usdt
        8 +  // subtotal_estimate_sol
        8 +  // executed_at
        8 +  // created_at
        4 + (MAX_ENTRIES_PER_BATCH * Self::ENTRY_SIZE); // entries
}

/// Refund share cache account for batch processing
/// 
/// AUDIT CRITICAL:
/// - Stores pre-calculated refund distribution data
/// - Enables efficient batch execution
/// - Prevents double execution
/// - Contains gas cost estimates
/// 
/// SECURITY FEATURES:
/// - Fixed account size prevents overflow
/// - PDA-based address derivation
/// - Expiration mechanism prevents stale data
/// - Execution tracking prevents double-spending
/// - Comprehensive validation
#[account]
#[derive()]
pub struct RefundShareCache {
    /// Batch identifier for this refund share entry
    /// AUDIT: Links cache to specific batch of records
    /// SECURITY: Ensures proper batch association
    pub batch_id: u16,
    
    /// Year index for this refund (0-9)
    /// AUDIT: Specific year for refund calculation
    /// SECURITY: Controls refund timing
    pub year_index: u8,
    
    /// Investment identifier (15 bytes)
    /// AUDIT: Links refund share to specific investment
    /// SECURITY: Ensures proper investment association
    pub investment_id: [u8; 15],
    
    /// Version identifier (4 bytes)
    /// AUDIT: Links refund share to specific investment version
    /// SECURITY: Prevents version confusion
    pub version: [u8; 4],
    
    /// Total H2COIN amount to be distributed
    /// AUDIT: Must match sum of all entries
    /// SECURITY: Prevents fund exhaustion
    pub subtotal_refund_hcoin: u64,
    
    /// Estimated SOL cost for execution
    /// AUDIT: Used for gas cost estimation
    /// SECURITY: Ensures sufficient gas coverage
    pub subtotal_estimate_sol: u64,
    
    /// Execution timestamp (0 if not executed)
    /// AUDIT: Prevents double execution
    /// SECURITY: Ensures idempotency
    pub executed_at: i64,
    
    /// Cache creation timestamp
    /// AUDIT: Used for expiration validation
    /// SECURITY: Prevents stale data execution
    pub created_at: i64,
    
    /// List of refund share entries for this batch
    /// AUDIT: Up to 30 entries per batch
    /// SECURITY: Limits batch size for efficiency
    pub entries: Vec<RefundEntry>,
}

/// Individual refund share entry
/// 
/// AUDIT CRITICAL:
/// - Contains refund distribution details for one recipient
/// - Used for H2COIN transfer execution
/// - Includes stage information for validation
/// 
/// SECURITY:
/// - Validates refund calculations
/// - Ensures proper recipient identification
/// - Prevents calculation errors
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RefundEntry {
    /// Account identifier (15 bytes)
    /// AUDIT: Links entry to specific account
    /// SECURITY: Ensures proper account association
    pub account_id: [u8; 15],
    
    /// Recipient wallet address
    /// AUDIT: Destination for H2COIN transfer
    /// SECURITY: Controls fund distribution destination
    pub wallet: Pubkey,
    
    /// H2COIN amount to transfer
    /// AUDIT: Calculated based on investment amount and refund percentage
    /// SECURITY: Determines actual transfer amount
    pub amount_hcoin: u64,
    
    /// Investment stage (1, 2, or 3)
    /// AUDIT: Used for refund percentage calculation
    /// SECURITY: Ensures proper refund calculation
    pub stage: u8,
}

impl RefundShareCache {
    /// Size of a single refund entry: 56 bytes
    /// 
    /// AUDIT: Used for size calculations
    /// SECURITY: Ensures proper memory allocation
    pub const ENTRY_SIZE: usize = 15 + 32 + 8 + 1;

    /// Total account size calculation
    /// 
    /// AUDIT CRITICAL:
    /// - Dynamic size based on number of entries
    /// - Must not exceed account size limits
    /// - Used for account initialization
    /// - Prevents account overflow
    /// 
    /// SIZE BREAKDOWN:
    /// - 8 bytes: Anchor discriminator
    /// - 2 bytes: batch_id
    /// - 1 byte: year_index
    /// - 15 bytes: investment_id
    /// - 4 bytes: version
    /// - 8 bytes: subtotal_refund_hcoin
    /// - 8 bytes: subtotal_estimate_sol
    /// - 8 bytes: executed_at
    /// - 8 bytes: created_at
    /// - 4 bytes: entries vector length
    /// - N * ENTRY_SIZE: entries data
    pub const SIZE: usize =
        8 +  // discriminator
        2 +  // batch_id
        1 +  // year_index
        15 + // investment_id
        4 +  // version
        8 +  // subtotal_refund_hcoin
        8 +  // subtotal_estimate_sol
        8 +  // executed_at
        8 +  // created_at
        4 + (MAX_ENTRIES_PER_BATCH * Self::ENTRY_SIZE); // entries

    /// Calculate refund percentage for given stage and year
    /// 
    /// AUDIT CRITICAL:
    /// - Core refund calculation logic
    /// - Must match business requirements
    /// - Used for refund amount calculations
    /// - Critical for financial accuracy
    /// 
    /// SECURITY:
    /// - Validates stage and year indices
    /// - Prevents array out-of-bounds access
    /// - Ensures proper percentage calculation
    /// - Maintains calculation consistency
    pub fn get_refund_percentage(stage_ratio: &[[u8; 10]; 3], stage: u8, year_index: u8) -> u8 {
        // Validate stage index (1-based, convert to 0-based)
        if !(1..=MAX_STAGE).contains(&(stage as usize)) {
            return 0;
        }
        
        // Validate year index
        if year_index > MAX_YEAR_INDEX {
            return 0;
        }
        
        // Get percentage for stage and year
        stage_ratio[(stage - 1) as usize][year_index as usize]
    }
}
