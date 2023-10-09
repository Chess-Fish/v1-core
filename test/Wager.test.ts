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

        const ChessWager = await ethers.getContractFactory("ChessWager");
        const chess = await ChessWager.deploy(
            moveVerification.address,
            chessFishToken.address,
            paymentSplitter.address,
            chessNFT.address
        );

        const amount = ethers.utils.parseEther("100");
        const tx = await token.transfer(otherAccount.address, amount);

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
            deployer,
            otherAccount,
            initalState,
            initialWhite,
            initialBlack,
            token,
        };
    }

    describe("Wager Unit Tests", function () {
        it("Should create wager", async function () {
            const { chess, deployer, otherAccount, token } = await loadFixture(deploy);

            console.log("Deployer", deployer.address);
            console.log("Other Account", otherAccount.address);
            console.log("token address", token.address);

            const balance = await token.balanceOf(deployer.address);
            console.log(balance);

            let player1 = otherAccount.address;
            let wagerToken = token.address;
            let wager = ethers.utils.parseEther("1.0");
            let maxTimePerMove = 86400;
            let numberOfGames = 3;

            await token.approve(chess.address, wager);

            let tx = await chess
                .connect(deployer)
                .createGameWager(player1, wagerToken, wager, maxTimePerMove, numberOfGames);
            await tx.wait();

            const balance0 = await token.balanceOf(chess.address);
            console.log("balance of chess contract", balance0);

            // let games = await chess.userGames(deployer.address);
            // console.log(games);
        });

        it("Should create game", async function () {
            const { chess, deployer, otherAccount, token } = await loadFixture(deploy);

            console.log("Deployer", deployer.address);
            console.log("Other Account", otherAccount.address);

            let player1 = otherAccount.address;
            let wagerToken = token.address;
            let wager = ethers.utils.parseEther("1.0");
            let maxTimePerMove = 86400;
            let numberOfGames = 3;

            await token.approve(chess.address, wager);

            let tx = await chess
                .connect(deployer)
                .createGameWager(player1, wagerToken, wager, maxTimePerMove, numberOfGames);
            await tx.wait();

            let gameAddr = await chess.userGames(deployer.address, 0);
            let playerMove0 = await chess.getPlayerMove(gameAddr);
            console.log(playerMove0);

            let gameAddr0 = await chess.userGames(deployer.address, 0);
            let gameAddr1 = await chess.userGames(otherAccount.address, 0);
            expect(gameAddr0).to.equal(gameAddr1);

            // approve chess contract
            await token.connect(otherAccount).approve(chess.address, wager);

            // accept wager
            let tx1 = await chess.connect(otherAccount).acceptWager(gameAddr);
            await tx1.wait();

            let playerMove1 = await chess.getPlayerMove(gameAddr);
            console.log("player turn:", playerMove1);

            // first move
            let hex_move1 = await chess.moveToHex("e2e4");
            console.log("hex move", hex_move1);

            // player that accepts wager conditions plays first move
            let tx2 = await chess.connect(otherAccount).playMove(gameAddr, hex_move1);

            let playerMove2 = await chess.getPlayerMove(gameAddr);
            console.log("player turn:", playerMove2);
        });

        it("Should play game", async function () {
            const { chess, chessFishToken, paymentSplitter, deployer, otherAccount, token, chessNFT } =
                await loadFixture(deploy);

            let player1 = otherAccount.address;
            let wagerToken = token.address;
            let wager = ethers.utils.parseEther("1.0");
            let maxTimePerMove = 86400;
            let numberOfGames = 3;

            await token.approve(chess.address, wager);

            let tx = await chess
                .connect(deployer)
                .createGameWager(player1, wagerToken, wager, maxTimePerMove, numberOfGames);
            await tx.wait();

            let gameAddr = await chess.userGames(deployer.address, 0);
            // let playerMove0 = await chess.getPlayerMove(gameAddr);

            let gameAddr0 = await chess.userGames(deployer.address, 0);
            let gameAddr1 = await chess.userGames(otherAccount.address, 0);
            expect(gameAddr0).to.equal(gameAddr1);

            const moves = ["f2f3", "e7e5", "g2g4", "d8h4"];

            // approve chess contract
            await token.connect(otherAccount).approve(chess.address, wager);
            console.log("allowance", await token.allowance(otherAccount.address, chess.address));

            // accept wager terms
            let tx1 = await chess.connect(otherAccount).acceptWager(gameAddr);
            await tx1.wait();

            //// #### FIRST GAME #### ////
            for (let i = 0; i < moves.length; i++) {
                let player = null;
                if (i % 2 != 1) {
                    player = otherAccount;
                } else {
                    player = deployer;
                }

                let hex_move = await chess.moveToHex(moves[i]);
                await chess.connect(player).playMove(gameAddr, hex_move);

                console.log(hex_move);
            }

            // let game_status = await chess.getGameStatus(gameAddr);
            // 0 = inconclusive
            // 1 = draw
            // 2 = white win
            // 3 = black win

            const wins = await chess.wagerStatus(gameAddr);

            const winsPlayer0 = Number(wins.winsPlayer0);
            const winsPlayer1 = Number(wins.winsPlayer1);

            console.log("Wins player0", winsPlayer0);
            console.log("Wins player1", winsPlayer1);

            expect(winsPlayer0).to.equal(1);
            expect(winsPlayer1).to.equal(0);

            const wagerAddresses = await chess.getAllUserGames(player1);
            console.log(wagerAddresses);

            const gameLength = await chess.getGameLength(gameAddr);
            console.log(gameLength);

            // #### SECOND GAME ####
            for (let i = 0; i < moves.length; i++) {
                let player = null;
                if (i % 2 != 1) {
                    player = deployer;
                } else {
                    player = otherAccount;
                }

                let hex_move = await chess.moveToHex(moves[i]);
                console.log(hex_move);
                let tx = await chess.connect(player).playMove(gameAddr, hex_move);

                //console.log(hex_move);
            }

            const wins1 = await chess.wagerStatus(gameAddr);
            const winsPlayer01 = Number(wins1.winsPlayer0);
            const winsPlayer11 = Number(wins1.winsPlayer1);

            console.log("Wins player0", winsPlayer01);
            console.log("Wins player1", winsPlayer11);

            expect(winsPlayer01).to.equal(1);
            expect(winsPlayer11).to.equal(1);

            const timeRemaining = await chess.checkTimeRemaining(gameAddr);
            console.log("TIME REMAINING", timeRemaining[0], timeRemaining[1]);

            const gameData = await chess.gameWagers(gameAddr);
            const gameLength1 = await chess.getGameLength(gameAddr);
            expect(gameData.numberOfGames).to.equal(3);
            expect(gameLength1).to.equal(2);

            /// ### THIRD GAME ####
            for (let i = 0; i < moves.length; i++) {
                let player = null;
                if (i % 2 != 1) {
                    player = otherAccount;
                } else {
                    player = deployer;
                }
                let hex_move = await chess.moveToHex(moves[i]);
                console.log(hex_move);
                let tx = await chess.connect(player).playMove(gameAddr, hex_move);
            }

            const gameData1 = await chess.gameWagers(gameAddr);
            const gameLength2 = await chess.getGameLength(gameAddr);
            expect(gameData1.numberOfGames).to.equal(gameLength2);

            const wins2 = await chess.wagerStatus(gameAddr);
            const winsPlayer02 = Number(wins2.winsPlayer0);
            const winsPlayer12 = Number(wins2.winsPlayer1);

            console.log("Wins player0", winsPlayer02);
            console.log("Wins player1", winsPlayer12);

            expect(winsPlayer02).to.equal(2);
            expect(winsPlayer12).to.equal(1);

            const balance0 = await token.balanceOf(deployer.address);
            await chess.payoutWager(gameAddr);
            const balance1 = await token.balanceOf(deployer.address);

            console.log(Number(balance1.sub(balance0)));

            const wagerPayout = balance1.sub(balance0);

            const chessTokenBalance = await token.balanceOf(paymentSplitter.address);
            console.log(Number(chessTokenBalance));

            console.log(Number(wager) * 2 * 0.94);

            expect(Number(wagerPayout)).to.equal(Number(wager) * 2 * 0.95);

            const NFTcount = await chessNFT.balanceOf(deployer.address);
            expect(NFTcount).to.equal(1);

            const numberOfWagers = await chess.getAllWagersCount();
            expect(numberOfWagers).to.equal(1);
        });

        it("Should test player pool functionality", async function () {
            const { chess, deployer, otherAccount, token } = await loadFixture(deploy);

            let wagerToken = token.address;
            let wager = ethers.utils.parseEther("1.0");
            let maxTimePerMove = 86400;
            let numberOfGames = 3;

            await token.approve(chess.address, wager);

            let tx = await chess
                .connect(deployer)
                .createGameWager(
                    "0x0000000000000000000000000000000000000000",
                    wagerToken,
                    wager,
                    maxTimePerMove,
                    numberOfGames
                );
            await tx.wait();

            let gameAddr = await chess.userGames(deployer.address, 0);

            // approve chess contract
            await token.connect(otherAccount).approve(chess.address, wager);
            console.log("allowance", await token.allowance(otherAccount.address, chess.address));

            let tx1 = await chess.connect(otherAccount).acceptWager(gameAddr);
            await tx1.wait();

            let gameAddr0 = await chess.userGames(deployer.address, 0);
            let gameAddr1 = await chess.userGames(otherAccount.address, 0);
            expect(gameAddr0).to.equal(gameAddr1);

            const moves = ["f2f3", "e7e5", "g2g4", "d8h4"];

            //// #### FIRST GAME #### ////
            for (let i = 0; i < moves.length; i++) {
                let player = null;
                if (i % 2 != 1) {
                    player = otherAccount;
                } else {
                    player = deployer;
                }
                let hex_move = await chess.moveToHex(moves[i]);
                await chess.connect(player).playMove(gameAddr, hex_move);
                console.log(hex_move);
            }

            const gameMovesContract = await chess.getGameMoves(gameAddr, 0);
            const gameMoves: string[] = [];

            for (let i = 0; i < moves.length; i++) {
                const move = await chess.hexToMove(Number(gameMovesContract[0][i]));
                gameMoves.push(move);
            }
            expect(gameMoves).to.deep.equal(moves);

            const numberOfWagers = await chess.getAllWagersCount();
            expect(numberOfWagers).to.equal(1);
        });

        it("Should test revert on wrong user calling accept wager", async function () {
            const { chess, deployer, otherAccount, token } = await loadFixture(deploy);

            let player1 = otherAccount.address;
            let wagerToken = token.address;
            let wager = ethers.utils.parseEther("0");
            let maxTimePerMove = 86400;
            let numberOfGames = 3;

            await token.approve(chess.address, wager);

            let tx = await chess
                .connect(deployer)
                .createGameWager(player1, wagerToken, wager, maxTimePerMove, numberOfGames);
            await tx.wait();

            let gameAddr = await chess.userGames(deployer.address, 0);

            // approve chess contract
            await token.connect(otherAccount).approve(chess.address, wager);
            console.log("allowance", await token.allowance(otherAccount.address, chess.address));

            const [_deployer, _otherAccount, account3] = await ethers.getSigners();

            let promise = chess.connect(account3).acceptWager(gameAddr);

            await expect(promise).to.be.revertedWith("msg.sender != player1");

            const numberOfWagers = await chess.getAllWagersCount();
            expect(numberOfWagers).to.equal(1);
        });
    });
});
