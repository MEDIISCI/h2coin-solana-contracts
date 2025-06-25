/**
 * @fileoverview Cluster Connection Test Suite for H2Coin Vault Share Program
 * This test suite validates the cluster connection functionality including provider setup,
 * wallet connection, and basic cluster interaction for the H2Coin program.
 * 
 * SECURITY CONSIDERATIONS:
 * - Tests cluster connection and provider initialization
 * - Validates wallet connection and balance retrieval
 * - Ensures proper network connectivity for program operations
 * - Tests basic cluster interaction functionality
 * 
 * @audit This test suite is critical for infrastructure validation and should be reviewed for:
 * - Cluster connection security and reliability
 * - Provider initialization and configuration
 * - Wallet connection validation
 * - Network connectivity verification
 */

import * as Anchor from "@coral-xyz/anchor";
import { getProvider } from "../utils/provider";

describe("Cluster Anchor Test", () => {
    it("initializes", async () => {
        const provider = getProvider();
        Anchor.setProvider(provider);

        // You can now access the program and use Anchor normally
        const connection = provider.connection;
        const wallet = provider.wallet.publicKey;

        const solBalanceLamports = await provider.connection.getBalance(wallet);
        const solBalance = solBalanceLamports / Anchor.web3.LAMPORTS_PER_SOL;
        
        console.log("✅ Connected to:", wallet.toBase58());
        console.log("💰 SOL Balance:", solBalance, "SOL");
    });
});
