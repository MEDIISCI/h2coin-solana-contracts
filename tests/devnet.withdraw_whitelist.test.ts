/**
 * @fileoverview Withdraw Whitelist Management Test Suite for H2Coin Vault Share Program
 * This test suite validates the withdraw whitelist functionality including initialization,
 * whitelist patching, and access control mechanisms for fund withdrawal permissions.
 * 
 * SECURITY CONSIDERATIONS:
 * - Tests whitelist-based access control for fund withdrawals
 * - Validates multi-signature requirements for whitelist modifications
 * - Ensures proper authorization checks for withdrawal operations
 * - Tests edge cases in withdraw whitelist management
 * 
 * @audit This test suite is critical for security validation and should be reviewed for:
 * - Withdrawal permission access control mechanism effectiveness
 * - Multi-signature validation for withdrawal operations
 * - Withdraw whitelist state consistency
 * - Authorization bypass prevention for fund withdrawals
 * - Edge case handling in withdraw whitelist operations
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



describe("h2coin whitelist-check", async () => {
	const __investmentId = "02SEHzIZfBcpIZ1";
	const __version = "b9b64000";
	
	const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
		units: 400_000, // try 400k or 500k if needed
	});

	const threeExecSigners = loadExecuteWhitelistKeypairs().slice(0, 3);
	console.log(threeExecSigners.map(kp => kp.publicKey.toBase58()));
	
	const threeUpdateSigners = loadUpdateWhitelistKeypairs().slice(0, 3);

	before("Initialize investment info with CSR type", async function() {
		this.timeout(1000 * 60 * 5); // 5 分鐘 timeout
		const indent = ResolveIndent(this, 1);
		console.log(`🚀 Initialize invesgtment info with CSR type program...`);
		
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
		console.log(`${indent}✅ (0) Initialize investment info:`, {
			investmentId: bytesToFixedString(investmentInfo.investmentId),
			version: Buffer.from(version).toString('hex'),
			investmentType: Object.keys(investmentInfo.investmentType)[0],
			stageRatio: investmentInfo.stageRatio.toString(),
			investmentUpperLimit: investmentInfo.investmentUpperLimit.toString(),
			executeWhitelist: investmentInfo.executeWhitelist.map(r=>r.toBase58()).join(', '),
			updateWhitelist: investmentInfo.updateWhitelist.map(r=>r.toBase58()).join(', '),
			withdrawWhitelist: investmentInfo.withdrawWhitelist.map(r=>r.toBase58()).join(', '),
			state: Object.keys(investmentInfo.state)[0],
			startAt: new Date(investmentInfo.startAt.toNumber()*1000),
			endAt: new Date(investmentInfo.endAt.toNumber()*1000),
			vaultPda: investmentInfo.vault.toBase58(),
			solBalance: vaultInfo / Anchor.web3.LAMPORTS_PER_SOL,
			usdtBalance: usdtBalance.value.uiAmountString ?? '0',
			h2coinBalance: h2coinBalance.value.uiAmountString ?? '0',
		});
	});

	it("(0) Replace whole with empty", async function() {
		this.timeout(1000 * 60 * 5); // 5 分鐘 timeout
		const indent = ResolveIndent(this, 1);
		console.log(`🚀 Replace whole with empty program...`);


		const program = R.program;
		const provider = R.provider;
		const investmentInfoPda = R.investmentInfoPda;

		
		const withdrawList: PublicKey[] = [];
				

		let caught = false;
		try {
			const tx = await program.methods
			.patchWithdrawWhitelist()
			.accounts({
				investmentInfo: investmentInfoPda,
				payer: provider.wallet.publicKey,
			} as any)
			.remainingAccounts([
				...threeExecSigners.map(kp => ({
					pubkey: kp.publicKey,
					isWritable: false,
					isSigner: true,
				})),
				...withdrawList.map(kp => ({
					pubkey: kp,
					isWritable: false,
					isSigner: false,
				}))
			])
			.signers(threeExecSigners)
			.preInstructions([modifyComputeUnits])
			.rpc();

		} catch (e:any) {
			caught = true;			
			expect(e).to.have.property("error");
			expect(e.error.errorCode.code).to.equal("WhitelistLengthInvalid");
		}
	

		const investmentInfo = await program.account.investmentInfo.fetch(investmentInfoPda);
		const withdrawWhitelist = investmentInfo.withdrawWhitelist;
		const testList = [
			new PublicKey("CF5yyzXav4KfxxCAtDwMoptaQXZJeVqMZrFLxePMvZGW")
		];
		let all_matched = true;
		for(let i=0; i<withdrawWhitelist.length; i++) {
			const index = testList.findIndex((v)=>{
				return v.equals(withdrawWhitelist[i]);
			});

			all_matched = all_matched && index >= 0;
			console.log(`${indent}${withdrawWhitelist[i].toBase58()} ${index >= 0 ? '✅' : '❌'}`);
		}

		if ( !all_matched ) {
			throw new Error("Not matched!");
		}
	});

	it("(1) Replace whole with update whitelist signer", async function() {
		this.timeout(1000 * 60 * 5); // 5 分鐘 timeout
		const indent = ResolveIndent(this, 1);
		console.log(`🚀 Replace whole with update whitelist signer program...`);

		const program = R.program;
		const investmentInfoPda = R.investmentInfoPda;
		const provider = R.provider;


		const withdrawList: PublicKey[] = [
			new PublicKey("CF5yyzXav4KfxxCAtDwMoptaQXZJeVqMZrFLxePMvZGW")
		];
				

		let caught = false;
		try {
			const tx = await program.methods
			.patchWithdrawWhitelist()
			.accounts({
				investmentInfo: investmentInfoPda,
				payer: provider.wallet.publicKey,
			} as any)
			.remainingAccounts([
				...threeUpdateSigners.map(kp => ({
					pubkey: kp.publicKey,
					isWritable: false,
					isSigner: true,
				})),
				...withdrawList.map(kp => ({
					pubkey: kp,
					isWritable: false,
					isSigner: false,
				}))
			])
			.signers(threeUpdateSigners)
			.preInstructions([modifyComputeUnits])
			.rpc();		
		} catch (e:any) {			
			caught = true;
			expect(e).to.have.property("error");
			expect(e.error.errorCode.code).to.equal("UnauthorizedSigner");
		}
	

		const investmentInfo = await program.account.investmentInfo.fetch(investmentInfoPda);
		const withdrawWhitelist = investmentInfo.withdrawWhitelist;
		const testList = [
			new PublicKey("CF5yyzXav4KfxxCAtDwMoptaQXZJeVqMZrFLxePMvZGW")
		];
		let all_matched = true;
		for(let i=0; i<withdrawWhitelist.length; i++) {
			const index = testList.findIndex((v)=>{
				return v.equals(withdrawWhitelist[i]);
			});

			all_matched = all_matched && index >= 0;
			console.log(`${indent}${withdrawWhitelist[i].toBase58()} ${index >= 0 ? '✅' : '❌'}`);
		}

		if ( !all_matched ) {
			throw new Error("Not matched!");
		}
	});

	it("(2) Replace whole", async function() {
		this.timeout(1000 * 60 * 5); // 5 分鐘 timeout
		const indent = ResolveIndent(this, 1);
		console.log(`🚀 Replace whole program...`);


		const program = R.program;
		const provider = R.provider;
		const investmentInfoPda = R.investmentInfoPda;


		const withdrawList:PublicKey[] = [
			new PublicKey("78cKKSS3V2hortcDFKbUaPunYE1PWW11oEomYCPNMo8k"),
			new PublicKey("5QUUjS7i2akMphaXV9QGWANhucQY73BsC9cNedR3feqB"),
		];
				
		let caught = false;
		try {
			const tx = await program.methods
			.patchWithdrawWhitelist()
			.accounts({
				investmentInfo: investmentInfoPda,
				payer: provider.wallet.publicKey,
			} as any)
			.remainingAccounts([
				...threeExecSigners.map(kp => ({
					pubkey: kp.publicKey,
					isWritable: false,
					isSigner: true,
				})),
				...withdrawList.map(kp => ({
					pubkey: kp,
					isWritable: false,
					isSigner: false,
				}))
			])
			.signers(threeExecSigners)
			.preInstructions([modifyComputeUnits])
			.rpc();		
		} catch (e:any) {
			caught = true;
			expect(e).to.have.property("error");
			expect(e.error.errorCode.code).to.equal("WhitelistAddressExists");
		}


		const investmentInfo = await program.account.investmentInfo.fetch(investmentInfoPda);
		const withdrawWhitelist = investmentInfo.withdrawWhitelist;
		let all_matched = withdrawWhitelist.length === withdrawList.length;
		for(let i=0; i<withdrawWhitelist.length; i++) {
			const index = withdrawList.findIndex((v)=>{
				return v.equals(withdrawWhitelist[i]);
			});

			all_matched = all_matched && index >= 0;
			console.log(`${indent}${withdrawWhitelist[i].toBase58()} ${index >= 0 ? '✅' : '❌'}`);
		}

		if ( !all_matched ) {
			throw new Error("Not matched!");
		}
	});
	it("(3) Reset to original whitelist", async function() {
		this.timeout(1000 * 60 * 5); // 5 分鐘 timeout
		const indent = ResolveIndent(this, 1);
		console.log(`🚀 Reset to original whitelist program...`);

		const program = R.program;
		const investmentInfoPda = R.investmentInfoPda;
		const provider = R.provider;


		const withdrawList = loadWithdrawWhitelistKeypairs();		
				

		let caught = false;
		try {
			const tx = await program.methods
			.patchWithdrawWhitelist()
			.accounts({
				investmentInfo: investmentInfoPda,
				payer: provider.wallet.publicKey,
			} as any)
			.remainingAccounts([
				...threeExecSigners.map(kp => ({
					pubkey: kp.publicKey,
					isWritable: false,
					isSigner: true,
				})),
				...withdrawList.map(kp => ({
					pubkey: kp.publicKey,
					isWritable: false,
					isSigner: false,
				}))
			])
			.signers(threeExecSigners)
			.preInstructions([modifyComputeUnits])
			.rpc();		
		} catch (e:any) {			
			caught = true;
			expect(e).to.have.property("error");
			expect(e.error.errorCode.code).to.equal("UnauthorizedSigner");
		}
	

		const investmentInfo = await program.account.investmentInfo.fetch(investmentInfoPda);
		const withdrawWhitelist = investmentInfo.withdrawWhitelist;
		
		let all_matched = true;
		for(let i=0; i<withdrawWhitelist.length; i++) {
			const index = withdrawList.findIndex((v)=>{
				return v.publicKey.equals(withdrawWhitelist[i]);
			});

			all_matched = all_matched && index >= 0;
			console.log(`${indent}${withdrawWhitelist[i].toBase58()} ${index >= 0 ? '✅' : '❌'}`);
		}

		if ( !all_matched ) {
			throw new Error("Not matched!");
		}
	});
});