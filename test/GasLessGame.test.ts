import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { coordinates_array, bitCoordinates_array } from "./constants";

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

        const initalState = "0xcbaedabc99999999000000000000000000000000000000001111111143265234";
        const initialWhite = "0x000704ff";
        const initialBlack = "0x383f3cff";

        return {
            chess,
            gaslessGame,
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
            const { chess, gaslessGame, deployer, otherAccount, token } =
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
            const moves = ["e2e4", "f7f6", "d2d4", "g7g5", "d1h5"]; // reversed fool's mate

            // approve chess contract
            await token.connect(otherAccount).approve(chess.address, wager);

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
                let startingPlayer = playerAddress === otherAccount.address ? otherAccount : deployer;

                for (let i = 0; i < moves.length; i++) {
                    let player;
                    if (i % 2 == 0) {
                        player = startingPlayer;
                    } else {
                        player = startingPlayer.address === otherAccount.address ? deployer : otherAccount;
                    }

                    const hex_move = await chess.moveToHex(moves[i]);

                    const message = await gaslessGame.generateMoveMessage(gameAddr, hex_move, i, timeStamp);
                    messageArray.push(message);

                    const messageHash = await gaslessGame.getMessageHash(gameAddr, hex_move, i, timeStamp);
                    messageHashesArray.push(messageHash);

                    const signature = await player.signMessage(ethers.utils.arrayify(messageHash));
                    signatureArray.push(signature);
                }
                await chess.verifyGameUpdateState(messageArray, signatureArray);
            }

            const wins = await chess.wagerStatus(gameAddr);

            const winsPlayer0 = Number(wins.winsPlayer0);
            const winsPlayer1 = Number(wins.winsPlayer1);

            console.log("Wins player0", winsPlayer0);
            console.log("Wins player1", winsPlayer1);

            expect(winsPlayer0).to.equal(1);
            expect(winsPlayer1).to.equal(2);

            const wagerAddresses = await chess.getAllUserGames(player1);
            console.log(wagerAddresses);

            const gameLength = await chess.getGameLength(gameAddr);
            console.log(gameLength);
        });
    });
});
