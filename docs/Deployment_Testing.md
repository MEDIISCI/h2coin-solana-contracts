# 🚀 Deployment & Testing: H2Coin Vault Share Protocol

This section outlines the steps to configure your environment, build, deploy, and test the H2Coin Vault Share Protocol on Solana Devnet.

## 1\. **Install project dependencies**

```
yarn install
```

## 2\. **Generate or Specify Authority Keypair**

This keypair acts as the deploy authority and signer for transactions:

```
solana address --keypair ./assets/deploy/devnet-keypair.json 

9HJ4pswgZDcWYkqCxxXhmE4KLRP1i4ZXhcGYgq5sDBDG
```

## 3\. **Program id Keypiar**

This is the keypair representing the deployed program’s identity:

```
solana address --keypair ./target/deploy/h2coin_vault_share-keypair.json 

ALjifiKwvSzKLfpebFZ185b3mLAxroEvxYXCcy9Lzw2B
```

## 4\. **Set Up Devent Environment**

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

## 5\. **Fund Your Wallet with Test SOL**

Use this to receive 5 test SOL from the Devnet faucet.

```
solana airdrop 5
```

## 6\. **Build Program**

Compile the Anchor smart contract:

```
anchor build
```

This generates:

*   The .so binary for deployment
*   The IDL at target/idl/h2coin\_vault\_share.json

## 7\. Deploy to Devnet

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

## 8\. **Run Tests**

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
| npx mocha [`tests/devnet.investment_info.test.ts`](../tests/devnet.investment_info.test.ts) | Initialize investment info and update/complete/deactivated investment info |
| npm mocha [`tests/devnet.execute_whitelist.test.ts`](../tests/devnet.execute_whitelist.test.ts) | Update execute whitelist |
| npm mocha [`tests/devnet.update_whitelist.test.ts`](../tests/devnet.update_whitelist.test.ts) | Update Update whitelist |
| npm mocha [`tests/devnet.withdraw_whitelist.test.ts`](../tests/devnet.withdraw_whitelist.test.ts) | Update withdraw whitelist |
| npm mocha [`tests/devnet.investment_record.test1.ts`](../tests/devnet.investment_record.test1.ts) | Investment records with type `csr` were added, but share profit estimation is restricted for this investment type. |
| npm mocha [`tests/devnet.investment_record.test2.ts`](../tests/devnet.investment_record.test2.ts) | Adds new investment records using type standard, and verifies the behavior when updating the wallet linked to an existing account_id.|
| npm mocha [`tests/devnet.profit_refund_share.test.ts`](../tests/devnet.profit_refund_share.test.ts) | Run full profit and refund distribution process |

## 9\. **Upgrade the Program (if needed)**

Redeploy after changes using:

```
anchor deploy
```

Or upgrade manually (for controlled rollout):

```
anchor upgrade ./target/deploy/h2coin_vault_share.so --program-id ALjifiKwvSzKLfpebFZ185b3mLAxroEvxYXCcy9Lzw2B
```