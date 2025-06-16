// programs/h2coin_vault_share/src/state.rs

use anchor_lang::prelude::*;
use core::{convert::TryFrom, result::Result as StdResult};

use crate::constants::*;
use crate::error::ErrorCode;

#[account]
#[derive(Debug)]
pub struct InvestmentInfo {
    pub investment_id: [u8; 15],
    pub version: [u8; 4],
    pub investment_type: InvestmentType,
    pub stage_ratio: [[u8; 10]; MAX_STAGE],
    pub start_at: i64,
    pub end_at: i64,
    pub investment_upper_limit: u64,
    pub execute_whitelist: Vec<Pubkey>,
    pub update_whitelist: Vec<Pubkey>,
    pub withdraw_whitelist: Vec<Pubkey>,
    pub vault: Pubkey, // PDA
    pub state: InvestmentState,
    pub is_active: bool,
    pub created_at: i64,
}

impl InvestmentInfo {
    /// Total size: 772 bytes
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
                require!(val <= 100, ErrorCode::InvalidStageRatioValue);

                if val > 0 {
                    any_nonzero = true;
                    started = true;
                }

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

            require!(sum <= 100, ErrorCode::InvalidStageRatioSum);
        }

        require!(any_nonzero, ErrorCode::EmptyStageRatio);
        Ok(())
    }

    /// Check that at least 3-of-5 signers match the whitelist.
    /// This is only used in enforce context, so we require length == 5 here.
    pub fn verify_signers_3_of_5(&self, signer_keys: &[Pubkey], is_update: bool) -> Result<()> {
        let whitelist = if is_update {
            &self.update_whitelist
        } else {
            &self.execute_whitelist
        };

        // ✅ Enforce must be exactly 5 members during execution
        require!(
            whitelist.len() == MAX_WHITELIST_LEN,
            ErrorCode::WhitelistMustBeFive
        );

        let match_count = signer_keys
            .iter()
            .filter(|key| whitelist.contains(key))
            .count();

        require!(match_count >= 3, ErrorCode::UnauthorizedSigner);
        Ok(())
    }

    pub fn enforce_3_of_5_signers<'info>(
        &self,
        signer_infos: &[AccountInfo<'info>],
        is_update: bool,
    ) -> Result<()> {
        let signer_keys: Vec<Pubkey> = signer_infos
            .iter()
            .filter(|info| info.is_signer)
            .map(|info| info.key())
            .collect();

        self.verify_signers_3_of_5(&signer_keys, is_update)
    }
}


#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum InvestmentType {
    Standard,
    Csr,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u16)]
pub enum InvestmentState {
    Init = 0,
    Pending = 1,
    Completed = 999,
}

impl InvestmentState {
    pub fn as_u16(self) -> u16 {
        self as u16
    }
}

impl TryFrom<u16> for InvestmentState {
    type Error = ();

    fn try_from(value: u16) -> StdResult<Self, Self::Error> {
        match value {
            0 => Ok(InvestmentState::Init),
            1 => Ok(InvestmentState::Pending),
            999 => Ok(InvestmentState::Completed),
            _ => Err(()),
        }
    }
}

#[account]
#[derive(Debug)]
pub struct InvestmentRecord {
    pub batch_id: u16,
    pub record_id: u64,
    pub account_id: [u8; 15],
    pub investment_id: [u8; 15],
    pub version: [u8; 4],
    pub wallet: Pubkey,
    pub amount_usdt: u64,
    pub amount_hcoin: u64,
    pub stage: u8,
    pub revoked_at: i64, // Indicates if this record has been revoked
    pub created_at: i64,
}

impl InvestmentRecord {
    // Size is 128 bytes
    pub const SIZE: usize =
        8 +     // discriminator
        2 +     // batch_id
        8 +     // record_id
        15 +    // account_id
        15 +    // investment_id
        4 +     // version
        32 +    // wallet
        8 +     // amount_usdt
        8 +     // amount_hcoin
        1 +     // stage
        8 +     // revoked_at
        8;      // created_at
}

//
// 📤 Profit related struct
//
#[account]
#[derive(Debug)]
pub struct ProfitShareCache {
    pub batch_id: u16,                  // batch id for this profit share entry
    pub investment_id: [u8; 15],        // Links the profit share entry to the correct 
    pub version: [u8; 4],               // version
    pub subtotal_profit_usdt: u64,      // The total amount of USDT to be distributed in this ALT 
    pub subtotal_estimate_sol: u64,     // The total cost in lamports to execute  in this ALT 
    pub executed_at: i64,               // if this ALT was executed, give timestamp to executed_at to prevent double executed
    pub created_at: i64,                // Timestamp of when this ALT was created
    pub entries: Vec<ProfitEntry>,      // List of profit share entries for this ALT (up to ~100)
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ProfitEntry {
    pub account_id: [u8; 15],
    pub wallet: Pubkey,
    pub amount_usdt: u64,
    pub ratio_bp: u16,
    pub recipient_ata: Pubkey,
}

impl ProfitShareCache {
    // ENTRY_SIZE is 89 bytes
    pub const ENTRY_SIZE: usize = 15 + 32 + 8 + 2 + 32;
    // Size is 2735 bytes
    pub const SIZE: usize =
        8 +     // discriminator
        2 +     // batch_id        
        15 +    // investment_id
        4 +     // version
        8 +     // subtotal_profit_usdt
        8 +     // subtotal_estimate_sol
        8 +     // executed_at
        8 +     // created_at
        4 +     // Vec length prefix
        MAX_ENTRIES_PER_BATCH * Self::ENTRY_SIZE; // 25 × 57
}

//
// 📤 Refund related struct
//
#[account]
#[derive(Debug)]
pub struct RefundShareCache {
    pub batch_id: u16,                  // batch id for this profit share entry
    pub year_index: u8,                 // Refund at n year
    pub investment_id: [u8; 15],        // Links the refund share entry to the correct 
    pub version: [u8; 4],               // version
    pub subtotal_refund_hcoin: u64,    // The total amount of H2coin to be distributed in this ALT 
    pub subtotal_estimate_sol: u64,     // The total cost in lamports to execute  in this ALT 
    pub executed_at: i64,               // if this ALT was executed, give timestamp to executed_at to prevent double executed
    pub created_at: i64,                // Timestamp of when this ALT was created
    pub entries: Vec<RefundEntry>,      // List of refund share entries for this ALT (up to ~100)
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RefundEntry {
    pub account_id: [u8; 15],
    pub wallet: Pubkey,
    pub amount_hcoin: u64,
    pub stage: u8,
    pub recipient_ata: Pubkey,
}

impl RefundShareCache {
    // ENTRY_SIZE is 88 bytes
    pub const ENTRY_SIZE: usize = 15 + 32 + 8 + 1 + 32;
    // Size is 2706 bytes
    pub const SIZE: usize =
        8 +  // anchor discriminator
        2 +  // batch_id
        1 +  // year_index
        15 + // investment_id
        4 +  // version
        8 +  // subtotal_refund_hcoin
        8 +  // subtotal_estimate_sol
        8 +  // executed_at
        8 +  // created_at
        4 +  // Vec length prefix
        MAX_ENTRIES_PER_BATCH * Self::ENTRY_SIZE;

    /// Get refund percentage from stage_ratio
    /// 
    /// # Parameters:
    /// - `stage_ratio`: A 2D array of refund percentages, grouped as 3 stages × 10 years (`[[u8; 10]; 3]`)
    /// - `stage`: Investment stage (1, 2, or 3)
    /// - `year_index`: Which year (0-based, range: 0 ~ 9)
    ///
    /// # Returns:
    /// - The refund percentage (0 if invalid input)
    pub fn get_refund_percentage(stage_ratio: &[[u8; 10]; 3], stage: u8, year_index: u8) -> u8 {
        // stage: 1, 2, 3 → index: 0, 1, 2
        if !(1..=3).contains(&stage) || year_index >= 10 {
            return 0;
        }
        stage_ratio[(stage - 1) as usize][year_index as usize]
    }
}
