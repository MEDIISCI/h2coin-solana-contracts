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

*   PDAs are derived using consistent seed formats for `investment_info`, `investment_record`, `vault and` `cache` accounts.
*   Anchor’s `#[account(seeds = [...], bump)]` constraints ensure the PDA is valid and securely derived.

### 🪙 Token Authority

*   Token transfers and vault operations rely on `vault` PDAs as token authorities.
*   Anchor enforces token ownership and account mutability constraints (`init_if_needed`, `mut`, `associated_token_program`) to prevent unauthorized transfers.

### 📊 Account Constraints

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

## 📑 Instructions - Investment Info

Initializes a new investment configuration account (InvestmentInfo), a vault PDA for holding SOL, and associated token accounts (ATAs) for USDT and H2COIN.

### 🚀 Arguments `- InitializeInvestmentInfo`

| Name | Type | Description |
| --- | --- | --- |
| `investment_id` | `[u8; 15]` | investment ID. |
| `version` | `[u8; 4]` | version. |

### 🔑 PDA seeds

> Investment Info: `["investment", investment_id, version]`
> 
> Vault: `["vault", investment_id, version]`

### 📦 Account Metadata `- InitializeInvestmentInfo`

| Account | Type | Init | Mutable | Description |
| --- | --- | --- | --- | --- |
| `investment_info` | `Account<InvestmentInfo>` | ✅ | ✅ | PDA that stores investment configuration (newly initialized). |
| `payer` | `Signer` | ❌ | ✅ | Pays rent and all initialization-related fees. |
| `vault` | `UncheckedAccount` | ✅ (if needed) | ✅ | Derived PDA that holds SOL and acts as authority for token vaults. |
| `vault_usdt_account` | `Account<TokenAccount>` | ✅ (if needed) | ✅ | Associated Token Account (ATA) for USDT held by the vault. |
| `vault_hcoin_account` | `Account<TokenAccount>` | ✅ (if needed) | ✅ | Associated Token Account (ATA) for H2COIN held by the vault. |
| `usdt_mint` | `Account<Mint>` | ❌ | ❌ | The USDT token mint. |
| `hcoin_mint` | `Account<Mint>` | ❌ | ❌ | The H2COIN token mint. |
| `system_program` | `Program<System>` | ❌ | ❌ | Required to initialize PDAs and accounts. |
| `token_program` | `Program<Token>` | ❌ | ❌ | Required for all token-related operations. |
| `associated_token_program` | `Program<AssociatedToken>` | ❌ | ❌ | Required for creating associated token accounts (ATAs). |
| `rent` | `Sysvar<Rent>` | ❌ | ❌ | Used for rent exemption when initializing accounts. Optional in recent Anchor versions, but safe to include. |

---

### `📦 Account Metadata - UpdateInvestmentInfo`, `CompletedInvestmentInfo`, `DeactivateInvestmentInfo`

Modifies core fields or state flags on an existing InvestmentInfo.

| Account | Type | Mutable | Description |
| --- | --- | --- | --- |
| `investment_info` | `Account<InvestmentInfo>` | ✅ | Target account to update. Must match PDA seeds. |
| `payer` | `Signer` | ✅ | Signs the transaction and pays fees. Must be **on the update-whitelist** _(3-of-5 rule enforced in instruction logic)_. |

### Behaviour Matrix

| State Before | Instruction | State After | Notes |
| --- | --- | --- | --- |
| **Active** & _NotCompleted_ | `UpdateInvestmentInfo` | **Active** & _NotCompleted_ | Updates mutable fields only. |
| **Active** & _NotCompleted_ | `CompletedInvestmentInfo` | **Active** & _Completed_ | Locks most fields; enables profit-share. |
| Any | `DeactivateInvestmentInfo` | **Inactive** | Disables all future activity. |

---

### `📦 Account Metadata - UpdateExecuteWallet`, `UpdateUpdateWallet`, `UpdateWithdrawWallet`

Rotates the 5-member multisig arrays stored inside InvestmentInfo.

| Account | Type | Mutable | Description |
| --- | --- | --- | --- |
| `investment_info` | `Account<InvestmentInfo>` | ✅ | Holds the three whitelist arrays (`execute`, `update`, `withdraw`). |
| `payer` | `Signer` | ✅ | **Must already belong to the target whitelist** and satisfies the 3-of-5 rule for this update. |
| `system_program` | `Program<System>` | ❌ | Required only when resizing (rare). Included for rent-exemption safety. |

### Whitelist Rotation Flow

1.  Client prepares the new array of 5 wallet pubkeys.
2.  Calls the appropriate Update instruction, passing:
    *   new\_wallets: \[Pubkey; 5\]
3.  On-chain logic:
    *   Verifies payer ∈ current whitelist.
    *   Verifies ≥ 3 valid signatures (3-of-5).
    *   Overwrites the corresponding whitelist field.
    *   Emits WalletWhitelistUpdated event.

### Security Notes

*   3-of-5 Multisig: Every state-changing instruction checks that exactly 5 expected pubkeys are present and that at least 3 have signed (is\_signer).
*   PDA authority: Only the derived PDA (investment\_info) is mutated; SOL and token transfers remain gated by the vault PDA created during initialization.
*   Idempotency: All instructions are safe to retry—Anchor’s mut constraint plus internal state checks prevent double-spending or duplicate mutations.

---

## 📑 Instructions `-` Investment Record

Creates and initializes an InvestmentRecord PDA for an individual investor, plus the two token vault ATAs (USDT + H2COIN) tied to that investor’s wallet.

### 🚀 Arguments - `AddInvestmentRecords`

| Name | Type | Description |
| --- | --- | --- |
| `batch_id` | `u16` | Batch identifier (1 … N). |
| `record_id` | `u64` | Auto-incrementing record index within the batch. |
| `account_id` | `[u8; 15]` | Off-chain user identifier (15-byte fixed string). |

### 🔑 PDA seeds

> record: `["record", investment_id, version, batch_id, record_id, account_id]`

### 📦 Account Metadata `- AddInvestmentRecords`

| Account | Type | Init | Mutable | Description |
| --- | --- | --- | --- | --- |
| `investment_info` | `Account<InvestmentInfo>` | ❌ | ❌ | Parent investment config. PDA seeds = `["investment", investment_id, version]`. |
| `investment_record` | `Account<InvestmentRecord>` | ✅ | ✅ | New PDA for the investor. Seeds = `["record", investment_id, version, batch_id, record_id, account_id]`. |
| `usdt_mint` | `Account<Mint>` | ❌ | ❌ | USDT SPL-Token mint. |
| `hcoin_mint` | `Account<Mint>` | ❌ | ❌ | H2COIN SPL-Token mint. |
| `recipient_account` | `UncheckedAccount` | ❌ | ❌ | Investor’s main wallet (lamport address). Manually verified in CPI. |
| `recipient_usdt_account` | `Account<TokenAccount>` | ✅ (if needed) | ✅ | Investor’s **ATA** for USDT (authority = `recipient_account`). |
| `recipient_hcoin_account` | `Account<TokenAccount>` | ✅ (if needed) | ✅ | Investor’s **ATA** for H2COIN (authority = `recipient_account`). |
| `payer` | `Signer` | ❌ | ✅ | Pays rent + must belong to the **update-whitelist** 3-of-5 multisig. |
| `rent` | `Sysvar<Rent>` | ❌ | ❌ | Supplies rent-exemption values. |
| `system_program` | `Program<System>` | ❌ | ❌ | Needed by `init` constraints. |
| `token_program` | `Program<Token>` | ❌ | ❌ | SPL-Token CPI helper. |
| `associated_token_program` | `Program<AssociatedToken>` | ❌ | ❌ | Used to create ATAs during `init_if_needed`. |

### 🔐 Security & Business Logic

1.  **Whitelist Enforcement**  
    The instruction validates that payer is on the update-whitelist and that at least 3 of 5 update signers have signed the transaction.
2.  **Record Uniqueness**  
    PDA seeds (batch\_id, record\_id, account\_id) make each record deterministic and non-colliding. Re-playing with the same IDs triggers the “account already in use” error.
3.  **Recipient Validation**  
    Off-chain callers must ensure recipient\_account belongs to the investor. On-chain logic only checks it is not the zero address.
4.  **Idempotent ATA Creation**  
    ATAs are created with init\_if\_needed, so existing token accounts are reused without error.

---

### 📦 Account Metadata `- UpdateInvestmentRecordWallets`

Patches wallet of existing records with same `account_id`.

| Account | Type | Init | Mutable | Description |
| --- | --- | --- | --- | --- |
| `investment_info` | `Account<InvestmentInfo>` | ❌ | ❌ | Validates authority & state; seeds `["investment", investment_id, version]` |
| `usdt_mint` | `Account<Mint>` | ❌ | ❌ | Ensures ATAs correspond to USDT mint |
| `hcoin_mint` | `Account<Mint>` | ❌ | ❌ | Ensures ATAs correspond to H2COIN mint |
| `recipient_account` | `UncheckedAccount` | ❌ | ❌ | Target wallet address to patch into records |
| `recipient_usdt_account` | `Account<TokenAccount>` | ❌ | ✅ (`init_if_needed`) | ATA for `recipient_account` × `usdt_mint` |
| `recipient_hcoin_account` | `Account<TokenAccount>` | ❌ | ✅ (`init_if_needed`) | ATA for `recipient_account` × `hcoin_mint` |
| `payer` | `Signer` | ❌ | ✅ | Pays rent for new ATAs; must be in 3‑of‑5 **update\_whitelist** |
| `rent` | `Sysvar<Rent>` | ❌ | ❌ | Rent‑exemption calculations |
| `system_program` | `Program<System>` | ❌ | ❌ | Required by `init_if_needed` |
| `token_program` | `Program<Token>` | ❌ | ❌ | SPL‑Token CPI used by ATA creation |
| `associated_token_program` | `Program<AssociatedToken>` | ❌ | ❌ | Creates ATAs when absent |

---

### 📦 Account Metadata `- RevokeInvestmentRecord`

Marks an `InvestmentRecord` as revoked.

| Account | Type | Init | Mutable | Description |
| --- | --- | --- | --- | --- |
| `investment_info` | `Account<InvestmentInfo>` | ❌ | ❌ | Parent of the record |
| `investment_record` | `Account<InvestmentRecord>` | ❌ | ✅ | Target to revoke |
| `payer` | `Signer` | ❌ | ✅ | Auth signer |

---

## 📑 Instructions — Profit-Sharing Flow

*   **There are two steps:**
    *   EstimateProfitShare – computes the per-investor amounts for a given batch and stores them in a ProfitShareCache PDA.
    *   ExecuteProfitShare – reads that cache, transfers the funds from the vault to every investor, and marks the cache as executed.
*   **Both derive the same PDA roots:**
    *   Investment: \["investment", investment\_id, version\]
    *   Vault: \["vault", investment\_id, version\]
    *   Cache: \["profit\_cache", investment\_id, version, batch\_id\]

### 🚀 Arguments `- EstimateProfitShare`

| Name | Type | Description |
| --- | --- | --- |
| `batch_id` | `u16` | Target batch (1 … N); determines which investor subset is processed. |

### 🔑 PDA seeds

> `profit_cache`: `["profit_cache", investment_id, version, batchID]`

### 📦 Account Metadata `- EstimateProfitShare`

Generates and stores a `ProfitShareCache` for batch.

| Account | Type | Init | Mutable | Description |
| --- | --- | --- | --- | --- |
| `investment_info` | `Account<InvestmentInfo>` | ❌ | ❌ | Parent investment configuration. |
| `cache` | `Account<ProfitShareCache>` | ✅ (`init_if_needed`) | ✅ | Stores calculated per-investor amounts + metadata for `batch_id`. |
| `payer` | `Signer` | ❌ | ✅ | Pays rent and fees. |
| `rent` | `Sysvar<Rent>` | ❌ | ❌ | Rent exemption data. |
| `system_program` | `Program<System>` | ❌ | ❌ | Needed for account initialization. |

### **Process**

1.  Verify signer is on execute-whitelist and collect ≥ 3 signatures (3-of-5).
2.  Derive cache PDA (using batch\_id).
3.  Iterate all InvestmentRecords in the batch, compute each investor’s USDT share.
4.  Save results + total\_profit\_share, total\_estimate\_sol, created\_at.
5.  Emit ProfitShareEstimated event.

---

### 🚀 Arguments `- ExecuteProfitShare`

| Name | Type | Description |
| --- | --- | --- |
| `batch_id` | `u16` | Batch to execute; must have a previously populated cache. |

### 🔑 PDA seeds

> `vault`: `["vault", investment_id, version]`  
> `profit_cache`: `["profit_cache", investment_id, version, batchID]`

### 📦 Account Metadata `- ExecuteProfitShare`

Generates and stores a `ProfitShareCache` for batch.

| Account | Type | Init | Mutable | Description |
| --- | --- | --- | --- | --- |
| `investment_info` | `Account<InvestmentInfo>` | ❌ | ❌ | Investment state; enforces “completed & active” checks. |
| `cache` | `Account<ProfitShareCache>` | ❌ | ✅ | Must match `batch_id`; marked executed at end. |
| `mint` | `Account<Mint>` | ❌ | ❌ | Token being distributed (normally USDT). |
| `vault` | `UncheckedAccount` | ❌ | ✅ | SOL / token vault PDA (authority for token account). |
| `vault_token_account` | `Account<TokenAccount>` | ❌ | ✅ | ATA holding `mint` tokens owned by `vault`. |
| `payer` | `Signer` | ❌ | ✅ | Pays fees for large TX (usually the DAO ops wallet). |
| `system_program` | `Program<System>` | ❌ | ❌ | Required if ATAs must be created. |
| `token_program` | `Program<Token>` | ❌ | ❌ | SPL token CPI. |
| `associated_token_program` | `Program<AssociatedToken>` | ❌ | ❌ | Creates missing ATAs on-the-fly. |
| `_remaining_accounts_` | — | — | — | **Dynamic** list: |
| \- all `ProfitShareCache` PDAs for the batch (read-only) |   |   |   |   |
| \- every recipient’s ATA (writable) |   |   |   |   |

### **Process**

1.  Verify `payer` transaction and **3-of-5 execute-whitelist** signatures.
2.  Confirm `cache.executed_at == 0` (prevents double-send).
3.  Check `vault_token_account.amount ≥ cache.total_profit_share`.
4.  For each entry in `cache.entries` _(supplied via_ `_remaining_accounts_`_)_:
    *   Ensure recipient ATA exists; create via `associated_token_program` if needed.
    *   `token::transfer_checked` from vault → recipient.
    *   Accumulate success / failure counters for event logging.
5.  Mark `cache.executed_at = Clock::get().unix_timestamp`.
6.  Emit `ProfitShareExecuted` event (includes batch\_id, totals, gas used).

### 🔐 Security Notes

| Risk | Mitigation |
| --- | --- |
| **Replay** of execution | `executed_at` field in cache prevents re-runs. |
| Insufficient vault funds | Pre-transfer balance check aborts with custom error. |
| Whitelist hijack | Each update uses separate 3-of-5 multisig instruction (`UpdateExecuteWallet`). |

---

## 📑 Instructions — Refund-Sharing Flow

Refunds are paid in H2COIN (or any SPL-mint you pass in) and span 10 years starting from refund year 3 (i.e. the 4th project year).  
Each instruction pair works per batch\_id and year\_index:

### 🚀 Arguments `- EstimateRefundShare`

| Concept | Range | Meaning |
| --- | --- | --- |
| `batch_id` | `1 … N` | Which 200-record batch (ALT group) of investors is processed. |
| `year_index` | `0 … 9` | Refund year to settle. `0` = first year, `9` = last year. |

### 🔑 PDA seeds

> `refund_cache`: `["refund_cache", investment_id, version, batch_id, year_index]`

### 📦 Account Metadata `- EstimateRefundShare`

| Account | Type | Init | Mutable | Description |
| --- | --- | --- | --- | --- |
| `investment_info` | `Account<InvestmentInfo>` | ❌ | ❌ | Parent investment configuration. |
| `cache` | `Account<RefundShareCache>` | ✅ (`init_if_needed`) | ✅ | Stores per-investor refund amounts for the given year. |
| `payer` | `Signer` | ❌ | ✅ | Pays rent / fees. Must belong to **execute-whitelist** (3-of-5). |
| `rent` | `Sysvar<Rent>` | ❌ | ❌ | Provides rent data. |
| `system_program` | `Program<System>` | ❌ | ❌ | Needed for account init. |

### Process

1.  Verify multisig (≥ 3 execute-whitelist signers).
2.  Fetch all relevant InvestmentRecords (batch & stage).
3.  Compute per-investor H2COIN refund for year\_index using stage\_ratio.
4.  Record results in RefundShareCache and emit RefundShareEstimated.

---

### 🚀 Arguments `- ExecuteRefundShare`

| Concept | Range | Meaning |
| --- | --- | --- |
| `batch_id` | `1 … N` | Which 200-record batch (ALT group) of investors is processed. |
| `year_index` | `0 … 9` | Refund year to settle. `0` = first year, `9` = last year. |

### 🔑 PDA seeds

> `vault`: `["vault", investment_id, version]`  
> `refund_cache`: `["refund_cache", investment_id, version, batch_id, year_index]`

### 📦 Account Metadata `- EstimateRefundShare`

| Account | Type | Init | Mutable | Description |
| --- | --- | --- | --- | --- |
| `investment_info` | `Account<InvestmentInfo>` | ❌ | ❌ | Must be **active & completed**. |
| `cache` | `Account<RefundShareCache>` | ❌ | ✅ | Pre-populated by estimation; will be marked `executed_at`. |
| `mint` | `Account<Mint>` | ❌ | ❌ | Token that is refunded (default = H2COIN). |
| `vault` | `UncheckedAccount` | ❌ | ✅ | PDA that holds tokens; signer for transfers. |
| `vault_token_account` | `Account<TokenAccount>` | ❌ | ✅ | ATA of `mint` owned by `vault`. |
| `payer` | `Signer` | ❌ | ✅ | Pays compute/ATA fees. |
| `system_program` | `Program<System>` | ❌ | ❌ | — |
| `token_program` | `Program<Token>` | ❌ | ❌ | SPL-Token CPI. |
| `associated_token_program` | `Program<AssociatedToken>` | ❌ | ❌ | Creates recipient ATAs if missing. |
| `_remaining_accounts_` | — | — | — | Dynamic list: |
| • each `RefundShareCache` PDA for the batch (read-only) |   |   |   |   |
| • every recipient’s ATA (writable) |   |   |   |   |

### Process

1.  Re-verify 3-of-5 multisig.
2.  Confirm cache.executed\_at == 0.
3.  Ensure vault\_token\_account.amount ≥ cache.total\_refund.
4.  Loop over cache.entries (passed via remaining\_accounts):
    *   Create recipient ATA if absent.
    *   token::transfer\_checked from vault → recipient.
5.  Set cache.executed\_at = Clock::get()?.unix\_timestamp.
6.  Emit RefundShareExecuted with success metrics.

### 🔐 Security Matrix

| Threat | Defense |
| --- | --- |
| Duplicate execution | `executed_at` guard in cache. |
| Underfunded vault | Pre-transfer balance check, abort with custom error. |
| Whitelist compromise | Rotation guarded by `UpdateExecuteWallet` + 3-of-5 rule. |

---

## 💰 Instructions — Vault Deposit (SOL)

The H2Coin Vault supports two deposit paths:

1.  `DepositSolToVault` — transfers SOL from a user to the vault PDA.
2.  `DepositTokenToVault` — transfers SPL tokens (USDT or H2COIN) from a user’s ATA to the vault's ATA.

### 🔑 PDA seeds

> `vault`: `["vault", investment_id, version]`

### 📦 Account Metadata `- DepositSolToVault`

Transfers native SOL into the vault PDA directly.

| Account | Type | Init | Mutable | Description |
| --- | --- | --- | --- | --- |
| `investment_info` | `Account<InvestmentInfo>` | ❌ | ❌ | Used to derive the vault PDA. |
| `vault` | `UncheckedAccount` | ❌ | ✅ | PDA used to receive SOL. Validated by seeds. |
| `payer` | `Signer` | ❌ | ✅ | The wallet sending the SOL. |
| `system_program` | `Program<System>` | ❌ | ❌ | Required for native lamport transfers. |

### **Process**

Derive the vault PDA using the investment ID and version.

Use CPI (invoke\_signed) to transfer lamports from payer to vault.

Vault does not deserialize any data — it holds only SOL.

---

### 📦 Account Metadata `- DepositTokenToVault`

Transfers SPL tokens (e.g. USDT or H2COIN) into the vault's associated token account.

| Account | Type | Init | Mutable | Description |
| --- | --- | --- | --- | --- |
| `investment_info` | `Account<InvestmentInfo>` | ❌ | ❌ | Used to derive the vault PDA. |
| `mint` | `Account<Mint>` | ❌ | ❌ | Token mint (USDT or H2COIN). |
| `from` | `Account<TokenAccount>` | ❌ | ✅ | The user's ATA holding the token. |
| `vault` | `UncheckedAccount` | ❌ | ✅ | PDA acting as token authority. Receives tokens. |
| `vault_token_account` | `Account<TokenAccount>` | ❌ | ✅ | ATA owned by `vault` for this token mint. |
| `payer` | `Signer` | ❌ | ✅ | Pays ATA creation if needed. |
| `system_program` | `Program<System>` | ❌ | ❌ | Required for ATA creation. |
| `token_program` | `Program<Token>` | ❌ | ❌ | Required for `transfer_checked`. |
| `associated_token_program` | `Program<AssociatedToken>` | ❌ | ❌ | Used to create `vault_token_account` on demand. |

### Process

Confirm vault\_token\_account exists; create if needed (init\_if\_needed).

Use token::transfer\_checked to transfer tokens from from to vault\_token\_account.

vault PDA signs the destination account authority.

### 🔐 Security Notes

| Risk | Mitigation |
| --- | --- |
| **Unauthorized minting or receiving** | Vault PDA is deterministic and validated via seeds. |
| **Wrong mint** | `vault_token_account` is explicitly checked against the `mint` account. |
| **Token spoofing** | Uses `transfer_checked`, which validates decimals and mint identity. |

---

📑 Instruction — Withdraw From Vault

Withdraws SOL and/or SPL tokens (USDT / H2COIN) from the project’s vault PDA to an arbitrary recipient wallet.  
Execution is guarded by a 3-of-5 multisig drawn from the withdraw-whitelist stored in InvestmentInfo.

### 🔑 PDA seeds

> `vault`: `["vault", investment_id, version]`

### 📦 Account Metadata `- WithdrawFromVault`

Transfers from vault funds (SOL, USDT, H2COIN) to authorized wallets.

| Account | Type | Init | Mutable | Description |
| --- | --- | --- | --- | --- |
| `investment_info` | `Account<InvestmentInfo>` | ❌ | ❌ | Source of vault seeds and whitelist arrays. |
| `usdt_mint` / `hcoin_mint` | `Account<Mint>` | ❌ | ❌ | Token mints for validation. |
| `vault` | `UncheckedAccount` | ❌ | ✅ | PDA that owns SOL and token vault ATAs. |
| `vault_usdt_account` / `vault_hcoin_account` | `Account<TokenAccount>` | ❌ | ✅ | Vault’s ATAs for USDT / H2COIN. |
| `recipient_account` | `UncheckedAccount` | ❌ | ✅ | Destination wallet (lamports + ATA authority). |
| `recipient_usdt_account` / `recipient_hcoin_account` | `Account<TokenAccount>` | ✅ (if needed) | ✅ | Recipient ATAs (auto-created when absent). |
| `payer` | `Signer` | ❌ | ✅ | Pays rent for ATA creation; must be **one of** the 5 withdraw signers. |
| `rent` | `Sysvar<Rent>` | ❌ | ❌ | Required by `init_if_needed`. |
| `system_program` | `Program<System>` | ❌ | ❌ | Needed for lamport and ATA creation. |
| `token_program` | `Program<Token>` | ❌ | ❌ | SPL transfer & sync. |
| `associated_token_program` | `Program<AssociatedToken>` | ❌ | ❌ | Creates recipient ATAs on demand. |
| `_remaining_accounts_` | — | — | — | **First 3** entries must be the other withdraw signers (`AccountInfo`). |

### 🔐 Security Notes

| Threat | Mitigation |
| --- | --- |
| **Unauthorized withdrawal** | 3-of-5 multisig enforcement via `InvestmentInfo::enforce_3_of_5_signers`. |
| **Wrong mint** | ATA constraints (`associated_token::mint`, `authority`) ensure account matches expected mint + owner. |
| **Missing ATAs** | `init_if_needed` pattern creates recipient ATAs safely (payer covers rent). |
| **SOL draining** | Instruction optionally caps `amount_sol` to vault balance; aborts on under-flow. |
| **Replay** | No replay risk—the treasury moves lamports/tokens only once per call and emits a unique event ID. |

---

✅ This context spec allows developers, auditors, and frontends to understand account requirements across instructions.ac