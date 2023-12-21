import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { coordinates_array, bitCoordinates_array } from "../scripts/constants";

describe("ChessFish Wager Unit Tests", function () {
	// We define a fixture to reuse the same setup in every test.
	async function deploy() {
		const [deployer, otherAccount] = await ethers.getSigners();

		const ERC20_token = await ethers.getContractFactory("Token");
		const token = await ERC20_token.deploy();

		const ChessFishToken = await ethers.getContractFactory("ChessFish");
		const chessFishToken = await ChessFishToken.deploy(deployer.address);
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
		await token.transfer(otherAccount.address, amount);

		await chess.initCoordinates(coordinates_array, bitCoordinates_array);
		await chessNFT.setChessFishAddress(chess.address);

		// typed signature data
		const domain = {
			chainId: 1, // replace with the chain ID on frontend
			name: "ChessFish", // Contract Name
			verifyingContract: gaslessGame.address, // for testing
			version: "1", // version
		};

		const types = {
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
			deployer,
			otherAccount,
			token,
			domain,
			types,
		};
	}

	describe("Gasless Game Verification Unit Tests", function () {
		it("Should play game", async function () {
			const { chess, gaslessGame, deployer, otherAccount, token, domain, types } = await loadFixture(deploy);

			let player1 = otherAccount.address;
			let wagerToken = token.address;
			let wager = ethers.utils.parseEther("1.0");
			let maxTimePerMove = 86400;
			let numberOfGames = 3;

			await token.approve(chess.address, wager);

			let tx = await chess.connect(deployer).createGameWager(player1, wagerToken, wager, maxTimePerMove, numberOfGames);
			await tx.wait();

			let wagerAddress = await chess.userGames(deployer.address, 0);
			let wagerAddress1 = await chess.userGames(otherAccount.address, 0);
			expect(wagerAddress).to.equal(wagerAddress1);

			// const moves = ["f2f3", "e7e5", "g2g4", "d8h4"]; // fool's mate
			const moves = ["e2e4", "f7f6", "d2d4", "g7g5", "d1h5"]; // reversed fool's mate

			// approve chess contract
			await token.connect(otherAccount).approve(chess.address, wager);

			// accept wager terms
			let tx1 = await chess.connect(otherAccount).acceptWager(wagerAddress);
			await tx1.wait();

			const timeNow = Date.now();
			const timeStamp = Math.floor(timeNow / 1000) + 86400 * 2; // plus two days

			//// #### FIRST GAME #### ////
			for (let game = 0; game < numberOfGames; game++) {
				// reseting gasless data after each game
				let messageArray: any[] = [];
				let signatureArray: any[] = [];

				let playerAddress = await chess.getPlayerMove(wagerAddress);
				let startingPlayer = playerAddress === otherAccount.address ? otherAccount : deployer;

				for (let i = 0; i < moves.length; i++) {
					let player;
					if (i % 2 == 0) {
						player = startingPlayer;
					} else {
						player = startingPlayer.address === otherAccount.address ? deployer : otherAccount;
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

					const signature = await player._signTypedData(domain, types, messageData);
					signatureArray.push(signature);

					const recoveredAddress = ethers.utils.verifyTypedData(
						domain,
						types,
						messageData,
						signature
					  );

					expect(recoveredAddress.toLowerCase()).to.equal(player.address.toLowerCase());
				}
				await chess.verifyGameUpdateState(messageArray, signatureArray);
			}

			const wins = await chess.wagerStatus(wagerAddress);

			const winsPlayer0 = Number(wins.winsPlayer0);
			const winsPlayer1 = Number(wins.winsPlayer1);

			expect(winsPlayer0).to.equal(1);
			expect(winsPlayer1).to.equal(2);

			const wagerAddresses = await chess.getAllUserGames(player1);
			const gameLength = await chess.getGameLength(wagerAddresses[0]);
			expect(gameLength).to.equal(3);
		});
	});
});
