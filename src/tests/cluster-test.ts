import * as Anchor from "@coral-xyz/anchor";
import { getProvider } from "../utils/provider";

describe("Cluster Anchor Test", () => {
    it("initializes", async () => {
        const provider = getProvider();
        Anchor.setProvider(provider);

        // You can now access the program and use Anchor normally
        const connection = provider.connection;
        const wallet = provider.wallet.publicKey;

        const solBalanceLamports = await provider.connection.getBalance(wallet);
        const solBalance = solBalanceLamports / Anchor.web3.LAMPORTS_PER_SOL;
        
        console.log("✅ Connected to:", wallet.toBase58());
        console.log("💰 SOL Balance:", solBalance, "SOL");
    });
});
