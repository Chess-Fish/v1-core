import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import fs from "fs";

import { Chess } from "chess.js";
import { splitSignature } from "ethers/lib/utils";

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

describe("evm_chess Game Unit Tests", function () {
    // We define a fixture to reuse the same setup in every test.
    async function deploy() {
        const [deployer, otherAccount] = await ethers.getSigners();

        const ERC20_token = await ethers.getContractFactory("Token");
        const token = await ERC20_token.deploy();
        await token.deployed();
        console.log("Test Token contract deployed");

        const ChessToken = await ethers.getContractFactory("ChessFish");
        const chessToken = await ChessToken.deploy(deployer.address);
        await chessToken.deployed();
        console.log("ChessFish token contract deployed");

        const SPLITTER = await ethers.getContractFactory("PaymentSplitter");
        const splitter = await SPLITTER.deploy(chessToken.address);
        await splitter.deployed();
        console.log("dividend splitter contract deployed");

        const ChessNFT = await ethers.getContractFactory("ChessFishNFT");
        const chessNFT = await ChessNFT.deploy();
        await chessNFT.deployed();
        console.log("ChessNFT contract deployed");

        const MoveVerification = await ethers.getContractFactory("MoveVerification");
        const moveVerification = await MoveVerification.deploy();
        await moveVerification.deployed();
        console.log("Move verification contract deployed");

        const ChessWager = await ethers.getContractFactory("ChessWager");
        const chess = await ChessWager.deploy(
            moveVerification.address,
            chessToken.address,
            splitter.address,
            chessNFT.address
        );
        await chess.deployed();
        console.log("Chess Wager contract deployed");

        const amount = ethers.utils.parseEther("100");
        const tx = await token.transfer(otherAccount.address, amount);

        await chess.initCoordinates(coordinates_array, bitCoordinates_array);
        await chessNFT.setChessFishAddress(chess.address);

        const initalState = "0xcbaedabc99999999000000000000000000000000000000001111111143265234";
        const initialWhite = "0x000704ff";
        const initialBlack = "0x383f3cff";

        return { chess, moveVerification };
    }

    describe("Functionality Tests", function () {
        let games;
        try {
            const data = fs.readFileSync("output_moves.json", "utf8");
            games = JSON.parse(data);
        } catch (err) {
            console.error("Error reading file:", err);
            return;
        }

        games.forEach((game, index) => {
            it(`Should get outcome from checkEndgame using algebraic chess notation for game ${
                index + 1
            }`, async function () {
                const { chess, moveVerification } = await loadFixture(deploy);

                const chessInstance = new Chess();

                const moves = game.moves;

                let hex_moves = [];

                for (let i = 0; i < moves.length; i++) {
                    let fromSquare = moves[i].substring(0, 2);
                    let toSquare = moves[i].substring(2);

                    try {
                        chessInstance.move({
                            from: fromSquare,
                            to: toSquare,
                            promotion: "q",
                        });
                    } catch (error) {
                        console.log(fromSquare + toSquare);
                        console.log(error);
                        break;
                    }

                    let hex_move = await chess.moveToHex(moves[i]);
                    hex_moves.push(hex_move);
                }

                let outcome = await moveVerification.checkGameFromStart(hex_moves);

                // 0 = inconclusive
                // 1 = draw
                // 2 = white win
                // 3 = black win

                // not checking for draws only stalemates
                let winner;
                if (chessInstance.isCheckmate()) {
                    winner = chessInstance.turn() === "w" ? 3 : 2;

                    let winnerColor = chessInstance.turn() === "w" ? "Black" : "White";
                    console.log(`CHECKMATE ${winnerColor} won the game`);
                } else if (chessInstance.isStalemate()) {
                    console.log("DRAW");
                    winner = 1;
                } else {
                    winner = 0;
                }

                // if this fails it means that there was a draw
                expect(outcome[0]).to.equal(winner);

                chessInstance.reset();
            });
        });
    });
});
