/**
 * @fileoverview Utility library for H2Coin Vault Share program testing
 * This file contains essential utility functions for data conversion, keypair management,
 * file operations, and test infrastructure support.
 * 
 * SECURITY CONSIDERATIONS:
 * - Handles sensitive keypair loading and generation
 * - Manages whitelist keypair access control
 * - Processes binary data and string conversions
 * - Provides transaction event parsing capabilities
 * 
 * @audit This file is critical for test infrastructure and should be reviewed for:
 * - Secure keypair handling and storage
 * - File system access patterns
 * - Data validation and sanitization
 * - Memory management for large datasets
 */

import fs from "fs";
import path from "path";
import * as Anchor from "@coral-xyz/anchor";
import {
	PublicKey,
	Keypair,
	Transaction,
	sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
	getAssociatedTokenAddress,
	createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { H2coinVaultShare } from "../../target/types/h2coin_vault_share";
import programKeypairJson from "../../target/deploy/h2coin_vault_share-keypair.json";

/**
 * Converts a UTF-8 string into a fixed-length byte array (u8[]),
 * padding with zeros or truncating to fit the specified length.
 * 
 * @param str - Input string to convert
 * @param len - Target length of the byte array
 * @param encoding - Buffer encoding (default: utf8)
 * @returns Fixed-length byte array
 * 
 * @audit This function is used for:
 * - Investment ID encoding
 * - Version string processing
 * - Data serialization for program calls
 * - Ensures consistent data format across tests
 */
export function stringToFixedU8Array(
    str: string,
    len: number,
    encoding: BufferEncoding = "utf8"
): number[] {
    const encoded = Buffer.from(str, encoding);
    if (encoded.length > len) {
        console.error(`stringToFixedU8Array: String "${str}" encodes to ${encoded.length} bytes, which is longer than allowed ${len} bytes.`);
        // Optionally, throw or truncate here
    }
    const buf = Buffer.alloc(len);
    buf.write(str, 0, len, encoding);
    return Array.from(buf);
}

/**
 * Converts a 16-bit unsigned integer to little-endian byte representation
 * 
 * @param n - 16-bit unsigned integer
 * @returns 2-byte buffer in little-endian format
 * 
 * @audit Used for binary data serialization in program interactions
 */
export function u16ToLEBytes(n: number): Buffer {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(n, 0);
  return buf;
}

/**
 * Converts a byte array to a fixed string, removing null terminators
 * 
 * @param bytes - Input byte array
 * @returns Cleaned string without null characters
 * 
 * @audit Used for deserializing program data and cleaning user inputs
 */
export function bytesToFixedString(bytes: number[] | Uint8Array): string {
	return Buffer.from(bytes).toString("utf8").replace(/\0/g, "");
}

/**
 * Converts an array of stage ratios (with mid and last values)
 * into a flattened 30-element u8[] stage ratio array.
 * Each entry becomes: [0,0,0, mid x6, last]
 * 
 * @param stage_ratio_rows - Array of stage ratio objects
 * @returns Array of flattened stage ratios
 * 
 * @audit This function is critical for:
 * - Investment stage calculation
 * - Profit sharing distribution logic
 * - Ensures consistent ratio formatting for program calls
 * - Validates stage ratio structure
 */
export function stage_ratio_map(stage_ratio_rows: { mid: number; last: number }[]): number[][] {
	return stage_ratio_rows.map(({ mid, last }) => {
		const stage: number[] = [
			// 3 zeros, 6 mids, 1 last = 10 elements
			...new Array(3).fill(0),
			...new Array(6).fill(Math.round(mid)),
			Math.round(last),
		];
		return stage.slice(0, 10); // ensure 10 elements
	});
}

/**
 * Loads execute whitelist keypairs from JSON files
 * These keypairs have permission to execute investment operations
 * 
 * @returns Array of execute whitelist keypairs
 * 
 * @audit SECURITY CRITICAL:
 * - Loads sensitive private keys from filesystem
 * - These keypairs control investment execution permissions
 * - Files should be properly secured and access-controlled
 * - Keypairs should be validated before use
 */
export function loadExecuteWhitelistKeypairs(): Anchor.web3.Keypair[] {
	const baseDir = path.join(__dirname, "../../assets/execute_whitelist");

	// List all JSON files matching the naming pattern
	const files = fs
		.readdirSync(baseDir)
		.filter(f => /^execute\d+\.json$/.test(f))
		.sort((a, b) => {
			// Sort numerically by index (e.g., execute2 before execute10)
			const numA = parseInt(a.match(/\d+/)?.[0] || "0");
			const numB = parseInt(b.match(/\d+/)?.[0] || "0");
			return numA - numB;
		});

	const keypairs: Anchor.web3.Keypair[] = [];

	for (const filename of files) {
		const filepath = path.join(baseDir, filename);
		const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(filepath, "utf8")));
		keypairs.push(Anchor.web3.Keypair.fromSecretKey(secretKey));
	}

	return keypairs;
}

/**
 * Loads update whitelist keypairs from JSON files
 * These keypairs have permission to update investment information
 * 
 * @returns Array of update whitelist keypairs
 * 
 * @audit SECURITY CRITICAL:
 * - Loads sensitive private keys from filesystem
 * - These keypairs control investment update permissions
 * - Files should be properly secured and access-controlled
 * - Keypairs should be validated before use
 */
export function loadUpdateWhitelistKeypairs(): Anchor.web3.Keypair[] {
		const baseDir = path.join(__dirname, "../../assets/update_whitelist");

	// List all JSON files matching the naming pattern
	const files = fs
		.readdirSync(baseDir)
		.filter(f => /^update\d+\.json$/.test(f))
		.sort((a, b) => {
			// Sort numerically by index (e.g., update2 before update10)
			const numA = parseInt(a.match(/\d+/)?.[0] || "0");
			const numB = parseInt(b.match(/\d+/)?.[0] || "0");
			return numA - numB;
		});	

	const keypairs: Anchor.web3.Keypair[] = [];

	for (const filename of files) {
		const filepath = path.join(baseDir, filename);
		const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(filepath, "utf8")));
		keypairs.push(Anchor.web3.Keypair.fromSecretKey(secretKey));
	}

	return keypairs
}

/**
 * Loads withdraw whitelist keypairs from JSON files
 * These keypairs have permission to withdraw funds
 * 
 * @returns Array of withdraw whitelist keypairs
 * 
 * @audit SECURITY CRITICAL:
 * - Loads sensitive private keys from filesystem
 * - These keypairs control fund withdrawal permissions
 * - Files should be properly secured and access-controlled
 * - Keypairs should be validated before use
 */
export function loadWithdrawWhitelistKeypairs(): Anchor.web3.Keypair[] {
	const baseDir = path.join(__dirname, "../../assets/withdraw_whitelist");

	// List all JSON files matching the naming pattern
	const files = fs
		.readdirSync(baseDir)
		.filter(f => /^withdraw\d+\.json$/.test(f))
		.sort((a, b) => {
			// Sort numerically by index (e.g., withdraw2 before withdraw10)
			const numA = parseInt(a.match(/\d+/)?.[0] || "0");
			const numB = parseInt(b.match(/\d+/)?.[0] || "0");
			return numA - numB;
		});

	const keypairs: Anchor.web3.Keypair[] = [];

	for (const filename of files) {
		const filepath = path.join(baseDir, filename);
		const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(filepath, "utf8")));
		keypairs.push(Anchor.web3.Keypair.fromSecretKey(secretKey));
	}

	return keypairs;
}

/**
 * Loads investor account keypairs from JSON files
 * These represent individual investor accounts for testing
 * 
 * @returns Array of investor account keypairs
 * 
 * @audit SECURITY CONSIDERATIONS:
 * - Loads test investor private keys from filesystem
 * - These represent simulated investor accounts
 * - Should only be used in test environments
 * - Keypairs should be validated before use
 */
export function loadInvestorAccountKeypairs(): Keypair[] {
	const baseDir = path.join(__dirname, "../../assets/investor_account");

	// List all JSON files matching the naming pattern
	const files = fs
		.readdirSync(baseDir)
		.filter(f => /^investor\d+\.json$/.test(f))
		.sort((a, b) => {
			// Sort numerically by index (e.g., investor0 before investor10)
			const numA = parseInt(a.match(/\d+/)?.[0] || "0");
			const numB = parseInt(b.match(/\d+/)?.[0] || "0");
			return numA - numB;
		});

	const keypairs: Keypair[] = [];

	for (const filename of files) {
		const filepath = path.join(baseDir, filename);
		const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(filepath, "utf8")));
		keypairs.push(Keypair.fromSecretKey(secretKey));
	}

	return keypairs;
}

/**
 * Returns the deployed program ID (public key) from the keypair file.
 * This ensures accurate loading of the deployed program in localnet or devnet.
 * 
 * @returns Program public key
 * 
 * @audit This function is critical for:
 * - Program identification and validation
 * - Ensuring correct program deployment
 * - Preventing program ID mismatches
 * - Should be validated against expected program ID
 */
export function get_program_id(): PublicKey {
	try {
		const programKeypair = Keypair.fromSecretKey(Uint8Array.from(programKeypairJson));
		return programKeypair.publicKey;
	} catch (err) {
		console.error("Failed to load program keypair. Please verify the JSON key file.");
		throw err;
	}
}

/**
 * Generates a new keypair and saves it to a file, or returns existing keypair
 * Provides deterministic keypair generation for testing scenarios
 * 
 * @param filename - Name of the keypair file
 * @param folder - Directory to store the keypair
 * @returns Generated or existing keypair
 * 
 * @audit SECURITY CONSIDERATIONS:
 * - Creates or loads sensitive private keys
 * - Files are stored in assets directory
 * - Should only be used in test environments
 * - Directory creation should be properly secured
 * - Existing keypairs are reused for consistency
 */
export function generateKeypair(filename: string, folder: string):Keypair {
	const baseDir = path.join(__dirname, `../../assets/${folder}`);

	// check if the directory exists, if not, create it
	if (!fs.existsSync(baseDir)) {
		fs.mkdirSync(baseDir, { recursive: true });
	}

	// check if the file already exists
	// if it does, return the existing keypair
	// if it doesn't, generate a new keypair and save it
	const filePath = path.join(baseDir, `${filename}.json`);
	if (fs.existsSync(filePath)) {
		// console.warn(`⚠️ Keypair already exists: ${filename}.json, skipping.`);
		const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(filePath, "utf-8")));
		return Keypair.fromSecretKey(secretKey);
	}

	// generate a new keypair
	// and save it to the specified file
	// in the specified directory
	const keypair = Keypair.generate();
	const secretKeyArray = Array.from(keypair.secretKey);
	fs.writeFileSync(filePath, JSON.stringify(secretKeyArray), "utf-8");

	// console.log(`✅ Generated keypair: ${filename}.json`);

	return keypair;
}

/**
 * Splits an array into chunks of specified size
 * Useful for processing large datasets in batches
 * 
 * @param arr - Input array
 * @param size - Chunk size
 * @returns Array of arrays, each of specified size
 * 
 * @audit Used for:
 * - Batch processing of transactions
 * - Memory management for large operations
 * - Rate limiting of API calls
 */
export function chunk<T>(arr: T[], size: number): T[][] {
	const result: T[][] = [];
	for (let i = 0; i < arr.length; i += size) {
		result.push(arr.slice(i, i + size));
	}
	return result;
}

/**
 * Retrieves and parses Anchor events from a transaction signature
 * Extracts program events and compute units consumed
 * 
 * @param signature - Transaction signature
 * @param program - Anchor program instance
 * @returns Object containing events array and compute units consumed
 * 
 * @audit This function is critical for:
 * - Event validation and testing
 * - Compute unit consumption monitoring
 * - Transaction success verification
 * - Program state change tracking
 * - Should handle transaction failures gracefully
 */
export async function getAnchorEvents(signature: string, program: Anchor.Program<H2coinVaultShare>):Promise<{
	events: any[],
	consumed: number|undefined	

}> {
	const tx = await program.provider.connection.getTransaction(signature, {
		commitment: "confirmed",
		maxSupportedTransactionVersion: 0,
	});

	const logs = tx?.meta?.logMessages ?? [];
	const parser = new Anchor.EventParser(program.programId, program.coder);

	const events: any[] = [];
	for (const event of parser.parseLogs(logs)) {
			events.push(event);
	}

	return {
		events,
		consumed: tx?.meta?.computeUnitsConsumed
	};
}
