# 📘 H2Coin Vault Share Protocol – README

## 🤩 Overview

The **H2Coin Vault Share Protocol** is a secure and scalable Solana-based smart contract system designed to manage decentralized investment, profit sharing, and refund distribution.

It ensures asset safety through multi-signature authorization, batch processing via Address Lookup Tables (ALT), and strict constraint validation. The protocol is ideal for managing DAO treasuries, investor payouts, and time-based reward mechanisms.

## 🌟 Project Objectives

*   ✅ Enable decentralized profit and refund distribution
*   ✅ Support investor batch management with ALT
*   ✅ Enforce 3-of-5 multisig on all critical actions
*   ✅ Provide replay protection via cache locking
*   ✅ Ensure upgrade-safety and deterministic state control

## ⚙️ Protocol Architecture

### Core Components:

*   `InvestmentInfo`: Metadata for each investment campaign
*   `InvestmentRecord`: Tracks investor participation per stage/batch
*   `ProfitShareCache`: Stores estimated profit per batch (one-time)
*   `RefundShareCache`: Caches refund amounts based on yearly stages
*   `Vault PDA`: Holds SOL, USDT, and H2COIN for secure distribution

### Entry Points (Instructions):

| Instruction | Purpose |
| --- | --- |
| `initialize` | Initialize investment config and whitelist |
| `update_investment_info` | Update metadata and version control |
| `add_investment_record` | Add a new investor record |
| `estimate_profit_share` | Estimate per-investor profit and cache result |
| `execute_profit_share` | Perform USDT transfer to investors using cache |
| `estimate_refund_share` | Estimate yearly refunds per stage |
| `execute_refund_share` | Send H2COIN refunds using stage-based logic |
| `withdraw_from_vault` | Withdraw tokens/SOL to approved recipients |

> 🔐 All critical instructions require 3-of-5 whitelist signer validation.

## 🚀 Deployment & Testing

### 1\. **Authority Keypair**
```
solana address --keypair ./assets/deploy/devnet-keypair.json 

9HJ4pswgZDcWYkqCxxXhmE4KLRP1i4ZXhcGYgq5sDBDG
```
### 2\. **Program id Keypiar**
```
solana address --keypair ./target/deploy/h2coin_vault_share-keypair.json 

ALjifiKwvSzKLfpebFZ185b3mLAxroEvxYXCcy9Lzw2B
```
### 3\. **Set Up Devent Environment**

```
solana config set --url https://api.devnet.solana.com
solana config set --keypair ./assets/deploy/devnet-keypair.json
solana config get

Config File: ~/.config/solana/cli/config.yml
RPC URL: https://api.devnet.solana.com 
WebSocket URL: wss://api.devnet.solana.com/ (computed)
Keypair Path: ./assets/deploy/devnet-keypair.json 
Commitment: confirmed 
```

### 4\. **Build & Deploy**

```
anchor build
anchor deploy
```

### 5\. **Run Tests**

```
anchor test
```

Tests are written using Mocha + Chai and simulate multi-batch execution with real token transfers and whitelist signer emulation.

## 🦪 Example Commands

### Build Program

```
anchor build
```

### Deploy to Localnet

```
anchor deploy

Deploying cluster: https://api.devnet.solana.com
Upgrade authority: ./assets/deploy/devnet-keypair.json
Deploying program "h2coin_vault_share"...
Program path: /home/cheny/node_project/h2coin-solana-contracts/target/deploy/h2coin_vault_share.so...
Program Id: ALjifiKwvSzKLfpebFZ185b3mLAxroEvxYXCcy9Lzw2B

Signature: 5RcFzKuy39gafH9FC4E1Rh34Qvf8F7XDbSUuZrCSyjwWAEjWywQTa8b8NLmn5oGsP5D9Rxz39N1hiZm2Fd8wusvc

Deploy success
```

### Run Tests

```
anchor test
```

### Upgrade Program

```
anchor upgrade ./target/deploy/h2coin_vault_share.so --program-id <PROGRAM_ID>
```

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

Maintained by the H2Coin Protocol Team.