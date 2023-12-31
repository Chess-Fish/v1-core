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

		const initalState = "0xcbaedabc99999999000000000000000000000000000000001111111143265234";
		const initialWhite = "0x000704ff";
		const initialBlack = "0x383f3cff";

		// typed signature data
		const domain = {
			chainId: 1, // replace with the chain ID on frontend
			name: "ChessFish", // Contract Name
			verifyingContract: gaslessGame.address, // for testing
			version: "1", // version
		};

		const delegationTypes = {
			Delegation: [
				{ name: "delegatorAddress", type: "address" },
				{ name: "delegatedAddress", type: "address" },
				{ name: "wagerAddress", type: "address" },
			],
		};

		const gaslessMoveTypes = {
			GaslessMove: [
				{ name: "wagerAddress", type: "address" },
				{ name: "gameNumber", type: "uint" },
				{ name: "moveNumber", type: "uint" },
				{ name: "move", type: "uint16" },
				{ name: "expiration", type: "uint" },
			],
		};

		return {
			chess,
			gaslessGame,
			chessFishToken,
			paymentSplitter,
			chessNFT,
			signer0,
			signer1,
			initalState,
			initialWhite,
			initialBlack,
			token,
			domain,
			delegationTypes,
			gaslessMoveTypes,
		};
	}

	describe("Gasless Delegated Game Verification Unit Tests", function () {
		it("Should play delegated gasless game", async function () {
			const { chess, gaslessGame, signer0, signer1, token, domain, delegationTypes, gaslessMoveTypes } =
				await loadFixture(deploy);

			let player1 = signer1.address;
			let wagerToken = token.address;
			let wager = ethers.utils.parseEther("1.0");
			let maxTimePerMove = 86400;
			let numberOfGames = 3;

			await token.approve(chess.address, wager);

			let tx = await chess.connect(signer0).createGameWager(player1, wagerToken, wager, maxTimePerMove, numberOfGames);
			await tx.wait();

			let wagerAddress = await chess.userGames(signer0.address, 0);
			let wagerAddress1 = await chess.userGames(signer1.address, 0);
			expect(wagerAddress).to.equal(wagerAddress1);

			// DELEGATED SIGNING OF GAME

			// ON THE FRONT END user 0
			// 1) Generate random public private key pair
			const entropy0 = generateRandomHash();
			const delegatedSigner0 = ethers.Wallet.createRandom(entropy0);

			// 2) create deletation and hash it
			const delegationData0 = [signer0.address, delegatedSigner0.address, wagerAddress];

			// 3 Sign Typed Data V4
			const message0 = {
				delegatorAddress: delegationData0[0],
				delegatedAddress: delegationData0[1],
				wagerAddress: delegationData0[2],
			};

			// Sign the data
			const signature0 = await signer0._signTypedData(domain, delegationTypes, message0);
			const signedDelegationData0 = await gaslessGame.encodeSignedDelegation(message0, signature0);

			// ON THE FRONT END user 1
			// 1) Generate random public private key pair
			const entropy1 = generateRandomHash();
			const delegatedSigner1 = ethers.Wallet.createRandom(entropy1);

			// 2) create deletation and hash it
			const delegationData1 = [signer1.address, delegatedSigner1.address, wagerAddress];

			// 3 Sign Typed Data V4
			const message1 = {
				delegatorAddress: delegationData1[0],
				delegatedAddress: delegationData1[1],
				wagerAddress: delegationData1[2],
			};

			// Sign the data
			const signature1 = await signer1._signTypedData(domain, delegationTypes, message1);
			const signedDelegationData1 = await gaslessGame.encodeSignedDelegation(message1, signature1);

			// const moves = ["f2f3", "e7e5", "g2g4", "d8h4"]; // fool's mate
			const moves = ["e2e4", "f7f6", "d2d4", "g7g5", "d1h5"]; // reversed fool's mate

			// approve chess contract
			await token.connect(signer1).approve(chess.address, wager);

			// accept wager terms
			let tx1 = await chess.connect(signer1).acceptWager(wagerAddress);
			await tx1.wait();

			const timeNow = Date.now();
			const timeStamp = Math.floor(timeNow / 1000) + 86400 * 2; // plus two days

			for (let game = 0; game < numberOfGames; game++) {
				// reseting gasless data after each game
				let messageArray: any[] = [];
				let signatureArray: any[] = [];

				let playerAddress = await chess.getPlayerMove(wagerAddress);
				let startingPlayer = playerAddress === signer1.address ? delegatedSigner1 : delegatedSigner0;

				for (let i = 0; i < moves.length; i++) {
					let player;
					if (i % 2 == 0) {
						player = startingPlayer;
					} else {
						player = startingPlayer.address === delegatedSigner0.address ? delegatedSigner1 : delegatedSigner0;
					}

					const hex_move = await chess.moveToHex(moves[i]);

					const messageData = {
						wagerAddress: wagerAddress,
						gameNumber: game,
						moveNumber: i,
						move: hex_move,
						expiration: timeStamp,
					};
					const message = await gaslessGame.encodeMoveMessage(messageData);
					messageArray.push(message);

					const signature = await player._signTypedData(domain, gaslessMoveTypes, messageData);
					signatureArray.push(signature);
				}
				const delegations = [signedDelegationData0, signedDelegationData1];

				await chess.verifyGameUpdateStateDelegated(delegations, messageArray, signatureArray);
			}

			const wins = await chess.wagerStatus(wagerAddress);

			const winsPlayer0 = Number(wins.winsPlayer0);
			const winsPlayer1 = Number(wins.winsPlayer1);

			expect(winsPlayer0).to.equal(1);
			expect(winsPlayer1).to.equal(2);
		});
	});
});
