import fs from "fs";
import * as dotenv from "dotenv";
import * as Anchor from "@coral-xyz/anchor";

dotenv.config(); // Load .env file

// Validate required .env variables
if (!process.env.ANCHOR_PROVIDER_URL || !process.env.ANCHOR_WALLET) {
  	throw new Error("Missing ANCHOR_PROVIDER_URL or ANCHOR_WALLET in .env file");
}

/**
 * Returns a configured AnchorProvider using .env values.
 */
export function getProvider(): Anchor.AnchorProvider {
	const providerUrl = process.env.ANCHOR_PROVIDER_URL!;
	const walletPath = process.env.ANCHOR_WALLET!;

	// Load wallet keypair
	const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")));
	const wallet = new Anchor.Wallet(Anchor.web3.Keypair.fromSecretKey(secretKey));

	const connection = new Anchor.web3.Connection(providerUrl, "confirmed");

	// Create Anchor provider
	const provider = new Anchor.AnchorProvider(connection, wallet, {
		commitment: "confirmed",
	});

	return provider;
}
