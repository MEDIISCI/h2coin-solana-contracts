# 📘 H2Coin Vault Share Protocol – README

## 🤩 Overview

The **H2Coin Vault Share Protocol** is a secure, scalable smart contract system built on Solana. It facilitates decentralized investment management, automated profit sharing, and stage-based refund distribution.

The protocol emphasizes asset security through 3-of-5 multi-signature authorization, efficient batch processing using Address Lookup Tables (ALT), and strict on-chain validation. It is especially suitable for managing DAO treasuries, investor payouts, and time-based reward distribution.

## 🌟 Project Goals

*   ✅ Support decentralized profit sharing and refund distribution
*   ✅ Manage investment records in batches using ALT
*   ✅ Enforce 3-of-5 multisig for all critical operations
*   ✅ Prevent duplicate execution with cache-based replay protection
*   ✅ Ensure upgrade-safe, deterministic state transitions

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

## 🚀 Deployment & Testing

This section outlines the steps to configure your environment, build, deploy, and test the H2Coin Vault Share Protocol on Solana Devnet.

### 1\. **Install project dependencies**

```
yarn install
```

### 2\. **Generate or Specify Authority Keypair**

This keypair acts as the deploy authority and signer for transactions:

```
solana address --keypair ./assets/deploy/devnet-keypair.json 

9HJ4pswgZDcWYkqCxxXhmE4KLRP1i4ZXhcGYgq5sDBDG
```

### 3\. **Program id Keypiar**

This is the keypair representing the deployed program’s identity:

```
solana address --keypair ./target/deploy/h2coin_vault_share-keypair.json 

ALjifiKwvSzKLfpebFZ185b3mLAxroEvxYXCcy9Lzw2B
```

### 4\. **Set Up Devent Environment**

Configure Solana CLI to use Devnet and your deploy authority:

```
solana config set --url https://api.devnet.solana.com
solana config set --keypair ./assets/deploy/devnet-keypair.json
```

Verify your config:

```
solana config get
```

Sample output:

```
Config File: ~/.config/solana/cli/config.yml
RPC URL: https://api.devnet.solana.com 
WebSocket URL: wss://api.devnet.solana.com/ (computed)
Keypair Path: ./assets/deploy/devnet-keypair.json 
Commitment: confirmed 
```

### 5\. **Fund Your Wallet with Test SOL**

Use this to receive 5 test SOL from the Devnet faucet.

```
solana airdrop 5
```

### 6\. **Build Program**

Compile the Anchor smart contract:

```
anchor build
```

This generates:

*   The .so binary for deployment
*   The IDL at target/idl/h2coin\_vault\_share.json

### 7\. Deploy to Devnet

Deploy the compiled program to Solana Devnet:

```
anchor deploy
```

Expected output:

```
Deploying cluster: https://api.devnet.solana.com
Upgrade authority: ./assets/deploy/devnet-keypair.json
Deploying program "h2coin_vault_share"...
Program path: /home/cheny/node_project/h2coin-solana-contracts/target/deploy/h2coin_vault_share.so...
Program Id: ALjifiKwvSzKLfpebFZ185b3mLAxroEvxYXCcy9Lzw2B

Signature: 5RcFzKuy39gafH9FC4E1Rh34Qvf8F7XDbSUuZrCSyjwWAEjWywQTa8b8NLmn5oGsP5D9Rxz39N1hiZm2Fd8wusvc

Deploy success
```

### 8\. **Run Tests**

Tests are written using **Mocha** + **Chai**, simulating the full lifecycle of an investment project.

The tests cover:

*   **Initialization of Investment Info** – creates a new investment entry with ID, version, investment type, whitelist signers, and per-stage refund ratios
*   **Batch-based investment Record Setup** – registers investor records by `batch_id`, `record_id`, `account_id`, `wallet`, `amount` and `stage`
*   **Profit & Refund Share Estimation** – calculates cache entries per batch base on stage and year-index
*   **Execution Flow** – transfers USDT/H2COIN to investors using multi-sig and vault authority
*   **Whitelist Signer Logic** – enforces 3-of-5 authorization rules for secure execution

To execute all tests:

| command | Description |
| --- | --- |
| npx mocha [`tests/devnet.investment_info.test.ts`](./tests/devnet.investment_info.test.ts) | Initialize investment info and update/complete/deactivated investment info |
| npm mocha [`tests/devnet.execute_whitelist.test.ts`](./tests/devnet.execute_whitelist.test.ts) | Update execute whitelist |
| npm mocha [`tests/devnet.update_whitelist.test.ts`](./tests/devnet.update_whitelist.test.ts) | Update Update whitelist |
| npm mocha [`tests/devnet.withdraw_whitelist.test.ts`](./tests/devnet.withdraw_whitelist.test.ts) | Update withdraw whitelist |
| npm mocha [`tests/devnet.investment_record.test1.ts`](./tests/devnet.investment_record.test1.ts) | Add invesment records with type `csr` |
| npm mocha [`tests/devnet.investment_record.test2.ts`](./tests/devnet.investment_record.test2.ts) | Add invesment records with type `standard` |

### 9\. **Upgrade the Program (if needed)**

Redeploy after changes using:

```
anchor deploy
```

Or upgrade manually (for controlled rollout):

```
anchor upgrade ./target/deploy/h2coin_vault_share.so --program-id ALjifiKwvSzKLfpebFZ185b3mLAxroEvxYXCcy9Lzw2B
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

Maintained by the H2Coin Vault Share Protocol Team.met