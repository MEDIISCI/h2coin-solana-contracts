// programs/h2coin_vault_share/src/context.rs

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::state::*;

#[derive(Accounts)]
#[instruction(investment_id: [u8; 15], version: [u8; 4])]
pub struct InitializeInvestmentInfo<'info> {
    //── InvestmentInfo PDA ─────────────────────────────
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


    //── Mint ────────────────────────────────────────
    pub usdt_mint: Account<'info, Mint>,
    pub hcoin_mint: Account<'info, Mint>,


    //── Vault PDA (SOL) ─────────────────────────────
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
        
    //── Vault ATA：USDT ─────────────────────────────
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = usdt_mint,
        associated_token::authority = vault,
        associated_token::token_program = token_program,
    )]
    pub vault_usdt_account: Account<'info, TokenAccount>,
    
    //── Vault ATA：H2COIN ───────────────────────────
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = hcoin_mint,
        associated_token::authority = vault,
        associated_token::token_program = token_program,
    )]
    pub vault_hcoin_account: Account<'info, TokenAccount>,

    //── payer / program / Sysvar ────────────────────
    #[account(mut)]
    pub payer: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}


#[derive(Accounts)]
pub struct UpdateInvestmentInfo<'info> {
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
    
    
    pub payer: Signer<'info>,
}
#[derive(Accounts)]
pub struct CompletedInvestmentInfo<'info> {
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
    
    #[account(mut)]
    pub payer: Signer<'info>,
}

#[derive(Accounts)]
pub struct DeactivateInvestmentInfo<'info> {
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

    #[account(mut)]
    pub payer: Signer<'info>,
}


#[derive(Accounts)]
pub struct UpdateExecuteWallet<'info> {
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

    #[account(mut)]
    pub payer: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateUpdateWallet<'info> {
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

    #[account(mut)]
    pub payer: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateWithdrawWallet<'info> {
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

    #[account(mut)]
    pub payer: Signer<'info>,
}


#[derive(Accounts)]
#[instruction(batch_id: u16, record_id: u64, account_id: [u8; 15])]
pub struct AddInvestmentRecords<'info> {
    #[account(
        seeds = [
            b"investment",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref()
        ],
        bump
    )]
    pub investment_info: Account<'info, InvestmentInfo>,

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

    //── Mint ───────────────────────
    pub usdt_mint: Account<'info, Mint>,
    pub hcoin_mint: Account<'info, Mint>,
    
    /// CHECK: recipient lamport target, manually validated
    pub recipient_account: UncheckedAccount<'info>,

    //── Recipient ATA (USDT) ───────────────
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = usdt_mint,
        associated_token::authority = recipient_account,
        associated_token::token_program = token_program,
    )]
    pub recipient_usdt_account: Account<'info, TokenAccount>,

    //── Recipient ATA (H2coin) ───────────────
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = hcoin_mint,
        associated_token::authority = recipient_account,
        associated_token::token_program = token_program,
    )]
    pub recipient_hcoin_account: Account<'info, TokenAccount>,

    //── Payer / Programs ────────────
    #[account(mut)]
    pub payer: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}


#[derive(Accounts)]
#[instruction(account_id: [u8; 15])]
pub struct UpdateInvestmentRecordWallets<'info> {
    pub investment_info: Account<'info, InvestmentInfo>,

    //── Mint ───────────────────────
    pub usdt_mint: Account<'info, Mint>,
    pub hcoin_mint: Account<'info, Mint>,

    //── Recipient (SOL) ───────────────────────
    /// CHECK: recipient lamport target, manually validated
    pub recipient_account: UncheckedAccount<'info>,

    //── Recipient ATA (USDT) ───────────────
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = usdt_mint,
        associated_token::authority = recipient_account,
        associated_token::token_program = token_program,
    )]
    pub recipient_usdt_account: Account<'info, TokenAccount>,

    //── Recipient ATA (H2coin) ───────────────
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = hcoin_mint,
        associated_token::authority = recipient_account,
        associated_token::token_program = token_program,
    )]
    pub recipient_hcoin_account: Account<'info, TokenAccount>,

    //── Payer / Programs ────────────
    /// CHECK: validated manually via 3-of-5 multisig inside instruction
    #[account(mut)]
    pub payer: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
#[instruction(batch_id:u16, record_id: u64, account_id:[u8; 15])]
pub struct RevokeInvestmentRecord<'info> {
    #[account(
        seeds = [
            b"investment",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref()
        ],
        bump
    )]
    pub investment_info: Account<'info, InvestmentInfo>,

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

    pub payer: Signer<'info>,
}

//================ handle profit share and refund share ================
#[derive(Accounts)]
#[instruction(batch_id: u16)]
pub struct EstimateProfitShare<'info> {
    #[account(
        seeds = [
            b"investment",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref()
        ],
        bump
    )]
    pub investment_info: Account<'info, InvestmentInfo>,

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


    pub mint: Account<'info, Mint>,

    // The payer is the one who pays for the transaction fees
    #[account(mut)]
    pub payer: Signer<'info>,

    // The signer is the one who signs the transaction
    #[account(mut)]
    pub signer: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(batch_id: u16, year_index: u8)]
pub struct EstimateRefundShare<'info> {
    #[account(
        seeds = [
            b"investment",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref(),
        ],
        bump
    )]
    pub investment_info: Account<'info, InvestmentInfo>,

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

    pub mint: Account<'info, Mint>,
    
    // The payer is the one who pays for the transaction fees
    #[account(mut)]
    pub payer: Signer<'info>,

    // The signer is the one who signs the transaction
    #[account(mut)]
    pub signer: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
#[instruction(batch_id: u16)]
pub struct ExecuteProfitShare<'info> {
    #[account(
        seeds = [
            b"investment",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref()
        ],
        bump
    )]
    pub investment_info: Account<'info, InvestmentInfo>,

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
 

    pub mint: Account<'info, Mint>,


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


    #[account(mut,
        associated_token::mint = mint,
        associated_token::authority = vault,
        associated_token::token_program = token_program,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,


    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,

    // 👉 ProfitShareCache accounts and recipient ATAs will be passed in through `ctx.remaining_accounts`
    // ✅ Each ProfitShareCache will be verified dynamically using batch_id
    // ✅ Each recipient ATA (for token transfer) will be matched by Pubkey
}


#[derive(Accounts)]
#[instruction(batch_id: u16, year_index: u8)]
pub struct ExecuteRefundShare<'info> {
    #[account(
        seeds = [
            b"investment",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref()
        ],
        bump
    )]
    pub investment_info: Account<'info, InvestmentInfo>,

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

    pub mint: Account<'info, Mint>,

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

    #[account(mut,
        associated_token::mint = mint,
        associated_token::authority = vault,
        associated_token::token_program = token_program,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,


    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,

    // 👉 RefundShareCache accounts and recipient ATAs will be passed in through `ctx.remaining_accounts`
    // ✅ Each RefundShareCache will be verified dynamically using batch_id
    // ✅ Each recipient ATA (for token transfer) will be matched by Pubkey
}


#[derive(Accounts)]
#[instruction()]
pub struct DepositSolToVault<'info> {
    #[account(
        seeds = [
            b"investment",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref()
        ],
        bump
    )]
    pub investment_info: Account<'info, InvestmentInfo>, 

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

    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction()]
pub struct DepositTokenToVault<'info> {
    //── Investment Info ──────────────────────────────
    #[account(
        seeds = [
            b"investment",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref()
        ],
        bump
    )]
    pub investment_info: Account<'info, InvestmentInfo>,

    //── Mint ─────────────────────────────────────────
    pub mint: Account<'info, Mint>,

    //── From ATA (USDT/H2coin) ───────────────────────
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,

    //── vault (SOL) ───────────────────────────────────
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

    //── TO ATA (USDT/H2coin) ───────────────────────────
    #[account(mut,
        associated_token::mint = mint,
        associated_token::authority = vault,
        associated_token::token_program = token_program,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,    

    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}


#[derive(Accounts)]
pub struct WithdrawFromVault<'info> {
    //── Investment Info ──────────────────────────────
    #[account(
        seeds = [
            b"investment",
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref()
        ],
        bump
    )]
    pub investment_info: Account<'info, InvestmentInfo>,

    //── Mint ───────────────────────────────────────────
    pub usdt_mint: Account<'info, Mint>,
    pub hcoin_mint: Account<'info, Mint>,

    //── vault PDA ──────────────────────────────────────
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

    //── Vault ATA (USDT) ──────────────────────────────
    #[account(mut, 
        associated_token::mint = usdt_mint, 
        associated_token::authority = vault,
        associated_token::token_program = token_program,
    )]
    pub vault_usdt_account: Account<'info, TokenAccount>,

    //── Vault ATA (H2coin) ─────────────────────────────
    #[account(mut, 
        associated_token::mint = hcoin_mint, 
        associated_token::authority = vault,
        associated_token::token_program = token_program,
    )]
    pub vault_hcoin_account: Account<'info, TokenAccount>,

    //── Recipient ──────────────────────────────────────
    #[account(mut)]
    /// CHECK: recipient passed and manually verified
    pub recipient_account: UncheckedAccount<'info>,

    //── Recipient ATA (USDT) ───────────────────────────
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = usdt_mint,
        associated_token::authority = recipient_account,
        associated_token::token_program = token_program,
    )]
    pub recipient_usdt_account: Account<'info, TokenAccount>,

    //── Recipient ATA (H2coin) ───────────────────────────
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = hcoin_mint,
        associated_token::authority = recipient_account,
        associated_token::token_program = token_program,
    )]
    pub recipient_hcoin_account: Account<'info, TokenAccount>,

    //── Payer / Programs ───────────────────────────────────
    /// CHECK: validated manually via 3-of-5 multisig inside instruction
    #[account(mut)]
    pub payer: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}
