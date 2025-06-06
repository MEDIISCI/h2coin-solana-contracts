# 🧾 Instruction Specification: H2Coin Vault Share Protocol

This section provides a detailed specification of each instruction function in the H2Coin Vault Share Protocol, including purpose, access level, required accounts, and security constraints. This is intended for auditors, developers, and protocol integrators.

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
| `withdraw_from_vault` | Transfer remaining vault sol/token balance to withdraw whitelist wallet | — | ✅ |

---

## 📌 Additional Instruction Details

### 🧾 Instruction: `initialize_investment_info`

| Field | Value |
| --- | --- |
| **Purpose** | Create a new investment and initialize the vault PDA |
| **Access Type** | Write + Init |
| **Creates PDA** | `InvestmentInfo`, `Vault` |
| **State Accounts** | — |
| **Requires Signers** | Payer only |
| **Constraints** | Unique `investment_id`, correct PDA derivation |
| **Criticality** | Medium |

---

### 🧾 Instruction: `update_investment_info`

| Field | Value |
| --- | --- |
| **Purpose** | Update investment metadata such as version, limit, or state |
| **Access Type** | Write |
| **Creates PDA** | No |
| **State Accounts** | `InvestmentInfo` |
| **Requires Signers** | 3-of-5 from `update_whitelist` |
| **Constraints** | \- Investment must be active  
\- Only allowed fields can be changed |
| **Criticality** | Medium |

---

### 🧾 Instruction: `completed_investment_info`

| Field | Value |
| --- | --- |
| **Purpose** | Mark investment as completed |
| **Access Type** | Write |
| **Creates PDA** | No |
| **State Accounts** | `InvestmentInfo` |
| **Requires Signers** | 3-of-5 from `update_whitelist` |
| **Constraints** | Must be active before completion |
| **Criticality** | Medium |

---

### 🧾 Instruction: `deactivate_investment_info`

| Field | Value |
| --- | --- |
| **Purpose** | Mark an investment as inactive |
| **Access Type** | Write |
| **Creates PDA** | No |
| **State Accounts** | `InvestmentInfo` |
| **Requires Signers** | 3-of-5 from `update_whitelist` |
| **Constraints** | \- Investment must be completed |
| **Criticality** | Medium |

---

### 🧾 Instruction: `update_execute_wallet`

| Field | Value |
| --- | --- |
| **Purpose** | Replace one signer in `execute_whitelist` |
| **Access Type** | Write |
| **Creates PDA** | No |
| **State Accounts** | `InvestmentInfo` |
| **Requires Signers** | 3-of-5 from `execute_whitelist` |
| **Constraints** | \- New wallet not in list  
\- Old wallet must exist in list |
| **Criticality** | Low |

---

### 🧾 Instruction: `add_investment_records`

| Field | Value |
| --- | --- |
| **Purpose** | Add investment records and update summary stats |
| **Access Type** | Write + Init |
| **Creates PDA** | `InvestmentRecord` |
| **State Accounts** | `InvestmentInfo`, `InvestmentSummary` |
| **Requires Signers** | 3-of-5 from `update_whitelist` |
| **Constraints** | \- Valid PDA per record  
\- Consistent account ID and stage |
| **Criticality** | High |

---

### 🧾 Instruction: `update_investment_record_wallets`

| Field | Value |
| --- | --- |
| **Purpose** | Update wallet info inside investment records |
| **Access Type** | Write |
| **Creates PDA** | No |
| **State Accounts** | `InvestmentRecord` |
| **Requires Signers** | 3-of-5 from `update_whitelist` |
| **Constraints** | \- Record must not be revoked |
| **Criticality** | Medium |

---

### 🧾 Instruction: `revoke_investment_record`

| Field | Value |
| --- | --- |
| **Purpose** | Mark a record as revoked |
| **Access Type** | Write |
| **Creates PDA** | No |
| **State Accounts** | `InvestmentRecord`, `InvestmentInfo` |
| **Requires Signers** | 3-of-5 from `update_whitelist` |
| **Constraints** | \- Record must not be revoked |
| **Criticality** | Medium |

---

### 🧾 Instruction: `estimate_profit_share`

| Field | Value |
| --- | --- |
| **Purpose** | Estimate profit share and cache per batch |
| **Access Type** | Write + Init |
| **Creates PDA** | `ProfitShareCache` |
| **State Accounts** | `InvestmentInfo`, `InvestmentRecord`, `InvestmentSummary` |
| **Requires Signers** | Any signer from `*whitelist` |
| **Constraints** | \- Investment must be completed  
\- Total USDT > 0 |
| **Criticality** | High |

---

### 🧾 Instruction: `execute_profit_share`

| Field | Value |
| --- | --- |
| **Purpose** | Transfer USDT to investor wallets using cached entries |
| **Access Type** | Write |
| **Creates PDA** | No |
| **State Accounts** | `ProfitShareCache`, `Vault`, `InvestmentInfo` |
| **Requires Signers** | 3-of-5 from `execute_whitelist` |
| **Constraints** | \- `executed_at == 0`  
\- Vault balance ≥ total required  
\- Valid ATAs exist or are created |
| **Criticality** | High |

---

### 🧾 Instruction: `estimate_refund_share`

| Field | Value |
| --- | --- |
| **Purpose** | Estimate H2COIN refund share per year/stage |
| **Access Type** | Write + Init |
| **Creates PDA** | `RefundShareCache` |
| **State Accounts** | `InvestmentInfo`, `InvestmentRecord`, `InvestmentSummary` |
| **Requires Signers** | Any signer from `*whitelist` |
| **Constraints** | \- Stage ratio must exist  
\- Record stage must match |
| **Criticality** | High |

---

### 🧾 Instruction: `execute_refund_share`

| Field | Value |
| --- | --- |
| **Purpose** | Transfer H2COIN to investor wallets using cached refund entries |
| **Access Type** | Write |
| **Creates PDA** | No |
| **State Accounts** | `RefundShareCache`, `Vault`, `InvestmentInfo` |
| **Requires Signers** | 3-of-5 from `execute_whitelist` |
| **Constraints** | \- `executed_at == 0`  
\- Vault H2COIN ≥ total required  
\- Valid ATAs exist or are created |
| **Criticality** | High |

---

### 🧾 Instruction: `withdraw_from_vault`

| Field | Value |
| --- | --- |
| **Purpose** | Transfer remaining SOL/ USDT/ H2COIN from vault to withdraw wallet |
| **Access Type** | Write |
| **Creates PDA** | No |
| **State Accounts** | `Vault`, `InvestmentInfo` |
| **Requires Signers** | 3-of-5 from `execute_whitelist` |
| **Constraints** | \- Must be in withdraw whitelist |
| **Criticality** | Medium |

---

Additional instructions like `deposit_token_to_vault`, `deposit_sol_to_vault`, and whitelist patching are low-risk and do not require multi-sig.

This document can be extended with inline examples or account diagrams if needed.