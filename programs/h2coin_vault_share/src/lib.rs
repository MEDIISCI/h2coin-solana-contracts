// programs/h2coin_vault_share/src/lib.rs

#![allow(unexpected_cfgs)]
#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;


pub mod context;
pub mod instructions;
pub mod state;
pub mod event;
pub mod constants;
pub mod error;

use crate::state::*;
use crate::context::*;


declare_id!("ALjifiKwvSzKLfpebFZ185b3mLAxroEvxYXCcy9Lzw2B");



#[program]
pub mod h2coin_vault_share {

    use super::*;

    //================ handle investment info ================
    #[allow(clippy::too_many_arguments)]
    pub fn initialize_investment_info(
        ctx: Context<InitializeInvestmentInfo>,
        investment_id: [u8; 15],
        version: [u8; 4],
        investment_type: InvestmentType,
        stage_ratio: [[u8; 10]; 3],
        start_at: i64,
        end_at: i64,
        investment_upper_limit: u64,
        execute_whitelist: Vec<Pubkey>,
        update_whitelist: Vec<Pubkey>,
        withdraw_whitelist: Vec<Pubkey>,
    ) -> Result<()> {
        instructions::initialize_investment_info(
            ctx,
            investment_id,
            version,
            investment_type,
            stage_ratio,
            start_at,
            end_at,
            investment_upper_limit,
            execute_whitelist,
            update_whitelist,
            withdraw_whitelist,
        )
    }

    pub fn update_investment_info(
        ctx: Context<UpdateInvestmentInfo>,
        new_stage_ratio: Option<[[u8; 10]; 3]>,
        new_upper_limit: Option<u64>,
    ) -> Result<()> {
        instructions::update_investment_info(ctx, new_stage_ratio, new_upper_limit)
    }

    pub fn completed_investment_info(ctx: Context<CompletedInvestmentInfo>) -> Result<()> {
        instructions::completed_investment_info(ctx)
    }    

    pub fn deactivate_investment_info(ctx: Context<DeactivateInvestmentInfo>) -> Result<()> {
        instructions::deactivate_investment_info(ctx)
    }    

    pub fn patch_execute_whitelist(ctx: Context<UpdateExecuteWallet>) -> Result<()> {
        instructions::patch_execute_whitelist(ctx)
    }

    pub fn patch_update_whitelist(ctx: Context<UpdateUpdateWallet>) -> Result<()> {
        instructions::patch_update_whitelist(ctx)
    }

    pub fn patch_withdraw_whitelist(ctx: Context<UpdateWithdrawWallet>) -> Result<()> {
        instructions::patch_withdraw_whitelist(ctx)
    }


    //================ handle investment records ================
    #[allow(clippy::too_many_arguments)]
    pub fn add_investment_record(
        ctx: Context<AddInvestmentRecords>,
        batch_id: u16,
        record_id: u64,
        account_id: [u8; 15],
        amount_usdt: u64,
        amount_hcoin: u64,
        investment_stage: u8,
    ) -> Result<()> {
        instructions::add_investment_record(ctx, batch_id, record_id, account_id, amount_usdt, amount_hcoin, investment_stage)
    }

    pub fn update_investment_record_wallets<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, UpdateInvestmentRecordWallets<'info>>,
        account_id: [u8; 15],
    ) -> Result<()> 
    where 
        'c: 'info,
    {
        instructions::update_investment_record_wallets(ctx, account_id)
    }

    pub fn revoked_investment_record(
        ctx: Context<RevokeInvestmentRecord>,
        batch_id: u16,
        record_id: u64,
        account_id: [u8; 15],
    ) -> Result<()> {
        instructions::revoked_investment_record(ctx, batch_id, record_id, account_id)
    }

    //================ handle estimate report and execute distribution ================
    pub fn estimate_profit_share<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, EstimateProfitShare<'info>>,
        batch_id: u16,
        total_profit_usdt: u64,
        total_invest_usdt: u64,
    ) -> Result<()>
    where
        'c: 'info,
    {
        instructions::estimate_profit_share(ctx, batch_id, total_profit_usdt, total_invest_usdt)
    }
    

    pub fn estimate_refund_share<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, EstimateRefundShare<'info>>,
        batch_id: u16,
        year_index: u8
    ) -> Result<()>
    where
        'c: 'info, 
    {
        instructions::estimate_refund_share(ctx, batch_id, year_index)
    }


    pub fn execute_profit_share<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, ExecuteProfitShare<'info>>,
        batch_id: u16,
    ) -> Result<()>
    where
        'c: 'info,
    {
        instructions::execute_profit_share(ctx, batch_id)
    }

    pub fn execute_refund_share<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, ExecuteRefundShare<'info>>,
        batch_id: u16,
        year_index: u8
    ) -> Result<()>
    where
        'c: 'info,
    {
        instructions::execute_refund_share(ctx, batch_id, year_index)
    }

    //================ handle deposit to vault and withdraw from vault ================

    pub fn deposit_sol_to_vault(ctx: Context<DepositSolToVault>, amount: u64) -> Result<()> {
        instructions::deposit_sol_to_vault(ctx, amount)
    }

    pub fn deposit_token_to_vault(ctx: Context<DepositTokenToVault>, amount: u64) -> Result<()> {
        instructions::deposit_token_to_vault(ctx, amount)
    }

    pub fn withdraw_from_vault<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, WithdrawFromVault<'info>>,
    ) -> Result<()>
    where
        'c: 'info,
    {
        instructions::withdraw_from_vault(ctx)
    }


}