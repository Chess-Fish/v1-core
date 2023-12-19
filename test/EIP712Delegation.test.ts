import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { generateRandomHash, coordinates_array, bitCoordinates_array } from "../scripts/constants";

describe("ChessFish Delegated Signed Gasless Game Unit Tests", function () {
	async function deploy() {
		const [signer0, signer1] = await ethers.getSigners();

		const ERC20_token = await ethers.getContractFactory("Token");
		const token = await ERC20_token.deploy();

		const ChessFishToken = await ethers.getContractFactory("ChessFish");
		const chessFishToken = await ChessFishToken.deploy(signer0.address);
		await chessFishToken.deployed();

		const PaymentSplitter = await ethers.getContractFactory("PaymentSplitter");
		const paymentSplitter = await PaymentSplitter.deploy(chessFishToken.address);
		await paymentSplitter.deployed();

		const ChessNFT = await ethers.getContractFactory("ChessFishNFT");
		const chessNFT = await ChessNFT.deploy();

		const MoveVerification = await ethers.getContractFactory("MoveVerification");
		const moveVerification = await MoveVerification.deploy();

		const GaslessGame = await ethers.getContractFactory("GaslessGame");
		const gaslessGame = await GaslessGame.deploy(moveVerification.address);

		const ChessWager = await ethers.getContractFactory("ChessWager");
		const chess = await ChessWager.deploy(
			moveVerification.address,
			gaslessGame.address,
			paymentSplitter.address,
			chessNFT.address
		);

		await gaslessGame.setChessWager(chess.address);

		const amount = ethers.utils.parseEther("100");
		await token.transfer(signer1.address, amount);

		await chess.initCoordinates(coordinates_array, bitCoordinates_array);
		await chessNFT.setChessFishAddress(chess.address);

		return {
			chess,
			gaslessGame,
			chessFishToken,
			paymentSplitter,
			chessNFT,
			signer0,
			signer1,
			token,
		};
	}

	describe("Gasless Delegated Game Verification Unit Tests", function () {
		it("Should test verification of signed typed data v4", async function () {
			const { chess, gaslessGame, signer0, signer1, token } = await loadFixture(deploy);

			let player1 = signer1.address;
			let wagerToken = token.address;
			let wager = ethers.utils.parseEther("1.0");
			let maxTimePerMove = 86400;
			let numberOfGames = 3;

			await token.approve(chess.address, wager);

			let tx = await chess.connect(signer0).createGameWager(player1, wagerToken, wager, maxTimePerMove, numberOfGames);
			await tx.wait();

			let wagerAddress = await chess.userGames(signer0.address, 0);

			// 1) Generate random public private key pair
			const entropy0 = generateRandomHash();
			const delegatedSigner0 = ethers.Wallet.createRandom(entropy0);

			// 2) create delegation
			const delegationData = [signer0.address, delegatedSigner0.address, wagerAddress];

			// 3 Sign Typed Data V4
			const domain = {
				chainId: 1, // replace with the chain ID on frontend
				name: "ChessFish", // Contract Name
				verifyingContract: gaslessGame.address, // for testing
				version: "1", // version
			};

			const types = {
				Delegation: [
					{ name: "delegatorAddress", type: "address" },
					{ name: "delegatedAddress", type: "address" },
					{ name: "wagerAddress", type: "address" },
				],
			};

			const message = {
				delegatorAddress: delegationData[0],
				delegatedAddress: delegationData[1],
				wagerAddress: delegationData[2],
			};

			// Sign the data
			const signature = await signer0._signTypedData(domain, types, message);
			// console.log(signature);
			// const signature = '0xcf83445b48c2aec2ef5f0ad9f39b7d5770e27a8772f4a6952867ad13b52e2d5965ca775fc80bccdb1056aec8327d1501f8b13c6ef5a5c86900b3c2ffaa893b061c';

			const signedDelegation = [delegationData, signature];

			await gaslessGame.verifyDelegation(signedDelegation);
		});
	});
});
