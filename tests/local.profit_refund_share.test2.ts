import { expect } from "chai";
import {describe, it} from "mocha";
import bs58 from "bs58";
import TrimId from "trimid";
import * as Anchor from "@coral-xyz/anchor";
import { ComputeBudgetProgram, 
	PublicKey, Keypair, 
	AddressLookupTableProgram, 
} from "@solana/web3.js";
import { getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, 
	getAccount, createAssociatedTokenAccountInstruction 
} from "@solana/spl-token";

import {
	stringToFixedU8Array, bytesToFixedString, stage_ratio_map, u16ToLEBytes,
	loadUpdateWhitelistKeypairs, loadExecuteWhitelistKeypairs,
	loadWithdrawWhitelistKeypairs
} from "./lib/lib";
import {Runtime as R} from "./devnet.runtime";




describe("📃 Profit/Refund share Management", function () {
	let is_record_add = false as boolean;


	const __investmentId = "02SEHzIZfBcp222";
	const __version = "3e2ea006";
	
	const yearIndex = 3;
	const yearIndexBytes = Uint8Array.of(yearIndex);

	const MAX_ENTRIES = 1500;
	const MAX_ENTRIES_PER_BATCH = 30;
	const MAX_RECORDS_PER_TX = 5;

	type K = string | number;
	let batch_data: Record<K, PublicKey[]> = {};

	const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
		units: 800_000, // or even 800_000 if needed
	});

	const threeExecSigners = loadExecuteWhitelistKeypairs().slice(0, 3);
	const threeUpdateSigners = loadUpdateWhitelistKeypairs().slice(0, 3);

	
	before('Initialize investment info...', async function() {
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Initialize invesgtment info program...`);
		

		const program = R.program;
		const provider = R.provider;
		const investmentId = stringToFixedU8Array(__investmentId, 15);
		R.investmentId = investmentId;
		
		const version = stringToFixedU8Array(__version, 4, "hex");
		R.version = version;
		
		const investmentType = { standard: {} };

		const [investmentInfoPda] = Anchor.web3.PublicKey.findProgramAddressSync(
				[
					Buffer.from("investment"), 
					Buffer.from(R.investmentId),
					Buffer.from(version)
				],
				program.programId
			);
		R.investmentInfoPda = investmentInfoPda;
			


		const stageRatioRows = [
			{ mid: 6.0, last: 4.0 },
			{ mid: 4.0, last: 6.0 },
			{ mid: 3.0, last: 2.0 },
		];
		const stageRatio = stage_ratio_map(stageRatioRows);


		const executeWhitelist = [
			new PublicKey("3A1krgYtfgYecXaqwZNQaxgiEaq7Yt1v3wdeZtvQPidW"),
			new PublicKey("BPAtR1R2HjHtr2xYYLdeYaSHZhDg2zBHf5u3vh4Td7U2"),
			new PublicKey("7v385KDHKxqRsQv2iobwuCuQiq1KZA6JyuchXJWfvW42"),
			new PublicKey("9VzY3YbTyVjmE2BDBjgNr32Sfv2xpsx1CMNiCS9Kc8eT"),
			new PublicKey("CR7HxrTiCiCvWxgJF2gGV3XjQnm1pveBp5XCrXqwJnLy"),
		];

		const updateWhitelist = [
			new PublicKey("D37W4RnEps9SN1d6NjaJLXYPQKcKEjQKkMNyc8nVDXuB"),
			new PublicKey("DvKJPbJNRFuSJusLeAZ6jN4duaiUghfte1hFEemGYxMt"),
			new PublicKey("78cKKSS3V2hortcDFKbUaPunYE1PWW11oEomYCPNMo8k"),
			new PublicKey("5QUUjS7i2akMphaXV9QGWANhucQY73BsC9cNedR3feqB"),
			new PublicKey("CtwJnkTrVCdye3MF2VSRtyoLtGLdCBAkfs1idn3FeHRp"),
		];

		const withdrawWhitelist = [
			new PublicKey("CF5yyzXav4KfxxCAtDwMoptaQXZJeVqMZrFLxePMvZGW"),
		]
		
		try {
			const tx = await program.methods
			.initializeInvestmentInfo(
				investmentId,
				version,
				investmentType,
				stageRatio,
				new Anchor.BN(1747699200),
				new Anchor.BN(1779235200),
				new Anchor.BN(10000000000000),
				executeWhitelist,
				updateWhitelist,
				withdrawWhitelist
			)
			.accounts({
				investmentInfo: investmentInfoPda,
				payer: provider.wallet.publicKey,
				systemProgram: Anchor.web3.SystemProgram.programId,
			} as any)
			.preInstructions([modifyComputeUnits])
			.rpc();
		} catch (e:any) {
			const logs = e.transactionLogs?.join("\n") || e.message || JSON.stringify(e);
			expect(logs).to.include("already in use");
		}

		const result = await program.account.investmentInfo.fetch(investmentInfoPda);
		expect(result).to.have.property("investmentId");
		expect(bytesToFixedString(result.investmentId)).to.equal(__investmentId);
	});


	it("(0) adds 1500 new investment records (batch mode)", async function () {
		this.timeout(1000 * 60 * 20); // 20 分鐘 timeout
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Adding investment records program to init state ...`);


		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const investmentInfoPda = R.investmentInfoPda;
		const version = R.version;

		
		const record_list = await program.account.investmentRecord.all([
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
		if (record_list.length >= MAX_ENTRIES) {
			is_record_add = true;
			return;
		}


		let batchId = 1;
		let batchIdBytes = u16ToLEBytes(batchId);
		let total_invest_usdt = new Anchor.BN(0);
		let total_invest_h2coin = new Anchor.BN(0);
		const record_info:PublicKey[] = [];

		
		for (let start = 1; start <= MAX_ENTRIES; start += MAX_RECORDS_PER_TX) {
			let tx = new Anchor.web3.Transaction();

			
			for (let offset = 0; offset < MAX_RECORDS_PER_TX && (start + offset) <= MAX_ENTRIES; offset++) {
				const index = start + offset;

				// 🔁 Caluclate batchId and 30 records per batch
				batchId = Math.floor((index - 1) / MAX_ENTRIES_PER_BATCH) + 1;
				batchIdBytes = u16ToLEBytes(batchId);

				const recordId = new Anchor.BN(index);
				const accountId = TrimId.shortid();
				const accountIdBytes = stringToFixedU8Array(accountId, 15);
				const wallet = Keypair.generate().publicKey;

				const options = [1, 3, 5, 7, 10];
				const basicUsdt = 1000 * 10 ** 6;
				const exchangeRatio = 1.05;
				const amountBasic = basicUsdt * options[Math.floor(Math.random() * options.length)];
				const amountUsdt = new Anchor.BN(amountBasic);
				const amountHcoin = new Anchor.BN(amountBasic * exchangeRatio);

				const [recordPda] = Anchor.web3.PublicKey.findProgramAddressSync(
					[
						Buffer.from("record"),
						Buffer.from(investmentId),                    	// 15 bytes
						Buffer.from(version),							// 4 bytes
						batchIdBytes,
						recordId.toArrayLike(Buffer, "le", 8),        // 8 bytes 
						Buffer.from(accountIdBytes)
					],
					program.programId
				);

				if (!batch_data[batchId]) batch_data[batchId] = [];
				batch_data[batchId].push(recordPda);

				console.log(`${indent}${index}: wallet = ${wallet.toBase58()}, amount= ${amountBasic}, batchId = ${batchId}`);

				const ix = await program.methods
					.addInvestmentRecord(
						batchId,
						recordId,
						accountIdBytes,
						wallet,
						amountUsdt,
						amountHcoin,
						1
					)
					.accounts({
						investmentInfo: investmentInfoPda,
						investmentRecord: recordPda,
						payer: provider.wallet.publicKey,
						systemProgram: Anchor.web3.SystemProgram.programId,
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
				record_info.push(recordPda);
				total_invest_usdt = total_invest_usdt.add(amountUsdt);
				total_invest_h2coin = total_invest_h2coin.add(amountHcoin);
			} // enf for offset

			try {
				// send investment records transcation
				const sig = await provider.sendAndConfirm(tx, threeUpdateSigners, {
					commitment: "confirmed",
					skipPreflight: false,
				});
				console.log(`${indent}✅ Sent batch: ${start}~${Math.min(start + MAX_RECORDS_PER_TX - 1, MAX_ENTRIES)} (tx: ${sig})`);
				
				// delay 1 second
				await new Promise(resolve => setTimeout(resolve, 1000));


				// Create ALT with investment records
				if (record_info.length === MAX_ENTRIES_PER_BATCH) {
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
						addresses: record_info,
					});

					tx_alt.add(createIx, extendIx);
					const sig = await provider.sendAndConfirm(tx_alt, []);
					console.log(`${indent}✅ Record ALT address: ${lookupTableAddress.toBase58()}, batchId = ${batchId}`);
					R.lookupTableMap.get('record')!.set(batchId, lookupTableAddress);

					record_info.length = 0;
				} // end if record_info.length				

				// delay 1 second
				await new Promise(resolve => setTimeout(resolve, 1000));
				
			} catch (e: any) {
				console.error(`${indent}❌ Batch send failed:`, e.message ?? e);
				if (e.logs) {
					console.warn("🔍 Logs:\n" + e.logs.join("\n"));
				}
				throw e;
			}
		}

		console.log(`${indent}✅ total_invest_usdt:`, total_invest_usdt.toString());
		console.log(`${indent}✅ total_invest_h2coin:`, total_invest_h2coin.toString());	
	});


	it("(1) Set investment state to complete", async function() {
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Set investment state to complete...`);

		const program = R.program;
		const provider = R.provider;
		const investmentInfoPda = R.investmentInfoPda; // 10 million USDT (6 decimals)

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

			const updated = await program.account.investmentInfo.fetch(investmentInfoPda);
			expect(updated.state).to.have.property("completed");
			console.log(`${indent}✅ state is completed`);
		} catch (e:any) {
			expect(e).to.have.property("error");
			expect(e.error.errorCode.code).to.equal("InvestmentInfoHasCompleted");
		}
	});
	
	it("(2) Estimate profit share using ALT with standard type", async function () {
		this.timeout(1000 * 60 * 20); // 20 分鐘 timeout
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Estimate profit share program...`);


		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const investmentInfoPda = R.investmentInfoPda;
		const version = R.version;
		const usdtMint = R.usdt_mint;
		const payer = provider.wallet.publicKey;
		const totalProfitUsdt = new Anchor.BN(1_000_000_000_000); // = 1,000,000 USDT (6 decimals)


		const OFFSET_INVESTMENT_ID = 33; // discriminator(8) + batch_id(2) + record_id(8) + account_id(15)
		const results = await program.account.investmentRecord.all([
			{
				memcmp: {
					offset: OFFSET_INVESTMENT_ID,
					bytes: bs58.encode(Buffer.from(investmentId)),
				},
			},
			{
				memcmp: {
					offset: OFFSET_INVESTMENT_ID + 15,
					bytes: bs58.encode(Buffer.from(version)),
				},
			},
		]);

		// Calculate Total Invest USDT
		const maxBatchId = findMaxBatchId();
		const total_invest_usdt = results.reduce((sum, record) => {
			return sum.add(record.account.amountUsdt);
		}, new Anchor.BN(0));


		for (let batchId = 1; batchId <= maxBatchId; batchId++) {
			const batchIdBytes = u16ToLEBytes(batchId);
			const lookupTableAddress = R.lookupTableMap.get('record')!.get(batchId);

			const batch_data = await program.account.investmentRecord.all([
				{
					memcmp: {
						offset: 8, // discriminator
						bytes: bs58.encode(batchIdBytes),
					},
				},
				{
					memcmp: {
						offset: OFFSET_INVESTMENT_ID,
						bytes: bs58.encode(Buffer.from(investmentId)),
					},
				},
				{
					memcmp: {
						offset: OFFSET_INVESTMENT_ID + 15,
						bytes: bs58.encode(Buffer.from(version)),
					},
				},
			]);

			
			const [cachePda] = Anchor.web3.PublicKey.findProgramAddressSync(
				[
					Buffer.from("profit_cache"),
					Buffer.from(investmentId),
					Buffer.from(version),
					batchIdBytes,
				],
				program.programId
			);

			console.log(`${indent}🔍 Estimating for batchId=${batchId}, count=${batch_data.length}`);

			try {
				const estimateIx = await program.methods
					.estimateProfitShare(batchId, totalProfitUsdt, total_invest_usdt)
					.accounts({
						investmentInfo: investmentInfoPda,
						mint: usdtMint,
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
						...batch_data.map((kp) => ({
							pubkey: kp.publicKey,
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

				const info = await program.account.investmentInfo.fetch(investmentInfoPda);
				const cache = await program.account.profitShareCache.fetch(cachePda);
				console.log("🧠 ProfitShareCache summary:", {
					batchId,
					investmentId: bytesToFixedString(cache.investmentId),
					version: Buffer.from(cache.version).toString().replace(/\0/g, ""),
					investmentType: Object.keys(info.investmentType)[0],
					total_invest_usdt: total_invest_usdt.toString(),
					subtotalProfitUsdt: cache.subtotalProfitUsdt.toString(),
					subtotalEstimateSol: cache.subtotalEstimateSol.toString(),
					createdAt: new Date(cache.createdAt.toNumber() * 1000).toISOString(),
				});

				console.log("📊 Profit share entries:");
				for (const entry of cache.entries) {
					const data = {
						accountId: bytesToFixedString(entry.accountId),
						wallet: entry.wallet.toBase58(),
						amountUsdt: entry.amountUsdt.toString(),
						ratioBp: entry.ratioBp / 100,
					};
					console.log(data);
				}

				// delay 1 second
				await new Promise(resolve => setTimeout(resolve, 1000));
			} catch (err:any) {
				console.error(`${indent}❌ Failed to estimate for batchId=${batchId}`);
				console.error(err.logs ?? err.message ?? err);
			}
		}
	});

	it("(3) Estimate refund share using ALT with standard type", async function () {
		this.timeout(1000 * 60 * 20); // 20 分鐘 timeout
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Process estimate refund share program...`);


		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const investmentInfoPda = R.investmentInfoPda;
		const version = R.version;
		const h2coin_mint = R.h2coin_mint;
		const payer = provider.wallet.publicKey;
		

		const OFFSET_INVESTMENT_ID = 33; // discriminator(8) + batch_id(2) + record_id(8) + account_id(15)
		const results = await program.account.investmentRecord.all([
			{
				memcmp: {
					offset: OFFSET_INVESTMENT_ID,
					bytes: bs58.encode(Buffer.from(investmentId)),
				},
			},
			{
				memcmp: {
					offset: OFFSET_INVESTMENT_ID + 15,
					bytes: bs58.encode(Buffer.from(version)),
				},
			},
		]);

		// Calculate Total Invest H2coin
		const maxBatchId = findMaxBatchId();
		const total_invest_h2coin = results.reduce((sum, record) => {
			return sum.add(record.account.amountHcoin);
		}, new Anchor.BN(0));


		for (let batchId = 1; batchId <= maxBatchId; batchId++) {
			const batchIdBytes = u16ToLEBytes(batchId);
			const lookupTableAddress = R.lookupTableMap.get('record')!.get(batchId);

			const batch_data = await program.account.investmentRecord.all([
				{
					memcmp: {
						offset: 8, // discriminator
						bytes: bs58.encode(batchIdBytes),
					},
				},
				{
					memcmp: {
						offset: OFFSET_INVESTMENT_ID,
						bytes: bs58.encode(Buffer.from(investmentId)),
					},
				},
				{
					memcmp: {
						offset: OFFSET_INVESTMENT_ID + 15,
						bytes: bs58.encode(Buffer.from(version)),
					},
				},
			]);

			
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

			console.log(`${indent}🔍 Estimating for batchId=${batchId}, count=${batch_data.length}`);

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
						...batch_data.map((kp) => ({
							pubkey: kp.publicKey,
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
					

				const info = await program.account.investmentInfo.fetch(investmentInfoPda);
				const cache = await program.account.refundShareCache.fetch(cachePda);
				console.log("🧠 RefundShareCache summary:", {
					batchId,
					investmentId: bytesToFixedString(cache.investmentId),
					version: Buffer.from(cache.version).toString().replace(/\0/g, ""),
					investmentType: Object.keys(info.investmentType)[0],
					total_invest_h2coin: total_invest_h2coin.toString(),
					subtotalRefundHcoin: cache.subtotalRefundHcoin.toString(),
					subtotalEstimateSol: cache.subtotalEstimateSol.toString(),
					createdAt: new Date(cache.createdAt.toNumber() * 1000).toISOString(),
				});

				console.log("📊 Refund share entries:");
				for (const entry of cache.entries) {
					const data = {
						accountId: bytesToFixedString(entry.accountId),
						wallet: entry.wallet.toBase58(),
						amountHcoin: entry.amountHcoin.toString(),
					};
					console.log(data);
				}
			} catch (err:any) {
				console.error(`${indent}❌ Failed to estimate for batchId=${batchId}`);
				console.error(err.logs ?? err.message ?? err);
			}
		}
	});

	it("(4) Deposit sol, USDT and H2coin into vault", async function () {
		this.timeout(1000 * 60 * 20); // 20 分鐘 timeout
		if (is_record_add === true) return;
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Process deposit program...`);

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

	

		// ✅ Find how many batchId exist
		const maxBatchId = findMaxBatchId();
		console.log(`${indent}✅ maxBatchId: ${maxBatchId}`);
		

		let subtotalEstimateSol = new Anchor.BN(0);
		let subtotalProfitUsdt = new Anchor.BN(0);
		let subtotalRefundHcoin = new Anchor.BN(0);

		for (let batchId = 1; batchId <= maxBatchId; batchId++) {
			const batchIdBytes = u16ToLEBytes(batchId);		

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

			// delay 1 second
			await new Promise(resolve => setTimeout(resolve, 1000));

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
				console.log(`📦 batchId=${batchId}, refund=${cache.subtotalRefundHcoin.toString()}, sol=${cache.subtotalEstimateSol.toString()}`);
			} catch (error) {
				console.warn(`⚠️ Cache missing for batchId=${batchId}, skipping...`);
			}

			// delay 1 second
			await new Promise(resolve => setTimeout(resolve, 1000));
		}

		console.log("💰 Total SOL needed:", subtotalEstimateSol.toNumber() / Anchor.web3.LAMPORTS_PER_SOL, );
		console.log("💰 Total USDT needed:", subtotalProfitUsdt.toString());
		console.log("💰 Total H2coin needed:", subtotalRefundHcoin.toString());

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


			const userUsdtAta = await getAssociatedTokenAddress(usdtMint, payer);
			const vaultUsdtAta = await getAssociatedTokenAddress(usdtMint, vaultPda, true);
			const ix2 = await program.methods
				.depositTokenToVault(subtotalProfitUsdt)
				.accounts({
					investmentInfo: investmentInfoPda,
					payer,
					from: userUsdtAta,
					mint: usdtMint,
					vault: vaultPda,
					vaultTokenAccount: vaultUsdtAta,
					tokenProgram: TOKEN_PROGRAM_ID,
					systemProgram: Anchor.web3.SystemProgram.programId,
					associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				} as any)
				.preInstructions([modifyComputeUnits])
				.instruction();


			const userHcoinAta = await getAssociatedTokenAddress(h2coinMint, payer);
			const vaultHcoinAta = await getAssociatedTokenAddress(h2coinMint, vaultPda, true);
			const ix3 = await program.methods
				.depositTokenToVault(subtotalRefundHcoin)
				.accounts({
					investmentInfo: investmentInfoPda,
					payer,
					from: userHcoinAta,
					mint: h2coinMint,
					vault: vaultPda,
					vaultTokenAccount: vaultHcoinAta,
					tokenProgram: TOKEN_PROGRAM_ID,
					systemProgram: Anchor.web3.SystemProgram.programId,
					associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				} as any)
				.preInstructions([modifyComputeUnits])
				.instruction();

			const tx = new Anchor.web3.Transaction().add(ix1, ix2, ix3);
			const sig = await provider.sendAndConfirm(tx, []);
			console.log("✅ Vault deposit tx:", sig);

			// delay 1 second
			await new Promise(resolve => setTimeout(resolve, 1000));

			const solBalanceLamports = await provider.connection.getBalance(vaultPda);
			const solBalance = solBalanceLamports / Anchor.web3.LAMPORTS_PER_SOL;
			console.log("💰 SOL Balance:", solBalance, "SOL", vaultPda.toBase58());

			// delay 1 second
			await new Promise(resolve => setTimeout(resolve, 1000));

			const UsdtATA = await provider.connection.getTokenAccountBalance(vaultUsdtAta);
			const usdtBalance = UsdtATA.value.uiAmountString ?? '0';
			console.log("💰 Token Balance:", usdtBalance, "USDT", vaultUsdtAta.toBase58());

			// delay 1 second
			await new Promise(resolve => setTimeout(resolve, 1000));

			const H2coinATA = await provider.connection.getTokenAccountBalance(vaultUsdtAta);
			const H2coinBalance = H2coinATA.value.uiAmountString ?? '0';
			console.log("💰 Token Balance:", H2coinBalance, "H2coin", vaultUsdtAta.toBase58());
			
			// delay 1 second
			await new Promise(resolve => setTimeout(resolve, 1000));
		} catch (e: any) {
			console.error("❌ Deposit failed:", e.message ?? e);
		}
	});

	it("(5) Check if profitCache recipient ATA exist or not", async function () {
		this.timeout(1000 * 60 * 20); // 20 分鐘 timeout		
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Process profitCache recipient ATA program...`);

		
		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const version = R.version;
		const usdtMint = R.usdt_mint;

		const maxBatchId = findMaxBatchId();

		for (let batchId = 1; batchId <= maxBatchId; batchId++) {
			const batchIdBytes = u16ToLEBytes(batchId);

			// 📦 Fetch cache PDA
			const [profitcachePda] = Anchor.web3.PublicKey.findProgramAddressSync(
				[
					Buffer.from("profit_cache"),
					Buffer.from(investmentId),
					Buffer.from(version),
					batchIdBytes,
				],
				program.programId
			);

			let profitCache = await program.account.profitShareCache.fetch(profitcachePda);			

			const instructions = [];
			for (const entry of profitCache.entries) {
				const recipient = new Anchor.web3.PublicKey(entry.wallet);
				const recipientAta = await getAssociatedTokenAddress(usdtMint, recipient);

				// Double-check cached ATA matches real derived one
				const expected = recipientAta.toBase58();
				const actual = new Anchor.web3.PublicKey(entry.recipientAta).toBase58();
				if (actual !== expected) {
					console.error("❗ ATA mismatch for wallet:", entry.wallet.toBase58());
				}

				// Check if ATA exists on-chain
				const accountInfo = await provider.connection.getAccountInfo(recipientAta);
				if (accountInfo === null) {
					const ix = createAssociatedTokenAccountInstruction(
						provider.wallet.publicKey, // payer
						recipientAta,              // target ATA
						recipient,                 // owner
						usdtMint
					);
					instructions.push(ix);
				}
			}

			if (instructions.length > 0) {
				const MAX_PER_TX = 10; // 可以嘗試提高
				const txCount = Math.ceil(instructions.length / MAX_PER_TX);
				console.log(`🛠️ Need to create ${instructions.length} ATAs for batch ${batchId} in ${txCount} transactions`);

				for (let i = 0; i < txCount; i++) {
					const chunk = instructions.slice(i * MAX_PER_TX, (i + 1) * MAX_PER_TX);
					const tx = new Anchor.web3.Transaction().add(...chunk);
					const signature = await provider.sendAndConfirm(tx);
					console.log(`✅ TX ${i + 1}/${txCount} for batch ${batchId} ATA creation: ${signature}`);
				}
			} else {
				console.log(`✅ All ATAs exist for batch ${batchId}`);
			}

			await new Promise(resolve => setTimeout(resolve, 1000));
		}
	});

	it("(6) Create ALT from ProfitShareCache entries", async function () {
		this.timeout(1000 * 60 * 20); // 20 分鐘 timeout		
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Process profitShareCashe prgram...`);


		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const version = R.version;
		const usdtMint = R.usdt_mint;


		const maxBatchId = findMaxBatchId();

		for (let batchId = 1; batchId <= maxBatchId; batchId++) {
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

			// Validate entries
			for (const entry of cache.entries) {
				const recipient = entry.wallet;
				const recipientAta = await getAssociatedTokenAddress(usdtMint, recipient);
				const expected = recipientAta.toBase58();
				const actual = new Anchor.web3.PublicKey(entry.recipientAta).toBase58();

				if (actual !== expected) {
					console.error("🎯 MISMATCHED ATA for:", entry.wallet.toBase58());
				}

				const accountInfo = await provider.connection.getAccountInfo(recipientAta);
				if (!accountInfo) {
					console.error("🎯 Missing ATA:", recipientAta.toBase58());
				}
			}

			// Construct list of ATA pubkeys
			const entryATAs = cache.entries.map(entry => new Anchor.web3.PublicKey(entry.recipientAta));

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
				addresses: entryATAs,
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
		}
	});

	it("(7) Execute profit share using ALT", async function () {
		this.timeout(1000 * 60 * 20); // 20 分鐘 timeout
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Process Execute profit share program...`);


		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const investmentInfoPda = R.investmentInfoPda;
		const version = R.version;
		const usdtMint = R.usdt_mint;
		const h2coinMint = R.h2coin_mint;
		const payer = provider.wallet.publicKey;

		// Get Vault address
		const [vaultPda] = Anchor.web3.PublicKey.findProgramAddressSync(
			[
				Buffer.from("vault"),
				Buffer.from(investmentId),
				Buffer.from(version),
			],
			program.programId
		);

		// Create Vault Token Address associate
		const vaultTokenAta = await getAssociatedTokenAddress(usdtMint, vaultPda, true);
		const vaultTokenAtaInfo = await provider.connection.getAccountInfo(vaultTokenAta);
		if (!vaultTokenAtaInfo) {
			const ataIx = createAssociatedTokenAccountInstruction(
				payer,         // payer
				vaultTokenAta, // to create
				vaultPda,      // owner
				usdtMint       // mint
			);


			const tx = new Anchor.web3.Transaction().add(ataIx);
			const sig = await provider.sendAndConfirm(tx);
			console.log("✅ Created vaultTokenAta:", sig);
		}


		const maxBatchId = findMaxBatchId();

		for (let batchId = 1; batchId <= maxBatchId; batchId++) {
			const lookupTableAddress = R.lookupTableMap.get('cache')!.get(batchId);
			
			if (!lookupTableAddress) {
				console.warn(`⚠️ Missing lookup table for batch ${batchId}`);
				continue;
			}

			const batchIdBytes = u16ToLEBytes(batchId);
			const [cachePda] = Anchor.web3.PublicKey.findProgramAddressSync(
				[
					Buffer.from("profit_cache"),
					Buffer.from(investmentId),
					Buffer.from(version),
					batchIdBytes,
				],
				program.programId
			);

			
			// 準備 recipient ATA
			const walletATA: PublicKey[] = [];
			const cache = await program.account.profitShareCache.fetch(cachePda);
			for (const entry of cache.entries) {
				const ata = await getAssociatedTokenAddress(usdtMint, entry.wallet);
				walletATA.push(ata);
			}

			const lookupTableAccount = await provider.connection
				.getAddressLookupTable(lookupTableAddress)
				.then((res) => res.value!);

			const computeIx = modifyComputeUnits;

			const execIx = await program.methods
				.executeProfitShare(batchId)
				.accounts({
					investmentInfo: investmentInfoPda,
					cache: cachePda,
					payer,
					vault: vaultPda,
					mint: usdtMint,
					vaultTokenAccount: vaultTokenAta,
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
				instructions: [computeIx, execIx],
			}).compileToV0Message([lookupTableAccount]);

			const versionedTx = new Anchor.web3.VersionedTransaction(message);
			versionedTx.sign([...threeExecSigners, provider.wallet.payer!]);

			const signature = await provider.connection.sendTransaction(versionedTx, {
				skipPreflight: false,
			});

			await provider.connection.confirmTransaction({
				signature,
				blockhash: blockhash.blockhash,
				lastValidBlockHeight: blockhash.lastValidBlockHeight,
			});

			console.log(`✅ ALT-based executeProfitShare for batchId=${batchId}:`, signature);
			await new Promise((resolve) => setTimeout(resolve, 1000)); // optional delay
		}
	});

	it("(8) Check if recipient wallet ATA for refundCache exist or not", async function () {
		this.timeout(1000 * 60 * 20); // 20 分鐘 timeout		
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Process refundCache recipient ATA program...`);


		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const version = R.version;
		const h2coinMint = R.h2coin_mint;

		const maxBatchId = findMaxBatchId();

		for (let batchId = 1; batchId <= maxBatchId; batchId++) {
			const batchIdBytes = u16ToLEBytes(batchId);

			// 📦 Fetch cache PDA
			const [refundCachePda] = Anchor.web3.PublicKey.findProgramAddressSync(
				[
					Buffer.from("refund_cache"),
					Buffer.from(investmentId),
					Buffer.from(version),
					batchIdBytes,
					yearIndexBytes
				],
				program.programId
			);

			let refundCache = await program.account.refundShareCache.fetch(refundCachePda);			

			const instructions = [];
			for (const entry of refundCache.entries) {
				const recipient = new Anchor.web3.PublicKey(entry.wallet);
				const recipientAta = await getAssociatedTokenAddress(h2coinMint, recipient);

				// Double-check cached ATA matches real derived one
				const expected = recipientAta.toBase58();
				const actual = new Anchor.web3.PublicKey(entry.recipientAta).toBase58();
				if (actual !== expected) {
					console.error("❗ ATA mismatch for wallet:", entry.wallet.toBase58());
				}

				// Check if ATA exists on-chain
				const accountInfo = await provider.connection.getAccountInfo(recipientAta);
				if (accountInfo === null) {
					const ix = createAssociatedTokenAccountInstruction(
						provider.wallet.publicKey, // payer
						recipientAta,              // target ATA
						recipient,                 // owner
						h2coinMint
					);
					instructions.push(ix);
				}
			}

			if (instructions.length > 0) {
				const MAX_PER_TX = 10; // 可以嘗試提高
				const txCount = Math.ceil(instructions.length / MAX_PER_TX);
				console.log(`🛠️ Need to create ${instructions.length} ATAs for batch ${batchId} in ${txCount} transactions`);

				for (let i = 0; i < txCount; i++) {
					const chunk = instructions.slice(i * MAX_PER_TX, (i + 1) * MAX_PER_TX);
					const tx = new Anchor.web3.Transaction().add(...chunk);
					const signature = await provider.sendAndConfirm(tx);
					console.log(`✅ TX ${i + 1}/${txCount} for batch ${batchId} ATA creation: ${signature}`);
				}
			} else {
				console.log(`✅ All ATAs exist for batch ${batchId}`);
			}

			await new Promise(resolve => setTimeout(resolve, 1000)); // optional delay
		}
	});

	it("(9) Execute refund share using ALT", async function () {
		this.timeout(1000 * 60 * 20); // 20 分鐘 timeout
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Process Execute refund share using ALT program...`);


		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const investmentInfoPda = R.investmentInfoPda;
		const version = R.version;
		const h2coinMint = R.h2coin_mint;
		const payer = provider.wallet.publicKey;

		// Get Vault address
		const [vaultPda] = Anchor.web3.PublicKey.findProgramAddressSync(
			[
				Buffer.from("vault"),
				Buffer.from(investmentId),
				Buffer.from(version),
			],
			program.programId
		);

		// Create Vault Token Address associate
		const vaultTokenAta = await getAssociatedTokenAddress(h2coinMint, vaultPda, true);
		const vaultTokenAtaInfo = await provider.connection.getAccountInfo(vaultTokenAta);
		if (!vaultTokenAtaInfo) {
			const ataIx = createAssociatedTokenAccountInstruction(
				payer,         // payer
				vaultTokenAta, // to create
				vaultPda,      // owner
				h2coinMint     // mint
			);


			const tx = new Anchor.web3.Transaction().add(ataIx);
			const sig = await provider.sendAndConfirm(tx);
			console.log("✅ Created vaultTokenAta:", sig);
		}


		const maxBatchId = findMaxBatchId();

		for (let batchId = 1; batchId <= maxBatchId; batchId++) {
			const lookupTableAddress = R.lookupTableMap.get('cache')!.get(batchId);
			console.log({lookupTableAddress});
			
			if (!lookupTableAddress) {
				console.warn(`⚠️ Missing lookup table for batch ${batchId}`);
				continue;
			}

			const batchIdBytes = u16ToLEBytes(batchId);
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

			
			// 準備 recipient ATA
			const walletATA: PublicKey[] = [];
			const cache = await program.account.refundShareCache.fetch(cachePda);
			for (const entry of cache.entries) {
				const ata = await getAssociatedTokenAddress(h2coinMint, entry.wallet);
				walletATA.push(ata);
			}

			const lookupTableAccount = await provider.connection
				.getAddressLookupTable(lookupTableAddress)
				.then((res) => res.value!);

			const computeIx = modifyComputeUnits;

			const execIx = await program.methods
				.executeRefundShare(batchId, yearIndex)
				.accounts({
					investmentInfo: investmentInfoPda,
					cache: cachePda,
					payer,
					mint: h2coinMint,
					vault: vaultPda,
					vaultTokenAccount: vaultTokenAta,
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
				instructions: [computeIx, execIx],
			}).compileToV0Message([lookupTableAccount]);

			const versionedTx = new Anchor.web3.VersionedTransaction(message);
			versionedTx.sign([...threeExecSigners, provider.wallet.payer!]);

			const signature = await provider.connection.sendTransaction(versionedTx, {
				skipPreflight: false,
			});

			await provider.connection.confirmTransaction({
				signature,
				blockhash: blockhash.blockhash,
				lastValidBlockHeight: blockhash.lastValidBlockHeight,
			});

			console.log(`✅ ALT-based executeRefundShare for batchId=${batchId}:`, signature);
			await new Promise((resolve) => setTimeout(resolve, 1000)); // optional delay
		}
	});

	it("(10) Withdraw from vault balance to withdraw wallet", async function () {
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


		// Vault token accounts
		const vaultUsdtAta = await getAssociatedTokenAddress(usdt_mint, vaultPda, true);
		try {
			const vaultUsdtAtaInfo = await getAccount(provider.connection as any, vaultUsdtAta);
			const vaultUSDTBalance = Number(vaultUsdtAtaInfo.amount) / 1_000_000;
			console.log(`${indent} Vault USDT balance:`, vaultUSDTBalance, "USDT with ATA:", vaultUsdtAta.toBase58());
		} catch (e) {
			console.log(`${indent} Vault USDT balance: 0 USDT (ATA not found)`);
			const ataIx = createAssociatedTokenAccountInstruction(
				payer.publicKey, 		// payer
				vaultUsdtAta,       	// vault ATA address
				vaultPda,               // vault PDA
				usdt_mint               // mint
			);
			instructions.push(ataIx);
		}
		
		const vaultH2coinAta = await getAssociatedTokenAddress(h2coin_mint, vaultPda, true);
		try {
			const vaultH2coinAtaInfo = await getAccount(provider.connection as any, vaultH2coinAta);
			const vaultH2coinBalance = Number(vaultH2coinAtaInfo.amount) / 1_000_000;
			console.log(`${indent} Vault H2COIN balance:`, vaultH2coinBalance, "H2COIN with ATA:", vaultH2coinAta.toBase58());
		} catch (e) {
			console.log(`${indent} Vault H2COIN balance: 0 H2COIN (ATA not found)`);
			const ataIx = createAssociatedTokenAccountInstruction(
				payer.publicKey, 		// payer
				vaultH2coinAta,      	// vault ATA address
				vaultPda,               // vault PDA
				h2coin_mint             // mint
			);
			instructions.push(ataIx);
		}



		// Destination token accounts (ATA) for recipient
		const RecipientUsdtAta = await getAssociatedTokenAddress(usdt_mint, recipient);
		try {
			await getAccount(provider.connection as any, RecipientUsdtAta);
		} catch (error) {
			const ataIx = createAssociatedTokenAccountInstruction(
				payer.publicKey, 		// payer
				RecipientUsdtAta,       // Recipient ATA address
				recipient,              // Recipient PDA
				usdt_mint               // mint
			);
			instructions.push(ataIx);
		}


		const RecipientHcoinAta = await getAssociatedTokenAddress(h2coin_mint, recipient);
		try {
			await getAccount(provider.connection as any, RecipientHcoinAta);			
		} catch (error) {		
			const ataIx = createAssociatedTokenAccountInstruction(
				payer.publicKey,		// payer
				RecipientHcoinAta,		// Recipient ATA address
				recipient,				// Recipient PDA
				h2coin_mint
			)
			instructions.push(ataIx);
		}


		// Withdraw instruction
		const withdrawIx = await program.methods
			.withdrawFromVault(recipient)
			.accounts({
				investmentInfo: investmentInfoPda,
				usdtMint: usdt_mint,
				hcoinMint: h2coin_mint,
				tokenProgram: TOKEN_PROGRAM_ID,
				systemProgram: Anchor.web3.SystemProgram.programId,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				payer: payer.publicKey,
			} as any)
			.remainingAccounts([
				...threeExecSigners.map((kp) => ({
					pubkey: kp.publicKey,
					isWritable: false,
					isSigner: true,
				})),
				{ pubkey: vaultPda, isWritable: true, isSigner: false },
				{ pubkey: vaultUsdtAta, isWritable: true, isSigner: false },
				{ pubkey: vaultH2coinAta, isWritable: true, isSigner: false },
				{ pubkey: recipient, isWritable: true, isSigner: false },
				{ pubkey: RecipientUsdtAta, isWritable: true, isSigner: false },
				{ pubkey: RecipientHcoinAta, isWritable: true, isSigner: false },
			])
			.instruction();

		instructions.push(withdrawIx);

		// Send combined transaction
		const tx = new Anchor.web3.Transaction().add(...instructions);
		const txSig = await provider.sendAndConfirm(tx, threeExecSigners);
		console.log("✅ withdrawFromVault successful, tx:", txSig);
	});

	function findMaxBatchId() {
		const map = R.lookupTableMap.get("record");
		const maxBatchId = map && map?.size > 0 ? map?.size : 0;
		return maxBatchId;
	}
});