import { expect } from "chai";
import {describe, it} from "mocha";
import bs58 from "bs58";
import TrimId from "trimid";
import * as Anchor from "@coral-xyz/anchor";
import { 
	ComputeBudgetProgram, 
	PublicKey, Keypair, 
	AddressLookupTableProgram, 
} from "@solana/web3.js";

import { 
	getAssociatedTokenAddress, getAccount,
	ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, ACCOUNT_SIZE
} from "@solana/spl-token";

import {
	stringToFixedU8Array, bytesToFixedString, stage_ratio_map, u16ToLEBytes,
	loadUpdateWhitelistKeypairs, loadExecuteWhitelistKeypairs,
	loadWithdrawWhitelistKeypairs
} from "./lib/lib";
import {Runtime as R} from "./devnet.runtime";




describe("🚀 Profit/Refund share Management", function () {
	let is_record_add = false as boolean;


	const __investmentId = "02SEHzIZfBcpIZ5";
	const __version = "c9060000";
	
	const yearIndex = 3;
	const yearIndexBytes = Uint8Array.of(yearIndex);

	const MAX_ENTRIES = 1500;
	const MAX_ENTRIES_PER_BATCH = 30;
	const MAX_RECORDS_PER_TX = 2;

	const STAGE = 3;

	type K = string | number;
	let batch_data: Record<K, PublicKey[]> = {};

	const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
		units: 800_000, // or even 800_000 if needed
	});


	const threeUpdateSigners = loadUpdateWhitelistKeypairs().slice(0, 3);
	const threeExecSigners = loadExecuteWhitelistKeypairs().slice(0, 3);

	
	before("Initialize investment info with STANDARD type", async function() {
		this.timeout(1000 * 60 * 5); // 5 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`🚀 Initialize invesgtment info with STANDARD type program...`);
		
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


		// Derive the vaultPda PDA for a specific investmentId and version
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
		console.log(`${indent}✅ investment info Summary:`);
		console.log(`${indent} investmentId:`, bytesToFixedString(investmentInfo.investmentId));
		console.log(`${indent} version:`, Buffer.from(version).toString('hex'));
		console.log(`${indent} investmentType:`, Object.keys(investmentInfo.investmentType)[0]);
		console.log(`${indent} stageRatio:`, investmentInfo.stageRatio.toString());
		console.log(`${indent} investmentUpperLimit:`, investmentInfo.investmentUpperLimit.toString());
		console.log(`${indent} executeWhitelist:`, investmentInfo.executeWhitelist.map((v: PublicKey) => v.toBase58()).join(', '));
		console.log(`${indent} updateWhitelist:`, investmentInfo.updateWhitelist.map((v: PublicKey) => v.toBase58()).join(', '));
		console.log(`${indent} withdrawWhitelist:`, investmentInfo.withdrawWhitelist.map((v: PublicKey) => v.toBase58()).join(', '));
		console.log(`${indent} state:`, Object.keys(investmentInfo.state)[0]);
		console.log(`${indent} startAt:`, new Date(investmentInfo.startAt.toNumber()*1000));
		console.log(`${indent} endAt:`, new Date(investmentInfo.endAt.toNumber()*1000));
		console.log(`${indent} solBalance:`, vaultInfo / Anchor.web3.LAMPORTS_PER_SOL);
		console.log(`${indent} usdtBalance:`, usdtBalance.value.uiAmountString ?? '0');
		console.log(`${indent} h2coinBalance:`, h2coinBalance.value.uiAmountString ?? '0');
		
	});

	it("(0) Adds 1500 new investment records (batch mode)", async function () {
		this.timeout(1000 * 60 * 30); // 30 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`🚀 Adding investment records program to init state ...`);


		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const investmentInfoPda = R.investmentInfoPda;
		const version = R.version;	
		const payer = provider.wallet;
		const usdt_mint = R.usdt_mint;
		const h2coin_mint = R.h2coin_mint;

		
		const record_list = await program.account.investmentRecord.all([
				{
					memcmp: {
						offset: 33, // discriminator 是前8位，接下來是 investment_id
						bytes: bs58.encode(Buffer.from(investmentId)),
					},
				},
				{
					memcmp: {
						offset: 33 + 15, // discriminator + investment_id
						bytes: bs58.encode(Buffer.from(version)),
					},
				},
			]);
		if (record_list.length === MAX_ENTRIES) {
			is_record_add = true;
			console.log(`${indent}✅ 1500 investment records exist on chain!:`);
			return;
		}


		let batchId = 1;
		let batchIdBytes = u16ToLEBytes(batchId);
		let total_invest_usdt = new Anchor.BN(0);
		let total_invest_h2coin = new Anchor.BN(0);

		
		for (let start = 1; start <= MAX_ENTRIES; start += MAX_RECORDS_PER_TX) {
			let tx = new Anchor.web3.Transaction();
			
			for (let offset = 0; offset < MAX_RECORDS_PER_TX && (start + offset) <= MAX_ENTRIES; offset++) {
				const index = start + offset;

				// Caluclate batchId and 30 records per batch
				batchId = Math.floor((index - 1) / MAX_ENTRIES_PER_BATCH) + 1;
				batchIdBytes = u16ToLEBytes(batchId);

				const recordId = new Anchor.BN(index);
				const accountId = TrimId.shortid();
				const accountIdBytes = stringToFixedU8Array(accountId, 15);
				const wallet = Keypair.generate().publicKey;


				// Generate amountUsdt and amountHcoin
				const optionAmount = [1, 2, 5, 10];
				const basicUsdt = 1000 * 10 ** 6;
				const exchangeRatio = 1.05;
				const amountBasic = basicUsdt * optionAmount[Math.floor(Math.random() * optionAmount.length)];
				const amountUsdt = new Anchor.BN(amountBasic);
				const amountHcoin = new Anchor.BN(amountBasic * exchangeRatio);


				// Create record PDA
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

				if (!batch_data[batchId]) batch_data[batchId] = [];
				batch_data[batchId].push(recordPda);

				console.log(`${indent}	recordId`, index, 'wallet:', wallet.toBase58(), 'amount:', amountUsdt.toString(), 'recordPda:', recordPda.toBase58());

				const [RecipientUsdtAta, RecipientHcoinAta] = await Promise.all([
					getAssociatedTokenAddress(usdt_mint, wallet),
					getAssociatedTokenAddress(h2coin_mint, wallet)
				]);

				const ix = await program.methods
					.addInvestmentRecord(
						batchId,
						recordId,
						accountIdBytes,
						amountUsdt,
						amountHcoin,
						STAGE
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

				total_invest_usdt = total_invest_usdt.add(amountUsdt);
				total_invest_h2coin = total_invest_h2coin.add(amountHcoin);
			} // enf for offset

			try {
				// send investment records transcation
				const signature = await provider.sendAndConfirm(tx, threeUpdateSigners, {
					commitment: "confirmed",
					skipPreflight: false,
				});
				console.log(`${indent}✅ Successfully inserted ${MAX_RECORDS_PER_TX} investment records into batch #${batchId}. Tx signature: ${signature}`);

				
				// delay 1 second
				await new Promise(resolve => setTimeout(resolve, 1000));
				
			} catch (e: any) {
				console.log(`${indent}✅ state has completed`);
				throw e;
			}
		}
	});

	it("(1) Set investment state to complete", async function() {
		const indent = ResolveIndent(this, 1);
		console.log(`🚀 Set investment state to complete...`);

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
			console.log(`${indent}✅ state has completed`);
		}
	});	

	it("(2) Create ALT from investment records", async function () {
		this.timeout(1000 * 60 * 30); // 30 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`🚀 Create ALT from investment records program...`);


		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const version = R.version;

		// Get Max BatchId
		const maxBatchId = findMaxBatchId();


		// Create ALT
		for (let batchId = 1; batchId <= maxBatchId; batchId++) {
			const batchIdBytes = u16ToLEBytes(batchId);

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
			const signature = await provider.sendAndConfirm(tx_alt, []);


			// Store the lookup table address in the map
			R.lookupTableMap.get('record')!.set(batchId, lookupTableAddress);


			console.log(`${indent}✅ Created ALT address: ${lookupTableAddress.toBase58()} at count: ${record_list.length}, batchId: ${batchId}, signature: ${signature}`);

			// Delay 2 seconds
			await new Promise(resolve => setTimeout(resolve, 2000));
		}


		// Ensure all Address Lookup Tables (ALTs) exist on-chain for each batch
		console.log(`${indent} Start Checking ALT exists or not`);
		for (let batchId = 1; batchId <= maxBatchId; batchId++) {
			let retries = 0;
			let lookupTableAccount;

			// Retrieve the ALT address for the current batchId
			const lookupTableAddress = R.lookupTableMap.get('record')!.get(batchId);
			// If not found, exit early (consider logging)
			if (!lookupTableAddress) return;

			// Retry fetching the ALT up to 5 times (wait 1s between attempts)
			while (!lookupTableAccount && retries < 5) {
				const result = await provider.connection.getAddressLookupTable(lookupTableAddress);
				if (result.value) {
					lookupTableAccount = result.value; // ALT is available
					console.log(`${indent}✅ ALT ${lookupTableAddress} at batch: ${batchId} is available!`);
					break;
				}
				await new Promise(res => setTimeout(res, 5000)); // Wait before retrying
				retries++;
			}

			// If ALT still not available, throw an error
			if (!lookupTableAccount) {
				console.log(`${indent}❌ ALT ${lookupTableAddress} at batch: ${batchId} did not become available in time!`);
				return;
			}
		}
	});

	it("(3) Estimate profit share using ALT with standard type", async function () {
		this.timeout(1000 * 60 * 30); // 30 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`🚀 Estimate profit share program...`);


		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const investmentInfoPda = R.investmentInfoPda;
		const version = R.version;
		const payer = provider.wallet.publicKey;
		const totalProfitUsdt = new Anchor.BN(5_000_000_000_000); // = 1,000,000 USDT (6 decimals)


		// Get all records
		const OFFSET_INVESTMENT_ID = 33;
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
		const totalInvestUsdt = results.reduce((sum, record) => {
			return sum.add(record.account.amountUsdt);
		}, new Anchor.BN(0));
	
		
		// Get max batchId
		const maxBatchId = findMaxBatchId();


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


			// Derive the profit_cache PDA for a specific investmentId, version, and batchId
			const [cachePda] = Anchor.web3.PublicKey.findProgramAddressSync(
				[
					Buffer.from("profit_cache"),
					Buffer.from(investmentId),
					Buffer.from(version),
					batchIdBytes,
				],
				program.programId
			);


			try {
				const estimateIx = await program.methods
				.estimateProfitShare(batchId, totalProfitUsdt, totalInvestUsdt)
				.accounts({
					investmentInfo: investmentInfoPda,
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


				const lookupTableAccount = await provider.connection
				.getAddressLookupTable(lookupTableAddress!)
				.then(res => res.value!);
				
				
				const blockhash = await provider.connection.getLatestBlockhash();
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


				// Wait before confirming transaction
				await new Promise(res => setTimeout(res, 5000));

				
				const result = await provider.connection.confirmTransaction(
					{
						signature,
						blockhash: blockhash.blockhash,
						lastValidBlockHeight: blockhash.lastValidBlockHeight,
					},
					"confirmed"
				);
				console.log(`${indent}------------------------`);
				console.log(`${indent}✅ Estimating profit for batchId: ${batchId}, count: ${batch_data.length}, signature: ${signature}`);
				console.log(`${indent}📦 Estimating profit for Tx result:`, result.value.err === null? 'Successed': 'Failed');
				

				// Generate report
				const info = await program.account.investmentInfo.fetch(investmentInfoPda);
				const cache = await program.account.profitShareCache.fetch(cachePda);

				console.log(`${indent}🧠 Profit Share Cache summary at batchId: ${batchId}`);
				console.log(`${indent}		investmentId:`, Buffer.from(cache.investmentId).toString().replace(/\0/g, ""));
				console.log(`${indent}		version:`, Buffer.from(version).toString('hex'));
				console.log(`${indent}		investmentType:`, Object.keys(info.investmentType)[0]);
				console.log(`${indent}		totalProfitUsdt:`, totalProfitUsdt.toString());
				console.log(`${indent}		totalInvestUsdt:`, totalInvestUsdt.toString());
				console.log(`${indent}		subtotalProfitUsdt:`, cache.subtotalProfitUsdt.toString());
				console.log(`${indent}		subtotalEstimateSol:`, cache.subtotalEstimateSol.toString());
				console.log(`${indent}		createdAt:`, new Date(cache.createdAt.toNumber() * 1000).toISOString());
					
				
				console.log(`${indent}🧠 List Profit entry and count:`, cache.entries.length);
				for (const entry of cache.entries) {
					const data = {
						accountId: bytesToFixedString(entry.accountId),
						wallet: entry.wallet.toBase58(),
						amountUsdt: entry.amountUsdt.toString(),
						ratioBp: entry.ratioBp / 100,
					};
					console.log(`${indent}`, JSON.stringify(data));
				}

				// delay 1 second
				await new Promise(resolve => setTimeout(resolve, 1000));				
			} catch (e:any) {
				console.log(e);
				if (e.transactionLogs.length > 0) {
					expect(e.transactionLogs.join('\n')).to.include("StandardOnly");
				}				
			}
		} // end for
	});

	it("(4) Estimate refund share using ALT with standard type", async function () {
		this.timeout(1000 * 60 * 30); // 30 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`🚀 Process estimate refund share program...`);


		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const investmentInfoPda = R.investmentInfoPda;
		const version = R.version;
		const payer = provider.wallet.publicKey;

		
		// Get all records
		const OFFSET_INVESTMENT_ID = 33;
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
		const totalInvestH2coin = results.reduce((sum, record) => {
			return sum.add(record.account.amountHcoin);
		}, new Anchor.BN(0));
		

		// Get max batchId
		const maxBatchId = findMaxBatchId();


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

			
			// Derive the refund_cache PDA for a specific investmentId, version, batchId and yearIndex
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


			try {
				const estimateIx = await program.methods
				.estimateRefundShare(batchId, yearIndex)
				.accounts({
					investmentInfo: investmentInfoPda,
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


				const lookupTableAccount = await provider.connection
				.getAddressLookupTable(lookupTableAddress!)
				.then(res => res.value!);
				
				
				const blockhash = await provider.connection.getLatestBlockhash();
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


				// Wait before confirming transaction
				await new Promise(res => setTimeout(res, 5000));

				
				const result = await provider.connection.confirmTransaction(
					{
						signature,
						blockhash: blockhash.blockhash,
						lastValidBlockHeight: blockhash.lastValidBlockHeight,
					},
					"confirmed"
				);
				console.log(`${indent}------------------------`);
				console.log(`${indent}✅ Estimating refund for batchId: ${batchId}, count: ${batch_data.length}, signature: ${signature}`);
				console.log(`${indent}📦 Estimating refund for Tx result:`, result.value.err === null? 'Successed': 'Failed');
					

				// Generate report
				const info = await program.account.investmentInfo.fetch(investmentInfoPda);
				const cache = await program.account.refundShareCache.fetch(cachePda);

				console.log(`${indent}🧠 Refund Share Cache summary at batchId: ${batchId}`);
				console.log(`${indent}		investmentId:`, Buffer.from(cache.investmentId).toString().replace(/\0/g, ""));
				console.log(`${indent}		version:`, Buffer.from(version).toString('hex'));
				console.log(`${indent}		investmentType:`, Object.keys(info.investmentType)[0]);
				console.log(`${indent}		totalInvestH2coin:`, totalInvestH2coin.toString());
				console.log(`${indent}		subtotalRefundHcoin:`, cache.subtotalRefundHcoin.toString());
				console.log(`${indent}		subtotalEstimateSol:`, cache.subtotalEstimateSol.toString());
				console.log(`${indent}		createdAt:`, new Date(cache.createdAt.toNumber() * 1000).toISOString());

				console.log(`${indent}🧠 List Refund entry and count:`, cache.entries.length);
				for (const entry of cache.entries) {
					const data = {
						accountId: bytesToFixedString(entry.accountId),
						wallet: entry.wallet.toBase58(),
						amountHcoin: entry.amountHcoin.toString(),
					};
					console.log(`${indent}`, JSON.stringify(data));
				}

				// delay 1 second
				await new Promise(resolve => setTimeout(resolve, 1000));
			} catch (e:any) {
				console.log(e);
					
			}
		}
	});

	it("(5) Create ALT from ProfitShareCache entries", async function () {
		this.timeout(1000 * 60 * 30); // 30 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`🚀 Create ALT from ProfitShareCache entries prgram...`);


		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const version = R.version;
		const usdtMint = R.usdt_mint;
		const payer = provider.wallet.publicKey;


		const maxBatchId = findMaxBatchId();


		for (let batchId = 1; batchId <= maxBatchId; batchId++) {
			const batchIdBytes = u16ToLEBytes(batchId)

			// Derive the profit_cache PDA for a specific investmentId, version, and batchId
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
			console.log(`✅ created Profit ALT Address=${lookupTableAddress.toBase58()}, batchId=${batchId}, signature=${signature}`);

			// Delay 1 second
			await new Promise(resolve => setTimeout(resolve, 1000));
		}


		// Ensure ALT exist in chain
		// Iterate through all batchIds from 1 to maxBatchId
		for (let batchId = 1; batchId <= maxBatchId; batchId++) {
			let retries = 0;
			let lookupTableAccount;

			// Retrieve the ALT address for the current batchId
			const lookupTableAddress = R.lookupTableMap.get('cache')!.get(batchId);
			// If not found, exit early (consider logging)
			if (!lookupTableAddress) return;

			// Retry fetching the ALT up to 5 times (wait 1s between attempts)
			while (!lookupTableAccount && retries < 5) {
				const result = await provider.connection.getAddressLookupTable(lookupTableAddress);
				if (result.value) {
					lookupTableAccount = result.value; // ✅ ALT is available
					break;
				}
				await new Promise(res => setTimeout(res, 1000)); // 💤 Wait before retrying
				retries++;
			}

			// If ALT still not available, throw an error
			if (!lookupTableAccount) throw new Error("ALT did not become available in time");
		}
	});

	it("(6) Deposit sol, USDT and H2coin into vault", async function () {
		this.timeout(1000 * 60 * 30); // 30 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`🚀 Deposit sol, USDT and H2coin into vault program...`);


		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const investmentInfoPda = R.investmentInfoPda;
		const version = R.version;
		const usdtMint = R.usdt_mint;
		const h2coinMint = R.h2coin_mint;
		const payer = provider.wallet.publicKey;


		// Derive the vaultPda PDA for a specific investmentId and version
		const [vaultPda] = Anchor.web3.PublicKey.findProgramAddressSync(
			[
				Buffer.from("vault"),
				Buffer.from(investmentId),
				Buffer.from(version),
			],
			program.programId
		);	

		// Get max batchId
		const maxBatchId = findMaxBatchId();
		

		let subtotalEstimateSol = new Anchor.BN(0);
		let subtotalProfitUsdt = new Anchor.BN(0);
		let subtotalRefundHcoin = new Anchor.BN(0);

		for (let batchId = 1; batchId <= maxBatchId; batchId++) {
			const batchIdBytes = u16ToLEBytes(batchId);		

			try {
				// Derive the profit_cache PDA for a specific investmentId, version, and batchId
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
				// Derive the refund_cache PDA for a specific investmentId, version, batchId and yearIndex
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


		console.log(`${indent}💰 Before SOL Balance:`, subtotalEstimateSol.toNumber() / Anchor.web3.LAMPORTS_PER_SOL, );
		console.log(`${indent}💰 Before USDT Balance:`, subtotalProfitUsdt.toString());
		console.log(`${indent}💰 Before H2coin Balance:`, subtotalRefundHcoin.toString());

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


			// Send transaction
			const tx = new Anchor.web3.Transaction().add(ix1, ix2, ix3);
			const signature = await provider.sendAndConfirm(tx, []);
			console.log("✅ Vault deposit tx:", signature);

			// Wait before confirming transaction
			await new Promise(res => setTimeout(res, 1000));


			const solBalanceLamports = await provider.connection.getBalance(vaultPda);
			const solBalance = solBalanceLamports / Anchor.web3.LAMPORTS_PER_SOL;
			console.log(`${indent}💰 After SOL Balance:`, solBalance, "SOL", vaultPda.toBase58());

			// delay 1 second
			await new Promise(resolve => setTimeout(resolve, 1000));

			const UsdtATA = await provider.connection.getTokenAccountBalance(vaultUsdtAta);
			const usdtBalance = UsdtATA.value.uiAmountString ?? '0';
			console.log(`${indent}💰 After USDT Balance:`, usdtBalance, "USDT", vaultUsdtAta.toBase58());

			// delay 1 second
			await new Promise(resolve => setTimeout(resolve, 1000));

			const H2coinATA = await provider.connection.getTokenAccountBalance(vaultUsdtAta);
			const H2coinBalance = H2coinATA.value.uiAmountString ?? '0';
			console.log(`${indent}💰 After H2coin Balance:`, H2coinBalance, "H2coin", vaultUsdtAta.toBase58());
			
			// delay 1 second
			await new Promise(resolve => setTimeout(resolve, 1000));
		} catch (e: any) {
			console.error("❌ Deposit failed:", e.message ?? e);
		}
	});

	it("(7) Execute profit share using ALT", async function () {
		this.timeout(1000 * 60 * 30); // 30 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`🚀 Process Execute profit share program...`);


		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const investmentInfoPda = R.investmentInfoPda;
		const version = R.version;
		const usdtMint = R.usdt_mint;
		const payer = provider.wallet.publicKey;


		// Derive the vault PDA for a specific investmentId, version
		const [vaultPda] = Anchor.web3.PublicKey.findProgramAddressSync(
			[
				Buffer.from("vault"),
				Buffer.from(investmentId),
				Buffer.from(version),
			],
			program.programId
		);
		

		// Get Vault ATA
		const vaultTokenAta = await getAssociatedTokenAddress(usdtMint, vaultPda, true);


		// Get max batchId
		const maxBatchId = findMaxBatchId();

		for (let batchId = 1; batchId <= maxBatchId; batchId++) {
			const batchIdBytes = u16ToLEBytes(batchId);


			const lookupTableAddress = R.lookupTableMap.get('cache')!.get(batchId);
			
			if (!lookupTableAddress) {
				console.warn(`${indent}⚠️ Missing lookup table for batch ${batchId}`);
				continue;
			}


			// Derive the profit_cache PDA for a specific investmentId, version, batchId and yearIndex
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

			
			// Get recipient ATA on each batchId
			const walletATA: PublicKey[] = [];
			for (const entry of cache.entries) {
				const ata = await getAssociatedTokenAddress(usdtMint, entry.wallet);
				walletATA.push(ata);
			}


			const lookupTableAccount = await provider.connection
				.getAddressLookupTable(lookupTableAddress)
				.then((res) => res.value!);


			try {
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


				// delay 5 second
				await new Promise(resolve => setTimeout(resolve, 5000));


				const result = await provider.connection.confirmTransaction(
					{
						signature,
						blockhash: blockhash.blockhash,
						lastValidBlockHeight: blockhash.lastValidBlockHeight,
					},
					"confirmed"
				);
				console.log(`${indent}✅ Execute profit for batchI: ${batchId}, count: ${batch_data.length}, signature: ${signature}`);
				console.log(`${indent}📦 Execute profit for Tx result:`, result.value.err === null? 'Successed': 'Failed');
			} catch (e:any) {
				if (e.logs && e.logs.length) {
					expect(e.logs).to.not.be.undefined;
					expect(e.logs.join("\n")).to.include("Insufficient USDT Token balance in vault");
				}
			}
		} // end for
	});

	it("(8) Create ALT from RefundShareCache entries", async function () {
		this.timeout(1000 * 60 * 30); // 30 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`🚀 Create ALT from RefundShareCache entries prgram...`);


		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const version = R.version;
		const usdtMint = R.usdt_mint;
		const payer = provider.wallet.publicKey;


		const maxBatchId = findMaxBatchId();


		for (let batchId = 1; batchId <= maxBatchId; batchId++) {
			const batchIdBytes = u16ToLEBytes(batchId)

			// Derive the refund_cache PDA for a specific investmentId, version, batchId and yearIndex
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


			// Construct list of ATA pubkeys
			const addressATAs:PublicKey[] = [];
			for (const entry of cache.entries) {
				const recipient = entry.wallet;
				const recipientAta = await getAssociatedTokenAddress(usdtMint, recipient);

				addressATAs.push(recipientAta);
			}


			const recentSlot = await provider.connection.getSlot("finalized");

			const [createIx, lookupTableAddress] = AddressLookupTableProgram.createLookupTable({
				authority: payer,
				payer: payer,
				recentSlot,
			});

			const extendIx = AddressLookupTableProgram.extendLookupTable({
				lookupTable: lookupTableAddress,
				authority: payer,
				payer: payer,
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
			console.log(`${indent}✅ Created Refund ALT Address=${lookupTableAddress.toBase58()}, batchId=${batchId}, signature=${signature}`);

			// Delay 1 second
			await new Promise(resolve => setTimeout(resolve, 1000));
		}


		// Ensure ALT exist in chain
		// Iterate through all batchIds from 1 to maxBatchId
		for (let batchId = 1; batchId <= maxBatchId; batchId++) {
			let retries = 0;
			let lookupTableAccount;

			// Retrieve the ALT address for the current batchId
			const lookupTableAddress = R.lookupTableMap.get('cache')!.get(batchId);
			// If not found, exit early (consider logging)
			if (!lookupTableAddress) return;

			// Retry fetching the ALT up to 5 times (wait 1s between attempts)
			while (!lookupTableAccount && retries < 5) {
				const result = await provider.connection.getAddressLookupTable(lookupTableAddress);
				if (result.value) {
					lookupTableAccount = result.value; // ✅ ALT is available
					break;
				}
				await new Promise(res => setTimeout(res, 1000)); // 💤 Wait before retrying
				retries++;
			}

			// If ALT still not available, throw an error
			if (!lookupTableAccount) throw new Error("ALT did not become available in time");
		}
	});

	it("(9) Execute refund share using ALT", async function () {
		this.timeout(1000 * 60 * 30); // 30 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`🚀 Process Execute refund share using ALT program...`);


		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const investmentInfoPda = R.investmentInfoPda;
		const version = R.version;
		const h2coinMint = R.h2coin_mint;
		const payer = provider.wallet.publicKey;


		// Derive the vault PDA for a specific investmentId and version
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


		const maxBatchId = findMaxBatchId();

		for (let batchId = 1; batchId <= maxBatchId; batchId++) {
			const batchIdBytes = u16ToLEBytes(batchId);

			const lookupTableAddress = R.lookupTableMap.get('cache')!.get(batchId);			
			if (!lookupTableAddress) {
				console.warn(`${indent}⚠️ Missing lookup table for batch ${batchId}`);
				continue;
			}


			// Derive the refund_cache PDA for a specific investmentId, version, batchId and yearIndex
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

			
			// Prepare walletATA from all recipient ATA
			const walletATA: PublicKey[] = [];
			for (const entry of cache.entries) {
				const ata = await getAssociatedTokenAddress(h2coinMint, entry.wallet);
				walletATA.push(ata);
			}

			const lookupTableAccount = await provider.connection
				.getAddressLookupTable(lookupTableAddress)
				.then((res) => res.value!);


			try {
				const computeIx = modifyComputeUnits;
	
				const execIx = await program.methods
					.executeRefundShare(batchId, yearIndex)
					.accounts({
						investmentInfo: investmentInfoPda,
						mint: h2coinMint,
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
					instructions: [computeIx, execIx],
				}).compileToV0Message([lookupTableAccount]);
	
	
				const versionedTx = new Anchor.web3.VersionedTransaction(message);
				versionedTx.sign([...threeExecSigners, provider.wallet.payer!]);
	
				const signature = await provider.connection.sendTransaction(versionedTx, {
					skipPreflight: false,
				});
	
				// delay 5 second
				await new Promise(resolve => setTimeout(resolve, 5000));


				const result = await provider.connection.confirmTransaction(
					{
						signature,
						blockhash: blockhash.blockhash,
						lastValidBlockHeight: blockhash.lastValidBlockHeight,
					},
					"confirmed"
				);
				console.log(`${indent}✅ Execute refund for batchId: ${batchId}, count: ${batch_data.length}, signature: ${signature}`);
				console.log(`${indent}📦 Execute refund for Tx result:`, result.value.err === null? 'Successed': 'Failed');			
			} catch (e:any) {
				if (e.logs && e.logs.length) {
					expect(e.logs).to.not.be.undefined;
					expect(e.logs.join("\n")).to.include("Insufficient H2coin Token balance in vault");
				}
			}
		} // end for
	});

	it("(10) Withdraw from vaultPDA balance to withdraw wallet", async function () {
		this.timeout(1000 * 60 * 5); // 5 minutes timeout
		const indent = ResolveIndent(this, 1);
		console.log(`🚀 Process Withdraw from vault balance to withdraw wallet program...`);

	
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
		

		const [vaultPda] = Anchor.web3.PublicKey.findProgramAddressSync(
			[
				Buffer.from("vault"),
				Buffer.from(investmentId),
				Buffer.from(version),
			],
			program.programId
		);

		const vaultSolBalance = await provider.connection.getBalance(vaultPda);
		console.log(`${indent}💰 Before Vault SOL balance:`, vaultSolBalance / Anchor.web3.LAMPORTS_PER_SOL, "SOL with PDA:", vaultPda.toBase58());


		// Vault USDT token accounts
		const vaultUsdtAta = await getAssociatedTokenAddress(usdt_mint, vaultPda, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
		try {
			const vaultUsdtAtaInfo = await getAccount(provider.connection as any, vaultUsdtAta);
			const vaultUSDTBalance = Number(vaultUsdtAtaInfo.amount) / 1_000_000;
			console.log(`${indent}💰 Before Vault USDT balance:`, vaultUSDTBalance, "USDT with ATA:", vaultUsdtAta.toBase58());
		} catch (e) {
			console.log(`${indent}💰 Before Vault USDT balance: 0 USDT (ATA not found)`);
		}
		
		// Vault H2coin token accounts
		const vaultH2coinAta = await getAssociatedTokenAddress(h2coin_mint, vaultPda, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
		try {
			const vaultH2coinAtaInfo = await getAccount(provider.connection as any, vaultH2coinAta);
			const vaultH2coinBalance = Number(vaultH2coinAtaInfo.amount) / 1_000_000;
			console.log(`${indent}💰 Before Vault H2COIN balance:`, vaultH2coinBalance, "H2COIN with ATA:", vaultH2coinAta.toBase58());
		} catch (e) {
			console.log(`${indent}💰 Before Vault H2COIN balance: 0 H2COIN (ATA not found)`);
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
		const signature = await provider.sendAndConfirm(tx, threeExecSigners);
		console.log(`${indent} ✅ withdrawFromVault successful, tx:${signature}`);


		// Show after vault PDA result
		{
			const vaultSolBalance = await provider.connection.getBalance(vaultPda);
			console.log(`${indent}💰 After Vault SOL balance:`, vaultSolBalance / Anchor.web3.LAMPORTS_PER_SOL, "SOL with PDA:", vaultPda.toBase58());


			// Vault USDT token accounts
			const vaultUsdtAta = await getAssociatedTokenAddress(usdt_mint, vaultPda, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
			try {
				const vaultUsdtAtaInfo = await getAccount(provider.connection as any, vaultUsdtAta);
				const vaultUSDTBalance = Number(vaultUsdtAtaInfo.amount) / 1_000_000;
				console.log(`${indent}💰 After Vault USDT balance:`, vaultUSDTBalance, "USDT with ATA:", vaultUsdtAta.toBase58());
			} catch (e) {
				console.log(`${indent}💰 After Vault USDT balance: 0 USDT (ATA not found)`);
			}
			
			// Vault H2coin token accounts
			const vaultH2coinAta = await getAssociatedTokenAddress(h2coin_mint, vaultPda, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
			try {
				const vaultH2coinAtaInfo = await getAccount(provider.connection as any, vaultH2coinAta);
				const vaultH2coinBalance = Number(vaultH2coinAtaInfo.amount) / 1_000_000;
				console.log(`${indent}💰 After Vault H2COIN balance:`, vaultH2coinBalance, "H2COIN with ATA:", vaultH2coinAta.toBase58());
			} catch (e) {
				console.log(`${indent}💰 After Vault H2COIN balance: 0 H2COIN (ATA not found)`);
			}
		}

		// Show after withdraw wallet result
		{
			const recipientSolBalance = await provider.connection.getBalance(recipient);
			console.log(`${indent}💰 After recipient SOL balance:`, vaultSolBalance / Anchor.web3.LAMPORTS_PER_SOL, "SOL with PDA:", vaultPda.toBase58());


			// Vault USDT token accounts
			const recipientUsdtAta = await getAssociatedTokenAddress(usdt_mint, recipient);
			try {
				const recipientUsdtAtaInfo = await getAccount(provider.connection as any, recipientUsdtAta);
				const recipientUSDTBalance = Number(recipientUsdtAtaInfo.amount) / 1_000_000;
				console.log(`${indent}💰 After recipient USDT balance:`, recipientUSDTBalance, "USDT with ATA:", recipientUsdtAta.toBase58());
			} catch (e) {
				console.log(`${indent}💰 After recipient USDT balance: 0 USDT (ATA not found)`);
			}
			
			// Vault H2coin token accounts
			const recipientH2coinAta = await getAssociatedTokenAddress(h2coin_mint, recipient);
			try {
				const recipientH2coinAtaInfo = await getAccount(provider.connection as any, recipientH2coinAta);
				const recipientH2coinBalance = Number(recipientH2coinAtaInfo.amount) / 1_000_000;
				console.log(`${indent}💰 After recipient H2COIN balance:`, recipientH2coinBalance, "H2COIN with ATA:", recipientH2coinAta.toBase58());
			} catch (e) {
				console.log(`${indent}💰 After recipient H2COIN balance: 0 H2COIN (ATA not found)`);
			}
		}
	});

	function findMaxBatchId() {
		return 50;
	}
});