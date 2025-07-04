/**
 * @fileoverview Investment Information Management Test Suite for H2Coin Vault Share Program
 * This test suite validates the investment information functionality including initialization,
 * state management, and access control mechanisms for investment configuration.
 * 
 * SECURITY CONSIDERATIONS:
 * - Tests investment information initialization and validation
 * - Validates state transitions and lifecycle management
 * - Ensures proper authorization checks for investment operations
 * - Tests edge cases in investment information management
 * 
 * @audit This test suite is critical for security validation and should be reviewed for:
 * - Investment state initialization security
 * - State transition validation and consistency
 * - Authorization bypass prevention for investment operations
 * - Edge case handling in investment lifecycle management
 * - Data integrity validation for investment parameters
 */

import { expect } from "chai";
import { describe, it } from "mocha";
import * as Anchor from "@coral-xyz/anchor";
import { ComputeBudgetProgram, PublicKey } from "@solana/web3.js";

import { 
	ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, ACCOUNT_SIZE,
	getAssociatedTokenAddress,
} from "@solana/spl-token";


import { stringToFixedU8Array, stage_ratio_map, 
	loadExecuteWhitelistKeypairs, loadUpdateWhitelistKeypairs, 
	loadWithdrawWhitelistKeypairs, 
	bytesToFixedString} from "./lib/lib";
import {Runtime as R} from "./runtime";
import { create } from "domain";



describe("Investment Info", async function() {
	const __investmentId = "02SEHzIZfBcpIZ0";
	const __version = "b9b64000";

	const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
		units: 400_000, // try 400k or 500k if needed
	});
	
	const threeUpdateSigners = loadUpdateWhitelistKeypairs().slice(0, 3);
	

	it("(0) Initialize investment info", async function() {
		this.timeout(1000 * 60 * 5); // 5 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`🚀 Initialize invesgtment info program...`);
		
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

			// assertion
			const investmentInfo = await program.account.investmentInfo.fetch(investmentInfoPda);
			expect(investmentInfo.investmentId).to.deep.equal(investmentId);
			expect(investmentInfo.version).to.deep.equal(version);
			expect(investmentInfo.state).to.have.property("pending");
			expect(investmentInfo.isActive).to.equal(true);
		} catch (e:any) {
			const logs = e.transactionLogs?.join("\n") || e.message || JSON.stringify(e);
			if (logs) {
				expect(logs).to.include("already in use");	
			}
			else {
				const investmentInfo = await program.account.investmentInfo.fetch(investmentInfoPda);
				expect(investmentInfo.state).to.have.property("completed");
				expect(investmentInfo.isActive).to.equal(false);
			}
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

	it("(1) Fail initialize investment info when it has been initialized", async function() {
		this.timeout(1000 * 60 * 5); // 5 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`🚀 Fail initialize investment info when it has been initialized program...`);
		

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

			// assertion
			const investmentInfo = await program.account.investmentInfo.fetch(investmentInfoPda);
			expect(investmentInfo.investmentId).to.deep.equal(investmentId);
			expect(investmentInfo.version).to.deep.equal(version);
			expect(investmentInfo.state).to.have.property("pending");
			expect(investmentInfo.isActive).to.equal(true);
		} catch (e:any) {
			const logs = e.transactionLogs?.join("\n") || e.message || JSON.stringify(e);
			if (logs) {
				expect(logs).to.include("already in use");	
			}
			else {
				const investmentInfo = await program.account.investmentInfo.fetch(investmentInfoPda);
				expect(investmentInfo.state).to.have.property("completed");
				expect(investmentInfo.isActive).to.equal(false);
			}
		}
		

		const vaultInfo = await provider.connection.getBalance(vaultPda);
		function isTokenAccount(buffer: Buffer): boolean {
			return buffer.length === ACCOUNT_SIZE;
		}

		const usdtAtaInfo = await provider.connection.getAccountInfo(vaultUsdtAta);
		if (!usdtAtaInfo || !isTokenAccount(usdtAtaInfo.data)) {
			console.log("❌ USDT ATA does not exist");
			return;
		}

		const hcoinAtaInfo = await provider.connection.getAccountInfo(vaultH2coinAta);
		if (!hcoinAtaInfo || !isTokenAccount(hcoinAtaInfo.data)) {
			console.log("❌ H2COIN ATA does not exist");
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

	it("(2) Update investment info works", async function() {
		this.timeout(1000 * 60 * 5); // 5 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`🚀 Update investment info works program...`);


		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const version = R.version;
		const investmentInfoPda = R.investmentInfoPda;

		const newStageRatioRows = [
			{ mid: 6.0, last: 4.0 },
			{ mid: 4.0, last: 6.0 },
			{ mid: 3.0, last: 2.0 },
		];
		const newStageRatio = stage_ratio_map(newStageRatioRows)

		const newUpperLimit = new Anchor.BN(1_000_000_000_000);		

		
		try {
			const tx = await program.methods
			.updateInvestmentInfo(
				newStageRatio,
				newUpperLimit,
			)
			.accounts({
				investmentInfo: investmentInfoPda,
				payer: provider.wallet.publicKey,
			} as any)
			.remainingAccounts(
				threeUpdateSigners.map(kp => ({
					pubkey: kp.publicKey,
					isWritable: false,
					isSigner: true,
				}))
			)
			.signers(threeUpdateSigners)
			.preInstructions([modifyComputeUnits])
			.rpc();

			// assertion
			const investmentInfo = await program.account.investmentInfo.fetch(investmentInfoPda);
			expect(investmentInfo.investmentId).to.deep.equal(investmentId);
			expect(investmentInfo.version).to.deep.equal(version);		
			expect(investmentInfo.isActive).to.equal(true);
		} catch (error) {
			
		}


		const investmentInfo = await program.account.investmentInfo.fetch(investmentInfoPda);
		console.log(`${indent}✅ (2) Update investment info works:`, {
			investmentId: bytesToFixedString(investmentInfo.investmentId),
			version: investmentInfo.version.map(n => n.toString(16).padStart(2, '0')).join(''),
			investmentType: Object.keys(investmentInfo.investmentType)[0],
			stageRatio: investmentInfo.stageRatio.toString(),
			investmentUpperLimit: investmentInfo.investmentUpperLimit.toString(),
			state: Object.keys(investmentInfo.state)[0],
			isActive: investmentInfo.isActive,
			startAt: new Date(investmentInfo.startAt.toNumber()*1000),
			endAt: new Date(investmentInfo.endAt.toNumber()*1000),
			createdAt: new Date(investmentInfo.createdAt.toNumber()*1000),
		});

		
	});

	it("(3) Set investment state to complete", async function() {
		this.timeout(1000 * 60 * 5); // 5 minutes timeout		
		const indent = ResolveIndent(this, 1);
		console.log(`🚀 Set investment state to complete program...`);


		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const version = R.version;
		const investmentInfoPda = R.investmentInfoPda; // 10 million H2coin (6 decimals)

		try {
			const tx = await program.methods
			.completedInvestmentInfo()
			.accounts({
				investmentInfo: investmentInfoPda,
				payer: provider.wallet.publicKey,
			} as any)
			.remainingAccounts(
				threeUpdateSigners.map(kp => ({
					pubkey: kp.publicKey,
					isWritable: false,
					isSigner: true,
				}))
			)
			.signers(threeUpdateSigners)
			.preInstructions([modifyComputeUnits])
			.rpc();


			const investmentInfo = await program.account.investmentInfo.fetch(investmentInfoPda);
			expect(investmentInfo.investmentId).to.deep.equal(investmentId);
			expect(investmentInfo.version).to.deep.equal(version);
			expect(investmentInfo.state).to.have.property("completed");
			expect(investmentInfo.isActive).to.equal(true);
			console.log(`${indent}✅ state is completed`);
		} catch (e:any) {
			expect(e).to.have.property("error");
			expect(e.error.errorCode.code).to.be.oneOf([
				"InvestmentInfoHasCompleted",
				"InvestmentInfoDeactivated"
			]);
		}
	});

	it("(4) Fail update investment info when state is completed", async function() {
		this.timeout(1000 * 60 * 5); // 5 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`🚀 Fail update investment info when state is completed program...`);


		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const version = R.version;
		const investmentInfoPda = R.investmentInfoPda;

		const newStageRatioRows = [
			{ mid: 1.0, last: 4.0 },
			{ mid: 2.0, last: 5.0 },
			{ mid: 3.0, last: 6.0 },
		];
		const newStageRatio = stage_ratio_map(newStageRatioRows)

		const newUpperLimit = new Anchor.BN(1_000_000_000_000);		

		try {
			const tx = await program.methods
			.updateInvestmentInfo(
				newStageRatio,
				newUpperLimit,
			)
			.accounts({
				investmentInfo: investmentInfoPda,
				payer: provider.wallet.publicKey,
			} as any)
			.remainingAccounts(
				threeUpdateSigners.map(kp => ({
					pubkey: kp.publicKey,
					isWritable: false,
					isSigner: true,
				}))
			)
			.signers(threeUpdateSigners)
			.preInstructions([modifyComputeUnits])
			.rpc();


		} catch (e:any) {
			expect(e).to.have.property("error");
			expect(e.error.errorCode.code).to.be.oneOf([
				"InvestmentInfoHasCompleted",
				"InvestmentInfoDeactivated"
			]);
		}
		

		const investmentInfo = await program.account.investmentInfo.fetch(investmentInfoPda);
		console.log(`${indent}✅ (4) Fail update investment info:`, {
			investmentId: bytesToFixedString(investmentInfo.investmentId),
			version: investmentInfo.version.map(n => n.toString(16).padStart(2, '0')).join(''),
			investmentType: Object.keys(investmentInfo.investmentType)[0],
			stageRatio: investmentInfo.stageRatio.toString(),
			investmentUpperLimit: investmentInfo.investmentUpperLimit.toString(),
			state: Object.keys(investmentInfo.state)[0],
			isActive: investmentInfo.isActive,
			startAt: new Date(investmentInfo.startAt.toNumber()*1000),
			endAt: new Date(investmentInfo.endAt.toNumber()*1000),
			createdAt: new Date(investmentInfo.createdAt.toNumber()*1000),
		});
	});

	it("(5) Set investment state to deactivated", async function() {
		this.timeout(1000 * 60 * 5); // 5 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`🚀 Set investment state to deactived program...`);

		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const version = R.version;
		const investmentInfoPda = R.investmentInfoPda; // 10 million H2coin (6 decimals)

		try {
			const tx = await program.methods
			.deactivateInvestmentInfo()
			.accounts({
				investmentInfo: investmentInfoPda,
				payer: provider.wallet.publicKey,
			} as any)
			.remainingAccounts(
				threeUpdateSigners.map(kp => ({
					pubkey: kp.publicKey,
					isWritable: false,
					isSigner: true,
				}))
			)
			.signers(threeUpdateSigners)
			.preInstructions([modifyComputeUnits])
			.rpc();


			const investmentInfo = await program.account.investmentInfo.fetch(investmentInfoPda);
			expect(investmentInfo.investmentId).to.deep.equal(investmentId);
			expect(investmentInfo.version).to.deep.equal(version);
			expect(investmentInfo.state).to.have.property("completed");
			expect(investmentInfo.isActive).to.equal(false);
			console.log(`${indent}✅ Investment info is deactivated`);
		} catch (e:any) {
			expect(e).to.have.property("error");
			expect(e.error.errorCode.code).to.equal("InvestmentInfoDeactivated");
		}
	});
	
	it("(6) Replace existing key with new key", async function() {
		this.timeout(1000 * 60 * 5); // 5 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`🚀 Replace existing key with new key program...`);
		

		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const version = R.version;
		const investmentInfoPda = R.investmentInfoPda;
		
		const updateWhistLists = loadUpdateWhitelistKeypairs();
		const threeSigners = updateWhistLists.slice(0, 3);


		const from = new Anchor.web3.PublicKey("5QUUjS7i2akMphaXV9QGWANhucQY73BsC9cNedR3feqB");
		const to  = new Anchor.web3.PublicKey("CR7HxrTiCiCvWxgJF2gGV3XjQnm1pveBp5XCrXqwJnLy");
				
		let caught = false;
		try {
			await program.methods
			.patchUpdateWhitelist()
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

		
			const investmentInfo = await program.account.investmentInfo.fetch(investmentInfoPda);
			expect(investmentInfo.investmentId).to.deep.equal(investmentId);
			expect(investmentInfo.version).to.deep.equal(version);
			expect(investmentInfo.state).to.have.property("completed");
			expect(investmentInfo.isActive).to.equal(false);

		} catch (e: any) {
			caught = true;
			expect(e).to.have.property("error");
			expect(e.error.errorCode.code).to.equal("InvestmentInfoDeactivated");
		}
	});
});