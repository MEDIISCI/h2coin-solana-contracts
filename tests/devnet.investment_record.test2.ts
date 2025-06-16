import { expect } from "chai";
import { describe, it } from "mocha";
import bs58 from "bs58";
import TrimId from "trimid";
import * as Anchor from "@coral-xyz/anchor";
import { ComputeBudgetProgram, PublicKey, Keypair,
	AddressLookupTableProgram
} from "@solana/web3.js";

import { stringToFixedU8Array, stage_ratio_map, 
	loadExecuteWhitelistKeypairs, loadUpdateWhitelistKeypairs, 
	loadWithdrawWhitelistKeypairs, 
	bytesToFixedString,	u16ToLEBytes
} from "./lib/lib";
import {Runtime as R} from "./local.runtime";




describe("Investment Record management", async () => {
	let is_record_add = false as boolean;


	const __investmentId = "02SEHzIZfBcp223";
	const __version = "3e2ea022";


	const batchId = 1;
	const batchIdBytes = u16ToLEBytes(batchId);
	
		
	const MAX_ENTRIES_PER_BATCH = 30;
	const MAX_RECORDS_PER_TX = 5;
	
	const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
		units: 800_000,
	});
	
	const threeUpdateSigners = loadUpdateWhitelistKeypairs().slice(0, 3);

	before("Initialize investment info with CSR type", async function() {
		this.timeout(1000 * 60 * 5); // 5 分鐘 timeout
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Initialize invesgtment info with CSR type program...`);
		
		const program = R.program;
		const provider = R.provider;

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
				payer: provider.wallet.publicKey,
				systemProgram: Anchor.web3.SystemProgram.programId,
			} as any)
			.preInstructions([modifyComputeUnits])
			.rpc();

		} catch (e:any) {
			const logs = e.transactionLogs?.join("\n") || e.message || JSON.stringify(e);
			expect(logs).to.include("already in use");	
		}
		

		const investmentInfo = await program.account.investmentInfo.fetch(investmentInfoPda);
		console.log(`${indent}✅ (0) Initialize investment info:`, {
			investmentId: bytesToFixedString(investmentInfo.investmentId),
			version: investmentInfo.version.map(n => n.toString(16).padStart(2, '0')).join(''),
			investmentType: Object.keys(investmentInfo.investmentType)[0],
			stageRatio: investmentInfo.stageRatio.toString(),
			investmentUpperLimit: investmentInfo.investmentUpperLimit.toString(),
			startAt: new Date(investmentInfo.startAt.toNumber()*1000),
			endAt: new Date(investmentInfo.endAt.toNumber()*1000),
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
		const record_info:PublicKey[] = [];


		for (let start = 1; start <= MAX_ENTRIES_PER_BATCH; start += MAX_RECORDS_PER_TX) {
			let tx = new Anchor.web3.Transaction();

			for (let offset = 0; offset < MAX_RECORDS_PER_TX && (start + offset) <= MAX_ENTRIES_PER_BATCH; offset++) {
				const index = start*100 + offset;

				// Generate investment record
				const recordId = new Anchor.BN(index);
				const accountId = offset === 4? fix_account_id: TrimId.shortid();
				const accountIdBytes = stringToFixedU8Array(accountId, 15);
				const wallet = offset === 4? fix_wallet: Keypair.generate().publicKey;
				const options = [1, 5, 10];
				const basicUsdt = 1000 * 10 ** 6;
				const exchangeRatio = 1.05;
				const amountUsdt = basicUsdt * options[Math.floor(Math.random() * options.length)];
				const amountHcoin = amountUsdt * exchangeRatio;
				total_invest_usdt += amountUsdt;
				
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
				investmentRecordPdas.push(recordPda);

				console.log('recordId', index, 'wallet:', wallet.toBase58(), 'amount:', amountUsdt);

				const ix = await program.methods
					.addInvestmentRecord(
						batchId,
						recordId,
						accountIdBytes,
						wallet,
						new Anchor.BN(amountUsdt),
						new Anchor.BN(amountHcoin),
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
			} // end for offset

			try {
				// send investment records transcation
				const sig = await provider.sendAndConfirm(tx, threeUpdateSigners, {
					commitment: "confirmed",
					skipPreflight: false,
				});
				console.log(`${indent}✅ Sent batch: ${start}~${Math.min(start + MAX_RECORDS_PER_TX - 1, MAX_RECORDS_PER_TX)} (tx: ${sig})`);


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
					console.log(`${indent}✅ Created ALT for batchId=${batchId}: ${lookupTableAddress.toBase58()}`);
					R.lookupTableMap.get('record')!.set(batchId, lookupTableAddress);

					record_info.length = 0;
				} // end if record_info.length

			} catch (e: any) {
				console.error(`${indent}❌ Batch send failed:`, e.logs ?? e.message);
				throw e;
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
		const version = R.version;	
		const investmentInfoPda = R.investmentInfoPda;
		const investmentRecordPdas:PublicKey[] = [];


		const __account_id = '02SEUFT8wuOZ2w5';
		const fix_account_id = stringToFixedU8Array(__account_id, 15);
		const old_fix_wallet = new PublicKey('3A1krgYtfgYecXaqwZNQaxgiEaq7Yt1v3wdeZtvQPidW');
		const new_fix_wallet = new PublicKey('D37W4RnEps9SN1d6NjaJLXYPQKcKEjQKkMNyc8nVDXuB');


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
			before_record_list.map(i => ({
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
			.updateInvestmentRecordWallets(
				fix_account_id,
				new_fix_wallet
			)
			.accounts({
				investmentInfo: investmentInfoPda,
				payer: provider.wallet.publicKey,
				systemProgram: Anchor.web3.SystemProgram.programId,
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
				after_record_list.map(i => ({
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
		this.timeout(1000 * 60 * 5); // 5 分鐘 timeout
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


		const __account_id = '02SEUFT8wuOZ2w5';
		const fix_account_id = stringToFixedU8Array(__account_id, 15);
		const new_fix_wallet = new PublicKey('DKKntVkQgWxcT1ujwEPfQ8Gg8Zk6tBrA6cZLCYpdXqhf');


		const before_record_list = await program.account.investmentRecord.all([
			{
				memcmp: {
					offset: 18, // account_id
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


		console.log(`${indent}`,
			'before_record_list',
			before_record_list.map(i => ({
				recordId: i.account.recordId,
				accountId: i.account.accountId,
				wellet: i.account.wallet
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
			const tx = await program.methods
			.updateInvestmentRecordWallets(
				fix_account_id,
				new_fix_wallet
			)
			.accounts({
				investmentInfo: investmentInfoPda,
				payer: provider.wallet.publicKey,
				systemProgram: Anchor.web3.SystemProgram.programId,
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
			.signers(threeUpdateSigners)
			.preInstructions([modifyComputeUnits])
			.rpc();

			
		} catch (e:any) {
			expect(e).to.have.property("error");
			expect(e.error.errorCode.code, `Actual code: ${e.error.errorCode.code}`).to.be.oneOf([
				"NoRecordsUpdated",
				"InvestmentInfoDeactivated"
			]);
		}

		const after_record_list = await program.account.investmentRecord.all([
			{
				memcmp: {
					offset: 18, // account_id
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


		console.log(`${indent}`,
			'after_record_list',
			after_record_list.map(i => ({
				recordId: i.account.recordId,
				accountId: i.account.accountId,
				wellet: i.account.wallet
			}))
		);
	});

	it("(5) Create ALT from investment records", async function () {
		this.timeout(1000 * 60 * 5); // 5 分鐘 timeout
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Create ALT from investment records program...`);


		const program = R.program;
		const provider = R.provider;
		const investmentId = R.investmentId;
		const version = R.version;
		const usdtMint = R.usdt_mint;


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
			addresses: record_list.map(i => i.publicKey),
		});

		tx_alt.add(createIx, extendIx);
		const sig = await provider.sendAndConfirm(tx_alt, []);
		console.log(`${indent}✅ Created ALT for batchId=${batchId}: ${lookupTableAddress.toBase58()}`);

		// Store the lookup table address in the map
		R.lookupTableMap.get('record')!.set(batchId, lookupTableAddress);
	});

	it("(6) Estimate profit share using ALT with standard type", async function () {
		this.timeout(1000 * 60 * 5); // 5 分鐘 timeout
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

		for (const [index, record] of totalRecords.entries()) {
			const pda = record.publicKey.toBase58();
			const amount = record.account.amountUsdt.toString();
		}
		const totalInvestUsdt = totalRecords.reduce((sum, r) => {
			return sum.add(r.account.amountUsdt);
		}, new Anchor.BN(0));


		const investmentRecordPdas = totalRecords.map(record => record.publicKey);


		let errorCaught = false;
		try {
			const estimateIx = await program.methods
			.estimateProfitShare(1, totalProfitUsdt, totalInvestUsdt)
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

			console.log("🧠 Profit Cache:", {
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
			});

			console.log('show profit cache detail and count:', cache.entries.length);			
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
			expect(errorCaught).to.be.true;
			expect(e.transactionLogs.join('\n')).to.include("MustStandard");
		}
	});
});