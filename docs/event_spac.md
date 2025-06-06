# Event Specification: H2Coin Vault Share Protocol

This document outlines all Anchor `#[event]` definitions used in the H2Coin Vault Share Protocol. Events serve as immutable logs to track state transitions, data changes, and asset flows for auditing and front-end tracking.

---

## 🔄 Investment Lifecycle Events

### `InvestmentInfoInitialized`

| Field           | Type      | Size (Bytes) | Description                  |
| --------------- | --------- | ------------ | ---------------------------- |
| `investment_id` | \[u8; 15] | 15           | ID of the investment project |
| version         | \[u8; 4]  | 4            | Version ID                   |
| vault           | Pubkey    | 32           | Vault PDA address            |
| `created_by`    | Pubkey    | 32           | Initializer wallet           |
| `created_at`    | i64       | 8            | Timestamp of creation        |

### `InvestmentUpdated`, `InvestmentCompleted`, `InvestmentDeactivated`

| Field           | Type        | Size (Bytes) | Description                          |
| --------------- | ----------- | ------------ | ------------------------------------ |
| `investment_id` | \[u8; 15]   | 15           | ID of the investment project         |
| version         | \[u8; 4]    | 4            | Version ID                           |
| `*_by`          | Pubkey      | 32           | Updater / Completer / Deactivator    |
| `*_at`          | i64         | 8            | Timestamp                            |
| signers         | Vec<Pubkey> | varies       | Multisig signers (usually 3 entries) |

---

## 📑 Whitelist Events

### `WhitelistUpdated`

| Field           | Type        | Size (Bytes) | Description      |
| --------------- | ----------- | ------------ | ---------------- |
| `investment_id` | \[u8; 15]   | 15           | Investment ID    |
| version         | \[u8; 4]    | 4            | Version          |
| wallet          | Pubkey      | 32           | Updated wallet   |
| `updated_by`    | Pubkey      | 32           | Executor         |
| `updated_at`    | i64         | 8            | Timestamp        |
| signers         | Vec<Pubkey> | varies       | Multisig signers |

---

## 📄 Investment Record Events

### `InvestmentRecordAdded`

| Field          | Type        | Size (Bytes) | Description       |
| -------------- | ----------- | ------------ | ----------------- |
| `investment_id`| \[u8; 15]   | 15           | Investment ID     |
| version        | \[u8; 4]    | 4            | Version           |
| `record_id`    | u64         | 8            | Record identifier |
| `account_id`   | \[u8; 15]   | 15           | Account ID        |
| `amount_usdt`  | u64         | 8            | USDT invested     |
| `added_by`     | Pubkey      | 32           | Sender            |
| `added_at`     | i64         | 8            | Timestamp         |
| signers        | Vec<Pubkey> | varies       | Multisig signers  |

### `InvestmentRecordWalletUpdated`, `InvestmentRecordRevoked`

| Field                       | Type        | Size (Bytes) | Description                    |
| --------------------------- | ----------- | ------------ | ------------------------------ |
| `investment_id`             | \[u8; 15]   | 15           | Investment ID                  |
| version                     | \[u8; 4]    | 4            | Version                        |
| `record_id`                 | u64         | 8            | Record identifier              |
| `account_id`                | \[u8; 15]   | 15           | Account ID                     |
| `new_wallet` / `revoked_by` | Pubkey      | 32           | Updated or revoked wallet info |
| `updated_at` / `revoked_at` | i64         | 8            | Timestamp                      |
| signers                     | Vec<Pubkey> | varies       | Multisig signers               |



### `WithdrawWhitelistUpdated`

| Field           | Type        | Size (Bytes) | Description       |
| --------------- | ----------- | ------------ | ----------------- |
| `investment_id` | \[u8; 15]   | 15           | Investment ID     |
| version         | \[u8; 4]    | 4            | Version           |
| wallets         | Vec<Pubkey> | varies       | New withdraw list |
| `updated_by`    | Pubkey      | 32           | Executor          |
| `updated_at`    | i64         | 8            | Timestamp         |
| signers         | Vec<Pubkey> | varies       | Multisig signers  |

---

## 📤 Distribution Events

### `ProfitShareEstimated`, `RefundShareEstimated`

| Field                 | Type        | Size (Bytes) | Description                 |
| --------------------- | ----------- | ------------ | --------------------------- |
| batch\_id             | u16         | 2            | Batch identifier            |
| `investment_id`       | \[u8; 15]   | 15           | Investment ID               |
| version               | \[u8; 4]    | 4            | Version                     |
| `subtotal_*`          | u64         | 8            | Estimated transfer amount   |
| `year_index` (refund) | u8          | 1            | Year (only in refund event) |
| `created_by`          | Pubkey      | 32           | Creator                     |
| `created_at`          | i64         | 8            | Timestamp                   |
| `entry_count`         | u16         | 2            | Number of entries           |
| signers               | Vec<Pubkey> | varies       | Multisig signers            |

### `ProfitShareExecuted`, `RefundShareExecuted`

| Field                 | Type        | Size (Bytes) | Description                  |
| --------------------- | ----------- | ------------ | ---------------------------- |
| batch\_id             | u16         | 2            | Batch ID                     |
| `investment_id`       | \[u8; 15]   | 15           | Investment ID                |
| version               | \[u8; 4]    | 4            | Version                      |
| `total_transfer_*`    | u64         | 8            | Actual transfer amount       |
| `year_index` (refund) | u8          | 1            | Refund year (only in refund) |
| `executed_by`         | Pubkey      | 32           | Executor                     |
| `executed_at`         | i64         | 8            | Timestamp                    |
| signers               | Vec<Pubkey> | varies       | Multisig signers             |

### `ProfitPaidEvent`, `RefundPaidEvent`

| Field           | Type      | Size (Bytes) | Description      |
| --------------- | --------- | ------------ | ---------------- |
| `investment_id` | \[u8; 15] | 15           | Investment ID    |
| version         | \[u8; 4]  | 4            | Version          |
| to              | Pubkey    | 32           | Recipient wallet |
| `amount_*`      | u64       | 8            | Transfer amount  |
| `pay_at`        | i64       | 8            | Timestamp        |

---

## 💰 Vault Activity Events

### `VaultDepositSolEvent`

| Field           | Type      | Size (Bytes) | Description    |
| --------------- | --------- | ------------ | -------------- |
| `investment_id` | \[u8; 15] | 15           | Investment ID  |
| version         | \[u8; 4]  | 4            | Version        |
| from            | Pubkey    | 32           | Sender wallet  |
| `amount_usdt`   | u64       | 8            | Deposited USDT |
| `deposit_at`    | i64       | 8            | Timestamp      |

### `VaultDepositTokenEvent`

| Field           | Type      | Size (Bytes) | Description         |
| --------------- | --------- | ------------ | ------------------- |
| `investment_id` | \[u8; 15] | 15           | Investment ID       |
| version         | \[u8; 4]  | 4            | Version             |
| from            | Pubkey    | 32           | Sender wallet       |
| `vault_ata`     | Pubkey    | 32           | Vault token account |
| `amount_usdt`   | u64       | 8            | Deposited USDT      |
| `deposit_at`    | i64       | 8            | Timestamp           |

### `VaultTransferred`

| Field           | Type        | Size (Bytes) | Description      |
| --------------- | ----------- | ------------ | ---------------- |
| `investment_id` | \[u8; 15]   | 15           | Investment ID    |
| version         | \[u8; 4]    | 4            | Version          |
| recipient       | Pubkey      | 32           | Recipient wallet |
| usdt\_amount    | u64         | 8            | USDT sent        |
| hcoin\_amount   | u64         | 8            | H2COIN sent      |
| sol\_amount     | u64         | 8            | SOL sent         |
| `executed_by`   | Pubkey      | 32           | Executor wallet  |
| `executed_at`   | i64         | 8            | Timestamp        |
| signers         | Vec<Pubkey> | varies       | Multisig signers |

---

✅ This event spec enables downstream systems to index, monitor, and audit key protocol actions.
