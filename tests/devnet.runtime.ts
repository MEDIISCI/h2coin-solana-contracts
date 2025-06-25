/**
 * @fileoverview Runtime configuration and setup for H2Coin Vault Share program testing
 * This file establishes the foundational test environment including program initialization,
 * global state management, and utility functions for all devnet tests.
 * 
 * SECURITY CONSIDERATIONS:
 * - Manages program state and configuration for testing scenarios
 * - Handles sensitive key management and PDA derivation
 * - Provides global test utilities and state resolution
 * 
 * @audit This file is critical for test infrastructure and should be reviewed for:
 * - Proper key management and derivation
 * - State initialization security
 * - Global variable usage patterns
 */

import {describe, it, before} from "mocha";
import * as Anchor from "@coral-xyz/anchor";
import {AnchorProvider, Program, Idl} from "@coral-xyz/anchor";
import { PublicKey, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";

import idlJson from "../target/idl/h2coin_vault_share.json";
import { H2coinVaultShare } from "../target/types/h2coin_vault_share";
import { getProvider } from "../src/utils/provider";
import { stringToFixedU8Array } from "./lib/lib";

/**
 * Type definition for Address Lookup Table categories
 * Used to organize and manage different types of lookup tables in the test environment
 */
type AltTableType = 'record' | 'cache';

/**
 * Global runtime configuration object
 * Contains all program state, keys, and configuration needed for testing
 * 
 * @audit This object holds sensitive information including:
 * - Program instances and IDs
 * - Token mint addresses
 * - PDA addresses
 * - Lookup table mappings
 */
const R:{
	program?: Program<H2coinVaultShare>;
	programId?: PublicKey;
	provider?: AnchorProvider;
	tokenProgram?: PublicKey;
	systemProgram?: PublicKey;
	associatedTokenProgram?: PublicKey; 
	version?: number[];
	investmentId?: number[];
	investmentInfoPda?: PublicKey;
	usdt_mint?: PublicKey;
	h2coin_mint?: PublicKey;
	lookupTableMap?: Map<AltTableType, Map<number, PublicKey>>;
	rent?: PublicKey;
} = {
	lookupTableMap: new Map<AltTableType, Map<number, PublicKey>>(),
};

/**
 * Exported runtime object with required type assertion
 * Provides type-safe access to all runtime configuration
 */
export const Runtime = R as Required<typeof R>;

/**
 * Global test setup function
 * Initializes program state, derives PDAs, and configures test environment
 * 
 * @audit This function performs critical security operations:
 * - Program initialization and provider setup
 * - PDA derivation for investment info
 * - Token mint address configuration
 * - Lookup table initialization
 */
before(async()=>{
	console.log("Resetting program's initial state...");

	// Initialize program with IDL and provider
	const idl = idlJson as Idl;
	const provider = getProvider();
	Anchor.setProvider(provider);

	// Create program instance and set global references
	const program = new Program<H2coinVaultShare>(idl, provider);
	Runtime.program = program;
	Runtime.programId = program.programId;
	Runtime.provider = provider;
	R.tokenProgram = TOKEN_PROGRAM_ID;
	R.associatedTokenProgram = ASSOCIATED_TOKEN_PROGRAM_ID;

	// Configure token mint addresses from environment variables
	// @audit Ensure these environment variables are properly secured in production
	const usdt_mint = process.env.USDT_MINT!;
	const h2coin_mint = process.env.H2coin_MINT!;
	Runtime.usdt_mint = new PublicKey(usdt_mint);
	Runtime.h2coin_mint = new PublicKey(h2coin_mint);

	// Set investment ID for testing scenarios
	// @audit This ID should be consistent across all test cases
	const investmentId = stringToFixedU8Array("02SEHzIZfBcpIZN", 15);
	Runtime.investmentId = investmentId;

	// Set version for program compatibility
	// @audit Version should match deployed program version
	const version = stringToFixedU8Array("4cdba595", 4, 'hex');
	Runtime.version = version;

	/**
	 * Derive Investment Info PDA
	 * This PDA is critical for program state management and should be derived consistently
	 * 
	 * @audit PDA derivation uses:
	 * - "investment" seed for namespace separation
	 * - investmentId for unique investment identification
	 * - version for program versioning support
	 */
	const [investmentInfoPda] = Anchor.web3.PublicKey.findProgramAddressSync(
		[
			Buffer.from("investment"), 
			Buffer.from(investmentId),
			Buffer.from(version),
		],
		program.programId
	);
	Runtime.investmentInfoPda = investmentInfoPda;

	// Initialize lookup table maps for efficient address resolution
	// @audit These maps improve transaction efficiency but should be validated
	Runtime.lookupTableMap.set('record', new Map());
	Runtime.lookupTableMap.set('cache', new Map());

	// Set system program references
	R.rent = SYSVAR_RENT_PUBKEY;
});

/**
 * Global type declaration for test context resolution
 * Extends Mocha context with custom utility functions
 */
declare global {
	function ResolveIndent(ctx: Mocha.Context, extend?:number):string;
}

/**
 * Global utility function for test indentation
 * Provides consistent formatting for test output and debugging
 * 
 * @param ctx - Mocha test context
 * @param extend - Additional indentation levels
 * @returns Formatted indentation string
 * 
 * @audit This function is used for test output formatting and should not affect
 * program logic or security
 */
global.ResolveIndent = function(ctx: Mocha.Context, extend:number=0) {
	let depth = 0;
	let parent = ctx?.test?.parent;
	while (parent && parent.title) {
		depth++;
		parent = parent.parent;
	}
	return "  ".repeat(depth + extend);
}

export {}; 