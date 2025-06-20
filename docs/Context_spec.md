# 📜 Context Specification: H2Coin Vault Share Protocol

This document outlines all Anchor `#[derive(Accounts)]` context structures used in the **H2Coin Vault Share Protocol**. Each context defines the required accounts and constraints necessary to execute specific instructions safely and correctly.

In Anchor, a context marked with `#[derive(Accounts)]` serves three main purposes:

*   📌 **Account Declaration**: Lists the accounts required to invoke the instruction.
*   🔐 **PDA Constraint Validation**: Enforces that program-derived addresses (PDAs) match expected `seeds = [...]` and `bump` values.
*   🔍 **Access Control**: Specifies whether accounts must be mutable (`mut`), initialized (`init`, `init_if_needed`), or match ownership/signing conditions (`Signer<'info>`).

---

## 🔐 Security Controls in Contexts

To ensure secure access and proper authority validation across instructions, the H2Coin Vault Share Protocol enforces multiple types of controls within each context:

### ✅ Signer Whitelist Verification

*   All instructions that modify state or move funds require a `Signer<'info>` that is checked against the appropriate whitelist (`execute_whitelist`, `update_whitelist`, `withdraw_whitelist`).
*   Whitelist membership is enforced in the instruction logic using `require!` macros.

### 🔑 Program-Derived Address (PDA) Validation

*   PDAs are derived using consistent seed formats for `investment_info`, `investment_record`, `vault`, `cache`, and `alt_group` accounts.
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

## 🧱 Context Struct Overview

This table lists all `#[derive(Accounts)]` context structs used in the H2Coin Vault Share Protocol, along with their purpose and key accounts involved.

| Context Name | Purpose | Key Accounts Involved |
| --- | --- | --- |
| `InitializeInvestmentInfo` | Initialize a new investment and vault PDA | `investment_info`, `payer`, `vault`, `system_program`, `vault_usdt_account`, `vault_hcoin_account` |
| `UpdateInvestmentInfo` | Update investment metadata (limits, version, state) | `investment_info`, `signer` |
| `CompletedInvestmentInfo` | Mark investment as completed | `investment_info`, `signer` |
| `DeactivateInvestmentInfo` | Mark investment as inactive (deactivated) | `investment_info`, `signer` |
| `UpdateExecuteWallet` | Update one signer in the `execute_whitelist` | `investment_info`, `signer` |
| `UpdateUpdateWallet` | Update one signer in the `update_whitelist` | `investment_info`, `signer` |
| `UpdateWithdrawWallet` | Update one signer in the `withdraw_whitelist` | `investment_info`, `signer` |
| `AddInvestmentRecords` | Add a new investment record and initialize the PDA | `investment_info`, `investment_record`, `payer`, `vault`, `system_program`, `usdt_mint`, `hcoin_mint`, `recipient_usdt_account`, `recipient_hcoin_account` |
| `UpdateInvestmentRecordWallets` | Update an existing investor wallet inside a record | `investment_info`, `payer`, `recipient_account`, `recipient_usdt_account`, `recipient_hcoin_account`, `usdt_mint`, `hcoin_mint`, `associated_token_program`, `token_program`, `system_program` |
| `RevokeInvestmentRecord` | Mark an investment record as revoked | `investment_info`, `investment_record`, `payer` |
| `EstimateProfitShare` | Estimate profit shares for a batch (creates ProfitShareCache) | `investment_info`, `cache`, `mint`, `payer`, `system_program` |
| `ExecuteProfitShare` | Distribute USDT to investors from vault for a batch | `investment_info`, `cache`, `vault`, `vault_token_account`, `mint`, `payer`, `token_program`, `associated_token_program` |
| `EstimateRefundShare` | Estimate H2Coin refunds based on year and investment stage | `investment_info`, `cache`, `mint`, `payer`, `system_program` |
| `ExecuteRefundShare` | Execute H2Coin refund distribution from vault | `investment_info`, `cache`, `vault`, `vault_token_account`, `mint`, `payer`, `token_program`, `associated_token_program` |
| `DepositSolToVault` | Deposit SOL into the vault PDA | `investment_info`, `vault`, `payer`, `system_program` |
| `DepositTokenToVault` | Deposit USDT/H2Coin into the vault’s token account (ATA) | `investment_info`, `vault`, `from`, `mint`, `vault_token_account`, `payer`, `token_program`, `associated_token_program` |
| `WithdrawFromVault` | Transfer remaining vault balance to withdraw whitelist wallet | `investment_info`, `vault`, `vault_usdt_account`, `vault_hcoin_account`, `usdt_mint`, `hcoin_mint`, `recipient_account`, `recipient_usdt_account`, `recipient_hcoin_account`, `payer`, `token_program`, `system_program`, `associated_token_program`, `rent` |


---

## 🏗️ Investment Info Instructions

### `InitializeInvestmentInfo`

Initializes a new `InvestmentInfo` account.

| Account | Type | Mutable | Description |
| --- | --- | --- | --- |
| `investment_info` | `Account<InvestmentInfo>` | ✅ | New PDA to be initialized |
| `payer` | `Signer` | ✅ | Funds rent and transaction |
| `vault` | `UncheckedAccount` | ✅ (init_if_needed) | Derived vault PDA for SOL/token authority |
| `system_program` | `Program<System>` | ❌ | Rent exemption |
| `token_program` | `Program<Token>` | ❌ | Token CPI transfer check |
| `associated_token_program` | `Program<AssociatedToken>` | ❌ | Required for ATA ops |

---

### `UpdateInvestmentInfo`, `CompletedInvestmentInfo`, `DeactivateInvestmentInfo`

Modifies an existing `InvestmentInfo` account.

| Account | Type | Mutable | Description |
| --- | --- | --- | --- |
| `investment_info` | `Account<InvestmentInfo>` | ✅ | Target to update |
| `payer` | `Signer` | ✅ | Signer to authorize action |

> ✅ Uses PDA seeds `["investment", investment_id, version]`

---

### `UpdateExecuteWallet`, `UpdateUpdateWallet`, `UpdateWithdrawWallet`

Modifies whitelist on `InvestmentInfo`.

| Account | Type | Mutable | Description |
| --- | --- | --- | --- |
| `investment_info` | `Account<InvestmentInfo>` | ✅ | Modified via multisig |
| `payer` | `Signer` | ✅ | Must be on multisig list |
| `system_program` | `Program<System>` | ❌ | Rent exemption |


---

## 🧾 Investment Record Instructions

### `AddInvestmentRecords`

Creates a new `InvestmentRecord` for a user.

| Account | Type | Mutable | Description |
| --- | --- | --- | --- |
| `investment_info` | `Account<InvestmentInfo>` | ✅ | Parent info; seeds `["investment", investment_id, version]` |
| `investment_record` | `Account<InvestmentRecord>` | ✅ (`init`) | PDA `["record", investment_id, version, batch_id, record_id, account_id]` |
| `usdt_mint` | `Account<Mint>` | ✅ | USDT mint (for ATA authority check) |
| `hcoin_mint` | `Account<Mint>` | ✅ | H2COIN mint |
| `recipient_usdt_account` | `Account<TokenAccount>` | ✅ (`init_if_needed`) | ATA for investor wallet × USDT |
| `recipient_hcoin_account` | `Account<TokenAccount>` | ✅ (`init_if_needed`) | ATA for investor wallet × H2COIN |
| `payer` | `Signer` | ✅ | Funds rent & must be in update‑whitelist multisig |
| `rent` | `Sysvar<Rent>` | ❌ | Rent calculations |
| `system_program` | `Program<System>` | ❌ | Needed for `init` |
| `token_program` | `Program<Token>` | ❌ | Required for ATA creation |
| `associated_token_program` | `Program<AssociatedToken>` | ❌ | ATA helper program |
---

### `UpdateInvestmentRecordWallets`

Patches wallet of existing records with same `account_id`.

| Account | Type | Mutable | Description |
| --- | --- | --- | --- |
| `investment_info` | `Account<InvestmentInfo>` | ✅ | Validates authority & state; seeds `["investment", investment_id, version]` |
| `usdt_mint` | `Account<Mint>` | ✅ | Ensures ATAs correspond to USDT mint |
| `hcoin_mint` | `Account<Mint>` | ✅ | Ensures ATAs correspond to H2COIN mint |
| `recipient_account` | `UncheckedAccount` | ❌ | Target wallet address to patch into records |
| `recipient_usdt_account` | `Account<TokenAccount>` | ✅ (`init_if_needed`) | ATA for `recipient_account` × `usdt_mint` |
| `recipient_hcoin_account` | `Account<TokenAccount>` | ✅ (`init_if_needed`) | ATA for `recipient_account` × `hcoin_mint` |
| `payer` | `Signer` | ✅ | Pays rent for new ATAs; must be in 3‑of‑5 **update_whitelist** |
| `rent` | `Sysvar<Rent>` | ❌ | Rent‑exemption calculations |
| `system_program` | `Program<System>` | ❌ | Required by `init_if_needed` |
| `token_program` | `Program<Token>` | ❌ | SPL‑Token CPI used by ATA creation |
| `associated_token_program` | `Program<AssociatedToken>` | ❌ | Creates ATAs when absent |

---

### `RevokeInvestmentRecord`

Marks an `InvestmentRecord` as revoked.

| Account | Type | Mutable | Description |
| --- | --- | --- | --- |
| `investment_info` | `Account<InvestmentInfo>` | ✅ | Parent of the record |
| `investment_record` | `Account<InvestmentRecord>` | ✅ | Target to revoke |
| `payer` | `Signer` | ✅ | Auth signer |

---

## 📊 Profit and Refund Share

### `EstimateProfitShare`

Generates and stores a `ProfitShareCache` for batch.

| Account | Type | Mutable | Description |
| --- | --- | --- | --- |
| `investment_info` | `Account<InvestmentInfo>` | ✅ | Reference for batch |
| `cache` | `Account<ProfitShareCache>` | ✅ (init\_if\_needed) | Stores estimates |
| `mint` | `Account<Mint>` | ✅ | Token used (USDT) |
| `payer` | `Signer` | ✅ | Funds creation |
| `system_program` | `Program<System>` | ❌ | Anchor requirement |

---

### `EstimateRefundShare`

Estimates refund for a batch-year.

| Account | Type | Mutable | Description |
| --- | --- | --- | --- |
| `investment_info` | `Account<InvestmentInfo>` | ✅ | Parent info |
| `cache` | `Account<RefundShareCache>` | ✅ (init\_if\_needed) | Stores refund info |
| `mint` | `Account<Mint>` | ✅ | Token (H2COIN) |
| `payer` | `Signer` | ✅ | Pays creation |
| `system_program` | `Program<System>` | ❌ | Required by Anchor |

---

### `ExecuteProfitShare`, `ExecuteRefundShare`

Transfers tokens to users using cached estimates.

| Account | Type | Mutable | Description |
| --- | --- | --- | --- |
| `investment_info` | `Account<InvestmentInfo>` | ✅ | Source info |
| `cache` | `Account<...Cache>` | ✅ | Contains entries |
| `vault` | `AccountInfo` | ✅ | Token authority (PDA) |
| `vault_token_account` | `Account<TokenAccount>` | ✅ | PDA-owned ATA |
| `mint` | `Account<Mint>` | ✅ | Token mint (USDT/H2COIN) |
| `payer` | `Signer` | ✅ | Signs tx |
| `system_program` | `Program<System>` | ❌ | General ops |
| `token_program` | `Program<Token>` | ❌ | CPI for transfer |
| `associated_token_program` | `Program<AssociatedToken>` | ❌ | For ATA ops |

> 📝 Recipient ATAs + ALT-resolved investor keys passed in `remaining_accounts`

---

## 💰 Vault Instructions

### `DepositSolToVault`

Transfers native SOL into the vault PDA.

| Account | Type | Mutable | Description |
| --- | --- | --- | --- |
| `investment_info` | `Account<InvestmentInfo>` | ✅ | Lookup vault seeds |
| `payer` | `Signer` | ✅ | Pays and deposits |
| `vault` | `UncheckedAccount` | ✅ (init\_if\_needed) | PDA stores lamports |
| `system_program` | `Program<System>` | ❌ | System requirement |

---

### `DepositTokenToVault`

Transfers SPL tokens into vault ATA.

| Account | Type | Mutable | Description |
| --- | --- | --- | --- |
| `investment_info` | `Account<InvestmentInfo>` | ✅ | Guides vault seeds |
| `payer` | `Signer` | ✅ | Pays rent if needed |
| `vault` | `AccountInfo` | ❌ | PDA owner who holding SOL |
| `from` | `Account<TokenAccount>` | ✅ | Sender's ATA |
| `mint` | `Account<Mint>` | ✅ | Token mint (USDT/H2COIN) |
| `vault_token_account` | `Account<TokenAccount>` | ✅ | PDA-owned ATA |
| `system_program` | `Program<System>` | ❌ | Anchor system |
| `token_program` | `Program<Token>` | ❌ | Used for transfer |
| `associated_token_program` | `Program<AssociatedToken>` | ❌ | Creates ATA if needed |

---

### `WithdrawFromVault`

Transfers vault funds (SOL, USDT, H2COIN) to authorized wallets.

| Account | Type | Mutable | Description |
| --- | --- | --- | --- |
| `investment_info` | `Account<InvestmentInfo>` | ✅ | Lookup whitelist |
| `usdt_mint` | `Account<Mint>` | ✅ | Ensures ATAs correspond to USDT mint |
| `hcoin_mint` | `Account<Mint>` | ✅ | Ensures ATAs correspond to H2COIN mint |
| `vault` | `AccountInfo` | ✅ | PDA owner who holding SOL |
| `vault_usdt_account` | `Account<TokenAccount>` | ✅ | USDT vault ATA |
| `vault_hcoin_account` | `Account<TokenAccount>` | ✅ | H2COIN vault ATA |
| `recipient_account` | `UncheckedAccount` | ❌ | Target wallet address to patch into records |
| `recipient_usdt_account` | `Account<TokenAccount>` | ✅ (`init_if_needed`) | ATA for `recipient_account` × `usdt_mint` |
| `recipient_hcoin_account` | `Account<TokenAccount>` | ✅ (`init_if_needed`) | ATA for `recipient_account` × `hcoin_mint` |
| `payer` | `Signer` | ✅ | Pays rent for new ATAs; must be in 3‑of‑5 **update_whitelist** |
| `rent` | `Sysvar<Rent>` | ❌ | Rent‑exemption calculations |
| `system_program` | `Program<System>` | ❌ | Required by `init_if_needed` |
| `token_program` | `Program<Token>` | ❌ | SPL‑Token CPI used by ATA creation |
| `associated_token_program` | `Program<AssociatedToken>` | ❌ | Creates ATAs when absent |

---

✅ This context spec allows developers, auditors, and frontends to understand account requirements across instructions.