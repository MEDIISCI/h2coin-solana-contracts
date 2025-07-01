// programs/h2coin_vault_share/src/constants.rs
//
// H2COIN VAULT SHARE PROGRAM - CONSTANTS AND CONFIGURATION
// ========================================================
//
// AUDIT NOTES:
// This file contains all program constants that affect security, performance, and functionality.
// Changes to these constants can have significant security implications.
//
// CRITICAL CONSTANTS:
// - Token mint addresses (network-specific)
// - Whitelist and batch size limits
// - Cache expiration times
// - Gas cost estimates
// - Year index ranges
//
// SECURITY CONSIDERATIONS:
// - Token mint addresses must match deployed contracts
// - Whitelist size affects multisig security model
// - Cache expiration prevents stale data execution
// - Gas estimates affect transaction success rates
// - Year indices affect refund distribution timing

use anchor_lang::prelude::*;

/// Get USDT mint address based on network configuration
/// 
/// AUDIT CRITICAL:
/// - Different mint addresses for different networks
/// - Must match actual deployed token addresses
/// - Used for token validation in all operations
/// 
/// SECURITY IMPLICATIONS:
/// - Incorrect mint address could lead to token loss
/// - Network-specific validation prevents cross-network attacks
/// - Mint validation prevents unauthorized token operations
/// 
/// NETWORK MAPPING:
/// - localnet: FTenRK9zPfxc19UUpZJ2Wm8CXrWV4k8rH8vLh2TNTp6q
/// - devnet: 7zpxGbRXo7qbtx4WCRo8y1vUr86B8un5x5UeSR4NLBuM
/// - mainnet: Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
pub fn get_usdt_mint() -> Pubkey {
    if cfg!(feature = "localnet") {
        // Local development network USDT mint
        pubkey!("FTenRK9zPfxc19UUpZJ2Wm8CXrWV4k8rH8vLh2TNTp6q")
    } else if cfg!(feature = "devnet") {
        // Devnet USDT mint (testnet)
        pubkey!("7zpxGbRXo7qbtx4WCRo8y1vUr86B8un5x5UeSR4NLBuM")
    } else {
        // Mainnet USDT mint (production)
        pubkey!("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB")
    }
}

/// Get H2COIN mint address based on network configuration
/// 
/// AUDIT CRITICAL:
/// - Different mint addresses for different networks
/// - Must match actual deployed token addresses
/// - Used for token validation in all operations
/// 
/// SECURITY IMPLICATIONS:
/// - Incorrect mint address could lead to token loss
/// - Network-specific validation prevents cross-network attacks
/// - Mint validation prevents unauthorized token operations
/// 
/// NETWORK MAPPING:
/// - localnet: 9PwAsgkYQTQ6RipNuCkn74EgoXiMQWTaYhVip4CinRgG
/// - devnet: 7iB42yQCPgaE2aqLr8gv6irbMk8xhjVQ3sRzw5ycKAYf
/// - mainnet: CJA59jCAoEoPnsWZyVJuH2WCM9uDxvjjomQam9du3Lu6
pub fn get_hcoin_mint() -> Pubkey {
    if cfg!(feature = "localnet") {
        // Local development network H2COIN mint
        pubkey!("9PwAsgkYQTQ6RipNuCkn74EgoXiMQWTaYhVip4CinRgG")
    } else if cfg!(feature = "devnet") {
        // Devnet H2COIN mint (testnet)
        pubkey!("7iB42yQCPgaE2aqLr8gv6irbMk8xhjVQ3sRzw5ycKAYf")
    } else {
        // Mainnet H2COIN mint (production)
        pubkey!("CJA59jCAoEoPnsWZyVJuH2WCM9uDxvjjomQam9du3Lu6")
    }
}

/// Maximum length for each whitelist (execute, update, withdraw)
/// 
/// AUDIT CRITICAL:
/// - Fixed at 5 members for 3-of-5 multisig security
/// - Cannot be changed without program upgrade
/// - Affects all multisig validation logic
/// 
/// SECURITY IMPLICATIONS:
/// - 3-of-5 provides good security vs usability balance
/// - Fixed size prevents dynamic whitelist manipulation
/// - Must be consistent across all whitelist operations
/// - Prevents DoS through oversized whitelist validation
pub const MAX_WHITELIST_LEN: usize = 5;

/// Maximum number of supported investment stages
/// 
/// AUDIT CRITICAL:
/// - Fixed at 3 stages (1, 2, 3)
/// - Used for stage ratio validation
/// - Affects refund calculation logic
/// 
/// SECURITY IMPLICATIONS:
/// - Prevents invalid stage values
/// - Bounds checking prevents array out-of-bounds access
/// - Must match stage ratio array dimensions
/// - Limits complexity of investment structures
pub const MAX_STAGE: usize = 3;

/// Maximum number of investment record entries per profit/refund batch
/// 
/// AUDIT CRITICAL:
/// - Limits account size to prevent exceeding compute limits
/// - Affects gas cost estimation
/// - Prevents transaction size overflow
/// 
/// SECURITY IMPLICATIONS:
/// - Prevents DoS through oversized transactions
/// - Limits memory usage and compute units
/// - Must balance between efficiency and transaction limits
/// - Prevents account size from exceeding Solana limits
pub const MAX_ENTRIES_PER_BATCH: usize = 30;

/// Maximum duration (in seconds) that ProfitShareCache or RefundShareCache remains valid
/// 
/// AUDIT CRITICAL:
/// - Prevents stale cache execution
/// - Forces re-estimation after expiration
/// - Default: 25 days × 86400 seconds/day = 2,160,000 seconds
/// 
/// SECURITY IMPLICATIONS:
/// - Prevents execution of outdated calculations
/// - Forces regular re-validation of distribution amounts
/// - Must be long enough for execution but short enough for security
/// - Prevents replay attacks with old cache data
/// - Ensures calculations reflect current market conditions
pub const SHARE_CACHE_EXPIRE_SECS: i64 = 25 * 86400;

/// The starting year index (0-based) when refund distributions begin
/// 
/// AUDIT CRITICAL:
/// - Year 3 means refunds start in the 4th year
/// - Prevents early refund distributions
/// - Used for refund period validation
/// 
/// SECURITY IMPLICATIONS:
/// - Prevents premature refund distributions
/// - Must align with business logic requirements
/// - Affects refund calculation validation
/// - Ensures proper investment maturation period
/// - Prevents exploitation of early refund mechanisms
pub const START_YEAR_INDEX: u8 = 3;

/// The maximum number of years for refund distribution (inclusive)
/// 
/// AUDIT CRITICAL:
/// - Index 9 = the 10th year of refund
/// - Sets upper bound for refund calculations
/// - Used for year index validation
/// 
/// SECURITY IMPLICATIONS:
/// - Prevents invalid year index values
/// - Bounds checking prevents array out-of-bounds access
/// - Must align with stage ratio array dimensions
/// - Limits refund distribution period
/// - Prevents infinite refund calculations
pub const MAX_YEAR_INDEX: u8 = 9;

/// Estimated base SOL cost for executing a profit or refund share instruction
/// 
/// AUDIT CRITICAL:
/// - Covers basic signature fees and minimal compute unit usage
/// - Used for gas cost estimation in cache creation
/// - Default: 100,000 lamports (0.0001 SOL)
/// 
/// SECURITY IMPLICATIONS:
/// - Must be sufficient to cover actual transaction costs
/// - Underestimation could lead to failed transactions
/// - Overestimation wastes user funds
/// - Affects transaction success rates
/// - Must be updated if network fees change
pub const ESTIMATE_SOL_BASE: u64 = 100_000;

/// Estimated SOL cost per entry in a batch execution
/// 
/// AUDIT CRITICAL:
/// - Covers per-transfer token fees and additional compute
/// - Used for gas cost estimation in cache creation
/// - Default: 5,000 lamports (0.000005 SOL)
/// 
/// SECURITY IMPLICATIONS:
/// - Must account for per-recipient transfer costs
/// - Underestimation could lead to failed transactions
/// - Overestimation wastes user funds
/// - Affects batch size optimization
/// - Must be updated if token transfer costs change
pub const ESTIMATE_SOL_PER_ENTRY: u64 = 5_000;
