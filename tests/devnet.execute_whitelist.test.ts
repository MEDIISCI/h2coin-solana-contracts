/**
 * @fileoverview Execute Whitelist Management Test Suite for H2Coin Vault Share Program
 * This test suite validates the execute whitelist functionality including initialization,
 * whitelist patching, and access control mechanisms for investment execution permissions.
 * 
 * SECURITY CONSIDERATIONS:
 * - Tests whitelist-based access control for investment execution
 * - Validates multi-signature requirements for whitelist modifications
 * - Ensures proper authorization checks for whitelist operations
 * - Tests edge cases in whitelist management
 * 
 * @audit This test suite is critical for security validation and should be reviewed for:
 * - Access control mechanism effectiveness
 * - Multi-signature validation
 * - Whitelist state consistency
 * - Authorization bypass prevention
 * - Edge case handling in whitelist operations
 */

import { expect } from "chai";
import {describe, it} from "mocha";
import * as Anchor from "@coral-xyz/anchor";
import { ComputeBudgetProgram, PublicKey } from "@solana/web3.js";

import { 
	ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, ACCOUNT_SIZE,
	getAssociatedTokenAddress,
} from "@solana/spl-token";

import {stringToFixedU8Array, stage_ratio_map, bytesToFixedString,
	loadExecuteWhitelistKeypairs, loadUpdateWhitelistKeypairs, loadWithdrawWhitelistKeypairs
} from "./lib/lib";

import {Runtime as R} from "./runtime";



describe("📃h2coin whitelist-check", async () => {
	const __investmentId = "02SEHzIZfBcpIZ1";
	const __version = "b9b64000";
	
	const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
		units: 400_000, // or even 500_000 if needed
	});


	before("Initialize investment info with CSR type", async function() {
		this.timeout(1000 * 60 * 5); // 5 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Initialize invesgtment info with CSR type program...`);
		
		const program = R.program;
		const provider = R.provider;
		const payer = provider.wallet;
		const usdt_mint = R.usdt_mint;
		const h2coin_mint = R.h2coin_mint;


		const investmentId = stringToFixedU8Array(__investmentId, 15);
		R.investmentId = investmentId;

		const version = stringToFixedU8Array(__version, 4, "hex");
		R.version = version;

		const investmentType = { csr:{} };

		const stageRatioRows = [
			{ mid: 1.0, last: 4.0 },
			{ mid: 2.0, last: 5.0 },
			{ mid: 3.0, last: 6.0 },
		];
		const stageRatio = stage_ratio_map(stageRatioRows);

		const start_at = new Anchor.BN(1747699200);
		const end_at = new Anchor.BN(1779235200);
		const upperLimit = new Anchor.BN(5_000_000_000_000);		

		const executeWhitelist = loadExecuteWhitelistKeypairs().map(k => k.publicKey).slice(0, 5);
		const updateWhitelist = loadUpdateWhitelistKeypairs().map(k => k.publicKey).slice(0, 5);
		const withdrawWhitelist = loadWithdrawWhitelistKeypairs().map(k => k.publicKey).slice(0, 1);


		// Compute PDA once for all tests
		const [investmentInfoPda] = Anchor.web3.PublicKey.findProgramAddressSync(
			[
				Buffer.from("investment"), 
				Buffer.from(investmentId), 
				Buffer.from(version)
			],
			program.programId
		);
		R.investmentInfoPda = investmentInfoPda;


		const [vaultPda] = Anchor.web3.PublicKey.findProgramAddressSync(
			[
				Buffer.from("vault"),
				Buffer.from(investmentId),
				Buffer.from(version),
			],
			program.programId
		);


		const [vaultUsdtAta, vaultH2coinAta] = await Promise.all([
			getAssociatedTokenAddress(usdt_mint, vaultPda, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
			getAssociatedTokenAddress(h2coin_mint, vaultPda, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID)
		]);


		try {
			const tx = await program.methods
			.initializeInvestmentInfo(
				investmentId,
				version,
				investmentType,
				stageRatio,
				start_at,
				end_at,
				upperLimit,
				executeWhitelist,
				updateWhitelist,
				withdrawWhitelist
			)
			.accounts({
				investmentInfo: investmentInfoPda,
				usdtMint: usdt_mint,
				hcoinMint: h2coin_mint,

				vault: vaultPda,
				vaultUsdtAccount: vaultUsdtAta,
				vaultHcoinAccount: vaultH2coinAta,

				payer: payer.publicKey,
				systemProgram: Anchor.web3.SystemProgram.programId,
				tokenProgram: TOKEN_PROGRAM_ID,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
			} as any)
			.preInstructions([modifyComputeUnits])
			.rpc();

		} catch (e:any) {			
			const logs = e.transactionLogs?.join("\n") || e.message || JSON.stringify(e);
			expect(logs).to.include("already in use");	
		}
		

		const vaultInfo = await provider.connection.getBalance(vaultPda);
		function isTokenAccount(buffer: Buffer): boolean {
			return buffer.length === ACCOUNT_SIZE;
		}

		const usdtAtaInfo = await provider.connection.getAccountInfo(vaultUsdtAta);
		if (!usdtAtaInfo || !isTokenAccount(usdtAtaInfo.data)) {
			console.log(`${indent}❌ USDT ATA does not exist`);
			return;
		}

		const hcoinAtaInfo = await provider.connection.getAccountInfo(vaultH2coinAta);
		if (!hcoinAtaInfo || !isTokenAccount(hcoinAtaInfo.data)) {
			console.log(`${indent}❌ H2COIN ATA does not exist`);
			return;
		}

		const [usdtBalance, h2coinBalance] = await Promise.all([
			provider.connection.getTokenAccountBalance(vaultUsdtAta),
			provider.connection.getTokenAccountBalance(vaultH2coinAta),
		]);


		const investmentInfo = await program.account.investmentInfo.fetch(investmentInfoPda);
		console.log(`${indent}✅ investment info Summary:`);
		console.log(`${indent}	investmentId:`, bytesToFixedString(investmentInfo.investmentId));
		console.log(`${indent}	version:`, Buffer.from(version).toString('hex'));
		console.log(`${indent}	investmentType:`, Object.keys(investmentInfo.investmentType)[0]);
		console.log(`${indent}	stageRatio:`, investmentInfo.stageRatio.toString());
		console.log(`${indent}	investmentUpperLimit:`, investmentInfo.investmentUpperLimit.toString());
		console.log(`${indent}	executeWhitelist:`, investmentInfo.executeWhitelist.map((v: PublicKey) => v.toBase58()).join(', '));
		console.log(`${indent}	updateWhitelist:`, investmentInfo.updateWhitelist.map((v: PublicKey) => v.toBase58()).join(', '));
		console.log(`${indent}	withdrawWhitelist:`, investmentInfo.withdrawWhitelist.map((v: PublicKey) => v.toBase58()).join(', '));
		console.log(`${indent}	state:`, Object.keys(investmentInfo.state)[0]);
		console.log(`${indent}	startAt:`, new Date(investmentInfo.startAt.toNumber()*1000));
		console.log(`${indent}	endAt:`, new Date(investmentInfo.endAt.toNumber()*1000));
		console.log(`${indent}	solBalance:`, vaultInfo / Anchor.web3.LAMPORTS_PER_SOL);
		console.log(`${indent}	usdtBalance:`, usdtBalance.value.uiAmountString ?? '0');
		console.log(`${indent}	h2coinBalance:`, h2coinBalance.value.uiAmountString ?? '0');
	});

	it("(0) Replace existing key with other existing key", async function() {
		this.timeout(1000 * 60 * 5); // 5 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Replace existing key with other existing key program...`);


		const program = R.program;
		const provider = R.provider;
		const investmentInfoPda = R.investmentInfoPda;

		
		const executeWhiteLists = loadExecuteWhitelistKeypairs();
		const threeSigners = executeWhiteLists.slice(0, 3);
		

		const from = new PublicKey("3A1krgYtfgYecXaqwZNQaxgiEaq7Yt1v3wdeZtvQPidW");
		const to = new PublicKey("9VzY3YbTyVjmE2BDBjgNr32Sfv2xpsx1CMNiCS9Kc8eT");
		
		
		let caught = false;
		try {
			await program.methods
				.patchExecuteWhitelist()
				.accounts({
					investmentInfo: investmentInfoPda,
					payer: provider.wallet.publicKey,
				} as any)
				.remainingAccounts([
					...threeSigners.map(kp => ({
						pubkey: kp.publicKey,
						isWritable: false,
						isSigner: true,
					})),
					{ pubkey: from, isWritable: false, isSigner: false },
					{ pubkey: to, isWritable: false, isSigner: false },
				])
				.signers(threeSigners)
				.preInstructions([modifyComputeUnits])
				.rpc();
		} catch (e: any) {
			caught = true;
			expect(e).to.have.property("error");
			expect(e.error.errorCode.code, `Actual code: ${e.error.errorCode.code}`).to.be.oneOf([
				"WhitelistAddressExists",
				"WhitelistAddressNotFound"
			]);
		}


		const investmentInfo = await program.account.investmentInfo.fetch(investmentInfoPda);
		const execWhiteLists = investmentInfo.executeWhitelist;
		let all_matched = true;
		for(let i=0; i<execWhiteLists.length; i++) {
			const index = executeWhiteLists.findIndex((v)=>{
				return v.publicKey.equals(execWhiteLists[i]);
			});

			all_matched = all_matched && index >= 0;
			console.log(`${indent}${execWhiteLists[i].toBase58()} ${index >= 0 ? '✅' : '❌'}`);
		}

		if ( !all_matched ) {
			throw new Error("Not matched!");
		}
	});

	it("(1) Replace existing key with self", async function() {
		this.timeout(1000 * 60 * 5); // 5 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Replace existing key with self program...`);


		const program = R.program;
		const provider = R.provider;
		const investmentInfoPda = R.investmentInfoPda;

		
		const executeWhiteLists = loadExecuteWhitelistKeypairs();
		const threeSigners = executeWhiteLists.slice(0, 3);

		const from = new PublicKey("3A1krgYtfgYecXaqwZNQaxgiEaq7Yt1v3wdeZtvQPidW");
		const to = new PublicKey("3A1krgYtfgYecXaqwZNQaxgiEaq7Yt1v3wdeZtvQPidW");
				
		let caught = false;
		try {
			await program.methods
				.patchExecuteWhitelist()
				.accounts({
					investmentInfo: investmentInfoPda,
					payer: provider.wallet.publicKey,
				} as any)
				.remainingAccounts([
					...threeSigners.map(kp => ({
						pubkey: kp.publicKey,
						isWritable: false,
						isSigner: true,
					})),
					{ pubkey: from, isWritable: false, isSigner: false },
					{ pubkey: to, isWritable: false, isSigner: false },
				])
				.signers(threeSigners)
				.preInstructions([modifyComputeUnits])
				.rpc();
		} catch (e: any) {
			caught = true;
			expect(e).to.have.property("error");
			expect(e.error.errorCode.code, `Actual code: ${e.error.errorCode.code}`).to.be.oneOf([
				"WhitelistAddressExists",
				"WhitelistAddressNotFound"
			]);
		}


		const investmentInfo = await program.account.investmentInfo.fetch(investmentInfoPda);
		const execWhiteLists = investmentInfo.executeWhitelist;
		let all_matched = true;
		for(let i=0; i<execWhiteLists.length; i++) {
			const index = executeWhiteLists.findIndex((v)=>{
				return v.publicKey.equals(execWhiteLists[i]);
			});

			all_matched = all_matched && index >= 0;
			console.log(`${indent}${execWhiteLists[i].toBase58()} ${index >= 0 ? '✅' : '❌'}`);
		}

		if ( !all_matched ) {
			throw new Error("Not matched!");
		}
	});

	it("(2) Replace existing key with new key", async function() {
		this.timeout(1000 * 60 * 5); // 5 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Replace existing key with new key...`);


		const program = R.program;
		const investmentInfoPda = R.investmentInfoPda;
		const provider = R.provider;
		
		const executeWhiteLists = loadExecuteWhitelistKeypairs();
		const threeSigners = executeWhiteLists.slice(0, 3);

		const from = new PublicKey("3A1krgYtfgYecXaqwZNQaxgiEaq7Yt1v3wdeZtvQPidW");
		const to  = new PublicKey("5QUUjS7i2akMphaXV9QGWANhucQY73BsC9cNedR3feqB");
				
		try {
			const tx = await program.methods
			.patchExecuteWhitelist()
			.accounts({
				investmentInfo: investmentInfoPda,
				payer: provider.wallet.publicKey,
			} as any)
			.remainingAccounts([
				...threeSigners.map(kp => ({
					pubkey: kp.publicKey,
					isWritable: false,
					isSigner: true,
				})),
				{ pubkey: from, isWritable: false, isSigner: false },
				{ pubkey: to, isWritable: false, isSigner: false },
			])
			.signers(threeSigners)
			.preInstructions([modifyComputeUnits])
			.rpc();
		} catch (e:any) {			
			expect(e).to.have.property("error");
			expect(e.error.errorCode.code, `Actual code: ${e.error.errorCode.code}`).to.be.oneOf([
				"WhitelistAddressExists",
				"WhitelistAddressNotFound"
			]);
		}
		


		const investmentInfo = await program.account.investmentInfo.fetch(investmentInfoPda);
		const execWhiteLists = investmentInfo.executeWhitelist;
		let all_matched = true;
		for(let i=0; i<execWhiteLists.length; i++) {
			const target = execWhiteLists[i];
			const index = executeWhiteLists.findIndex((v)=>{
				return v.publicKey.equals(target);
			});

			let pass:boolean;
			if ( target.equals(from) ) {
				pass = false;
			}
			else if ( target.equals(to) ) {
				pass = index < 0;
			}
			else {
				pass = index >= 0;
			}

			all_matched = all_matched && pass;
			console.log(`${indent}${target.toBase58()} ${pass ? '✅' : '❌'}`);
		}

		if ( !all_matched ) {
			throw new Error("Not matched!");
		}
	});

	it("(3) Reset to original whitelist", async function() {
		this.timeout(1000 * 60 * 5); // 5 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Reset to original whitelist progress...`);


		const program = R.program;
		const investmentInfoPda = R.investmentInfoPda;
		const provider = R.provider;
		
		const executeWhiteLists = loadExecuteWhitelistKeypairs();
		const threeSigners = executeWhiteLists.slice(1, 4);

		const from  = new PublicKey("5QUUjS7i2akMphaXV9QGWANhucQY73BsC9cNedR3feqB");
		const to 	= new PublicKey("3A1krgYtfgYecXaqwZNQaxgiEaq7Yt1v3wdeZtvQPidW");
				
		try {
			const tx = await program.methods
			.patchExecuteWhitelist()
			.accounts({
				investmentInfo: investmentInfoPda,
				payer: provider.wallet.publicKey,
			} as any)
			.remainingAccounts([
				...threeSigners.map(kp => ({
					pubkey: kp.publicKey,
					isWritable: false,
					isSigner: true,
				})),
				{ pubkey: from, isWritable: false, isSigner: false },
				{ pubkey: to, isWritable: false, isSigner: false },
			])
			.signers(threeSigners)
			.preInstructions([modifyComputeUnits])
			.rpc();
		} catch (e:any) {			
			expect(e).to.have.property("error");
			expect(e.error.errorCode.code, `Actual code: ${e.error.errorCode.code}`).to.be.oneOf([
				"WhitelistAddressExists",
				"WhitelistAddressNotFound"
			]);
		}
		


		const investmentInfo = await program.account.investmentInfo.fetch(investmentInfoPda);
		const execWhiteLists = investmentInfo.executeWhitelist;
		let all_matched = true;
		for(let i=0; i<execWhiteLists.length; i++) {
			const target = execWhiteLists[i];
			const index = executeWhiteLists.findIndex((v)=>{
				return v.publicKey.equals(target);
			});

			let pass:boolean;
			if ( target.equals(from) ) {
				pass = false;
			}
			else if ( target.equals(to) ) {
				pass = index >= 0;
			}
			else {
				pass = true;
			}

			all_matched = all_matched && pass;
			console.log(`${indent}${target.toBase58()} ${pass ? '✅' : '❌'}`);
		}

		if ( !all_matched ) {
			throw new Error("Not matched!");
		}
	});
});