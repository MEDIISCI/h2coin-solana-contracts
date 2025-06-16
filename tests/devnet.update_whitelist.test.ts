import { expect } from "chai"
import {describe, it} from "mocha";
import * as Anchor from "@coral-xyz/anchor";
import { ComputeBudgetProgram, PublicKey } from "@solana/web3.js";


import {stringToFixedU8Array, stage_ratio_map, loadUpdateWhitelistKeypairs, bytesToFixedString} from "./lib/lib";
import {Runtime as R} from "./devnet.runtime";



describe("📃h2coin whitelist-check", async () => {
	const __investmentId = "02SEHzIZfBcp222";
	const __version = "3e2ea017";

	const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
		units: 400_000, // or even 500_000 if needed
	});

	before('Initialize investment info...', async function() {
		this.timeout(1000 * 60 * 5); // 5 分鐘 timeout
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Initialize invesgtment info program...`);


		const program = R.program;
		const provider = R.provider;


		const investmentId = stringToFixedU8Array(__investmentId, 15);
		R.investmentId = investmentId;

		const version = stringToFixedU8Array(__version, 4, "hex");
		R.version = version;
		
		const investmentType = { standard: {} };

		const stageRatioRows = [
			{ mid: 6.0, last: 4.0 },
			{ mid: 4.0, last: 6.0 },
			{ mid: 3.0, last: 2.0 },
		];
		const stageRatio = stage_ratio_map(stageRatioRows);

		const start_at = new Anchor.BN(1747699200);
		const end_at = new Anchor.BN(1779235200);
		const upperLimit = new Anchor.BN(5_000_000_000_000);


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
			const info_data = await program.account.investmentInfo.fetch(investmentInfoPda);
			console.log('info_data exits');
			return;
		} catch (e:any) {
			console.log('info_data not exits');
		}
		
		
		try {
			const signature = await program.methods
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

			// assertion
			const investmentInfo = await program.account.investmentInfo.fetch(investmentInfoPda);
			expect(investmentInfo.investmentId).to.deep.equal(investmentId);
			expect(investmentInfo.version).to.deep.equal(version);
			expect(investmentInfo.state).to.have.property("pending");
			expect(investmentInfo.isActive).to.equal(true);
			
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
			executeWhitelist: investmentInfo.executeWhitelist.map((v: PublicKey) => v.toBase58()),
			updateWhitelist: investmentInfo.updateWhitelist.map((v: PublicKey) => v.toBase58()),
			withdrawWhitelist: investmentInfo.withdrawWhitelist.map((v: PublicKey) => v.toBase58()),
			state: Object.keys(investmentInfo.state)[0],
			isActive: investmentInfo.isActive,
			startAt: new Date(investmentInfo.startAt.toNumber()*1000),
			endAt: new Date(investmentInfo.endAt.toNumber()*1000),
			createdAt: new Date(investmentInfo.createdAt.toNumber()*1000),
		});
	});

	it("(0) Replace existing key with other existing key", async function() {
		this.timeout(1000 * 60 * 5); // 5 分鐘 timeout
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Replace existing key with other existing key program...`);


		const program = R.program;
		const provider = R.provider;
		const investmentInfoPda = R.investmentInfoPda;

		
		const updateWhistLists = loadUpdateWhitelistKeypairs();
		const threeSigners = updateWhistLists.slice(0, 3);


		const from = new PublicKey("5QUUjS7i2akMphaXV9QGWANhucQY73BsC9cNedR3feqB");
		const to = new PublicKey("5QUUjS7i2akMphaXV9QGWANhucQY73BsC9cNedR3feqB");


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
		} catch (e: any) {
			caught = true;
			expect(e).to.have.property("error");
			expect(e.error.errorCode.code, `Actual code: ${e.error.errorCode.code}`).to.be.oneOf([
				"WhitelistAddressExists",
				"WhitelistAddressNotFound"
			]);
		}



		const investmentInfo = await program.account.investmentInfo.fetch(investmentInfoPda);
		const updateWhiteLists = investmentInfo.updateWhitelist;
		let all_matched = true;
		for(let i=0; i<updateWhiteLists.length; i++) {
			const index = updateWhistLists.findIndex((v)=>{
				return v.publicKey.equals(updateWhiteLists[i]);
			});

			all_matched = all_matched && index >= 0;
			console.log(`${indent}${updateWhiteLists[i].toBase58()} ${index >= 0 ? '✅' : '❌'}`);
		}

		if ( !all_matched ) {
			throw new Error("Not matched!");
		}
	});

	it("(1) Replace existing key with self", async function() {
		this.timeout(1000 * 60 * 5); // 5 分鐘 timeout
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Replace existing key with self program...`);


		const program = R.program;
		const provider = R.provider;
		const investmentInfoPda = R.investmentInfoPda;

		
		const updateWhistLists = loadUpdateWhitelistKeypairs();
		const threeSigners = updateWhistLists.slice(0, 3);

		const from = new PublicKey("5QUUjS7i2akMphaXV9QGWANhucQY73BsC9cNedR3feqB");
		const to = new PublicKey("CtwJnkTrVCdye3MF2VSRtyoLtGLdCBAkfs1idn3FeHRp");
				
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
		} catch (e: any) {
			caught = true;
			expect(e).to.have.property("error");
			expect(e.error.errorCode.code, `Actual code: ${e.error.errorCode.code}`).to.be.oneOf([
				"WhitelistAddressExists",
				"WhitelistAddressNotFound"
			]);
		}


		const investmentInfo = await program.account.investmentInfo.fetch(investmentInfoPda);
		const updateWhiteLists = investmentInfo.updateWhitelist;
		let all_matched = true;
		for(let i=0; i<updateWhiteLists.length; i++) {
			const index = updateWhistLists.findIndex((v)=>{
				return v.publicKey.equals(updateWhiteLists[i]);
			});

			all_matched = all_matched && index >= 0;
			console.log(`${indent}${updateWhiteLists[i].toBase58()} ${index >= 0 ? '✅' : '❌'}`);
		}

		if ( !all_matched ) {
			throw new Error("Not matched!");
		}
	});

	it("(2) Replace existing key with new key", async function() {
		this.timeout(1000 * 60 * 5); // 5 分鐘 timeout
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Replace existing key with new key...`);

		const program = R.program;
		const investmentInfoPda = R.investmentInfoPda;
		const provider = R.provider;

		
		const updateWhistLists = loadUpdateWhitelistKeypairs();
		const threeSigners = updateWhistLists.slice(0, 3);


		const from = new PublicKey("5QUUjS7i2akMphaXV9QGWANhucQY73BsC9cNedR3feqB");
		const to  = new PublicKey("CR7HxrTiCiCvWxgJF2gGV3XjQnm1pveBp5XCrXqwJnLy");
				
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
		} catch (e: any) {
			caught = true;
			expect(e).to.have.property("error");
			expect(e.error.errorCode.code, `Actual code: ${e.error.errorCode.code}`).to.be.oneOf([
				"WhitelistAddressExists",
				"WhitelistAddressNotFound"
			]);
		}


		const investmentInfo = await program.account.investmentInfo.fetch(investmentInfoPda);
		const updateWhiteLists = investmentInfo.updateWhitelist;
		let all_matched = true;
		for(let i=0; i<updateWhiteLists.length; i++) {
			const target = updateWhiteLists[i];
			const index = updateWhistLists.findIndex((v)=>{
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
		this.timeout(1000 * 60 * 5); // 5 分鐘 timeout
		const indent = ResolveIndent(this, 1);
		console.log(`${indent}📃 Reset to original whitelist...`);

		const program = R.program;
		const investmentInfoPda = R.investmentInfoPda;
		const provider = R.provider;

		
		const updateWhistLists = loadUpdateWhitelistKeypairs();
		const threeSigners = updateWhistLists.slice(0, 3);


		const from  = new PublicKey("CR7HxrTiCiCvWxgJF2gGV3XjQnm1pveBp5XCrXqwJnLy");
		const to	= new PublicKey("5QUUjS7i2akMphaXV9QGWANhucQY73BsC9cNedR3feqB");
				
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
		} catch (e: any) {
			caught = true;
			console.log(e);
			
			expect(e).to.have.property("error");
			expect(e.error.errorCode.code, `Actual code: ${e.error.errorCode.code}`).to.be.oneOf([
				"WhitelistAddressExists",
				"WhitelistAddressNotFound"
			]);
		}


		const investmentInfo = await program.account.investmentInfo.fetch(investmentInfoPda);
		const updateWhiteLists = investmentInfo.updateWhitelist;
		let all_matched = true;
		for(let i=0; i<updateWhiteLists.length; i++) {
			const target = updateWhiteLists[i];
			const index = updateWhistLists.findIndex((v)=>{
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
				pass = index < 0;
			}

			all_matched = all_matched && pass;
			console.log(`${indent}${target.toBase58()} ${pass ? '✅' : '❌'}`);
		}

		if ( !all_matched ) {
			throw new Error("Not matched!");
		}
	});
});