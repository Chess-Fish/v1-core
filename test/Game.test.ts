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
            /* 
      let gameState = result[0];
      let newPlayerState = result[1];
      let newOponentState = result[2];
      */
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

            // let outcome = await moveVerification.checkGameFromStart(hex_moves);
            // black wins
            // expect(outcome[0]).to.equal(0);

            // console.log(outcome);
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

            // let piece = await chess.pieceAtPosition(gameState, 58);
        });

        /* 
    it("Should play game iteratively", async function () {
      const { chess } = await loadFixture(deploy);
  
      const moves = ['e2e4', 'g7g5', 'b2b3', 'f7f5', 'd1h5'];

      let hex_moves = ["0x314", "0xda6", "0x2db", "0xd6d", "0x0e7"];
    
      expect(moves.length == hex_moves.length);

      let initalState = '0xcbaedabc99999999000000000000000000000000000000001111111143265234';
      let playerState = '0x000704ff';
      let opponentState = '0x383f3cff';
      let currentTurnBlack = false;
  
      let gameStates = [];
      let whitePlayerStates = [];
      let blackPlayerStates = [];

      gameStates.push(initalState);
      whitePlayerStates.push(playerState);
      blackPlayerStates.push(opponentState);

      let blackMove = false;

      const tx = await chess.verifyExecuteMove(gameStates[0], hex_moves[0], whitePlayerStates[0], blackPlayerStates[0], blackMove);
      gameStates.push(tx[0]);
      whitePlayerStates.push(tx[1]);
      blackPlayerStates.push(tx[2]);
          
      // tx1
      // black to move 
      blackMove = !blackMove;
      const tx1 = await chess.verifyExecuteMove(gameStates[1], hex_moves[1], blackPlayerStates[1], whitePlayerStates[1], blackMove);
      gameStates.push(tx1[0]);
      whitePlayerStates.push(tx1[2]);
      blackPlayerStates.push(tx1[1]);

      // tx2
      // white to move 
      blackMove = !blackMove;
      const tx2 = await chess.verifyExecuteMove(gameStates[2], hex_moves[2], whitePlayerStates[2], blackPlayerStates[2], blackMove);
      gameStates.push(tx2[0]);
      whitePlayerStates.push(tx2[1]);
      blackPlayerStates.push(tx2[2]);

      // tx3
      // black to move 
      blackMove = !blackMove;
      const tx3 = await chess.verifyExecuteMove(gameStates[3], hex_moves[3], blackPlayerStates[3], whitePlayerStates[3], blackMove);
      gameStates.push(tx3[0]);
      whitePlayerStates.push(tx3[2]);
      blackPlayerStates.push(tx3[1]);

      // tx4
      // white to move 
      blackMove = !blackMove;
      const tx4 = await chess.verifyExecuteMove(gameStates[4], hex_moves[4], whitePlayerStates[4], blackPlayerStates[4], blackMove);
      gameStates.push(tx4[0]);
      whitePlayerStates.push(tx4[1]);
      blackPlayerStates.push(tx4[2]);
  });
  */
    });
});
