import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { coordinates_array, bitCoordinates_array } from "./constants";

describe("evm_chess Game Unit Tests", function () {
    // We define a fixture to reuse the same setup in every test.
    async function deploy() {
        const [owner, otherAccount] = await ethers.getSigners();

        const MoveVerification = await ethers.getContractFactory("MoveVerification");
        const moveVerification = await MoveVerification.deploy();

        const ChessWager = await ethers.getContractFactory("ChessWager");
        const chess = await ChessWager.deploy(moveVerification.address, owner.address, owner.address, owner.address);

        await chess.initCoordinates(coordinates_array, bitCoordinates_array);

        const initalState = "0xcbaedabc99999999000000000000000000000000000000001111111143265234";
        const initialWhite = "0x000704ff";
        const initialBlack = "0x383f3cff";

        return {
            chess,
            moveVerification,
            owner,
            otherAccount,
            initalState,
            initialWhite,
            initialBlack,
        };
    }

    describe("Functionality Tests", function () {
        it("Should get piece at position", async function () {
            const { moveVerification } = await loadFixture(deploy);

            let initalState = "0xcbaedabc99999999000000000000000000000000000000001111111143265234";
            let result = await moveVerification.pieceAtPosition(initalState, 0);

            // expect piece on h1 to be a white rook
            expect(result).to.equal(4);
        });

        it("Should get all pieces on board", async function () {
            const { chess } = await loadFixture(deploy);

            let initalState = "92127013753780222654361466179409805358231942438704711313202171559978994127412";

            let result = await chess.getBoard(initalState);

            let row = [];
            for (let i = 0; i < 64; i++) {
                row.push(result[i]);

                if ((i + 1) % 8 === 0) {
                    // console.log(row + '\n');
                    row = [];
                }
            }
        });

        it("Should print ascii board", async function () {
            const { chess } = await loadFixture(deploy);

            /// Robert Byrne - Robert James Fischer, New York 1963
            // official game moves: https://www.chessgames.com/perl/chessgame?gid=1008419
            // moves to checkmate: https://lichess.org/study/WSdWU9JC/HKJztW6i

            let gameState = "92128449317020355091629252608629158979248243942770410860708258515263854891572";

            let data = await chess.getBoard(gameState);
            console.log(data);

            let result = Object.values(data);

            let pieces = result.reverse();

            let board = "   +------------------------+\n ";

            for (let i = 0; i < 64; i++) {
                if (i % 8 === 0) {
                    let row_num = 8 - i / 8;
                    board += String(row_num) + "  ";
                }

                board += " " + pieces[i] + " ";

                if ((i + 1) % 8 === 0) {
                    board += "\n ";
                }
            }

            board += "  +------------------------+\n";
            board += "     a  b  c  d  e  f  g  h";

            console.log(board);
        });

        it("Should get move hex at position", async function () {
            const { chess } = await loadFixture(deploy);
            // 11     27
            // 1011   11011
            // 00
            // 001011 011011
            // binary: 001011011011
            // decimal: 731
            // hex: 0x2db

            // white pawn from e2 to e4
            let fromPos = "11";
            let toPos = "27";

            let move = await chess.convertToMove(fromPos, toPos);

            expect(move).to.equal(parseInt("0x2db", 16));

            // testing front end view function
            let convertedMove = await chess.convertFromMove(move);
            expect(convertedMove[0].toString()).to.equal(fromPos);
            expect(convertedMove[1].toString()).to.equal(toPos);
        });

        it("Should play a move", async function () {
            const { chess, moveVerification } = await loadFixture(deploy);

            let initalState = "0xcbaedabc99999999000000000000000000000000000000001111111143265234";

            let fromPos = "11";
            let toPos = "27";

            let move = await chess.convertToMove(fromPos, toPos);

            let playerState = "0x000704ff";
            let opponentState = "0x383f3cff";
            let currentTurnBlack = false;

            let result = await moveVerification.verifyExecuteMove(
                initalState,
                move,
                playerState,
                opponentState,
                currentTurnBlack
            );
        });

        it("Should convert move to hex move", async function () {
            const { chess } = await loadFixture(deploy);

            let hex_move = await chess.moveToHex("e2e4");

            expect(hex_move).to.equal(parseInt("0x31c", 16));
        });

        it("Should convert coordinate move to hex", async function () {
            const { chess } = await loadFixture(deploy);
            // 11     27
            // 1011   11011
            // 00
            // 001011 011011
            // binary: 001011011011
            // decimal: 731
            // hex: 0x2db

            // white pawn from e2 to e4
            let fromPos = "11";
            let toPos = "27";

            let move = await chess.convertToMove(fromPos, toPos);

            expect(move).to.equal(parseInt("0x2db", 16));
        });

        it("Should get array of hex moves from moves", async function () {
            const { chess } = await loadFixture(deploy);

            const moves = ["e2e3", "g7g5", "d1h5"];

            let hex_moves = [];

            for (let i = 0; i < moves.length; i++) {
                let hex_move = await chess.moveToHex(moves[i]);
                hex_moves.push(hex_move);
            }
            expect(moves.length == hex_moves.length);
        });

        it("Should play game in for loop", async function () {
            const { chess, moveVerification } = await loadFixture(deploy);

            /// Robert Byrne - Robert James Fischer, New York 1963
            // official game moves: https://www.chessgames.com/perl/chessgame?gid=1008419
            // moves to checkmate: https://lichess.org/study/WSdWU9JC/HKJztW6i

            /*

            const moves = 
            ['d2d4', 'g8f6', 'c2c4', 'g7g6', 'g2g3', 'c7c6', 'f1g2', 'd7d5', 'c4d5', 'c6d5', 'b1c3', 'f8g7',
            'e2e3', 'e8g8', 'g1e2', 'b8c6', 'e1g1', 'b7b6', 'b2b3', 'c8a6', 'c1a3', 'f8e8', 'd1d2', 'e7e5',
            'd4e5', 'c6e5', 'f1d1', 'e5d3', 'd2c2', 'd3f2', 'g1f2', 'f6g4', 'f2g1', 'g4e3', 'c2d2', 'e3g2',
            'g1g2', 'd5d4', 'e2d4', 'a6b7', 'g2f1', 'd8d7', 'd2f2', 'd7h3', 'f1g1', 'e8e1', 'd1e1', 'g7d4',
            'f2d4', 'h3g2'];
            
            */

            // const moves = [ 'f2f3', 'e7e5', 'g2g4', 'd8h4' ];
            const moves = ["d2d4", "f7f5", "b2b3", "f5f4", "e2e4", "f4e3"];

            let hex_moves = [];

            for (let i = 0; i < moves.length; i++) {
                let hex_move = await chess.moveToHex(moves[i]);
                hex_moves.push(hex_move);
            }
            // let hex_moves = ["0x355", "0xd2c", "0x39e", "0xedf"]
            // console.log("hex moves:", hex_moves);

            let initalState = "0xcbaedabc99999999000000000000000000000000000000001111111143265234";
            let playerState = "0x000704ff";
            let opponentState = "0x383f3cff";

            let gameStates = [];
            let whitePlayerStates = [];
            let blackPlayerStates = [];

            gameStates.push(initalState);
            whitePlayerStates.push(playerState);
            blackPlayerStates.push(opponentState);

            let blackMove = false;

            for (let i = 0; i < moves.length; i++) {
                if (blackMove == false) {
                    let tx = await moveVerification.verifyExecuteMove(
                        gameStates[i],
                        hex_moves[i],
                        whitePlayerStates[i],
                        blackPlayerStates[i],
                        blackMove
                    );
                    gameStates.push(tx[0]);
                    whitePlayerStates.push(tx[1]);
                    blackPlayerStates.push(tx[2]);
                } else {
                    let tx = await moveVerification.verifyExecuteMove(
                        gameStates[i],
                        hex_moves[i],
                        blackPlayerStates[i],
                        whitePlayerStates[i],
                        blackMove
                    );
                    gameStates.push(tx[0]);
                    whitePlayerStates.push(tx[2]);
                    blackPlayerStates.push(tx[1]);
                }

                blackMove = !blackMove;
            }
            let outcome = await moveVerification.checkGameFromStart(hex_moves);
            // black wins
            expect(outcome[0]).to.equal(0);
        });

        it("Should get outcome from checkEndgame using hex moves", async function () {
            const { moveVerification, initalState, initialWhite, initialBlack } = await loadFixture(deploy);

            let hex_moves = ["0x355", "0xd2c", "0x39e", "0xedf"];

            let outcome = await moveVerification.checkGameFromStart(hex_moves);

            expect(outcome[0]).to.equal(3);
        });

        it("Should get outcome from checkEndgame using algebraic chess notation", async function () {
            const { chess, moveVerification, initalState, initialWhite, initialBlack } = await loadFixture(deploy);

            const moves = ["e2e4", "g7g5", "b1c3", "f7f5", "d1h5"];
            // let hex_moves = ["0x314", "0xda6", "0x2db", "0xd6d", "0x0e7"];

            let hex_moves = [];

            for (let i = 0; i < moves.length; i++) {
                let hex_move = await chess.moveToHex(moves[i]);
                hex_moves.push(hex_move);
            }

            let outcome = await moveVerification.checkGameFromStart(hex_moves);

            expect(outcome[0]).to.equal(2);
        });

        it("Should get outcome from checkEndgame of stalemate using algebraic chess notation", async function () {
            const { chess, moveVerification, initalState, initialWhite, initialBlack } = await loadFixture(deploy);

            const moves = ["e2e4", "g7g5", "b1c3", "f7f5", "d1h5"];

            let hex_moves = [];

            for (let i = 0; i < moves.length; i++) {
                let hex_move: string = await chess.moveToHex(moves[i]);
                hex_moves.push(hex_move);
            }

            let gameData = await moveVerification.checkGameFromStart(hex_moves);

            let gameState = gameData[1];

            let outcome = await moveVerification.isStalemateViaInsufficientMaterial(gameState);

            // console.log(outcome);
            expect(outcome).to.equal(false);
        });

        it("Should get outcome from checkEndgame of stalemate using algebraic chess notation", async function () {
            const { chess, moveVerification, initalState, initialWhite, initialBlack } = await loadFixture(deploy);

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
            ]; //  let hex_moves = ["0x314", "0xda6", "0x2db", "0xd6d", "0x0e7"];

            let hex_moves = [];

            for (let i = 0; i < moves_stalemate.length; i++) {
                let hex_move: string = await chess.moveToHex(moves_stalemate[i]);
                hex_moves.push(hex_move);
            }

            let gameData = await moveVerification.checkGameFromStart(hex_moves);

            let gameState = gameData[1];

            let outcome = await moveVerification.isStalemateViaInsufficientMaterial(gameState);

            // console.log(outcome);
            expect(outcome).to.equal(true);
        });

        it("Should get outcome from checkEndgame using algebraic chess notation", async function () {
            const { chess, moveVerification, initalState, initialWhite, initialBlack } = await loadFixture(deploy);

            const moves = [
                "e2e4",
                "e7e5",
                "g1f3",
                "b8c6",
                "f1c4",
                "f8c5",
                "b2b4",
                "c5b4",
                "c2c3",
                "b4a5",
                "d2d4",
                "e5d4",
                "e1g1",
                "d4c3",
                "d1b3",
                "d8e7",
                "b1c3",
                "g8f6",
            ];

            let hex_moves = [];

            for (let i = 0; i < moves.length; i++) {
                let hex_move = await chess.moveToHex(moves[i]);
                hex_moves.push(hex_move);
            }

            let outcome = await moveVerification.checkGameFromStart(hex_moves);

            expect(outcome[0]).to.equal(0);
        });
    });
});
