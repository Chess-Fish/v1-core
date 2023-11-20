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

describe("evm_chess gasless stalemate unit test", function () {
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

    describe("Gasless Game Verification Unit Tests", function () {
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
            let gameAddr0 = await chess.userGames(deployer.address, 0);
            let gameAddr1 = await chess.userGames(otherAccount.address, 0);
            expect(gameAddr0).to.equal(gameAddr1);

            // const moves = ["f2f3", "e7e5", "g2g4", "d8h4"]; // fool's mate
            const moves_checkmate = ["e2e4", "f7f6", "d2d4", "g7g5", "d1h5"]; // reversed fool's mate

            // stalemate 2 kings remaining
            const moves_stalemate = [
                "d2d3",
                "d7d6",
                "e2e4",
                "c7c5",
                "a2a3",
                "a7a6",
                "g1f3",
                "g8f6",
                "g2g3",
                "h7h6",
                "b1c3",
                "d6d5",
                "e4d5",
                "f6d5",
                "c3d5",
                "d8d5",
                "b2b4",
                "c5b4",
                "a3b4",
                "d5f3",
                "d1f3",
                "e7e6",
                "f1g2",
                "b8c6",
                "f3c6",
                "b7c6",
                "g2c6",
                "e8e7",
                "c6a8",
                "c8b7",
                "c1h6",
                "h8h6",
                "a8b7",
                "h6h2",
                "h1h2",
                "g7g6",
                "b7a6",
                "e7f6",
                "h2h6",
                "f8h6",
                "a6c4",
                "h6g7",
                "c4e6",
                "f7e6",
                "f2f4",
                "f6f5",
                "g3g4",
                "f5g4",
                "c2c4",
                "g7a1",
                "e1f2",
                "g4f4",
                "d3d4",
                "g6g5",
                "f2e2",
                "e6e5",
                "e2d3",
                "a1d4",
                "c4c5",
                "d4c5",
                "b4c5",
                "f4f5",
                "d3e3",
                "f5e6",
                "e3f3",
                "e6d5",
                "f3g4",
                "d5c5",
                "g4g5",
                "c5b4",
                "g5f5",
                "e5e4",
                "f5e4",
            ];

            // approve chess contract
            await token.connect(otherAccount).approve(chess.address, wager);
            console.log("allowance", await token.allowance(otherAccount.address, chess.address));

            // accept wager terms
            let tx1 = await chess.connect(otherAccount).acceptWager(gameAddr);
            await tx1.wait();

            const timeNow = Date.now();
            const timeStamp = Math.floor(timeNow / 1000) + 86400 * 2; // plus two days

            //// #### FIRST GAME #### ////
            for (let game = 0; game < numberOfGames; game++) {
                // reseting gasless data after each game
                let messageArray: any[] = [];
                let messageHashesArray: any[] = [];
                let signatureArray: any[] = [];

                let playerAddress = await chess.getPlayerMove(gameAddr);
                let startingPlayer = playerAddress === otherAccount.address ? otherAccount : deployer; // Determine starting player based on address

                let moves;

                if (game === 2) {
                    moves = moves_stalemate;
                } else {
                    moves = moves_checkmate;
                }

                for (let i = 0; i < moves.length; i++) {
                    let player;
                    if (i % 2 == 0) {
                        player = startingPlayer; // First move of the game by starting player
                    } else {
                        player = startingPlayer.address === otherAccount.address ? deployer : otherAccount; // Alternate for subsequent moves using address for comparison
                    }

                    const hex_move = await chess.moveToHex(moves[i]);

                    const message = await chess.generateMoveMessage(gameAddr, hex_move, i, timeStamp);
                    messageArray.push(message);

                    const messageHash = await chess.getMessageHash(gameAddr, hex_move, i, timeStamp);
                    messageHashesArray.push(messageHash);

                    const signature = await player.signMessage(ethers.utils.arrayify(messageHash));
                    signatureArray.push(signature);
                }
                let data = await chess.verifyGameView(messageArray, signatureArray);
                console.log("OUTCOME", data.outcome);

                await chess.verifyGameUpdateState(messageArray, signatureArray);
                console.log("PASS");

                if (data.outcome === 0) {
                    let moves = await chess.getGameMoves(gameAddr, 1);
                    console.log(moves);

                    // let result = await chess.updateWagerStateInsufficientMaterial(gameAddr);
                    // expect(result).to.equal(true);
                }
            }

            const wins = await chess.wagerStatus(gameAddr);

            const winsPlayer0 = Number(wins.winsPlayer0);
            const winsPlayer1 = Number(wins.winsPlayer1);

            console.log("Wins player0", winsPlayer0);
            console.log("Wins player1", winsPlayer1);

            const games = await chess.getGameLength(gameAddr);

            console.log(games);

            expect(winsPlayer0).to.equal(2);
            expect(winsPlayer1).to.equal(2);

            const wagerData = await chess.gameWagers(gameAddr);
            expect(wagerData.numberOfGames).to.equal(4);

            const gameLength = await chess.getGameLength(gameAddr);
            console.log(gameLength);
        });
    });
});
