import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

export const domain = {
	chainId: 0,
	name: "ChessFish",
	verifyingContract: "",
	version: "1",
};

export const walletGenerationTypes = {
	WalletGeneration: [{ name: "wagerAddress", type: "address" }],
};

// Generating a new deterministic wallet based upon the
// wagerAddress and the hash of the user signature of the wagerAddress

// this method is used in production at Umbra Finance
// https://github.com/ScopeLift/umbra-protocol/blob/9bd49002eb64d058a3c6a98704d999f5b513b344/umbra-js/src/classes/Umbra.ts#L605C56-L605C69
export const generateWallet = async (
	signer: ethers.Signer,
	chainId: number,
	gaslessGameAddress: string,
	wagerAddress: string
): Promise<ethers.Signer> => {
	const message = {
		wagerAddress: wagerAddress,
	};

	domain.chainId = chainId;
	domain.verifyingContract = gaslessGameAddress;

	const signature = await signer._signTypedData(domain, walletGenerationTypes, message);
	const hashedSignature = ethers.utils.keccak256(signature);

	// Use the hashed signature to generate a deterministic mnemonic
	const mnemonic = ethers.utils.entropyToMnemonic(hashedSignature);

	// Create a wallet using the deterministic mnemonic
	const deterministicWallet = ethers.Wallet.fromMnemonic(mnemonic);

	return deterministicWallet;
};

describe("ChessFish Delegated Signed Gasless Game Unit Tests", function () {
	async function deploy() {
		const [signer0, signer1] = await ethers.getSigners();

		return {
			signer0,
			signer1,
		};
	}

	describe("Deterministic Wallet Generation Tests", function () {
		it("Should Test Determinism", async function () {
			const { signer0, signer1 } = await loadFixture(deploy);

			const chainId = 1;
			const gaslessGameAddress = signer1.address;
			const wagerAddress = await signer1.address;

			const deterministicWallet = await generateWallet(signer0, chainId, gaslessGameAddress, wagerAddress);

			for (let i = 0; i < 100; i++) {
				const deterministicWallet1 = await generateWallet(signer0, chainId, gaslessGameAddress, wagerAddress);
				expect(deterministicWallet.address).to.equal(deterministicWallet1.address);
			}
		});
	});
});
