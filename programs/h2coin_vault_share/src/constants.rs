// programs/h2coin_vault_share/src/constants.rs

use anchor_lang::prelude::*;


pub fn get_usdt_mint() -> Pubkey {
    if cfg!(feature = "localnet") {
        pubkey!("FTenRK9zPfxc19UUpZJ2Wm8CXrWV4k8rH8vLh2TNTp6q")
    } else if cfg!(feature = "devnet") {
        pubkey!("7zpxGbRXo7qbtx4WCRo8y1vUr86B8un5x5UeSR4NLBuM")
    } else {
        pubkey!("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB")
    }
}

pub fn get_hcoin_mint() -> Pubkey {
    if cfg!(feature = "localnet") {
        pubkey!("9PwAsgkYQTQ6RipNuCkn74EgoXiMQWTaYhVip4CinRgG")
    } else if cfg!(feature = "devnet") {
        pubkey!("7iB42yQCPgaE2aqLr8gv6irbMk8xhjVQ3sRzw5ycKAYf")
    } else {
        pubkey!("CJA59jCAoEoPnsWZyVJuH2WCM9uDxvjjomQam9du3Lu6")
    }
}


/// Maximun each whitelist length
pub const MAX_WHITELIST_LEN: usize = 5;

/// Maximum number of supported investment stages (1, 2, 3)
pub const MAX_STAGE: usize = 3;

/// Maximum number of investment record entries per profit/refund batch.
/// Used to limit account size and avoid exceeding compute limits.
pub const MAX_ENTRIES_PER_BATCH: usize = 30;

/// Maximum duration (in seconds) that ProfitShareCache or RefundShareCache remains valid.
/// Default: 25 days × 86400 seconds/day = 2,160,000 seconds.
pub const SHARE_CACHE_EXPIRE_SECS: i64 = 25 * 86400;

/// The starting year index (0-based) when refund distributions begin.
/// For example, year 3 means refunds start in the 4th year.
pub const START_YEAR_INDEX: u8 = 3;

/// The maximum number of years for refund distribution (inclusive).
/// Index 9 = the 10th year of refund.
pub const MAX_YEAR_INDEX: u8 = 9;

/// Estimated base SOL cost for executing a profit or refund share instruction.
/// Covers basic signature fees and minimal compute unit usage.
/// Default: 100,000 lamports (0.0001 SOL)
pub const ESTIMATE_SOL_BASE: u64 = 100_000;

/// Estimated SOL cost per entry in a batch execution (e.g., per investor).
/// Covers per-transfer token fees and additional compute.
/// Default: 5,000 lamports (0.000005 SOL)
pub const ESTIMATE_SOL_PER_ENTRY: u64 = 5_000;
