# 🔍 Address Lookup Table (ALT) – Risk Control Specification

## 📘 Purpose

This document outlines the design assumptions, usage policies, and risk controls associated with using Address Lookup Tables (ALT) in the H2Coin Vault Share Protocol.

ALT is used to efficiently support batched investor processing and reduce transaction size, enabling scalable distribution of USDT and H2COIN to large groups of recipients across multiple transactions.

---

## 🧠 ALT Design Principles

* In theory, each ALT can hold up to **256 addresses**, but in practice, **usable address count is often lower** due to Solana's **1232-byte transaction size limit**.
* Empirical testing shows that up to **30 writable records** can be reliably executed using ALT without exceeding transaction limits.
* Based on program size, number of remaining accounts, and token transfer logic, typical ALT usage in this protocol is capped at **approximately 25–30 addresses per transaction**.
* ALT is tightly scoped to a single investment batch by convention.
* ALT is read-only after creation and must be recreated to change.
* ALT is used to derive a full list of recipient ATAs during estimation and execution.

> ⚠️ ALT **cannot replace** `remaining_accounts` when **writability is required** — writable accounts must still be passed explicitly.

> 🔎 **Clarification:** Although ALT accounts may hold many addresses, **only a limited number can be resolved within a single transaction** due to Solana runtime limits on transaction size and compute budget.

---

## 📏 Transaction Size Impact Analysis

To understand the value of ALT and why it’s required, we analyze the memory cost:

### 🔹 `remaining_accounts` Size Cost

| Field        | Size (Bytes) |
| ------------ | ------------ |
| `pubkey`     | 32           |
| `isSigner`   | 1            |
| `isWritable` | 1            |
| **Total**    | **34**       |

* If you include 50 accounts:

  * `30 × 34 = 1020 bytes` 🟢 within Solana's 1232-byte limit
  * `50 × 34 = 1700 bytes` ❌ exceeds Solana's 1232-byte limit

### 🔹 ALT Reference Size

* ALT accounts resolve addresses with only **1–2 bytes per address** under-the-hood.
* This enables massive savings **but only for read-only access**.
* Writable accounts **must still be passed explicitly** in `remaining_accounts`.

### 🧪 Practical Limits

| Method                    | Max Accounts | Notes                                |
| ------------------------- | ------------ | ------------------------------------ |
| Only `remaining_accounts` | \~35–40      | Fully manual, no ALT                 |
| ALT + Writable ATAs       | \~30         | Writable ATAs still required         |
| ALT (read-only only)      | Up to 256    | Only if no writable access is needed |

---

## 💡 Why ALT Is Worth the Cost

| Advantage                          | Description                                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Transaction size reduction**     | Minimizes byte usage per address via lookup references, allowing more compact transactions      |
| **Avoids 1232-byte limit**         | Enables splitting across multiple instructions instead of cramming addresses into a single call |
| **Scales to large recipient sets** | Supports 100–200+ transfers across batches without exceeding program limits                     |
| **Simplified on-chain logic**      | Contract only processes `entries` from cache, not direct address inputs                         |
| **Prevents redundant calculation** | Combined with `executed_at`, ensures single-use per batch even with shared ALT                  |
| **Reusable across users**          | Once published, ALT can be used by any signer to execute the same logic                         |
| **Audit visibility**               | ALT account is public and verifiable, supporting traceable distribution                         |

---

## 🔒 Risk Control Considerations

### 1. Immutable Nature

* Once created, ALT content **cannot be modified**.
* If investor list changes, a **new ALT must be generated**.
* Prevents spoofing or accidental overwriting of recipient entries.

### 2. Batch Convention Binding

* ALT is logically associated with a specific investment batch/version.
* The program expects ALT to match the current `investment_id` and `version` when estimating or executing.
* Clients must manage mapping of ALT ↔ batch relationships.

### 3. Dynamic ALT Loading

* Every `estimate_profit_share` and `estimate_refund_share` call loads investors from ALT dynamically.
* This ensures the latest ALT is used without hardcoding account lists into the instruction.

### 4. Replay Resistance

* Execution is locked per batch via `executed_at`, not ALT.
* Prevents reuse or double-spend even if ALT content is reused.

### 5. ALT Expiry (Solana-native)

* ALT lifespan must be managed externally using TTL or wallet management tools.
* Not managed by the Vault Share Protocol directly.

---

## ✅ Best Practices

* Use unique ALT per batch and avoid reuse across unrelated records.
* Regenerate ALT on any recipient list changes.
* Persist `alt_address` metadata in your client/frontend to trace batches.
* Always validate that ALT accounts exist on-chain before executing instructions.

---

## 🧾 ALT Integration Points

| Instruction             | ALT Usage                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `estimate_profit_share` | Loads `InvestmentRecord` addresses from ALT for USDT profit estimation. Contract parses each record to build profit `entries`. |
| `execute_profit_share`  | Uses ALT to resolve `InvestmentRecord.wallet` → ATA. Transfers USDT to each wallet’s derived ATA via `remaining_accounts`.     |
| `estimate_refund_share` | Loads `InvestmentRecord` addresses from ALT to estimate H2COIN refunds for a given `year_index`.                               |
| `execute_refund_share`  | Uses ALT to resolve refund `wallet` → ATA and transfers H2COIN to those addresses using `remaining_accounts`.                  |

> ⚠️ **Note:** ALT provides read-only addresses for parsing records. Writable associated token accounts (ATAs) must still be passed explicitly via `remaining_accounts` during execution.

