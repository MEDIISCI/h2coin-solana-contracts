import {describe, it, before} from "mocha";
import * as Anchor from "@coral-xyz/anchor";
import {AnchorProvider, Program, Idl} from "@coral-xyz/anchor";
import { PublicKey, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";

import idlJson from "../target/idl/h2coin_vault_share.json";
import { H2coinVaultShare } from "../target/types/h2coin_vault_share";
import { getProvider } from "../src/utils/provider";
import { stringToFixedU8Array } from "./lib/lib";


type AltTableType = 'record' | 'cache';
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

export const Runtime = R as Required<typeof R>;


before(async()=>{
	console.log("Resetting program's initial state...");


	const idl = idlJson as Idl;
	const provider = getProvider();
	Anchor.setProvider(provider);


	const program = new Program<H2coinVaultShare>(idl, provider);
	Runtime.program = program;
	Runtime.programId = program.programId;
	Runtime.provider = provider;
	R.tokenProgram = TOKEN_PROGRAM_ID;
	R.associatedTokenProgram = ASSOCIATED_TOKEN_PROGRAM_ID;


	Runtime.usdt_mint = new PublicKey('FTenRK9zPfxc19UUpZJ2Wm8CXrWV4k8rH8vLh2TNTp6q');
	Runtime.h2coin_mint = new PublicKey('9PwAsgkYQTQ6RipNuCkn74EgoXiMQWTaYhVip4CinRgG');

	const investmentId = stringToFixedU8Array("02SEHzIZfBcpIZN", 15);
	Runtime.investmentId = investmentId;


	const version = stringToFixedU8Array("4cdba595", 4, 'hex');
	Runtime.version = version;

	const [investmentInfoPda] = Anchor.web3.PublicKey.findProgramAddressSync(
		[
			Buffer.from("investment"), 
			Buffer.from(investmentId),
			Buffer.from(version),
		],
		program.programId
	);
	Runtime.investmentInfoPda = investmentInfoPda;

	// Initialize lookupTableMap
	Runtime.lookupTableMap.set('record', new Map());
	Runtime.lookupTableMap.set('cache', new Map());

	R.rent = SYSVAR_RENT_PUBKEY;
});

declare global {
	function ResolveIndent(ctx: Mocha.Context, extend?:number):string;
}

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