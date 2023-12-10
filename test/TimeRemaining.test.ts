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

    describe("Wager Time Remaining Unit Tests", function () {
        it("Should create game", async function () {
            const { chess, deployer, otherAccount, token } = await loadFixture(deploy);

            console.log("Deployer", deployer.address);
            console.log("Other Account", otherAccount.address);

            let player1 = otherAccount.address;
            let wagerToken = token.address;
            let wager = ethers.utils.parseEther("1.0");
            let timeLimit = 86400;
            let numberOfGames = 3;

            await token.approve(chess.address, wager);

            let tx = await chess
                .connect(deployer)
                .createGameWager(player1, wagerToken, wager, timeLimit, numberOfGames);
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

            let timeRemaining = await chess.checkTimeRemaining(gameAddr);
            expect(timeRemaining[0]).to.equal(timeLimit);

            // first move
            let hex_move1 = await chess.moveToHex("e2e4");
            console.log("hex move", hex_move1);

            // player that accepts wager conditions plays first move
            let tx2 = await chess.connect(otherAccount).playMove(gameAddr, hex_move1);

            let playerMove2 = await chess.getPlayerMove(gameAddr);
            console.log("player turn:", playerMove2);
        });
    });
});
