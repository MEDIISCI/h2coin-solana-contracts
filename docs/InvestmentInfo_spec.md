# 📜 `InvestmentInfo` Specification

## 📘 Module: `InvestmentInfo`

This document describes the structure and behavior of the InvestmentInfo account in the H2Coin Vault Share Protocol.

---

## 📦 Account: `InvestmentInfo`

The InvestmentInfo account is used to define, control, and govern a specific investment project. It encapsulates all necessary configuration and security logic, such as distribution ratios, governance whitelists, lifecycle status, and the vault linkage. It is uniquely identified by a PDA derived from the investment ID and version.

This account:

*   Serves as the canonical source of truth for an investment project
*   Is referenced by other PDAs like vaults, investment records, and profit/refund caches
*   Drives the state machine of the investment through instructions like complete, deactivate, etc.
*   Enforces 3-of-5 multisig authorization for critical updates

---

## 🧭 Interpretation

The InvestmentInfo account represents a unique investment project configuration and status. It defines all the essential parameters and governance rules required to manage the investment lifecycle on-chain.

This account:

*   Acts as the central reference for any vault, record, or distribution operations
*   Stores key metadata like timeframes, whitelist governance, and distribution ratios
*   Is a PDA derived from `investment_id` and version, making it unique and secure
*   Controls the state transition of an investment: Init → Pending → Completed → Deactivated
*   Is validated before any on-chain instructions (e.g., add record, refund, profit share)

---

### 🧮 PDA Derivation

```
seeds = [
            b"profit_cache", 
            investment_info.investment_id.as_ref(),
            investment_info.version.as_ref(),
        ],
        
PDA = find_program_address(seeds, program_id)
```

### 🧮 Struct: `InvestmentInfo` and Size Calculation

| Field | Type | Size (Bytes) | Description |
| --- | --- | --- | --- |
| discriminator | — | 8 | Anchor account discriminator |
| investment\_id | `[u8; 15]` | 15 | Unique investment identifier |
| version | `[u8; 4]` | 4 | Program version or Git commit hash |
| investment\_type | `[u8; 16]` | 16 | Investment category/type |
| stage\_ratio | `[[u8; 10]; MAX_STAGE]` | 30 | Refund/share ratio for each stage (3 × 10) |
| start\_at | `i64` | 8 | Investment start timestamp |
| end\_at | `i64` | 8 | Investment end timestamp |
| investment\_upper\_limit | `u64` | 8 | Max USDT accepted |
| execute\_whitelist | `Vec<Pubkey>` | 4 + 32×5 = 164 | Pubkeys authorized to execute profit/refund |
| update\_whitelist | `Vec<Pubkey>` | 4 + 32×5 = 164 | Pubkeys authorized to update config |
| withdraw\_whitelist | `Vec<Pubkey>` | 4 + 32×5 = 164 | Pubkeys allowed to withdraw |
| vault | `Pubkey` | 32 | Vault PDA for funds |
| state | `InvestmentState` (`u16`) | 2 | Enum: `Init`, `Pending`, `Completed` |
| is\_active | `bool` | 1 | Whether investment is active |
| created\_at | `i64` | 8 | Creation timestamp |
| **Total** | — | **655** | Total account size |

#### Constants

*   `SIZE` = 655 bytes
*   `MAX_STAGE` = 3
*   `MAX_WHITELIST_LEN` = 5

---

### 📘 Enum: `InvestmentState`

```
#[repr(u16)]
pub enum InvestmentState {
    Init = 0,
    Pending = 1,
    Completed = 999,
}
```

Used to track current investment status.

---

### ✅ Validation Rules

*   `validate_stage_ratio()`
    *   All stage values must be ≤ 100
    *   Non-contiguous years (non-zero followed by non-zero) are invalid
    *   Each stage’s total ratio must be ≤ 100
*   `verify_signers_3_of_5()`
    *   Input signer keys must match at least 3-of-5 from the whitelist
    *   Enforced for both `execute_whitelist` and `update_whitelist`

---

### 🛠 Instruction Behaviors

*   `**initialize_investment_info**`
    *   Creates an InvestmentInfo account
    *   Validates whitelist length and PDA derivation
    *   Assigns initial fields and vault PDA
    *   Emits InvestmentInfoInitialized
*   `**update_investment_info**`
    *   Updates optional investment fields (type, ratio, upper limit)
    *   Requires 3-of-5 update signers
    *   Emits InvestmentUpdated
*   `**completed_investment_info**`
    *   Marks investment as completed
    *   Requires 3-of-5 execute signers
    *   Emits InvestmentCompleted
*   `**deactivate_investment_info**`
    *   Marks investment as deactivated (must be completed first)
    *   Requires 3-of-5 execute signers
    *   Emits InvestmentDeactivated
*   `**patch_execute_whitelist**`
    *   Replaces one address in `execute_whitelist`
    *   Requires 3-of-5 execute signers + from/to accounts
    *   Emits WhitelistUpdated
*   `**patch_update_whitelist**`
    *   Replaces one address in `update_whitelist`
    *   Requires 3-of-5 update signers + from/to accounts
    *   Emits WhitelistUpdated
*   `**patch_withdraw_whitelist**`
    *   Replaces the entire `withdraw_whitelist`
    *   Requires 3-of-5 execute signers
    *   Emits WithdrawWhitelistUpdated

---

✅ This document is audit-ready and reflects the latest `InvestmentInfo` logic.