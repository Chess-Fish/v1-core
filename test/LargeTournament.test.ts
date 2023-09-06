import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const coordinates_array = [
    "h1",
    "g1",
    "f1",
    "e1",
    "d1",
    "c1",
    "b1",
    "a1",
    "h2",
    "g2",
    "f2",
    "e2",
    "d2",
    "c2",
    "b2",
    "a2",
    "h3",
    "g3",
    "f3",
    "e3",
    "d3",
    "c3",
    "b3",
    "a3",
    "h4",
    "g4",
    "f4",
    "e4",
    "d4",
    "c4",
    "b4",
    "a4",
    "h5",
    "g5",
    "f5",
    "e5",
    "d5",
    "c5",
    "b5",
    "a5",
    "h6",
    "g6",
    "f6",
    "e6",
    "d6",
    "c6",
    "b6",
    "a6",
    "h7",
    "g7",
    "f7",
    "e7",
    "d7",
    "c7",
    "b7",
    "a7",
    "h8",
    "g8",
    "f8",
    "e8",
    "d8",
    "c8",
    "b8",
    "a8",
];
const bitCoordinates_array = [
    "7",
    "6",
    "5",
    "4",
    "3",
    "2",
    "1",
    "0",
    "15",
    "14",
    "13",
    "12",
    "11",
    "10",
    "9",
    "8",
    "23",
    "22",
    "21",
    "20",
    "19",
    "18",
    "17",
    "16",
    "31",
    "30",
    "29",
    "28",
    "27",
    "26",
    "25",
    "24",
    "39",
    "38",
    "37",
    "36",
    "35",
    "34",
    "33",
    "32",
    "47",
    "46",
    "45",
    "44",
    "43",
    "42",
    "41",
    "40",
    "55",
    "54",
    "53",
    "52",
    "51",
    "50",
    "49",
    "48",
    "63",
    "62",
    "61",
    "60",
    "59",
    "58",
    "57",
    "56",
];

describe("evm_chess Wager Unit Tests", function () {
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

        const ChessFishToken = await ethers.getContractFactory("ChessFishToken");
        const chessFishToken = await ChessFishToken.deploy();
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
        it("Should start tournament and play games 11 players", async function () {
            const { chess, tournament, players, token } = await loadFixture(deploy);

            let numberOfPlayers = 25;
            let wagerToken = token.address;
            let wagerAmount = ethers.utils.parseEther("10.0");
            let numberOfGames = 1;
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

            console.log(wagerAddresses);

            const moves = ["f2f3", "e7e5", "g2g4", "d8h4"];

            for (let i = 0; i < wagerAddresses.length; i++) {
                for (let j = 0; j < moves.length; j++) {
                    console.log(`Playing game ${i} of ${wagerAddresses.length}`);
                    let playerAddress = await chess.getPlayerMove(wagerAddresses[i]);
                    let player = await ethers.getSigner(playerAddress);
                    let hex_move = await chess.moveToHex(moves[j]);
                    await chess.connect(player).playMove(wagerAddresses[i], hex_move);
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

            console.log("PAYOUTS");
            console.log(ethers.utils.formatEther(player0bal1.sub(player0bal0)));
            console.log(ethers.utils.formatEther(player1bal1.sub(player1bal0)));
            console.log(ethers.utils.formatEther(player2bal1.sub(player2bal0)));
            console.log(ethers.utils.formatEther(player3bal1.sub(player3bal0)));
            console.log(ethers.utils.formatEther(player4bal1.sub(player4bal0)));
            console.log(ethers.utils.formatEther(player5bal1.sub(player5bal0)));
            console.log(ethers.utils.formatEther(player6bal1.sub(player6bal0)));

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

            expect(player0wins).to.equal(10);
            expect(player1wins).to.equal(9);
            expect(player2wins).to.equal(8);
            expect(player3wins).to.equal(7);
            expect(player4wins).to.equal(6);
            expect(player5wins).to.equal(5);
            expect(player6wins).to.equal(4);
            expect(player7wins).to.equal(3);
            expect(player8wins).to.equal(2);
            expect(player9wins).to.equal(1);
            expect(player10wins).to.equal(0);

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
