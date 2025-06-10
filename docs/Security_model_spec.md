# 🔐 Security Model Specification: H2Coin Vault Share Protocol

## 1. Core Assumptions

* All critical instructions are executed via Program Derived Addresses (PDAs) to eliminate single-point control risks.
* All assets (SOL, USDT, H2COIN) are held under Vault PDAs with limited access.
* Caching mechanisms (e.g., `executed_at`) prevent replay or double execution of key actions.
* Upgradability is discouraged unless authority is properly secured.

## 2. Role-Based Access Control

| Role                | Authority Description                        | Key Instructions                                                |
| ------------------- | -------------------------------------------- | --------------------------------------------------------------- |
| `UpdateWhitelist`   | Can initialize or update investment metadata | `initialize`, `update_investment_info`, `add_investment_record` |
| `ExecuteWhitelist`  | Authorized to execute profit or refund share | `execute_profit_share`, `execute_refund_share`                  |
| `WithdrawWhitelist` | Authorized to withdraw from Vault PDA        | `withdraw_from_vault`                                           |

> ✅ Each whitelist is an array of 5 public keys. Execution requires 3-of-5 multi-signature approval.

## 3. Multi-signature Enforcement (3-of-5)

Every critical instruction performs the following check:

```rust
info.enforce_3_of_5_signers(signer_infos, is_update)?;
```

* Requires 3 valid signatures from the specified whitelist.
* Prevents single user dominance over protected operations.

## 4. Vault PDA & Token Control

* Vault PDA seed: `["vault", investment_id, version]`
* Assets (SOL, USDT, H2COIN) are held in Vault PDA-owned ATAs.
* Token transfers are only permitted via program-signed CPI instructions:

  * Profit share ➝ investors
  * Refund ➝ stage-based distribution
  * Withdrawal ➝ whitelisted recipient

## 5. Replay Protection

Each execution cache (`ProfitShareCache`, `RefundShareCache`) includes:

```rust
pub executed_at: i64,
```

* Must be `0` before execution
* Written with current timestamp after execution
* Guarantees **one-time execution per batch**

## 6. Instruction-Level Validation

| Instruction             | Key Security Checks                              |
| ----------------------- | ------------------------------------------------ |
| `add_investment_record` | Valid PDA derivation, unique record ID           |
| `estimate_profit_share` | Valid ALT address, whitelist signer check        |
| `execute_profit_share`  | `executed_at == 0`, token balance, safe transfer |
| `withdraw_from_vault`   | 3-of-5 signer check, recipient whitelist check   |

## 7. Arithmetic Safety

All numeric operations use:

```rust
.checked_add(...).ok_or(ErrorCode::NumericalOverflow)?;
```

* Protects against overflows
* Enforces safe addition, multiplication, and subtraction

## 8. Address Lookup Table (ALT) Controls

* ALT is used to reduce transaction size for investor batches
* ALT address is linked per batch via `AltGroup`
* ALT entries are static; creating new batches requires fresh ALT entries

## 9. Constraint Enforcement

* Uses `#[account(constraint = ...)]` for PDA validation
* PDA derivation ensures authority is scoped to `investment_id`, `record_id`, etc.
* Prevents spoofed accounts or manipulated records

## 10. Test Coverage for Security

* ✅ Rejects execution with <3 valid signers
* ✅ Rejects re-execution if `executed_at != 0`
* ✅ Rejects execution when investment is inactive
* ✅ Rejects if vault balance is insufficient
* ✅ All constraints and seeds are tested against manipulated inputs

## Summary

The H2Coin Vault Share Protocol provides robust protection against misuse by enforcing multi-signature rules, ensuring state immutability through execution caching, using deterministic PDA-controlled token accounts, and employing Address Lookup Tables for scale. It is designed to be secure, auditable, and suitable for DeFi profit-sharing or DAO treasury systems.
