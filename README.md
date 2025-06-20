# 📘 H2Coin Vault Share Protocol – README

## 🤩 Overview

The **H2Coin Vault Share Protocol** is a secure, scalable smart contract system built on Solana. It facilitates decentralized investment management, automated profit sharing, and stage-based refund distribution.

The protocol emphasizes asset security through 3-of-5 multi-signature authorization, efficient batch processing using Address Lookup Tables (ALT), and strict on-chain validation. It is especially suitable for managing DAO treasuries, investor payouts, and time-based reward distribution.

## 🌟 Project Goals

*   Support decentralized profit sharing and refund distribution
*   Manage investment records in batches using ALT
*   Enforce 3-of-5 multisig for all critical operations
*   Prevent duplicate execution with cache-based replay protection
*   Ensure upgrade-safe, deterministic state transitions

## 🛠️ Contract Features

*   **Investment Stage Management**
    *   Support for multiple investment stages (up to 3 stages)
    *   Stage-specific ratio calculations for refunds
    *   Investment upper limit controls
*   **Profit Distribution System**
    *   Automated USDT profit distribution
    *   Batch processing for efficient distribution
    *   Cache-based distribution estimation
    *   3-of-5 multisig authorization for security
*   **Refund Distribution System**
    *   10-year refund period (starting from year 4 or year-inex 3)
    *   Stage-based refund ratio calculations
    *   H2COIN token distribution
    *   Automated refund tracking
*   **Security Features**
    *   3-of-5 multisig authorization
    *   Whitelist management for different operations
    *   Cache expiration protection (25 days)
    *   Input validation and error handling
    *   Secure fund management through PDAs

## ⚙️ Protocol Architecture

### Core Components:

*   `InvestmentInfo`: Defines metadata for each investment campaign
*   `InvestmentRecord`: Records individual investor participation per stage and batch
*   `ProfitShareCache`: Caches estimated profits for each batch (immutable once created)
*   `RefundShareCache`: Stores stage-based refund amounts (typically yearly)
*   `Vault PDA`: Holds SOL, USDT, and H2COIN used for secure on-chain distributions

### Entry Points (Instructions):

| Instruction | Purpose |
| --- | --- |
| `initialize_investment_info` | Initialize investment config and whitelist |
| `completed_investment_info` | Mark the investment as completed state and prevent any further add or update operations |
| `add_investment_record` | Add a new investor record |
| `estimate_profit_share` | Estimate per-investor profit and cache result |
| `execute_profit_share` | Perform USDT transfer to investors using cache |
| `estimate_refund_share` | Estimate yearly refunds per stage |
| `execute_refund_share` | Send H2COIN refunds using stage-based logic |
| `withdraw_from_vault` | Withdraw tokens/SOL to approved recipients |

> 🔐 All critical instructions require 3-of-5 whitelist signer validation.

## 📖 Further Documentation

| Document | Description |
| --- | --- |
| [`Architecture.md`](./docs/Architecture.md) | Protocol design architecture overview |
| [`AddressLookupTable_spec.md`](./docs/AddressLookupTable_spec.md) | Address Lookup Table (ALT) purpose |
| [`Security_model_spec.md`](./docs/Security_model_spec.md) | Protocol's security architecture and assumptions |
| [`State_spec.md`](./docs/State_spec.md) | Full list of PDA account states |
| [`Context_spec.md`](./docs/Context_spec.md) | Anchor context structures |
| [`Event_spec.md`](./docs/Event_spec.md) | Events emitted by the program |
| [`Error_sped.md`](./docs/Error_spec.md) | Error details |
| [`instructions_spec.md`](./docs/instructions_spec.md) | All instruction interfaces and constraints |
| [`InvestmentInfo_spec.md`](./docs/InvestmentInfo_spec.md) | Investment metadata definition |
| [`InvestmentRecord_spec.md`](./docs/InvestmentRecord_spec.md) | Investor participation tracking |
| [`ProfitShareCache_spec.md`](./docs/ProfitShareCache_spec.md) | Structure and purpose of profit share cache |
| [`RefundShareCache_spec.md`](./docs/RefundShareCache_spec.md) | Refund logic and refund batch design |
| [`specifications.md`](./docs/specifications.md) | Cross-module specifications and notes |

---

Maintained by the H2Coin Vault Share Protocol Team.met