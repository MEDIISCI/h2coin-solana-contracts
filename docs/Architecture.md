# 📜 Architecture: H2Coin Vault Share Protocol

This document outlines all Anchor `#[derive(Accounts)]` context definitions used in the H2Coin Vault Share Protocol. Contexts define the required accounts for each instruction and their constraints.

In Anchor, a context is a structure marked with `#[derive(Accounts)]` that declares:

*   The accounts required to invoke a specific instruction
*   PDA constraints using `seeds = [...]`
*   Access control (mutability, initialization, ownership, etc.)

---

## 🔐 Security Controls in Contexts

To ensure secure access and proper authority validation across instructions, the H2Coin Vault Share Protocol enforces multiple types of controls within each context:

### ✅ Signer Whitelist Verification

*   All instructions that modify state or move funds require a `Signer<'info>` that is checked against the appropriate whitelist (`execute_whitelist`, `update_whitelist`, `withdraw_whitelist`).
*   Whitelist membership is enforced in the instruction logic using `require!` macros.

### 🔑 Program-Derived Address (PDA) Validation

*   PDAs are derived using consistent seed formats for `investment_info`, `investment_record`, `vault`, and `cache` accounts.
*   Anchor’s `#[account(seeds = [...], bump)]` constraints ensure the PDA is valid and securely derived.

### 🪙 Token Authority

*   Token transfers and vault operations rely on `vault` PDAs as token authorities.
*   Anchor enforces token ownership and account mutability constraints (`init_if_needed`, `mut`, `associated_token_program`) to prevent unauthorized transfers.

### 📄 Account Constraints

*   `init`, `init_if_needed`, and `mut` attributes ensure accounts are correctly initialized and writable only when necessary.
*   `associated_token_program` and `system_program` are used where required for ATA creation and rent exemption.

### 🧾 ALT + Remaining Accounts

*   Instructions such as `ExecuteProfitShare` and `ExecuteRefundShare` leverage Address Lookup Tables (ALT) to pass large batches of investor accounts securely via `remaining_accounts`.

---

## 🧩 ALT-Based Account Passing Design

The **H2Coin Vault Share Protocol** leverages Solana’s **Address Lookup Table (ALT)** mechanism to efficiently and securely handle the transmission of large sets of accounts, particularly for the following instructions:

*   `execute_profit_share`
*   `execute_refund_share`

### 🧱 ALT Structure Design Principles

*   Each ALT group supports up to **30 accounts** (e.g., 30 `InvestmentRecord` PDAs).
*   ALT accounts are constructed externally and passed in through the transaction.

### ✅ Account Passing Strategy

*   ALT contents are passed into Anchor instructions via the `remaining_accounts` array.
*   Inside the instruction, `InvestmentInfo` is used to verify the validity of each passed account based on PDA seeds.

---

## 🧩 State Structs Overview

| Struct Name | Purpose | Key Fields |
| --- | --- | --- |
| `InvestmentInfo` | Represents a single investment project, including whitelist, vault, and state. | `investment_id`, `vault`, `execute/update/withdraw_whitelist`, `state`, `investment_actual_amount` |
| `InvestmentRecord` | Tracks a specific investment entry made by an investor. | `investment_record_id`, `account_id`, `amount_usdt`, `investment_stage` |
| `ProfitShareCache` | Caches a snapshot of the profit-sharing plan before execution. | `total_profit_share`, `estimate_sol`, `entries: Vec<ProfitEntry>` |
| `ProfitEntry` | Represents a single investor’s share in a profit distribution. | `account_id`, `wallet`, `amount_usdt`, `ratio_bp` |

---

## 🧱 Context Structs Overview

This table lists all `#[derive(Accounts)]` context structs used in the H2Coin Vault Share Protocol, along with their purpose and key accounts involved.

| Context Name | Purpose | Key Accounts Involved |
| --- | --- | --- |
| `InitializeInvestmentInfo` | Initialize a new investment and vault PDA | `investment_info`, `payer`, `system_program` |
| `UpdateInvestmentInfo` | Update investment metadata (limits, version, state) | `investment_info`, `signer` |
| `CompletedInvestmentInfo` | Mark investment as completed | `investment_info`, `signer` |
| `DeactivateInvestmentInfo` | Mark investment as inactive (deactivated) | `investment_info`, `signer` |
| `UpdateExecuteWallet` | Update one signer in the `execute_whitelist` | `investment_info`, `signer` |
| `UpdateUpdateWallet` | Update one signer in the `update_whitelist` | `investment_info`, `signer` |
| `UpdateWithdrawWallet` | Update one signer in the `withdraw_whitelist` | `investment_info`, `signer` |
| `AddInvestmentRecords` | Add a new investment record and initialize the PDA | `investment_info`, `investment_record`, `payer`, `system_program` |
| `UpdateInvestmentRecordWallets` | Update an existing investor wallet inside a record | `investment_info`, `payer` |
| `RevokeInvestmentRecord` | Mark an investment record as revoked | `investment_info`, `investment_record`, `payer` |
| `EstimateProfitShare` | Estimate profit shares for a batch (creates ProfitShareCache) | `investment_info`, `cache`, `mint`, `payer`, `system_program` |
| `ExecuteProfitShare` | Distribute USDT to investors from vault for a batch | `investment_info`, `cache`, `vault`, `vault_token_account`, `mint`, `payer`, `token_program`, `associated_token_program` |
| `EstimateRefundShare` | Estimate H2Coin refunds based on year and investment stage | `investment_info`, `cache`, `mint`, `payer`, `system_program` |
| `ExecuteRefundShare` | Execute H2Coin refund distribution from vault | `investment_info`, `cache`, `vault`, `vault_token_account`, `mint`, `payer`, `token_program`, `associated_token_program` |
| `DepositSolToVault` | Deposit SOL into the vault PDA | `investment_info`, `vault`, `payer`, `system_program` |
| `DepositTokenToVault` | Deposit USDT/H2Coin into the vault’s token account (ATA) | `investment_info`, `vault`, `from`, `mint`, `vault_token_account`, `payer`, `token_program`, `associated_token_program` |
| `WithdrawFromVault` | Transfer remaining vault balance to withdraw whitelist wallet | `investment_info`, `vault`, `vault_token_ata`, `vault_usdt_account`, `vault_hcoin_account`, `usdt_mint`, `hcoin_mint`, `payer`, `token_program`, `system_program`, `associated_token_program` |

---

## ⚙️ Instructions Function Overview

| Function Name | Purpose | update\_whitelist (3-of-5) | execute\_whitelist (3-of-5) |
| --- | --- | --- | --- |
| `initialize_investment_info` | Create a new investment with ID, version, whitelist, and vault | — | — |
| `update_investment_info` | Update version, state, or upper limit | ✅ | — |
| `update_execute_wallet` | Replace one signer in execute whitelist | — | ✅ |
| `update_update_wallet` | Replace one signer in update whitelist | ✅ | — |
| `update_withdraw_wallet` | Replace one signer in withdraw whitelist | — | ✅ |
| `update_investor_wallet` | Modify an investor's wallet | ✅ | — |
| `revoke_investment_record` | Mark an investment record as revoked | ✅ | — |
| `add_investment_records` | Create multiple investment records and update totals | ✅ | — |
| `estimate_profit_share` | Aggregate records, calculate ratio & write to cache | Any whitelist signer | Any whitelist signer |
| `execute_profit_share` | Transfer USDT from PDA to recipients using associated token account | — | ✅ |
| `estimate_refund_share` | Aggregate refund records by stage & year, write to cache | Any whitelist signer | Any whitelist signer |
| `execute_refund_share` | Transfer H2COIN from PDA to recipients using associated token account | — | ✅ |
| `deposit_sol_to_vault` | Transfer SOL from payer to vault PDA | — | — |
| `deposit_token_to_vault` | Transfer token from payer to vault ATA | — | — |
| `withdraw_from_vault` | Transfer remaining vault token balance to whitelist wallet | — | ✅ |