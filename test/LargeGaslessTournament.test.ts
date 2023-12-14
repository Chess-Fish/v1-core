import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { coordinates_array, bitCoordinates_array } from "../scripts/constants";

describe("ChessFish Large Tournament Unit Tests", function () {
	// We define a fixture to reuse the same setup in every test.
	async function deploy() {
		const [
			deployer,
			player0,
			player1,
			player2,
			player3,
			player4,
			player5,
			player6,
			player7,
			player8,
			player9,
			player10,
			otherAccount,
		] = await ethers.getSigners();

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

		const ChessTournament = await ethers.getContractFactory("ChessFishTournament");
		const tournament = await ChessTournament.deploy(chess.address, paymentSplitter.address);

		await chess.addTournamentHandler(tournament.address);

		const amount = ethers.utils.parseEther("100");

		await token.transfer(player0.address, amount);
		await token.transfer(player1.address, amount);
		await token.transfer(player2.address, amount);
		await token.transfer(player3.address, amount);
		await token.transfer(player4.address, amount);
		await token.transfer(player4.address, amount);
		await token.transfer(player5.address, amount);
		await token.transfer(player6.address, amount);
		await token.transfer(player7.address, amount);
		await token.transfer(player8.address, amount);
		await token.transfer(player9.address, amount);
		await token.transfer(player10.address, amount);
		await token.transfer(otherAccount.address, amount);

		await token.connect(player0).approve(tournament.address, amount);
		await token.connect(player1).approve(tournament.address, amount);
		await token.connect(player2).approve(tournament.address, amount);
		await token.connect(player3).approve(tournament.address, amount);
		await token.connect(player4).approve(tournament.address, amount);
		await token.connect(player5).approve(tournament.address, amount);
		await token.connect(player6).approve(tournament.address, amount);
		await token.connect(player7).approve(tournament.address, amount);
		await token.connect(player8).approve(tournament.address, amount);
		await token.connect(player9).approve(tournament.address, amount);
		await token.connect(player10).approve(tournament.address, amount);

		await chess.initCoordinates(coordinates_array, bitCoordinates_array);
		await chessNFT.setChessFishAddress(chess.address);

		const players = [
			player0,
			player1,
			player2,
			player3,
			player4,
			player5,
			player6,
			player7,
			player8,
			player9,
			player10,
		];

		return {
			chess,
			gaslessGame,
			chessFishToken,
			paymentSplitter,
			chessNFT,
			tournament,
			players,
			otherAccount,
			token,
		};
	}

	describe("Tournament Unit Tests", function () {
		it("Should start gasless tournament and play games 11 players", async function () {
			this.timeout(100000); // sets the timeout to 100 seconds

			const { chess, gaslessGame, tournament, players, token } = await loadFixture(deploy);

			let numberOfPlayers = 25;
			let wagerToken = token.address;
			let wagerAmount = ethers.utils.parseEther("10.0");
			let numberOfGames = 3;
			let timeLimit = 172800;

			let tx = await tournament
				.connect(players[0])
				.createTournament(numberOfPlayers, numberOfGames, wagerToken, wagerAmount, timeLimit);

			await tx.wait();

			const tournamentNonce = await tournament.tournamentNonce();

			const playersSansPlayer0 = [...players]; // Create a copy of the players array
			playersSansPlayer0.shift(); // Remove the first player

			await Promise.all(
				playersSansPlayer0.map(async (player) => {
					return await tournament.connect(player).joinTournament(tournamentNonce - 1);
				})
			);

			const balance0 = await token.balanceOf(tournament.address);
			expect(balance0).to.equal(wagerAmount.mul(11));

			const playerAddresses = await tournament.getTournamentPlayers(tournamentNonce - 1);
			expect(playerAddresses.length).to.equal(11);

			await ethers.provider.send("evm_increaseTime", [86400]);
			await ethers.provider.send("evm_mine");

			await tournament.startTournament(tournamentNonce - 1);

			const wagerAddresses = await tournament.getTournamentWagerAddresses(tournamentNonce - 1);
			expect(wagerAddresses.length).to.equal(55); // 11 players

			const moves = ["f2f3", "e7e5", "g2g4", "d8h4"]; // fool's mate // this test only works if this is used since the logic is based on black winning
			// const moves = ["e2e4", "f7f6", "d2d4", "g7g5", "d1h5"]; // reversed fool's mate

			for (let i = 0; i < wagerAddresses.length; i++) {
				for (let j = 0; j < numberOfGames; j++) {
					let messageArray: any[] = [];
					let messageHashesArray: any[] = [];
					let signatureArray: any[] = [];

					let data = await chess.gameWagers(wagerAddresses[i]);

					let player0 = await ethers.getSigner(data.player0);
					let player1 = await ethers.getSigner(data.player1);

					let playerAddress = await chess.getPlayerMove(wagerAddresses[i]);
					let startingPlayer = playerAddress === player0.address ? player0 : player1; // Determine starting player based on address

					const timeNow = Date.now();
					const timeStamp = Math.floor(timeNow / 1000) + 86400 * 2; // plus two days

					for (let k = 0; k < moves.length; k++) {
						let player;
						if (k % 2 == 0) {
							player = startingPlayer; // First move of the game by starting player
						} else {
							player = startingPlayer.address === player1.address ? player0 : player1; // Alternate for subsequent moves using address for comparison
						}
						console.log(`Playing game ${i} of ${wagerAddresses.length}`);

						let hex_move = await chess.moveToHex(moves[k]);

						const message = await gaslessGame.generateMoveMessage(wagerAddresses[i], hex_move, k, timeStamp);
						messageArray.push(message);

						const messageHash = await gaslessGame.getMessageHash(wagerAddresses[i], hex_move, k, timeStamp);
						messageHashesArray.push(messageHash);

						const signature = await player.signMessage(ethers.utils.arrayify(messageHash));
						signatureArray.push(signature);
					}
					await chess.verifyGameUpdateState(messageArray, signatureArray);
				}
			}
			await ethers.provider.send("evm_increaseTime", [86400]);
			await ethers.provider.send("evm_mine");

			const player0bal0 = await token.balanceOf(players[0].address);
			const player1bal0 = await token.balanceOf(players[1].address);
			const player2bal0 = await token.balanceOf(players[2].address);
			const player3bal0 = await token.balanceOf(players[3].address);
			const player4bal0 = await token.balanceOf(players[4].address);
			const player5bal0 = await token.balanceOf(players[5].address);
			const player6bal0 = await token.balanceOf(players[6].address);
			const player7bal0 = await token.balanceOf(players[7].address);
			const player8bal0 = await token.balanceOf(players[8].address);
			const player9bal0 = await token.balanceOf(players[9].address);
			const player10bal0 = await token.balanceOf(players[10].address);

			await tournament.payoutTournament(tournamentNonce - 1);

			const player0bal1 = await token.balanceOf(players[0].address);
			const player1bal1 = await token.balanceOf(players[1].address);
			const player2bal1 = await token.balanceOf(players[2].address);
			const player3bal1 = await token.balanceOf(players[3].address);
			const player4bal1 = await token.balanceOf(players[4].address);
			const player5bal1 = await token.balanceOf(players[5].address);
			const player6bal1 = await token.balanceOf(players[6].address);
			const player7bal1 = await token.balanceOf(players[7].address);
			const player8bal1 = await token.balanceOf(players[8].address);
			const player9bal1 = await token.balanceOf(players[9].address);
			const player10bal1 = await token.balanceOf(players[10].address);

			const pool = wagerAmount * 11;
			const expectedPayoutPlayer0 = pool * 0.365;
			const expectedPayoutPlayer1 = pool * 0.23;
			const expectedPayoutPlayer2 = pool * 0.135;
			const expectedPayoutPlayer3 = pool * 0.1;
			const expectedPayoutPlayer4 = pool * 0.05;
			const expectedPayoutPlayer5 = pool * 0.025;
			const expectedPayoutPlayer6 = pool * 0.025;
			const expectedPayoutPlayer7 = pool * 0.0;

			// winners
			expect(player0bal1.sub(player0bal0).toString()).to.equal(expectedPayoutPlayer0.toString());
			expect(player1bal1.sub(player1bal0).toString()).to.equal(expectedPayoutPlayer1.toString());
			expect(player2bal1.sub(player2bal0).toString()).to.equal(expectedPayoutPlayer2.toString());
			expect(player3bal1.sub(player3bal0).toString()).to.equal(expectedPayoutPlayer3.toString());
			expect(player4bal1.sub(player4bal0).toString()).to.equal(expectedPayoutPlayer4.toString());
			expect(player5bal1.sub(player5bal0).toString()).to.equal(expectedPayoutPlayer5.toString());
			expect(player6bal1.sub(player6bal0).toString()).to.equal(expectedPayoutPlayer6.toString());

			// payout zero
			expect(player7bal1.sub(player7bal0).toString()).to.equal(expectedPayoutPlayer7.toString());
			expect(player8bal1.sub(player8bal0).toString()).to.equal(expectedPayoutPlayer7.toString());
			expect(player9bal1.sub(player9bal0).toString()).to.equal(expectedPayoutPlayer7.toString());
			expect(player10bal1.sub(player10bal0).toString()).to.equal(expectedPayoutPlayer7.toString());

			// wins
			const player0wins = await tournament.tournamentWins(tournamentNonce - 1, players[0].address);
			const player1wins = await tournament.tournamentWins(tournamentNonce - 1, players[1].address);
			const player2wins = await tournament.tournamentWins(tournamentNonce - 1, players[2].address);
			const player3wins = await tournament.tournamentWins(tournamentNonce - 1, players[3].address);
			const player4wins = await tournament.tournamentWins(tournamentNonce - 1, players[4].address);
			const player5wins = await tournament.tournamentWins(tournamentNonce - 1, players[5].address);
			const player6wins = await tournament.tournamentWins(tournamentNonce - 1, players[6].address);
			const player7wins = await tournament.tournamentWins(tournamentNonce - 1, players[7].address);
			const player8wins = await tournament.tournamentWins(tournamentNonce - 1, players[8].address);
			const player9wins = await tournament.tournamentWins(tournamentNonce - 1, players[9].address);
			const player10wins = await tournament.tournamentWins(tournamentNonce - 1, players[10].address);

			// Tournament of 3 games
			expect(player0wins).to.equal(20);
			expect(player1wins).to.equal(19);
			expect(player2wins).to.equal(18);
			expect(player3wins).to.equal(17);
			expect(player4wins).to.equal(16);
			expect(player5wins).to.equal(15);
			expect(player6wins).to.equal(14);
			expect(player7wins).to.equal(13);
			expect(player8wins).to.equal(12);
			expect(player9wins).to.equal(11);
			expect(player10wins).to.equal(10);

			const data = await tournament.viewTournamentScore(tournamentNonce - 1);

			expect(data[1][0]).to.equal(player0wins);
			expect(data[1][1]).to.equal(player1wins);
			expect(data[1][2]).to.equal(player2wins);
			expect(data[1][3]).to.equal(player3wins);
			expect(data[1][4]).to.equal(player4wins);
			expect(data[1][5]).to.equal(player5wins);
			expect(data[1][6]).to.equal(player6wins);
			expect(data[1][7]).to.equal(player7wins);
			expect(data[1][8]).to.equal(player8wins);
			expect(data[1][9]).to.equal(player9wins);
			expect(data[1][10]).to.equal(player10wins);

			let isComplete = (await tournament.tournaments(tournamentNonce - 1)).isComplete;
			expect(isComplete).to.equal(true);
		});
	});
});
