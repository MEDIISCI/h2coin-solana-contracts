// programs/h2coin_vault_share/src/event.rs

use anchor_lang::prelude::*;

//
// 🔄 投資相關事件
//

#[event]
pub struct InvestmentInfoInitialized {
    // Investment ID (fixed-length string)
    pub investment_id: [u8; 15],
    // git commit version
    pub version: [u8; 4],
    // Vault PDA used to store funds
    pub vault: Pubkey,
    // The initializer of this investment info
    pub created_by: Pubkey,
    // UNIX timestamp
    pub created_at: i64,
}

#[event]
pub struct InvestmentUpdated {
    // Investment ID (fixed-length string)
    pub investment_id: [u8; 15],
    // git commit version
    pub version: [u8; 4],
    pub new_stage_ratio: Option<[[u8; 10]; 3]>,
    pub new_upper_limit: Option<u64>,
    // The updater of this investment info
    pub updated_by: Pubkey,
    // UNIX timestamp
    pub updated_at: i64,
    pub signers: Vec<Pubkey>,
}


#[event]
pub struct InvestmentInfoCompleted {
    // Investment ID (fixed-length string)
    pub investment_id: [u8; 15],
    // git commit version
    pub version: [u8; 4],
    // The updater of this investment info
    pub updated_by: Pubkey,
    // UNIX timestamp
    pub updated_at: i64,
    pub signers: Vec<Pubkey>,
}

#[event]
pub struct InvestmentInfoDeactivated {
    // Investment ID (fixed-length string)
    pub investment_id: [u8; 15],
    // git commit version
    pub version: [u8; 4],
    // The deactiver of this investment info
    pub deactivated_by: Pubkey,
    // UNIX timestamp
    pub deactivated_at: i64,
    pub signers: Vec<Pubkey>,
}

//
// 📑 白名單變動事件
//
#[event]
pub struct WhitelistUpdated {
    // Investment ID (fixed-length string)
    pub investment_id: [u8; 15],
    // git commit version
    pub version: [u8; 4],
    pub wallet: Pubkey,
    pub updated_by: Pubkey,
    // UNIX timestamp
    pub updated_at: i64,
    pub signers: Vec<Pubkey>,
}

//
// 📄 投資紀錄事件
//

#[event]
pub struct InvestmentRecordAdded {
    // Investment ID (fixed-length string)
    pub investment_id: [u8; 15],
    // git commit version
    pub version: [u8; 4],
    pub record_id: u64,
    pub account_id: [u8; 15],
    pub amount_usdt: u64,
    pub added_by: Pubkey,
    // UNIX timestamp
    pub added_at: i64,
    pub signers: Vec<Pubkey>,
}

#[event]
pub struct InvestmentRecordWalletUpdated {
    // Investment ID (fixed-length string)
    pub investment_id: [u8; 15],
    // git commit version
    pub version: [u8; 4],
    pub account_id: [u8; 15],
    pub new_wallet: Pubkey,
    pub updated_by: Pubkey,
    // UNIX timestamp
    pub updated_at: i64,
    pub signers: Vec<Pubkey>,
}


#[event]
pub struct InvestmentRecordRevoked {
    // Investment ID (fixed-length string)
    pub investment_id: [u8; 15],
    // git commit version
    pub version: [u8; 4],
    pub record_id: u64,
    pub revoked_by: Pubkey,
    // UNIX timestamp
    pub revoked_at: i64,
    pub signers: Vec<Pubkey>,
}

#[event]
pub struct WithdrawWhitelistUpdated {
    // Investment ID (fixed-length string)
    pub investment_id: [u8; 15],
    // git commit version
    pub version: [u8; 4],
    pub wallets: Vec<Pubkey>,
    pub updated_by: Pubkey,
    // UNIX timestamp
    pub updated_at: i64,
    pub signers: Vec<Pubkey>,
}

//
// 📤 分潤相關事件
//

#[event]
pub struct ProfitShareEstimated {
    // Each batch_id handles 25 investment records
    pub batch_id: u16,
    // Investment ID (fixed-length string)
    pub investment_id: [u8; 15],
    // git commit version
    pub version: [u8; 4],
    pub subtotal_profit_usdt: u64,
    pub subtotal_estimate_sol: u64,
    pub created_by: Pubkey,
    // UNIX timestamp
    pub created_at: i64,
    pub entry_count: u16,
    pub signers: Vec<Pubkey>,
}

#[event]
pub struct RefundShareEstimated {
    // Each batch_id handles 25 investment records
    pub batch_id: u16,
    // Investment ID (fixed-length string)
    pub investment_id: [u8; 15],
    // git commit version
    pub version: [u8; 4],
    pub year_index: u8,
    pub subtotal_refund_hcoin: u64,
    pub subtotal_estimate_sol: u64,
    pub created_by: Pubkey,
    // UNIX timestamp
    pub created_at: i64,
    pub entry_count: u16,
    pub signers: Vec<Pubkey>,
}


#[event]
pub struct ProfitShareExecuted {
    pub batch_id: u16,
    pub investment_id: [u8; 15],
    pub version: [u8; 4],
    pub total_transfer_usdt: u64,
    pub executed_by: Pubkey,
    // UNIX timestamp
    pub executed_at: i64,
    pub signers: Vec<Pubkey>,
}


#[event]
pub struct RefundShareExecuted {
    pub batch_id: u16,
    pub investment_id: [u8; 15],
    pub version: [u8; 4],
    pub year_index: u8,
    pub total_transfer_hcoin: u64,
    pub executed_by: Pubkey,
    // UNIX timestamp
    pub executed_at: i64,
    pub signers: Vec<Pubkey>,
}


#[event]
pub struct VaultDepositSolEvent {
    pub investment_id: [u8; 15],
    pub version: [u8; 4],
    pub from: Pubkey,
    pub amount_usdt: u64,
    // UNIX timestamp
    pub deposit_at: i64,
}

/// Event emitted after a successful token deposit into the vault
#[event]
pub struct VaultDepositTokenEvent {
    pub investment_id: [u8; 15],
    pub version: [u8; 4],
    pub from: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    // UNIX timestamp
    pub deposit_at: i64,
}

#[event]
pub struct VaultTransferred {
    pub investment_id: [u8; 15],
    pub version: [u8; 4],
    pub recipient: Pubkey,
    pub usdt_amount: u64,
    pub hcoin_amount: u64,
    pub sol_amount: u64,
    pub executed_by: Pubkey,
    // UNIX timestamp
    pub executed_at: i64,
    pub signers: Vec<Pubkey>,
}