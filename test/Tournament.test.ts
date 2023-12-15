import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { coordinates_array, bitCoordinates_array } from "../scripts/constants";

describe("evm_chess Tournament Unit Tests", function () {
	// We define a fixture to reuse the same setup in every test.
	async function deploy() {
		const [player0, player1, player2, player3, player4, player5, otherAccount] = await ethers.getSigners();

		const ERC20_token = await ethers.getContractFactory("Token");
		const token = await ERC20_token.deploy();

		const ChessFishToken = await ethers.getContractFactory("ChessFish");
		const chessFishToken = await ChessFishToken.deploy(player0.address);
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
		await token.transfer(player5.address, amount);
		await token.transfer(otherAccount.address, amount);

		await chess.initCoordinates(coordinates_array, bitCoordinates_array);
		await chessNFT.setChessFishAddress(chess.address);

		const initalState = "0xcbaedabc99999999000000000000000000000000000000001111111143265234";
		const initialWhite = "0x000704ff";
		const initialBlack = "0x383f3cff";

		console.log("BALANCE INIT", ethers.utils.formatEther(await token.balanceOf(player0.address)));

		return {
			chess,
			chessFishToken,
			paymentSplitter,
			chessNFT,
			tournament,
			player0,
			player1,
			player2,
			player3,
			player4,
			player5,
			otherAccount,
			initalState,
			initialWhite,
			initialBlack,
			token,
		};
	}

	describe("Wager Unit Tests", function () {
		it("Should create tournament with custom parameters", async function () {
			const { tournament, player0, token } = await loadFixture(deploy);

			let numberOfPlayers = 3;
			let wagerToken = token.address;
			let wagerAmount = ethers.utils.parseEther("10.0");
			let numberOfGames = 1;
			let timeLimit = 86400;

			await token.connect(player0).approve(tournament.address, wagerAmount);

			let tx = await tournament
				.connect(player0)
				.createTournament(numberOfPlayers, numberOfGames, wagerToken, wagerAmount, timeLimit);

			await tx.wait();

			const balance0 = await token.balanceOf(tournament.address);

			expect(balance0).to.equal(wagerAmount);
		});

		it("Should join tournament", async function () {
			const { tournament, player0, player1, token } = await loadFixture(deploy);

			let numberOfPlayers = 3;
			let wagerToken = token.address;
			let wagerAmount = ethers.utils.parseEther("10.0");
			let numberOfGames = 1;
			let timeLimit = 86400;

			await token.connect(player0).approve(tournament.address, wagerAmount);

			let tx = await tournament
				.connect(player0)
				.createTournament(numberOfPlayers, numberOfGames, wagerToken, wagerAmount, timeLimit);

			await tx.wait();

			await token.connect(player1).approve(tournament.address, wagerAmount);
			await tournament.connect(player1).joinTournament(0);

			const balance0 = await token.balanceOf(tournament.address);

			expect(balance0).to.equal(wagerAmount.mul(2));

			const tournamentNonce = await tournament.tournamentNonce();
			const players = await tournament.getTournamentPlayers(tournamentNonce - 1);

			expect(players.length).to.equal(2);
		});

		it("Should start tournament", async function () {
			const { tournament, player0, player1, player2, token } = await loadFixture(deploy);

			let numberOfPlayers = 3;
			let wagerToken = token.address;
			let wagerAmount = ethers.utils.parseEther("10.0");
			let numberOfGames = 1;
			let timeLimit = 86400;

			await token.connect(player0).approve(tournament.address, wagerAmount);

			let tx = await tournament
				.connect(player0)
				.createTournament(numberOfPlayers, numberOfGames, wagerToken, wagerAmount, timeLimit);

			await tx.wait();

			const tournamentNonce = await tournament.tournamentNonce();

			await token.connect(player1).approve(tournament.address, wagerAmount);
			await token.connect(player2).approve(tournament.address, wagerAmount);

			await tournament.connect(player1).joinTournament(tournamentNonce - 1);
			await tournament.connect(player2).joinTournament(tournamentNonce - 1);

			const balance0 = await token.balanceOf(tournament.address);
			expect(balance0).to.equal(wagerAmount.mul(3));

			const players = await tournament.getTournamentPlayers(tournamentNonce - 1);
			expect(players.length).to.equal(3);

			await tournament.startTournament(tournamentNonce - 1);
		});

		it("Should start tournament and play games", async function () {
			const { chess, tournament, chessNFT, player0, player1, player2, token } = await loadFixture(deploy);

			let numberOfPlayers = 3;
			let wagerToken = token.address;
			let wagerAmount = ethers.utils.parseEther("10.0");
			let numberOfGames = 1;
			let timeLimit = 86400;

			await token.connect(player0).approve(tournament.address, wagerAmount);

			let tx = await tournament
				.connect(player0)
				.createTournament(numberOfPlayers, numberOfGames, wagerToken, wagerAmount, timeLimit);

			await tx.wait();

			const tournamentNonce = await tournament.tournamentNonce();

			await token.connect(player1).approve(tournament.address, wagerAmount);
			await token.connect(player2).approve(tournament.address, wagerAmount);

			await tournament.connect(player1).joinTournament(tournamentNonce - 1);
			await tournament.connect(player2).joinTournament(tournamentNonce - 1);

			const balance0 = await token.balanceOf(tournament.address);
			expect(balance0).to.equal(wagerAmount.mul(3));

			const players = await tournament.getTournamentPlayers(tournamentNonce - 1);
			expect(players.length).to.equal(3);

			await tournament.startTournament(tournamentNonce - 1);

			const wagerAddresses = await tournament.getTournamentWagerAddresses(tournamentNonce - 1);

			console.log(player0.address);
			console.log(player1.address);
			console.log(player2.address);

			const moves = ["f2f3", "e7e5", "g2g4", "d8h4"];

			//// #### FIRST GAME #### ////
			// player1 = white
			// player2 = black
			for (let i = 0; i < moves.length; i++) {
				let player = null;
				if (i % 2 != 1) {
					player = player1;
				} else {
					player = player0;
				}
				let hex_move = await chess.moveToHex(moves[i]);
				await chess.connect(player).playMove(wagerAddresses[0], hex_move);
			}

			//// #### SECOND GAME #### ////
			for (let i = 0; i < moves.length; i++) {
				let player = null;
				if (i % 2 != 1) {
					player = player2;
				} else {
					player = player0;
				}
				let hex_move = await chess.moveToHex(moves[i]);
				await chess.connect(player).playMove(wagerAddresses[1], hex_move);
			}

			//// #### THIRD GAME #### ////
			for (let i = 0; i < moves.length; i++) {
				let player = null;
				if (i % 2 != 1) {
					player = player2;
				} else {
					player = player1;
				}
				let hex_move = await chess.moveToHex(moves[i]);
				await chess.connect(player).playMove(wagerAddresses[2], hex_move);
			}

			await ethers.provider.send("evm_increaseTime", [86400]);
			await ethers.provider.send("evm_mine");

			const player0bal0 = BigInt(await token.balanceOf(player0.address));
			const player1bal0 = BigInt(await token.balanceOf(player1.address));
			const player2bal0 = BigInt(await token.balanceOf(player2.address));

			await tournament.payoutTournament(tournamentNonce - 1);

			const player0bal1 = BigInt(await token.balanceOf(player0.address));
			const player1bal1 = BigInt(await token.balanceOf(player1.address));
			const player2bal1 = BigInt(await token.balanceOf(player2.address));

			// Pool calculation in wei
			const pool = BigInt(wagerAmount) * 3n;
			const expectedPayoutPlayer0 = (pool * 56n) / 100n;
			const expectedPayoutPlayer1 = (pool * 37n) / 100n;
			const expectedPayoutPlayer2 = 0n;

			expect(player0bal1 - player0bal0).to.equal(expectedPayoutPlayer0);
			expect(player1bal1 - player1bal0).to.equal(expectedPayoutPlayer1);
			expect(player2bal1 - player2bal0).to.equal(expectedPayoutPlayer2);

			const player0wins = await tournament.tournamentWins(tournamentNonce - 1, player0.address);
			const player1wins = await tournament.tournamentWins(tournamentNonce - 1, player1.address);
			const player2wins = await tournament.tournamentWins(tournamentNonce - 1, player2.address);

			console.log(player0wins, player1wins, player2wins);

			expect(player0wins).to.equal(2);
			expect(player1wins).to.equal(1);
			expect(player2wins).to.equal(0);

			const data = await tournament.viewTournamentScore(tournamentNonce - 1);

			expect(data[1][0]).to.equal(player0wins);
			expect(data[1][1]).to.equal(player1wins);
			expect(data[1][2]).to.equal(player2wins);

			let isComplete = (await tournament.tournaments(tournamentNonce - 1)).isComplete;
			expect(isComplete).to.equal(true);

			for (let i = 0; i < wagerAddresses.length; i++) {
				await chess.mintWinnerNFT(wagerAddresses[i]);
			}

			let bal0 = await chessNFT.balanceOf(player0.address);
			let bal1 = await chessNFT.balanceOf(player1.address);
			let bal2 = await chessNFT.balanceOf(player2.address);

			expect(bal0).to.equal(2);
			expect(bal1).to.equal(1);
			expect(bal2).to.equal(0);
		});

		it("Should start tournament and play games 5 players", async function () {
			const { chess, tournament, player0, player1, player2, player3, player4, token } = await loadFixture(deploy);

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

			const wagerAddresses = await tournament.getTournamentWagerAddresses(tournamentNonce - 1);

			console.log(player0.address);
			console.log(player1.address);
			console.log(player2.address);
			console.log(player3.address);
			console.log(player4.address);

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

			console.log("PAYOUTS");
			console.log(ethers.utils.formatEther(player0bal1.sub(player0bal0)));
			console.log(ethers.utils.formatEther(player1bal1.sub(player1bal0)));
			console.log(ethers.utils.formatEther(player2bal1.sub(player2bal0)));
			console.log(ethers.utils.formatEther(player3bal1.sub(player3bal0)));
			console.log(ethers.utils.formatEther(player4bal1.sub(player4bal0)));

			const pool = wagerAmount * 5;
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

			console.log(player0wins, player1wins, player2wins, player3wins, player4wins);

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
		it("Should start authenticated tournament and play games between 5 players", async function () {
			const { chess, tournament, player0, player1, player2, player3, player4, player5, token } = await loadFixture(deploy);

			let numberOfPlayers = 5;
			let wagerToken = token.address;
			let wagerAmount = ethers.utils.parseEther("10.0");
			let numberOfGames = 1;
			let timeLimit = 172800;

			await token.connect(player0).approve(tournament.address, wagerAmount);

			let specificPlayers = [player1.address, player2.address, player3.address, player4.address, player5.address];
			let shouldJoin = false;	

			console.log(specificPlayers);

			let tx = await tournament
				.connect(player0)
				.createTournamentWithSpecificPlayers(
					numberOfPlayers, 
					specificPlayers, 
					numberOfGames, 
					wagerToken, 
					wagerAmount, 
					timeLimit, 
					shouldJoin);

			await tx.wait();

			const tournamentNonce = await tournament.tournamentNonce();

			await token.connect(player1).approve(tournament.address, wagerAmount);
			await token.connect(player2).approve(tournament.address, wagerAmount);
			await token.connect(player3).approve(tournament.address, wagerAmount);
			await token.connect(player4).approve(tournament.address, wagerAmount);
			await token.connect(player5).approve(tournament.address, wagerAmount);

			await tournament.connect(player1).joinTournament(tournamentNonce - 1);
			await tournament.connect(player2).joinTournament(tournamentNonce - 1);
			await tournament.connect(player3).joinTournament(tournamentNonce - 1);
			await tournament.connect(player4).joinTournament(tournamentNonce - 1);
			await tournament.connect(player5).joinTournament(tournamentNonce - 1);

			const balance0 = await token.balanceOf(tournament.address);
			expect(balance0).to.equal(wagerAmount.mul(5));

			const players = await tournament.getTournamentPlayers(tournamentNonce - 1);
			expect(players.length).to.equal(5);

			await ethers.provider.send("evm_increaseTime", [86400]);
			await ethers.provider.send("evm_mine");

			await tournament.startTournament(tournamentNonce - 1);

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

			const player0bal0 = await token.balanceOf(player1.address);
			const player1bal0 = await token.balanceOf(player2.address);
			const player2bal0 = await token.balanceOf(player3.address);
			const player3bal0 = await token.balanceOf(player4.address);
			const player4bal0 = await token.balanceOf(player5.address);

			await tournament.payoutTournament(tournamentNonce - 1);

			const player0bal1 = await token.balanceOf(player1.address);
			const player1bal1 = await token.balanceOf(player2.address);
			const player2bal1 = await token.balanceOf(player3.address);
			const player3bal1 = await token.balanceOf(player4.address);
			const player4bal1 = await token.balanceOf(player5.address);

			const pool = wagerAmount * 5;
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

			const player0wins = await tournament.tournamentWins(tournamentNonce - 1, player1.address);
			const player1wins = await tournament.tournamentWins(tournamentNonce - 1, player2.address);
			const player2wins = await tournament.tournamentWins(tournamentNonce - 1, player3.address);
			const player3wins = await tournament.tournamentWins(tournamentNonce - 1, player4.address);
			const player4wins = await tournament.tournamentWins(tournamentNonce - 1, player5.address);

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

		it("Should start authenticated tournament and play games between 5 players", async function () {
			const { chess, tournament, player0, player1, player2, player3, player4, token } = await loadFixture(deploy);

			let numberOfPlayers = 5;
			let wagerToken = token.address;
			let wagerAmount = ethers.utils.parseEther("10.0");
			let numberOfGames = 1;
			let timeLimit = 172800;

			await token.connect(player0).approve(tournament.address, wagerAmount);

			let specificPlayers = [player0.address, player1.address, player2.address, player3.address, player4.address];
			let shouldJoin = true;	

			console.log(specificPlayers);

			let tx = await tournament
				.connect(player0)
				.createTournamentWithSpecificPlayers(
					numberOfPlayers, 
					specificPlayers, 
					numberOfGames, 
					wagerToken, 
					wagerAmount, 
					timeLimit, 
					shouldJoin);

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

			const pool = wagerAmount * 5;
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



		it("Should exit tournament", async function () {
			const { tournament, player0, player1, otherAccount, token } = await loadFixture(deploy);

			let numberOfPlayers = 3;
			let wagerToken = token.address;
			let wagerAmount = ethers.utils.parseEther("10.0");
			let numberOfGames = 1;
			let timeLimit = 86400;

			await token.connect(player0).approve(tournament.address, wagerAmount);

			let tx = await tournament
				.connect(player0)
				.createTournament(numberOfPlayers, numberOfGames, wagerToken, wagerAmount, timeLimit);

			await tx.wait();

			await token.connect(player1).approve(tournament.address, wagerAmount);
			await tournament.connect(player1).joinTournament(0);

			const balance0 = await token.balanceOf(tournament.address);

			expect(balance0).to.equal(wagerAmount.mul(2));

			const tournamentNonce = await tournament.tournamentNonce();
			const players = await tournament.getTournamentPlayers(tournamentNonce - 1);

			expect(players.length).to.equal(2);

			await tournament.connect(player1).exitTournament(tournamentNonce - 1);

			await expect(tournament.connect(otherAccount).exitTournament(tournamentNonce - 1)).to.be.revertedWith(
				"msg.sender not in tournament"
			);

			const players1 = await tournament.getTournamentPlayers(tournamentNonce - 1);
			expect(players1.length).to.equal(1);

			const balance1 = await token.balanceOf(tournament.address);
			expect(balance1).to.equal(wagerAmount);
		});
	});
});
