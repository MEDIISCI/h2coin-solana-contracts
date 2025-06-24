import { expect } from "chai";
import { describe, it } from "mocha";
import bs58 from "bs58";
import TrimId from "trimid";
import * as Anchor from "@coral-xyz/anchor";
import {
	ComputeBudgetProgram, 
	PublicKey, Keypair, 
	AddressLookupTableProgram,
} from "@solana/web3.js";
import { getAssociatedTokenAddress, 
	ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID,
	ACCOUNT_SIZE,
	getAccount
} from "@solana/spl-token";

import { stringToFixedU8Array, stage_ratio_map, 
	loadExecuteWhitelistKeypairs, loadUpdateWhitelistKeypairs, 
	loadWithdrawWhitelistKeypairs, 
	bytesToFixedString,	u16ToLEBytes
} from "./lib/lib";
import {Runtime as R} from "./devnet.runtime";



describe("Investment Record management", async () => {
	let is_record_add = false as boolean;


	const __investmentId = "02SEHzIZfBcpa22";
	const __version = "3e2ea002";


	const batchId = 2;
	const batchIdBytes = u16ToLEBytes(batchId);

	const yearIndex = 3;
	const yearIndexBytes = Uint8Array.of(yearIndex);
	
		
	const MAX_ENTRIES_PER_BATCH = 30;
	const MAX_RECORDS_PER_TX = 2;
	
	const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
		units: 800_000,
	});
	
	const threeExecSigners = loadExecuteWhitelistKeypairs().slice(0, 3);
	const threeUpdateSigners = loadUpdateWhitelistKeypairs().slice(0, 3);

	before("Initialize investment info with STANDARD type", async function() {
		this.timeout(1000 * 60 * 5); // 5 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Initialize invesgtment info with STANDARD type program...`);
		
		const program = R.program;
		const provider = R.provider;
		const payer = provider.wallet;
		const usdt_mint = R.usdt_mint;
		const h2coin_mint = R.h2coin_mint;


		const investmentId = stringToFixedU8Array(__investmentId, 15);
		R.investmentId = investmentId;

		const version = stringToFixedU8Array(__version, 4, "hex");
		R.version = version;

		const investmentType = { standard:{} };

		const stageRatioRows = [
			{ mid: 1.0, last: 4.0 },
			{ mid: 2.0, last: 5.0 },
			{ mid: 3.0, last: 6.0 },
		];
		const stageRatio = stage_ratio_map(stageRatioRows);

		const start_at = new Anchor.BN(1611100800); // January 20, 2021 12:00:00 AM
		const end_at = new Anchor.BN(1621468800);   // May 20, 2021 12:00:00 AM
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
			startAt: new Date(investmentInfo.startAt.toNumber()*1000),
			endAt: new Date(investmentInfo.endAt.toNumber()*1000),
			vaultPda: investmentInfo.vault.toBase58(),
			solBalance: vaultInfo / Anchor.web3.LAMPORTS_PER_SOL,
			usdtBalance: usdtBalance.value.uiAmountString ?? '0',
			h2coinBalance: h2coinBalance.value.uiAmountString ?? '0',
		});
	});

	it('(0) adds new investment records (batch mode)', async function () {		
		this.timeout(1000 * 60 * 5); // 5 minutes timeout		
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Adding investment records program ...`);


		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const investmentInfoPda = R.investmentInfoPda;
		const investmentRecordPdas:PublicKey[] = [];
		const version = R.version;	
		const payer = provider.wallet;
		const usdt_mint = R.usdt_mint;
		const h2coin_mint = R.h2coin_mint;


		const record_list = await program.account.investmentRecord.all([
				{
					memcmp: {
						offset: 8, // discriminator + batchId
						bytes: bs58.encode(Array.from(batchIdBytes)),
					},
				},
				{
					memcmp: {
						offset: 33, // investment_id
						bytes: bs58.encode(Buffer.from(investmentId)),
					},
				},
				{
					memcmp: {
						offset: 33 + 15, // version
						bytes: bs58.encode(Buffer.from(version)),
					},
				},
			]);
		if (record_list.length >= MAX_ENTRIES_PER_BATCH) {
			is_record_add = true;
			return;
		}

		const fix_account_id = '02SEUFT8wuOZ2w5';
		let fix_wallet = new PublicKey('3A1krgYtfgYecXaqwZNQaxgiEaq7Yt1v3wdeZtvQPidW');

		
		let total_invest_usdt = 0;
		let currentRecordId = 31;

		for (let start = 1; start <= MAX_ENTRIES_PER_BATCH; start += MAX_RECORDS_PER_TX) {
			let tx = new Anchor.web3.Transaction();

			for (let offset = 0; offset < MAX_RECORDS_PER_TX && (start + offset) <= MAX_ENTRIES_PER_BATCH; offset++) {
				const index = start*30 + offset;

				// Generate investment record
				const recordId = new Anchor.BN(currentRecordId);
				const accountId = index % 11 === 0? fix_account_id: TrimId.shortid();
				const accountIdBytes = stringToFixedU8Array(accountId, 15);
				const wallet = index % 11 === 0? fix_wallet: Keypair.generate().publicKey;
				const options = [1, 5, 10];
				const basicUsdt = 1000 * 10 ** 6;
				const exchangeRatio = 1.05;
				const amountUsdt = basicUsdt * options[Math.floor(Math.random() * options.length)];
				const amountHcoin = amountUsdt * exchangeRatio;
				total_invest_usdt += amountUsdt;
				
				const [recordPda] = Anchor.web3.PublicKey.findProgramAddressSync(
					[
						Buffer.from("record"),
						Buffer.from(investmentId),
						Buffer.from(version),
						batchIdBytes,
						recordId.toArrayLike(Buffer, "le", 8),
						Buffer.from(accountIdBytes)
					],
					program.programId
				);
				investmentRecordPdas.push(recordPda);

				console.log(`${indent}recordId`, currentRecordId, 'wallet:', wallet.toBase58(), 'amount:', amountUsdt, 'recordPda:', recordPda.toBase58());

				const [RecipientUsdtAta, RecipientHcoinAta] = await Promise.all([
					getAssociatedTokenAddress(usdt_mint, wallet),
					getAssociatedTokenAddress(h2coin_mint, wallet)
				]);
				
				const ix = await program.methods
					.addInvestmentRecord(
						batchId,
						recordId,
						accountIdBytes,
						new Anchor.BN(amountUsdt),
						new Anchor.BN(amountHcoin),
						1
					)
					.accounts({
						investmentInfo: investmentInfoPda,
						investmentRecord: recordPda,

						usdtMint: usdt_mint,
						hcoinMint: h2coin_mint,

						recipientAccount: wallet,
						recipientUsdtAccount: RecipientUsdtAta,
						recipientHcoinAccount: RecipientHcoinAta,

						payer: payer.publicKey,
						systemProgram: Anchor.web3.SystemProgram.programId,
						tokenProgram: TOKEN_PROGRAM_ID,
						associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
					} as any)
					.remainingAccounts(
						threeUpdateSigners.map(kp => ({
							pubkey: kp.publicKey,
							isWritable: false,
							isSigner: true,
						}))
					)
					.instruction();

				tx.add(ix);
				currentRecordId++;
			} // end for offset

			try {
				// send investment records transcation
				const sig = await provider.sendAndConfirm(tx, threeUpdateSigners, {
					commitment: "confirmed",
					skipPreflight: false,
				});
				console.log(`${indent}✅ Sent records: ${currentRecordId-2}~${currentRecordId-1} (tx: ${sig})`);


				await new Promise(resolve => setTimeout(resolve, 1000));

			} catch (e: any) {
				console.log(e);
				
				const logs = e.transactionLogs?.join("\n") || e.message || JSON.stringify(e);
				expect(logs).to.include("InvestmentInfoHasCompleted");
			}
		}

		// ✅ 驗證
		try {
			const result1 = await program.account.investmentRecord.all([
				{
					memcmp: {
						offset: 33, // discriminator 是前8位，接下來是 investment_id
						bytes: bs58.encode(Buffer.from(investmentId)),
					},
				},
				{
					memcmp: {
						offset: 33 + 15, // version
						bytes: bs58.encode(Buffer.from(version)),
					},
				},
			]);
			expect(result1.length).to.be.greaterThan(0);


			const result2 = await program.account.investmentRecord.all([
				{
					memcmp: {
						offset: 8, // discriminator + batchId
						bytes: bs58.encode(Array.from(batchIdBytes)),
					},
				},
				{
					memcmp: {
						offset: 33, // discriminator 是前8位，接下來是 investment_id
						bytes: bs58.encode(Buffer.from(investmentId)),
					},
				},
				{
					memcmp: {
						offset: 33 + 15, // version
						bytes: bs58.encode(Buffer.from(version)),
					},
				},
			]);
			expect(result2.length).to.be.greaterThan(0);

			console.log(`${indent}🔍  Add investment record result:`, {
				batchId,
				total_invest_usdt,
				total_record_by_batchId: result2.length,
				total_record_by_investmentId: result1.length,
			});
		} catch (e) {
			console.error(`${indent}❌ error:`, e);
		}
	});

	it('(1) Update investment record wallet base on accont_id', async function () {
		this.timeout(1000 * 60 * 5); // 5 minutes timeout		
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Update investment record wallet base on accont_id program ...`);
		

		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const investmentInfoPda = R.investmentInfoPda;
		const investmentRecordPdas:PublicKey[] = [];
		const version = R.version;	
		const payer = provider.wallet;
		const usdt_mint = R.usdt_mint;
		const h2coin_mint = R.h2coin_mint;


		const __account_id = '02SEUFT8wuOZ2w5';
		const fix_account_id = stringToFixedU8Array(__account_id, 15);
		const old_wallet = new PublicKey('3A1krgYtfgYecXaqwZNQaxgiEaq7Yt1v3wdeZtvQPidW');
		const new_wallet = new PublicKey('D37W4RnEps9SN1d6NjaJLXYPQKcKEjQKkMNyc8nVDXuB');
		const [RecipientUsdtAta, RecipientHcoinAta] = await Promise.all([
			getAssociatedTokenAddress(usdt_mint, new_wallet),
			getAssociatedTokenAddress(h2coin_mint, new_wallet)
		]);


		const before_record_list = await program.account.investmentRecord.all([
			{
				memcmp: {
					offset: 18, // account_id
					bytes: bs58.encode(Buffer.from(fix_account_id)),
				},
			},
			{
				memcmp: {
					offset: 33, // investment_id
					bytes: bs58.encode(Buffer.from(investmentId)),
				},
			},
			{
				memcmp: {
					offset: 33 + 15, // version
					bytes: bs58.encode(Buffer.from(version)),
				},
			},
		]);

		console.log(`${indent}✅`,
			'before_record_list',
			before_record_list.map((i:any) => ({
				recordId: i.account.recordId.toNumber(),
				accountId: bytesToFixedString(i.account.accountId),
				wellet: i.account.wallet.toBase58()
			}))
		);

		for (const {account} of before_record_list) {
			const [recordPda] = Anchor.web3.PublicKey.findProgramAddressSync(
					[
						Buffer.from("record"),
						Buffer.from(investmentId),                    	// 15 bytes
						Buffer.from(version),							// 4 bytes
						batchIdBytes,
						account.recordId.toArrayLike(Buffer, "le", 8),   // 8 bytes 
						Buffer.from(account.accountId)
					],
					program.programId
				);
			investmentRecordPdas.push(recordPda);
		}
		

		// ✅ 驗證
		try {
			const ix = await program.methods
			.updateInvestmentRecordWallets(fix_account_id)
			.accounts({
				investmentInfo: investmentInfoPda,
				usdtMint: usdt_mint,
				hcoinMint: h2coin_mint,

				recipientAccount: new_wallet,
				recipientUsdtAccount: RecipientUsdtAta,
				recipientHcoinAccount: RecipientHcoinAta,

				payer: payer.publicKey,
				systemProgram: Anchor.web3.SystemProgram.programId,
				tokenProgram: TOKEN_PROGRAM_ID,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
			} as any)
			.remainingAccounts([
				...threeUpdateSigners.map(kp => ({
					pubkey: kp.publicKey,
					isWritable: false,
					isSigner: true,
				})),
				...investmentRecordPdas.map(kp => ({
					pubkey: kp,
					isWritable: true,
					isSigner: false,
				}))
			])
			.preInstructions([modifyComputeUnits])
			.instruction();

			const tx = new Anchor.web3.Transaction().add(ix);
			const sig = await provider.sendAndConfirm(tx, [...threeUpdateSigners]);
			console.log(`${indent}✅ Wallets updated (tx: ${sig})`);

			// delay 1 second
			await new Promise(resolve => setTimeout(resolve, 1000));

			const after_record_list = await program.account.investmentRecord.all([
				{
					memcmp: {
						offset: 18, // account_id
						bytes: bs58.encode(Buffer.from(fix_account_id)),
					},
				},
				{
					memcmp: {
						offset: 33, // investment_id
						bytes: bs58.encode(Buffer.from(investmentId)),
					},
				},
				{
					memcmp: {
						offset: 33 + 15, // version
						bytes: bs58.encode(Buffer.from(version)),
					},
				},
			]);


			console.log(`${indent}✅`,
				'after_record_list',
				after_record_list.map((i:any) => ({
					recordId: i.account.recordId.toNumber(),
					accountId: bytesToFixedString(i.account.accountId),
					wellet: i.account.wallet.toBase58()
				}))
			);
		} catch (e:any) {
			expect(e.transactionLogs.join('\n')).to.include("NoRecordsUpdated");
		}
	});

	it("(2) Revoke investment record", async function() {
		this.timeout(1000 * 60 * 5); // 5 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Revoke investment record program...`);

		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const version = R.version;
		const investmentInfoPda = R.investmentInfoPda; // 10 million H2coin (6 decimals)

		const before_record_list = await program.account.investmentRecord.all([
			{
				memcmp: {
					offset: 8, // batchId
					bytes: bs58.encode(Buffer.from(batchIdBytes)),
				},
			},
			{
				memcmp: {
					offset: 33, // investment_id
					bytes: bs58.encode(Buffer.from(investmentId)),
				},
			},
			{
				memcmp: {
					offset: 33 + 15, // version
					bytes: bs58.encode(Buffer.from(version)),
				},
			},
		]);
		const before_record = before_record_list[3].account;
		console.log(`${indent}✅`,
			'before_record',
			{
				recordId: before_record.recordId.toNumber(),
				accountId: bytesToFixedString(before_record.accountId),
				revokedAt: before_record.revokedAt.toNumber(),
			}
		);

		try {
			const tx = await program.methods
			.revokedInvestmentRecord(
				before_record.batchId,
				before_record.recordId,
				before_record.accountId
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


			// delay 1 second
			await new Promise(resolve => setTimeout(resolve, 1000));


			const after_record_list = await program.account.investmentRecord.all([
				{
					memcmp: {
						offset: 8, // batchId
						bytes: bs58.encode(Buffer.from(batchIdBytes)),
					},
				},
				{
					memcmp: {
						offset: 33, // investment_id
						bytes: bs58.encode(Buffer.from(investmentId)),
					},
				},
				{
					memcmp: {
						offset: 33 + 15, // version
						bytes: bs58.encode(Buffer.from(version)),
					},
				},
			]);
			const after_record = after_record_list[3].account;
			console.log(`${indent}✅`,
				'after_record',
				{
					recordId: after_record.recordId.toNumber(),
					accountId: bytesToFixedString(after_record.accountId),
					revokedAt: after_record.revokedAt.toNumber(),
				}
			);
		} catch (e:any) {
			expect(e).to.have.property("error");
			expect(e.error.errorCode.code, `Actual code: ${e.error.errorCode.code}`).to.be.oneOf([
				"RecordAlreadyRevoked",
				"InvestmentInfoDeactivated",
				"InvestmentInfoNotCompleted"
			]);
		}
	});

	it("(3) Set investment state to complete", async function() {
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}Set investment state to complete...`);

		const program = R.program;
		const provider = R.provider;
		const investmentInfoPda = R.investmentInfoPda;


		try {
			const signature = await program.methods
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

			const updated = await program.account.investmentInfo.fetch(investmentInfoPda);
			expect(updated.state).to.have.property("completed");
			console.log(`${indent}✅ state is completed`);
		} catch (e:any) {
			expect(e).to.have.property("error");
			expect(e.error.errorCode.code).to.equal("InvestmentInfoHasCompleted");
		}
	});

	it('(4) Update investment record wallet again', async function () {		
		this.timeout(1000 * 60 * 5); // 5 minutes timeout		
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Update investment record wallet again program ...`);


		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const investmentInfoPda = R.investmentInfoPda;
		const investmentRecordPdas:PublicKey[] = [];
		const version = R.version;	
		const payer = provider.wallet;
		const usdt_mint = R.usdt_mint;
		const h2coin_mint = R.h2coin_mint;


		const __account_id = '02SEUFT8wuOZ2w5';
		const fix_account_id = stringToFixedU8Array(__account_id, 15);
		const old_wallet = new PublicKey('3A1krgYtfgYecXaqwZNQaxgiEaq7Yt1v3wdeZtvQPidW');
		const new_wallet = new PublicKey('D37W4RnEps9SN1d6NjaJLXYPQKcKEjQKkMNyc8nVDXuB');
		const [RecipientUsdtAta, RecipientHcoinAta] = await Promise.all([
			getAssociatedTokenAddress(usdt_mint, new_wallet),
			getAssociatedTokenAddress(h2coin_mint, new_wallet)
		]);


		const before_record_list = await program.account.investmentRecord.all([
			{
				memcmp: {
					offset: 18, // account_id
					bytes: bs58.encode(Buffer.from(fix_account_id)),
				},
			},
			{
				memcmp: {
					offset: 33, // investment_id
					bytes: bs58.encode(Buffer.from(investmentId)),
				},
			},
			{
				memcmp: {
					offset: 33 + 15, // version
					bytes: bs58.encode(Buffer.from(version)),
				},
			},
		]);

		console.log(`${indent}✅`,
			'before_record_list',
			before_record_list.map((i:any) => ({
				recordId: i.account.recordId.toNumber(),
				accountId: bytesToFixedString(i.account.accountId),
				wellet: i.account.wallet.toBase58()
			}))
		);

		for (const {account} of before_record_list) {
			const [recordPda] = Anchor.web3.PublicKey.findProgramAddressSync(
					[
						Buffer.from("record"),
						Buffer.from(investmentId),                    	// 15 bytes
						Buffer.from(version),							// 4 bytes
						batchIdBytes,
						account.recordId.toArrayLike(Buffer, "le", 8),   // 8 bytes 
						Buffer.from(account.accountId)
					],
					program.programId
				);
			investmentRecordPdas.push(recordPda);
		}
		

		// ✅ 驗證
		try {
			const ix = await program.methods
			.updateInvestmentRecordWallets(fix_account_id)
			.accounts({
				investmentInfo: investmentInfoPda,
				usdtMint: usdt_mint,
				hcoinMint: h2coin_mint,

				recipientAccount: new_wallet,
				recipientUsdtAccount: RecipientUsdtAta,
				recipientHcoinAccount: RecipientHcoinAta,

				payer: payer.publicKey,
				systemProgram: Anchor.web3.SystemProgram.programId,
				tokenProgram: TOKEN_PROGRAM_ID,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
			} as any)
			.remainingAccounts([
				...threeUpdateSigners.map(kp => ({
					pubkey: kp.publicKey,
					isWritable: false,
					isSigner: true,
				})),
				...investmentRecordPdas.map(kp => ({
					pubkey: kp,
					isWritable: true,
					isSigner: false,
				}))
			])
			.preInstructions([modifyComputeUnits])
			.instruction();

			const tx = new Anchor.web3.Transaction().add(ix);
			const sig = await provider.sendAndConfirm(tx, [...threeUpdateSigners]);
			console.log(`${indent}✅ Wallets updated (tx: ${sig})`);

			// delay 1 second
			await new Promise(resolve => setTimeout(resolve, 1000));

			const after_record_list = await program.account.investmentRecord.all([
				{
					memcmp: {
						offset: 18, // account_id
						bytes: bs58.encode(Buffer.from(fix_account_id)),
					},
				},
				{
					memcmp: {
						offset: 33, // investment_id
						bytes: bs58.encode(Buffer.from(investmentId)),
					},
				},
				{
					memcmp: {
						offset: 33 + 15, // version
						bytes: bs58.encode(Buffer.from(version)),
					},
				},
			]);


			console.log(`${indent}✅`,
				'after_record_list',
				after_record_list.map((i:any) => ({
					recordId: i.account.recordId.toNumber(),
					accountId: bytesToFixedString(i.account.accountId),
					wellet: i.account.wallet.toBase58()
				}))
			);
		} catch (e:any) {
			expect(e.transactionLogs.join('\n')).to.include("NoRecordsUpdated");
		}
	});

	it("(5) Create ALT from investment records", async function () {
		this.timeout(1000 * 60 * 5); // 5 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Create ALT from investment records program...`);


		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const version = R.version;


		const record_list = await program.account.investmentRecord.all([
			{
				memcmp: {
					offset: 8, // batchId
					bytes: bs58.encode(Buffer.from(batchIdBytes)),
				},
			},
			{
				memcmp: {
					offset: 33, // investment_id
					bytes: bs58.encode(Buffer.from(investmentId)),
				},
			},
			{
				memcmp: {
					offset: 33 + 15, // version
					bytes: bs58.encode(Buffer.from(version)),
				},
			},
		]);
		console.log(`${indent}✅ Found ${record_list.length} investment records for batchId=${batchId}`);
		record_list.sort((a, b) => a.account.recordId.toNumber() - b.account.recordId.toNumber());

		const tx_alt = new Anchor.web3.Transaction();
		const recentSlot = await provider.connection.getSlot("finalized");
		const [createIx, lookupTableAddress] = AddressLookupTableProgram.createLookupTable({
			authority: provider.wallet.publicKey,
			payer: provider.wallet.publicKey,
			recentSlot,
		});

		const extendIx = AddressLookupTableProgram.extendLookupTable({
			lookupTable: lookupTableAddress,
			authority: provider.wallet.publicKey,
			payer: provider.wallet.publicKey,
			addresses: record_list.map((i:any) => i.publicKey),
		});

		tx_alt.add(createIx, extendIx);
		const sig = await provider.sendAndConfirm(tx_alt, []);
		console.log(`${indent}✅ Created ALT address: ${lookupTableAddress.toBase58()} at batchId = ${batchId}`);
		await new Promise(resolve => setTimeout(resolve, 1500));

		let retries = 0;
		let lookupTableAccount;
		while (!lookupTableAccount && retries < 5) {
			const result = await provider.connection.getAddressLookupTable(lookupTableAddress);
			if (result.value) {
				lookupTableAccount = result.value;
				break;
			}
			await new Promise(res => setTimeout(res, 1000));
			retries++;
		}
		if (!lookupTableAccount) throw new Error("ALT did not become available in time");

		// Store the lookup table address in the map
		R.lookupTableMap.get('record')!.set(batchId, lookupTableAddress);
	});

	it("(6) Estimate profit share using ALT with standard type", async function () {
		this.timeout(1000 * 60 * 5); // 5 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Process estimate profit share program...`);
		

		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const investmentInfoPda = R.investmentInfoPda;
		const version = R.version;
		const usdt_mint = R.usdt_mint;
		const payer = provider.wallet.publicKey;
		const totalProfitUsdt = new Anchor.BN(5_000_000_000_000);
		const lookupTableAddress = R.lookupTableMap.get('record')!.get(batchId);
		console.log(`${indent}📃 Lookup Table Address: ${lookupTableAddress?.toBase58()}`);
		

		// Find the PDA for the profit share cache
		const [cachePda] = Anchor.web3.PublicKey.findProgramAddressSync(
			[
				Buffer.from("profit_cache"),
				Buffer.from(investmentId),
				Buffer.from(version),
				batchIdBytes,
			],
			program.programId
		);


		// Get all total records and calculte total invest usdt
		const totalRecords = await program.account.investmentRecord.all([
			{
				memcmp: {
					offset: 8, // batchId
					bytes: bs58.encode(Array.from(batchIdBytes)),
				},
			},
			{
				memcmp: {
					offset: 33,	// investment_id
					bytes: bs58.encode(Buffer.from(investmentId)),
				},
			},
			{
				memcmp: {
					offset: 33 + 15, // version
					bytes: bs58.encode(Buffer.from(version)),
				},
			},
		]);

	
		const totalInvestUsdt = totalRecords.reduce((sum, r) => {
			if (r.account.revokedAt.isZero()) {
				return sum.add(r.account.amountUsdt);
			}
			return sum;
		}, new Anchor.BN(0));
		const investmentRecordPdas = totalRecords.map(record => record.publicKey);


		let errorCaught = false;
		try {
			const estimateIx = await program.methods
			.estimateProfitShare(batchId, totalProfitUsdt, totalInvestUsdt)
			.accounts({
				investmentInfo: investmentInfoPda,
				mint: usdt_mint,
				cache: cachePda,
				payer: provider.wallet.publicKey,
				systemProgram: Anchor.web3.SystemProgram.programId,
			} as any)
			.remainingAccounts([
				{
					pubkey: threeUpdateSigners[0].publicKey,
					isWritable: false,
					isSigner: true,
				},
				...investmentRecordPdas.map(kp => ({
					pubkey: kp,
					isWritable: false,
					isSigner: false,
				})),
			])
			.signers([threeUpdateSigners[0]])
			.instruction();

			const blockhash = await provider.connection.getLatestBlockhash();
			const lookupTableAccount = await provider.connection
			.getAddressLookupTable(lookupTableAddress!)
			.then(res => res.value!);


			const message = new Anchor.web3.TransactionMessage({
				payerKey: payer,
				recentBlockhash: blockhash.blockhash,
				instructions: [modifyComputeUnits, estimateIx],
			}).compileToV0Message([lookupTableAccount]);

			
			const versionedTx = new Anchor.web3.VersionedTransaction(message);
			versionedTx.sign([threeUpdateSigners[0], provider.wallet.payer!]);

			const signature = await provider.connection.sendTransaction(versionedTx, {
				skipPreflight: false,
			});

			const signResult = await provider.connection.confirmTransaction({
				signature,
				blockhash: blockhash.blockhash,
				lastValidBlockHeight: blockhash.lastValidBlockHeight,
			});

			
			// Generate report
			const info = await program.account.investmentInfo.fetch(investmentInfoPda);
			const cache = await program.account.profitShareCache.fetch(cachePda);

			console.log(`${indent}🧠 Profit Cache:`, 
				{
					batchId,
					vault: info.vault.toBase58(),
					investmentId: Buffer.from(cache.investmentId).toString().replace(/\0/g, ""),
					version: Buffer.from(cache.version).toString().replace(/\0/g, ""),
					investmentType: Object.keys(info.investmentType)[0],
					totalProfitUsdt: totalProfitUsdt.toString(),
					totalInvestUsdt: totalInvestUsdt.toString(),
					subtotalProfitUsdt: cache.subtotalProfitUsdt.toString(),
					subtotalEstimateSol: cache.subtotalEstimateSol.toString(),
					createdAt: new Date(cache.createdAt.toNumber() * 1000).toISOString(),
				}
			);

			console.log(`${indent}🧠 Profit Cache entry detail and count:`, cache.entries.length);			
			for (const entry of cache.entries) {
				const data = {
					accountId: bytesToFixedString(entry.accountId),
					wallet: entry.wallet.toBase58(),
					amountUsdt: entry.amountUsdt.toString(),
					ratioBp: entry.ratioBp /100
				};
				console.log(data);
			}

			expect(errorCaught).to.be.false;
		} catch (e:any) {			
			errorCaught = true;
			console.log(e);
			expect(errorCaught).to.be.true;
			expect(e.transactionLogs.join('\n')).to.include("StandardOnly");
		}
	});
	it("(7) Estimate refund share using ALT with standard type", async function () {
		this.timeout(1000 * 60 * 5); // 5 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Process estimate refund share program...`);
		

		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const investmentInfoPda = R.investmentInfoPda;
		const version = R.version;
		const h2coin_mint = R.h2coin_mint;
		const payer = provider.wallet.publicKey;
		const lookupTableAddress = R.lookupTableMap.get('record')!.get(batchId);		


		// Find the PDA for the refund share cache
		const [cachePda] = Anchor.web3.PublicKey.findProgramAddressSync(
			[
				Buffer.from("refund_cache"),
				Buffer.from(investmentId),
				Buffer.from(version),
				batchIdBytes,
				yearIndexBytes
			],
			program.programId
		);


		// Get all total records in this batch and calculte invetment record PDAs
		const totalBatchRecods = await program.account.investmentRecord.all([
			{
				memcmp: {
					offset: 8, // discriminator + batch_id
					bytes: bs58.encode(Array.from(batchIdBytes)),
				},
			},
			{
				memcmp: {
					offset: 33, // investment_id
					bytes: bs58.encode(Buffer.from(investmentId)),
				},
			},
			{
				memcmp: {
					offset: 33 + 15, // version
					bytes: bs58.encode(Buffer.from(version)),
				},
			},
		]);
		const investmentRecordPdas = totalBatchRecods.map(record => record.publicKey);


		let errorCaught = false;
		try {
			const estimateIx = await program.methods
			.estimateRefundShare(batchId, yearIndex)
			.accounts({
				investmentInfo: investmentInfoPda,
				mint: h2coin_mint,
				cache: cachePda,
				payer: provider.wallet.publicKey,
				systemProgram: Anchor.web3.SystemProgram.programId,
			} as any)
			.remainingAccounts([
				{
					pubkey: threeUpdateSigners[0].publicKey,
					isWritable: false,
					isSigner: true,
				},
				...investmentRecordPdas.map(pda => ({
					pubkey: pda,
					isWritable: false,
					isSigner: false,
				}))
			])
			.signers([threeUpdateSigners[0]])
			.instruction();

			const blockhash = await provider.connection.getLatestBlockhash();
			const lookupTableAccount = await provider.connection
			.getAddressLookupTable(lookupTableAddress!)
			.then(res => res.value!);


			const message = new Anchor.web3.TransactionMessage({
				payerKey: payer,
				recentBlockhash: blockhash.blockhash,
				instructions: [modifyComputeUnits, estimateIx],
			}).compileToV0Message([lookupTableAccount]);

			
			const versionedTx = new Anchor.web3.VersionedTransaction(message);
			versionedTx.sign([threeUpdateSigners[0], provider.wallet.payer!]);

			const signature = await provider.connection.sendTransaction(versionedTx, {
				skipPreflight: false,
			});

			const signResult = await provider.connection.confirmTransaction({
				signature,
				blockhash: blockhash.blockhash,
				lastValidBlockHeight: blockhash.lastValidBlockHeight,
			});

			
			// Generate report
			const info = await program.account.investmentInfo.fetch(investmentInfoPda);
			const cache = await program.account.refundShareCache.fetch(cachePda);

			console.log("🧠 Refund cache:", {
				batchId,
				vault: info.vault.toBase58(),
				investmentId: Buffer.from(cache.investmentId).toString().replace(/\0/g, ""),
				version: Buffer.from(cache.version).toString().replace(/\0/g, ""),
				investmentType: Object.keys(info.investmentType)[0],
				subtotalRefundH2coin: cache.subtotalRefundHcoin.toString(),
				subtotalEstimateSol: cache.subtotalEstimateSol.toString(),
				createdAt: new Date(cache.createdAt.toNumber() * 1000).toISOString(),
			});

			console.log(`${indent}🧠 Refund cache entry detail and count:`, cache.entries.length);
			for (const entry of cache.entries) {
				const data = {
					accountId: bytesToFixedString(entry.accountId),
					wallet: entry.wallet.toBase58(),
					amountHcoin: entry.amountHcoin.toString(),
				};
				console.log(data);
			}

			expect(errorCaught).to.be.false;
		} catch (e:any) {
			console.error(e);
	
			errorCaught = true;
			expect(errorCaught).to.be.true;	

			console.log("🔍 Checking investment records:");
			for (const [i, pda] of investmentRecordPdas.entries()) {
				const record = await program.account.investmentRecord.fetch(pda);
				if (!record) {
					console.error(`❌ Missing InvestmentRecord[${i}] → ${pda}`);
				}
			}
		}
	});

	it("(9) Create ALT from Profit Share Cache entries", async function () {
		this.timeout(1000 * 60 * 20); // 20 分鐘 timeout
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Create ALT from ProfitShareCache entries prgram...`);


		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const version = R.version;
		const usdtMint = R.usdt_mint;

	
		const batchIdBytes = u16ToLEBytes(batchId)

		const [cachePda] = Anchor.web3.PublicKey.findProgramAddressSync(
			[
				Buffer.from("profit_cache"),
				Buffer.from(investmentId),
				Buffer.from(version),
				batchIdBytes,
			],
			program.programId
		);

		const cache = await program.account.profitShareCache.fetch(cachePda);



		// Construct list of ATA pubkeys
		const addressATAs:PublicKey[] = [];
		for (const entry of cache.entries) {
			const recipient = entry.wallet;
			const recipientAta = await getAssociatedTokenAddress(usdtMint, recipient);

			addressATAs.push(recipientAta);
		}


		const recentSlot = await provider.connection.getSlot("finalized");

		const [createIx, lookupTableAddress] = AddressLookupTableProgram.createLookupTable({
			authority: provider.wallet.publicKey,
			payer: provider.wallet.publicKey,
			recentSlot,
		});

		const extendIx = AddressLookupTableProgram.extendLookupTable({
			lookupTable: lookupTableAddress,
			authority: provider.wallet.publicKey,
			payer: provider.wallet.publicKey,
			addresses: addressATAs,
		});

		const tx = new Anchor.web3.Transaction().add(createIx, extendIx);
		const signature = await Anchor.web3.sendAndConfirmTransaction(
			provider.connection,
			tx,
			[provider.wallet.payer!],
			{ commitment: "confirmed" }
		);

		R.lookupTableMap.get('cache')!.set(batchId, lookupTableAddress);
		console.log(`✅ Cache ALT Address: ${lookupTableAddress.toBase58()}, batchId: ${batchId}`);
		await new Promise(resolve => setTimeout(resolve, 1000)); // optional delay
		
	});

	it("(10) Deposit sol, USDT and H2coin into vaultPDA", async function () {
		this.timeout(1000 * 60 * 5); // 5 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Deposit sol, USDT and H2coin into vaultPDA program...`);

		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const investmentInfoPda = R.investmentInfoPda;
		const version = R.version;
		const usdtMint = R.usdt_mint;
		const h2coinMint = R.h2coin_mint;
		const payer = provider.wallet.publicKey;

		const [vaultPda] = Anchor.web3.PublicKey.findProgramAddressSync(
			[
				Buffer.from("vault"),
				Buffer.from(investmentId),
				Buffer.from(version),
			],
			program.programId
		);

		

		let subtotalEstimateSol = new Anchor.BN(0);
		let subtotalProfitUsdt = new Anchor.BN(0);
		let subtotalRefundHcoin = new Anchor.BN(0);


		// Get profit share cache
		try {
			const [cachePda] = Anchor.web3.PublicKey.findProgramAddressSync(
				[
					Buffer.from("profit_cache"),
					Buffer.from(investmentId),
					Buffer.from(version),
					batchIdBytes,
				],
				program.programId
			);

			const cache = await program.account.profitShareCache.fetch(cachePda);
			subtotalEstimateSol = subtotalEstimateSol.add(cache.subtotalEstimateSol);
			subtotalProfitUsdt = subtotalProfitUsdt.add(cache.subtotalProfitUsdt);
			console.log(`📦 batchId=${batchId}, profit=${cache.subtotalProfitUsdt.toString()}, sol=${cache.subtotalEstimateSol.toString()}`);
		} catch (e) {
			console.warn(`⚠️ Cache missing for batchId=${batchId}, skipping...`);
		}


		// Get refund share cache
		try {
			const [cachePda] = Anchor.web3.PublicKey.findProgramAddressSync(
				[
					Buffer.from("refund_cache"),
					Buffer.from(investmentId),
					Buffer.from(version),
					batchIdBytes,
					yearIndexBytes
				],
				program.programId
			);

			const cache = await program.account.refundShareCache.fetch(cachePda);
			subtotalEstimateSol = subtotalEstimateSol.add(cache.subtotalEstimateSol);
			subtotalRefundHcoin = subtotalRefundHcoin.add(cache.subtotalRefundHcoin);
			console.log(`${indent}📦 batchId=${batchId}, refund=${cache.subtotalRefundHcoin.toString()}, sol=${cache.subtotalEstimateSol.toString()}`);
		} catch (error) {
			console.warn(`${indent}⚠️ Cache missing for batchId=${batchId}, skipping...`);
		}


		console.log(`${indent}💰 Total SOL needed:`, subtotalEstimateSol.toNumber() / Anchor.web3.LAMPORTS_PER_SOL);
		console.log(`${indent}💰 Total USDT needed:`, subtotalProfitUsdt.toString());
		console.log(`${indent}💰 Total H2coin needed:`, subtotalRefundHcoin.toString());

		try {
			const ix1 = await program.methods
				.depositSolToVault(subtotalEstimateSol)
				.accounts({
					investmentInfo: investmentInfoPda,
					payer,
					vault: vaultPda,
					systemProgram: Anchor.web3.SystemProgram.programId,
				} as any)
				.preInstructions([modifyComputeUnits])
				.instruction();


			const fromUsdtAta = await getAssociatedTokenAddress(usdtMint, payer);
			const vaultUsdtAta = await getAssociatedTokenAddress(usdtMint, vaultPda, true);
			const ix2 = await program.methods
				.depositTokenToVault(subtotalProfitUsdt)
				.accounts({
					investmentInfo: investmentInfoPda,
					mint: usdtMint,
					from: fromUsdtAta,
					vault: vaultPda,
					vaultTokenAccount: vaultUsdtAta,
					payer,
					tokenProgram: TOKEN_PROGRAM_ID,
					systemProgram: Anchor.web3.SystemProgram.programId,
					associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				} as any)
				.preInstructions([modifyComputeUnits])
				.instruction();


			const fromHcoinAta = await getAssociatedTokenAddress(h2coinMint, payer);
			const vaultHcoinAta = await getAssociatedTokenAddress(h2coinMint, vaultPda, true);
			const ix3 = await program.methods
				.depositTokenToVault(subtotalRefundHcoin)
				.accounts({
					investmentInfo: investmentInfoPda,
					mint: h2coinMint,
					from: fromHcoinAta,
					vault: vaultPda,
					vaultTokenAccount: vaultHcoinAta,
					payer,
					tokenProgram: TOKEN_PROGRAM_ID,
					systemProgram: Anchor.web3.SystemProgram.programId,
					associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				} as any)
				.preInstructions([modifyComputeUnits])
				.instruction();

			const tx = new Anchor.web3.Transaction().add(ix1, ix2, ix3);
			const sig = await provider.sendAndConfirm(tx, []);
			console.log(`${indent}✅ Vault deposit tx:`, sig);

			// delay 1 second
			await new Promise(resolve => setTimeout(resolve, 1000));

			const solBalanceLamports = await provider.connection.getBalance(vaultPda);
			const solBalance = solBalanceLamports / Anchor.web3.LAMPORTS_PER_SOL;
			console.log(`${indent}💰 SOL Balance:`, solBalance, "SOL", vaultPda.toBase58());

			// delay 1 second
			await new Promise(resolve => setTimeout(resolve, 1000));

			const UsdtATA = await provider.connection.getTokenAccountBalance(vaultUsdtAta);
			const usdtBalance = UsdtATA.value.uiAmountString ?? '0';
			console.log(`${indent}💰 USDT Balance:`, usdtBalance, "USDT", vaultUsdtAta.toBase58());

			// delay 1 second
			await new Promise(resolve => setTimeout(resolve, 1000));

			const H2coinATA = await provider.connection.getTokenAccountBalance(vaultUsdtAta);
			const H2coinBalance = H2coinATA.value.uiAmountString ?? '0';
			console.log(`${indent}💰 H2coin Balance:`, H2coinBalance, "H2coin", vaultUsdtAta.toBase58());
			
			// delay 1 second
			await new Promise(resolve => setTimeout(resolve, 1000));
		} catch (e: any) {
			console.error(`${indent}❌ Deposit failed:`, e.message ?? e);
		}
	});

	it("(11) Execute profit share using ALT", async function () {
		this.timeout(1000 * 60 * 5); // 5 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Execute profit share using ALT program...`);

		
		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const investmentInfoPda = R.investmentInfoPda;
		const version = R.version;
		const lookupTableAddress = R.lookupTableMap.get('cache')!.get(batchId);
		const usdtMint = R.usdt_mint;
		const payer = provider.wallet.publicKey;


		const [cachePda] = Anchor.web3.PublicKey.findProgramAddressSync(
			[
				Buffer.from("profit_cache"),
				Buffer.from(investmentId),
				Buffer.from(version),
				batchIdBytes,
			],
			program.programId
		);

		const [vaultPda] = Anchor.web3.PublicKey.findProgramAddressSync(
			[
				Buffer.from("vault"),
				Buffer.from(investmentId),
				Buffer.from(version),
			],
			program.programId
		);

		const vaultTokenAta = await getAssociatedTokenAddress(usdtMint, vaultPda, true);


		// 找是哪個 recipient 的 ATA 出錯
		const walletATA:PublicKey[] = [];
		const cache = await program.account.profitShareCache.fetch(cachePda);
		for (const entry of cache.entries) {
			const ata = await getAssociatedTokenAddress(usdtMint, entry.wallet);
			walletATA.push(ata);
		}


		const lookupTableAccount = await provider.connection
		.getAddressLookupTable(lookupTableAddress!)
		.then((res:any) => res.value!);

		for (const key of lookupTableAccount.state.addresses) {
			if (key.toBase58() === "8ftoK2iy8Njk9MkgACEJJVenwdycFUW82uk6SVUk1xK3") {
				console.log(`✅ ALT ${key.toBase58()} 包含這個 ATA`);
			}
		}

		try {
			const computeIx = modifyComputeUnits;

			const execIx = await program.methods
				.executeProfitShare(batchId)
				.accounts({
					investmentInfo: investmentInfoPda,
					mint: usdtMint,
					cache: cachePda,
					vault: vaultPda,
					vaultTokenAccount: vaultTokenAta,
					payer,
					tokenProgram: TOKEN_PROGRAM_ID,
					systemProgram: Anchor.web3.SystemProgram.programId,
					associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				} as any)
				.remainingAccounts([
					...threeExecSigners.map((kp) => ({
						pubkey: kp.publicKey,
						isWritable: false,
						isSigner: true,
					})),
					...walletATA.map((kp) => ({
						pubkey: kp,
						isWritable: true,  // ATA 不需要寫入
						isSigner: false,    // 也不會簽名
					}))
				])
				.instruction();

			const blockhash = await provider.connection.getLatestBlockhash();


			const message = new Anchor.web3.TransactionMessage({
				payerKey: payer,
				recentBlockhash: blockhash.blockhash,
				instructions: [computeIx, execIx],
			}).compileToV0Message([lookupTableAccount]);

			const versionedTx = new Anchor.web3.VersionedTransaction(message);
			versionedTx.sign([...threeExecSigners, provider.wallet.payer!]);

			const signature = await provider.connection.sendTransaction(versionedTx, {
				skipPreflight: false,
			});

			const signResult = await provider.connection.confirmTransaction({
				signature,
				blockhash: blockhash.blockhash,
				lastValidBlockHeight: blockhash.lastValidBlockHeight,
			});
			
			console.log(`${indent}✅ ALT-based executeProfitShare signature=${signature}`);
		} catch (e:any) {
			console.error("❌ TX failed:", e.message ?? e);
			expect(e.logs).to.not.be.undefined;

			expect(e.logs.join("\n")).to.include("Insufficient USDT token balance in vault");
		}
	});
	it("(12) Create ALT from Refund Share Cache entries", async function () {
		this.timeout(1000 * 60 * 20); // 20 分鐘 timeout
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Create ALT from Refund Share Cache entries prgram...`);


		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const version = R.version;
		const h2coinMint = R.h2coin_mint;


		const [cachePda] = Anchor.web3.PublicKey.findProgramAddressSync(
			[
				Buffer.from("refund_cache"),
				Buffer.from(investmentId),
				Buffer.from(version),
				batchIdBytes,
				yearIndexBytes
			],
			program.programId
		);
		const cache = await program.account.refundShareCache.fetch(cachePda);
		console.log('cache', cache.entries.length);
		


		// Construct list of ATA pubkeys
		const addressATAs:PublicKey[] = [];
		for (const entry of cache.entries) {
			const recipient = entry.wallet;
			const recipientAta = await getAssociatedTokenAddress(h2coinMint, recipient, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

			addressATAs.push(recipientAta);
		}


		const tx_alt = new Anchor.web3.Transaction();
		const recentSlot = await provider.connection.getSlot("finalized");

		const [createIx, lookupTableAddress] = AddressLookupTableProgram.createLookupTable({
			authority: provider.wallet.publicKey,
			payer: provider.wallet.publicKey,
			recentSlot,
		});
		
		await provider.sendAndConfirm(tx_alt.add(createIx));
		const signature = await provider.sendAndConfirm(tx_alt, []);
		console.log(`${indent}✅ Created ALT address: ${lookupTableAddress.toBase58()} at batchId = ${batchId}, signature=${signature}`);


		const BATCH_SIZE = 20; // 根據測試可調整為 20~30
		for (let i = 0; i < addressATAs.length; i += BATCH_SIZE) {
			const chunk = addressATAs.slice(i, i + BATCH_SIZE);

			const extendIx = AddressLookupTableProgram.extendLookupTable({
				lookupTable: lookupTableAddress,
				authority: provider.wallet.publicKey,
				payer: provider.wallet.publicKey,
				addresses: chunk,
			});

			const signature = await Anchor.web3.sendAndConfirmTransaction(
				provider.connection,
				new Anchor.web3.Transaction().add(extendIx),
				[provider.wallet.payer!]
			);

			console.log(`${indent}✅ Extended ALT with ${chunk.length} addresses, signature=${signature}`);
		}

		
		await new Promise(resolve => setTimeout(resolve, 1500));

		let retries = 0;
		let lookupTableAccount;
		while (!lookupTableAccount && retries < 5) {
			const result = await provider.connection.getAddressLookupTable(lookupTableAddress);
			if (result.value) {
				lookupTableAccount = result.value;
				break;
			}
			await new Promise(res => setTimeout(res, 1000));
			retries++;
		}
		if (!lookupTableAccount) throw new Error("ALT did not become available in time");

		// Store the lookup table address in the map
		R.lookupTableMap.get('cache')!.set(batchId, lookupTableAddress);
		
	});

	it("(13) Execute Refund Share using ALT", async function () {
		this.timeout(1000 * 60 * 5); // 5 分鐘 timeout

		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Process Execute Refund Share using ALT program...`);

		
		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const investmentInfoPda = R.investmentInfoPda;
		const version = R.version;
		const lookupTableAddress = R.lookupTableMap.get('cache')!.get(batchId);
		const h2coin_mint = R.h2coin_mint;
		const payer = provider.wallet.publicKey;


		const [cachePda] = Anchor.web3.PublicKey.findProgramAddressSync(
			[
				Buffer.from("refund_cache"),
				Buffer.from(investmentId),
				Buffer.from(version),
				batchIdBytes,
				yearIndexBytes
			],
			program.programId
		);

		const [vaultPda] = Anchor.web3.PublicKey.findProgramAddressSync(
			[
				Buffer.from("vault"),
				Buffer.from(investmentId),
				Buffer.from(version),
			],
			program.programId
		);
		
		
		try {
			const vaultTokenAta = await getAssociatedTokenAddress(h2coin_mint, vaultPda, true);

			// 準備 recipient ATA
			const walletATA:PublicKey[] = [];
			const cache = await program.account.refundShareCache.fetch(cachePda);
			for (const entry of cache.entries) {
				const ata = await getAssociatedTokenAddress(h2coin_mint, entry.wallet);
				walletATA.push(ata);
			}


			const lookupTableAccount = await provider.connection
			.getAddressLookupTable(lookupTableAddress!)
			.then((res:any) => res.value!);


			const execIx = await program.methods
				.executeRefundShare(batchId, yearIndex)
				.accounts({
					investmentInfo: investmentInfoPda,
					mint: h2coin_mint,
					cache: cachePda,
					vault: vaultPda,
					vaultTokenAccount: vaultTokenAta,
					payer,
					tokenProgram: TOKEN_PROGRAM_ID,
					systemProgram: Anchor.web3.SystemProgram.programId,
					associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				} as any)
				.remainingAccounts([
					...threeExecSigners.map((kp) => ({
						pubkey: kp.publicKey,
						isWritable: false,
						isSigner: true,
					})),
					...walletATA.map((kp) => ({
						pubkey: kp,
						isWritable: true,
						isSigner: false,
					})),
				])
				.instruction();

			const blockhash = await provider.connection.getLatestBlockhash();


			const message = new Anchor.web3.TransactionMessage({
				payerKey: payer,
				recentBlockhash: blockhash.blockhash,
				instructions: [modifyComputeUnits, execIx],
			}).compileToV0Message([lookupTableAccount]);

			const versionedTx = new Anchor.web3.VersionedTransaction(message);
			versionedTx.sign([...threeExecSigners, provider.wallet.payer!]);

			const signature = await provider.connection.sendTransaction(versionedTx, {
				skipPreflight: false,
			});

			const signResult = await provider.connection.confirmTransaction({
				signature,
				blockhash: blockhash.blockhash,
				lastValidBlockHeight: blockhash.lastValidBlockHeight,
			});
			
			console.log(`${indent}✅ ALT-based executeRefundShare signature=${signature}`);
		} catch (e:any) {
	
		}
	});

	it("(14) Withdraw from vaultPDA balance to withdraw wallet", async function () {
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Process Withdraw from vault balance to withdraw wallet program...`);

	
		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const investmentInfoPda = R.investmentInfoPda;
		const version = R.version;
		const usdt_mint = R.usdt_mint;
		const h2coin_mint = R.h2coin_mint;
		const payer = provider.wallet;
		// Withdraw wallet keypair & pubkey
		const withdrawWallet = loadWithdrawWhitelistKeypairs()[0];
		const recipient = withdrawWallet.publicKey;
		// prepare instructions
		const instructions = [];
		



		const [vaultPda, vaultBump] = Anchor.web3.PublicKey.findProgramAddressSync(
			[
				Buffer.from("vault"),
				Buffer.from(investmentId),
				Buffer.from(version),
			],
			program.programId
		);

		const vaultSolBalance = await provider.connection.getBalance(vaultPda);
		console.log(`${indent} Vault SOL balance:`, vaultSolBalance / Anchor.web3.LAMPORTS_PER_SOL, "SOL with PDA:", vaultPda.toBase58(), vaultBump);


		// Vault USDT token accounts
		const vaultUsdtAta = await getAssociatedTokenAddress(usdt_mint, vaultPda, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
		try {
			const vaultUsdtAtaInfo = await getAccount(provider.connection as any, vaultUsdtAta);
			const vaultUSDTBalance = Number(vaultUsdtAtaInfo.amount) / 1_000_000;
			console.log(`${indent} Vault USDT balance:`, vaultUSDTBalance, "USDT with ATA:", vaultUsdtAta.toBase58());
		} catch (e) {
			console.log(`${indent} Vault USDT balance: 0 USDT (ATA not found)`);
		}
		
		// Vault H2coin token accounts
		const vaultH2coinAta = await getAssociatedTokenAddress(h2coin_mint, vaultPda, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
		try {
			const vaultH2coinAtaInfo = await getAccount(provider.connection as any, vaultH2coinAta);
			const vaultH2coinBalance = Number(vaultH2coinAtaInfo.amount) / 1_000_000;
			console.log(`${indent} Vault H2COIN balance:`, vaultH2coinBalance, "H2COIN with ATA:", vaultH2coinAta.toBase58());
		} catch (e) {
			console.log(`${indent} Vault H2COIN balance: 0 H2COIN (ATA not found)`);
		}



		// Destination USDT token accounts (ATA) for recipient
		const RecipientUsdtAta = await getAssociatedTokenAddress(usdt_mint, recipient);

		// Destination H2coin token accounts (ATA) for recipient
		const RecipientHcoinAta = await getAssociatedTokenAddress(h2coin_mint, recipient);


		// Withdraw instruction
		const withdrawIx = await program.methods
			.withdrawFromVault()
			.accounts({
				investmentInfo: investmentInfoPda,
				usdtMint: usdt_mint,
				hcoinMint: h2coin_mint,

				vault: vaultPda,
				vaultUsdtAccount: vaultUsdtAta,
				vaultHcoinAccount: vaultH2coinAta,

				recipientAccount: recipient,
				recipientUsdtAccount: RecipientUsdtAta,
				recipientHcoinAccount: RecipientHcoinAta,

				payer: payer.publicKey,
				systemProgram: Anchor.web3.SystemProgram.programId,
				tokenProgram: TOKEN_PROGRAM_ID,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
			} as any)
			.remainingAccounts([
				...threeExecSigners.map((kp) => ({
					pubkey: kp.publicKey,
					isWritable: false,
					isSigner: true,
				})),
			])
			.instruction();

		instructions.push(withdrawIx);

		// Send combined transaction
		const tx = new Anchor.web3.Transaction().add(...instructions);
		const txSig = await provider.sendAndConfirm(tx, threeExecSigners);
		console.log(`${indent}✅ withdrawFromVault successful, tx:`, txSig);
	});
});