import * as anchor from "@coral-xyz/anchor";
import { getProvider } from "../utils/provider";

describe("Cluster Anchor Test", () => {
    it("initializes", async () => {
        const provider = getProvider();
        anchor.setProvider(provider);

        // You can now access the program and use Anchor normally
        const connection = provider.connection;
        const wallet = provider.wallet.publicKey;

        console.log("✅ Connected to:", wallet.toBase58());
    });
});
