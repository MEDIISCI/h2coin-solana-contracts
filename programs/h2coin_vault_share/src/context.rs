// programs/h2coin_vault_share/src/context.rs

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Token, TokenAccount, Mint},
};

use crate::state::*;

#[derive(Accounts)]
#[instruction(investment_id: [u8; 15], version: [u8; 4])]
pub struct InitializeInvestmentInfo<'info> {
    #[account(
        init,
        space = InvestmentInfo::SIZE,
        seeds = [
            b"investment", 
            investment_id.as_ref(), 
            version.as_ref()
        ],
        bump,
        payer = payer,
    )]
    pub investment_info: Account<'info, InvestmentInfo>,

    /// CHECK: vault PDA is derived from seeds and only used for lamports/token transfer, not deserialized
    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
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
    
    /// CHECK: validated manually via 3-of-5 signatures
    #[account()]
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
#[instruction(batch_id:u16, record_id: u64, account_id:[u8; 15])]
pub struct AddInvestmentRecords<'info> {
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

    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
#[instruction(account_id: [u8; 15])]
pub struct UpdateInvestmentRecordWallets<'info> {
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

    /// CHECK: validated manually via 3-of-5 multisig inside instruction
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(batch_id:u16, record_id: u64, account_id:[u8; 15])]
pub struct RevokeInvestmentRecord<'info> {
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
        mut,
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

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(batch_id: u16, year_index: u8)]
pub struct EstimateRefundShare<'info> {
    #[account(
        mut,
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

    #[account(mut)]
    pub mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
#[instruction(batch_id: u16)]
pub struct ExecuteProfitShare<'info> {
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

    #[account(
        mut,
        seeds = [
            b"profit_cache", 
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref(),
            batch_id.to_le_bytes().as_ref(),
        ],
        bump,
    )]
    pub cache: Account<'info, ProfitShareCache>,

    #[account(
        mut,
        seeds = [
            b"vault", 
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref(),
        ],
        bump
    )]
    /// CHECK: This is a derived PDA; validated by seeds
    pub vault: AccountInfo<'info>,

    #[account(
        mut,
        constraint = vault_token_account.owner == vault.key(),
        constraint = vault_token_account.mint == mint.key()
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

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
        mut,
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
            b"refund_cache", 
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref(),
            batch_id.to_le_bytes().as_ref(),
            year_index.to_le_bytes().as_ref(),
        ],
        bump,
    )]
    pub cache: Account<'info, RefundShareCache>,

    #[account(
        mut,
        seeds = [
            b"vault", 
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref(),
        ],
        bump
    )]
    /// CHECK: This is a derived PDA; validated by seeds
    pub vault: AccountInfo<'info>,

    #[account(
        mut,
        constraint = vault_token_account.owner == vault.key(),
        constraint = vault_token_account.mint == mint.key()
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

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
    #[account(mut)]
    pub investment_info: Account<'info, InvestmentInfo>,  

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init_if_needed,
        seeds = [
            b"vault", 
            investment_info.investment_id.as_ref(), 
            investment_info.version.as_ref(),
        ],
        bump,
        payer = payer,
        space = 0,
        owner = system_program.key() 
    )]
    /// CHECK: This vault PDA holds SOL, no deserialization needed
    pub vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction()]
pub struct DepositTokenToVault<'info> {
    #[account(mut)]
    pub investment_info: Account<'info, InvestmentInfo>, 

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [
            b"vault", 
            investment_info.investment_id.as_ref(), 
            investment_info.version.as_ref()
        ],
        bump
    )]
    /// CHECK: validated by PDA logic
    pub vault: AccountInfo<'info>,

    #[account(mut)]
    pub from: Account<'info, TokenAccount>, // ⬅️ 使用者的 ATA

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = vault
    )]
    pub vault_token_account: Account<'info, TokenAccount>,    

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}


#[derive(Accounts)]
pub struct WithdrawFromVault<'info> {
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

    /// CHECK: vault PDA is derived from seeds and only used for lamports/token transfer, not deserialized
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub usdt_mint: Account<'info, Mint>,

    #[account(mut)]
    pub hcoin_mint: Account<'info, Mint>,

    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
