/**
 * @fileoverview Provider Configuration Utility for H2Coin Vault Share Program
 * This utility provides centralized provider configuration including wallet management,
 * connection setup, and environment variable validation for the H2Coin program.
 * 
 * SECURITY CONSIDERATIONS:
 * - Manages sensitive wallet keypair loading from filesystem
 * - Handles environment variable validation and configuration
 * - Provides secure connection setup for program operations
 * - Ensures proper provider initialization for testing and deployment
 * 
 * @audit This utility is critical for security and should be reviewed for:
 * - Secure wallet keypair handling and storage
 * - Environment variable security and validation
 * - Connection configuration security
 * - Provider initialization security
 */

import fs from "fs";
import * as dotenv from "dotenv";
import * as Anchor from "@coral-xyz/anchor";

dotenv.config(); // Load .env file

// Validate required .env variables
// @audit Critical security check: ensures required environment variables are present
if (!process.env.ANCHOR_PROVIDER_URL || !process.env.ANCHOR_WALLET) {
  	throw new Error("Missing ANCHOR_PROVIDER_URL or ANCHOR_WALLET in .env file");
}

/**
 * Returns a configured AnchorProvider using .env values.
 * 
 * @returns Configured AnchorProvider instance
 * 
 * @audit This function performs critical security operations:
 * - Loads sensitive wallet keypair from filesystem
 * - Establishes secure connection to blockchain network
 * - Creates provider with proper commitment level
 * - Should be used only in secure environments
 */
export function getProvider(): Anchor.AnchorProvider {
	const providerUrl = process.env.ANCHOR_PROVIDER_URL!;
	const walletPath = process.env.ANCHOR_WALLET!;

	// Load wallet keypair from filesystem
	// @audit SECURITY CRITICAL: loads sensitive private key data
	const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")));
	const wallet = new Anchor.Wallet(Anchor.web3.Keypair.fromSecretKey(secretKey));

	// Establish connection to blockchain network
	const connection = new Anchor.web3.Connection(providerUrl, "confirmed");

	// Create Anchor provider with secure configuration
	const provider = new Anchor.AnchorProvider(connection, wallet, {
		commitment: "confirmed",
	});

	return provider;
}
