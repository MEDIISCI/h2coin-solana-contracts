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

export function u16ToLEBytes(n: number): Buffer {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(n, 0);
  return buf;
}

export function bytesToFixedString(bytes: number[] | Uint8Array): string {
	return Buffer.from(bytes).toString("utf8").replace(/\0/g, "");
}

/**
 * Converts an array of stage ratios (with mid and last values)
 * into a flattened 30-element u8[] stage ratio array.
 * Each entry becomes: [0,0,0, mid x6, last]
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


// Not used in new test env

/**
 * Returns the deployed program ID (public key) from the keypair file.
 * This ensures accurate loading of the deployed program in localnet or devnet.
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

// Generate a new keypair and save it to a file
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

export function chunk<T>(arr: T[], size: number): T[][] {
	const result: T[][] = [];
	for (let i = 0; i < arr.length; i += size) {
		result.push(arr.slice(i, i + size));
	}
	return result;
}


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
