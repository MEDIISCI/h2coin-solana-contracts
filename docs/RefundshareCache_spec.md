# `📜 RefundShareCache` Specification

## 📘 Module: `RefundShareCache`

This document specifies the `RefundShareCache` structure and its role in the H2Coin Vault Share Protocal. It is designed for audit and documentation purposes.

---

## 📦 Account: `RefundShareCache`

The `RefundShareCache` account is used to **cache batched refund entries** for a specific investment project (`investment_id`) and a refund year. Each cache contains up to 20 refund recipients and is used to prevent duplicated execution and track stage-based refund ratios over multiple years.

### 🧮 PDA Derivation

```
seeds = [
    b"refund_cache", 
    investment_info.investment_id.as_ref(),
    investment_info.version.as_ref(),
    batch_id.to_le_bytes().as_ref(),
    year_index.to_le_bytes().as_ref(),
],

PDA = find_program_address(seeds, program_id)
```

### 🧮 Struct: `RefundShareCache` and Size Calculation

| Field | Type | Size (Bytes) | Description |
| --- | --- | --- | --- |
| discriminator | — | 8 | Anchor discriminator |
| batch\_id | `u16` | 2 | ALT batch ID |
| year\_index | `u8` | 1 | Refund year index (0 ~ 9) |
| investment\_id | `[u8; 15]` | 15 | Investment reference |
| version | `[u8; 4]` | 4 | Version |
| subtotal\_refund\_hcoin | `u64` | 8 | Total H2COIN to distribute |
| subtotal\_estimate\_sol | `u64` | 8 | Estimated SOL to execute |
| executed\_at | `i64` | 8 | Timestamp if executed |
| created\_at | `i64` | 8 | Cache creation time |
| entries (prefix) | `Vec<RefundEntry>` | 4 | Vec length prefix |
| entries | — | 88 × N | Refund entries (N ≤ `MAX_ENTRIES_PER_BATCH`) |
| **Total (N=20)** | — | **1826** | Size with 20 entries |

### 🧮 Struct: `RefundEntry` (used in `entries`) and Size Calculation

| Field | Type | Size (Bytes) | Description |
| --- | --- | --- | --- |
| account\_id | `[u8; 15]` | 15 | Account ID |
| wallet | `Pubkey` | 32 | Wallet address |
| amount\_hcoin | `u64` | 8 | H2COIN refund amount |
| stage | `u8` | 1 | Investment stage (1 ~ 3) |
| recipient\_ata | `Pubkey` | 32 | Associated token address |
| **Total** | — | **88** | Entry size |

#### Constants

*   `ENTRY_SIZE =` 88 bytes
*   `BASE_SIZE`  = 66 bytes (without entries)
*   `SIZE` = 1826 (with entries)
*   `MAX_ENTRIES_PER_BATCH` = 20
*   `MAX_YEAR_INDEX` = 9
*   `ESTIMATE_SOL_BASE` = 100_000
*   `ESTIMATE_SOL_PER_ENTRY` = 5_000

---

## Notes

*   Each `RefundShareCache` stores up to 20 entries.
*   `executed_at` ensures idempotent execution (only run once).
*   Refund ratios are stage/year-based and calculated off-chain.
*   `amount_hcoin` must be an integer (no decimal rounding).
*   `recipient_ata` must be derived from `wallet + mint`.
*   `stage` must be 1, 2, or 3.
*   executed\_at = 0 means the refund for this batch has not yet been executed.
*   This account is initialized using the seeds:

```
["refund_cache", investment_id, version, batch_id (LE), year_index (LE)]
```

*   year\_index is validated using:

```
let elapsed = now.saturating_sub(info.end_at);
let expect_year_index = (elapsed / SECONDS_PER_YEAR) as u8;
```

*   get\_refund\_percentage() helps convert stage + year → refund %:

```
stage_ratio[(stage - 1) as usize][year_index as usize]
```

## ✅ Security Considerations

*   `executed_at` prevents re-execution of the same batch-year.
*   Entries are generated off-chain by authorized signers.
*   The `execute_refund_share` instruction verifies:
    *   3-of-5 multisignature approval from the execute whitelist
    *   Sufficient H2COIN and SOL balances in the vault
    *   That the cache has not already been executed

## 🛠 Related Instructions Overview

| Instruction | Description |
| --- | --- |
| `estimate_refund_share` | Generates entries and stores `RefundShareCache` |
| `execute_refund_share` | Transfers H2COIN to investors |
| `reset_refund_cache` (optional) | Manually clears a cache in devnet/testnet |

---

## 🧪 Instruction Details

### 1\. `estimate_refund_share`

Generates refund entries and stores them in a new `RefundShareCache`.

#### ⚙️ Inputs

*   `investment_info`: Reference to investment ID and version
*   `batch_id`: ID for the target refund batch
*   `year_index`: The refund year (0 to 9)
*   `off-chain input`: List of refund entries to include (not passed directly on-chain)

#### 📋 Process

*   Derives PDA using investment\_id, version, batch\_id, year\_index
*   Validates:
    *   `InvestmentInfo.state == Completed`
    *   `stage_ratio` is valid and non-empty
    *   No existing RefundShareCache with same batch + year
*   Calculates:
    *   `subtotal_refund_hcoin` = sum of all entries
    *   `subtotal_estimate_sol` = estimated gas for this batch
*   Caches all entries in an `AnchorAccount`

#### 🛡 Validations

*   Only callable once per batch-year (based on PDA existence)
*   Refund percentages are based on stage and year ratio
*   Maximum entries: 20

---

### 2\. `execute_refund_share`

Distributes H2COIN from vault to each `recipient_ata` listed in the cache.

#### ⚙️ Inputs

*   `vault`: PDA derived from `investment_id`, `version`
*   `hcoin_mint`: H2COIN mint used for ATA
*   `RefundShareCache`: Cached data from previous step
*   `Whitelist signers`: 3-of-5 multisig accounts

#### 🧾 Execution Steps

*   Verifies:
    *   3 of 5 `execute_whitelist` signers
    *   Vault contains sufficient H2COIN
    *   `executed_at == 0` (not already executed)
*   Transfers:
    *   For each entry, transfer `amount_hcoin` from vault to recipient ATA
*   Updates:
    *   Marks `executed_at` timestamp to prevent re-execution

#### 🛡 Validations

*   Vault token account must match expected H2COIN mint
*   ATA auto-creation supported (if needed)
*   Transaction limited by compute units and `MAX_ENTRIES_PER_BATCH`

## 📌 Summary

RefundShareCache enables secure, yearly, and gas-efficient H2COIN refund distribution.

Each batch-year cache is immutable once created.

One cache per (investment\_id + version + batch\_id + year\_index) pair.oe()

```
stage_ratio[(stage - 1) as usize][year_index as usize]
```

```
let elapsed = now.saturating_sub(info.end_at);
let expect_year_index = (elapsed / SECONDS_PER_YEAR) as u8;
```

```
["refund_cache", investment_id, version, batch_id (LE), year_index (LE)]
```

---

✅ This document is audit-ready and reflects the latest `RefundShareCache` logic.