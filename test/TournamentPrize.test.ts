import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { coordinates_array, bitCoordinates_array } from "../scripts/constants";

describe("evm_chess Tournament Unit Tests", function () {
	// We define a fixture to reuse the same setup in every test.
	async function deploy() {
		const [deployer, player0, player1, player2, player3, player4, otherAccount] = await ethers.getSigners();

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

		const ChessWager = await ethers.getContractFactory("ChessWager");
		const chess = await ChessWager.deploy(
			moveVerification.address,
			chessFishToken.address,
			paymentSplitter.address,
			chessNFT.address
		);

		const ChessTournament = await ethers.getContractFactory("ChessFishTournament");
		const tournament = await ChessTournament.deploy(chess.address, paymentSplitter.address);

		await chess.addTournamentHandler(tournament.address);

		const amount = ethers.utils.parseEther("100");

		await token.transfer(player0.address, amount);
		await token.transfer(player1.address, amount);
		await token.transfer(player2.address, amount);
		await token.transfer(player3.address, amount);
		await token.transfer(player4.address, amount);
		await token.transfer(otherAccount.address, amount);

		await chess.initCoordinates(coordinates_array, bitCoordinates_array);
		await chessNFT.setChessFishAddress(chess.address);

		const initalState = "0xcbaedabc99999999000000000000000000000000000000001111111143265234";
		const initialWhite = "0x000704ff";
		const initialBlack = "0x383f3cff";

		return {
			chess,
			chessFishToken,
			paymentSplitter,
			chessNFT,
			tournament,
			deployer,
			player0,
			player1,
			player2,
			player3,
			player4,
			otherAccount,
			initalState,
			initialWhite,
			initialBlack,
			token,
		};
	}

	describe("Tournament Prize Unit Tests", function () {
		it("Should start tournament, add prize,  and play games 5 players", async function () {
			const { chess, tournament, deployer, player0, player1, player2, player3, player4, token } = await loadFixture(
				deploy
			);

			let numberOfPlayers = 25;
			let wagerToken = token.address;
			let wagerAmount = ethers.utils.parseEther("10.0");
			let numberOfGames = 1;
			let timeLimit = 172800;

			await token.connect(player0).approve(tournament.address, wagerAmount);

			let tx = await tournament
				.connect(player0)
				.createTournament(numberOfPlayers, numberOfGames, wagerToken, wagerAmount, timeLimit);

			await tx.wait();

			const tournamentNonce = await tournament.tournamentNonce();

			await token.connect(player1).approve(tournament.address, wagerAmount);
			await token.connect(player2).approve(tournament.address, wagerAmount);
			await token.connect(player3).approve(tournament.address, wagerAmount);
			await token.connect(player4).approve(tournament.address, wagerAmount);

			await tournament.connect(player1).joinTournament(tournamentNonce - 1);
			await tournament.connect(player2).joinTournament(tournamentNonce - 1);
			await tournament.connect(player3).joinTournament(tournamentNonce - 1);
			await tournament.connect(player4).joinTournament(tournamentNonce - 1);

			const balance0 = await token.balanceOf(tournament.address);
			expect(balance0).to.equal(wagerAmount.mul(5));

			const players = await tournament.getTournamentPlayers(tournamentNonce - 1);
			expect(players.length).to.equal(5);

			await ethers.provider.send("evm_increaseTime", [86400]);
			await ethers.provider.send("evm_mine");

			await tournament.startTournament(tournamentNonce - 1);

			const depositAmount = ethers.utils.parseEther("100.0");

			await token.connect(deployer).approve(tournament.address, depositAmount);
			await tournament.connect(deployer).depositToTournament(tournamentNonce - 1, depositAmount);

			const wagerAddresses = await tournament.getTournamentWagerAddresses(tournamentNonce - 1);

			const moves = ["f2f3", "e7e5", "g2g4", "d8h4"];

			//// #### FIRST GAME #### ////
			// player1 = white
			// player2 = black
			for (let i = 0; i < moves.length; i++) {
				let playerAddress = await chess.getPlayerMove(wagerAddresses[0]);
				let player = await ethers.getSigner(playerAddress);
				let hex_move = await chess.moveToHex(moves[i]);
				await chess.connect(player).playMove(wagerAddresses[0], hex_move);
			}
			//// #### SECOND GAME #### ////
			for (let i = 0; i < moves.length; i++) {
				let playerAddress = await chess.getPlayerMove(wagerAddresses[1]);
				let player = await ethers.getSigner(playerAddress);
				let hex_move = await chess.moveToHex(moves[i]);
				await chess.connect(player).playMove(wagerAddresses[1], hex_move);
			}
			//// #### THIRD GAME #### ////
			for (let i = 0; i < moves.length; i++) {
				let playerAddress = await chess.getPlayerMove(wagerAddresses[2]);
				let player = await ethers.getSigner(playerAddress);
				let hex_move = await chess.moveToHex(moves[i]);
				await chess.connect(player).playMove(wagerAddresses[2], hex_move);
			}
			//// #### GAME 4 #### ////
			for (let i = 0; i < moves.length; i++) {
				let playerAddress = await chess.getPlayerMove(wagerAddresses[3]);
				let player = await ethers.getSigner(playerAddress);
				let hex_move = await chess.moveToHex(moves[i]);
				await chess.connect(player).playMove(wagerAddresses[3], hex_move);
			}
			//// #### GAME 5 #### ////
			for (let i = 0; i < moves.length; i++) {
				let playerAddress = await chess.getPlayerMove(wagerAddresses[4]);
				let player = await ethers.getSigner(playerAddress);
				let hex_move = await chess.moveToHex(moves[i]);
				await chess.connect(player).playMove(wagerAddresses[4], hex_move);
			}
			//// #### GAME 6 #### ////
			for (let i = 0; i < moves.length; i++) {
				let playerAddress = await chess.getPlayerMove(wagerAddresses[5]);
				let player = await ethers.getSigner(playerAddress);
				let hex_move = await chess.moveToHex(moves[i]);
				await chess.connect(player).playMove(wagerAddresses[5], hex_move);
			}
			//// #### GAME 7 #### ////
			for (let i = 0; i < moves.length; i++) {
				let playerAddress = await chess.getPlayerMove(wagerAddresses[6]);
				let player = await ethers.getSigner(playerAddress);
				let hex_move = await chess.moveToHex(moves[i]);
				await chess.connect(player).playMove(wagerAddresses[6], hex_move);
			}
			//// #### GAME 8 #### ////
			for (let i = 0; i < moves.length; i++) {
				let playerAddress = await chess.getPlayerMove(wagerAddresses[7]);
				let player = await ethers.getSigner(playerAddress);
				let hex_move = await chess.moveToHex(moves[i]);
				await chess.connect(player).playMove(wagerAddresses[7], hex_move);
			}
			//// #### GAME 9 #### ////
			for (let i = 0; i < moves.length; i++) {
				let playerAddress = await chess.getPlayerMove(wagerAddresses[8]);
				let player = await ethers.getSigner(playerAddress);
				let hex_move = await chess.moveToHex(moves[i]);
				await chess.connect(player).playMove(wagerAddresses[8], hex_move);
			}
			//// #### GAME 10 #### ////
			for (let i = 0; i < moves.length; i++) {
				let playerAddress = await chess.getPlayerMove(wagerAddresses[9]);
				let player = await ethers.getSigner(playerAddress);
				let hex_move = await chess.moveToHex(moves[i]);
				await chess.connect(player).playMove(wagerAddresses[9], hex_move);
			}

			await ethers.provider.send("evm_increaseTime", [86400]);
			await ethers.provider.send("evm_mine");

			const player0bal0 = await token.balanceOf(player0.address);
			const player1bal0 = await token.balanceOf(player1.address);
			const player2bal0 = await token.balanceOf(player2.address);
			const player3bal0 = await token.balanceOf(player3.address);
			const player4bal0 = await token.balanceOf(player4.address);

			await tournament.payoutTournament(tournamentNonce - 1);

			const player0bal1 = await token.balanceOf(player0.address);
			const player1bal1 = await token.balanceOf(player1.address);
			const player2bal1 = await token.balanceOf(player2.address);
			const player3bal1 = await token.balanceOf(player3.address);
			const player4bal1 = await token.balanceOf(player4.address);

/* 			console.log("PAYOUTS");
			console.log(ethers.utils.formatEther(player0bal1.sub(player0bal0)));
			console.log(ethers.utils.formatEther(player1bal1.sub(player1bal0)));
			console.log(ethers.utils.formatEther(player2bal1.sub(player2bal0)));
			console.log(ethers.utils.formatEther(player3bal1.sub(player3bal0)));
			console.log(ethers.utils.formatEther(player4bal1.sub(player4bal0)));

			console.log(depositAmount);
			console.log(wagerAmount);
			console.log(wagerAmount.mul(5)); */

			const pool = wagerAmount.mul(5).add(depositAmount);

			const expectedPayoutPlayer0 = pool * 0.33;
			const expectedPayoutPlayer1 = pool * 0.29;
			const expectedPayoutPlayer2 = pool * 0.18;
			const expectedPayoutPlayer3 = pool * 0.13;
			const expectedPayoutPlayer4 = pool * 0.0;

			expect(player0bal1.sub(player0bal0).toString()).to.equal(expectedPayoutPlayer0.toString());
			expect(player1bal1.sub(player1bal0).toString()).to.equal(expectedPayoutPlayer1.toString());
			expect(player2bal1.sub(player2bal0).toString()).to.equal(expectedPayoutPlayer2.toString());
			expect(player3bal1.sub(player3bal0).toString()).to.equal(expectedPayoutPlayer3.toString());
			expect(player4bal1.sub(player4bal0).toString()).to.equal(expectedPayoutPlayer4.toString());

			const player0wins = await tournament.tournamentWins(tournamentNonce - 1, player0.address);
			const player1wins = await tournament.tournamentWins(tournamentNonce - 1, player1.address);
			const player2wins = await tournament.tournamentWins(tournamentNonce - 1, player2.address);
			const player3wins = await tournament.tournamentWins(tournamentNonce - 1, player3.address);
			const player4wins = await tournament.tournamentWins(tournamentNonce - 1, player4.address);

			// console.log(player0wins, player1wins, player2wins, player3wins, player4wins);

			expect(player0wins).to.equal(4);
			expect(player1wins).to.equal(3);
			expect(player2wins).to.equal(2);
			expect(player3wins).to.equal(1);
			expect(player4wins).to.equal(0);

			const data = await tournament.viewTournamentScore(tournamentNonce - 1);

			expect(data[1][0]).to.equal(player0wins);
			expect(data[1][1]).to.equal(player1wins);
			expect(data[1][2]).to.equal(player2wins);
			expect(data[1][3]).to.equal(player3wins);
			expect(data[1][4]).to.equal(player4wins);

			let isComplete = (await tournament.tournaments(tournamentNonce - 1)).isComplete;
			expect(isComplete).to.equal(true);
		});
	});
});
