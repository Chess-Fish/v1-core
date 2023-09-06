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

async function deploy() {
    const [owner, otherAccount] = await ethers.getSigners();

    const ERC20_token = await ethers.getContractFactory("Token");
    const token = await ERC20_token.deploy();
    await token.deployed();

    const ChessToken = await ethers.getContractFactory("ChessFishToken");
    const chessToken = await ChessToken.deploy();
    await chessToken.deployed();

    const MoveVerification = await ethers.getContractFactory("MoveVerification");
    const moveVerification = await MoveVerification.deploy();
    await moveVerification.deployed();

    const ChessWager = await ethers.getContractFactory("ChessWager");
    const chess = await ChessWager.deploy(moveVerification.address, chessToken.address);
    await chess.deployed();

    console.log("Deployer: ", owner.address);
    console.log("Test ERC20 token address", token.address);
    console.log("Chess Fish Token", chessToken.address);
    console.log("Move Verification address", moveVerification.address);
    console.log("Chess Contract address", chess.address);

    await chess.initCoordinates(coordinates_array, bitCoordinates_array);

    console.log("________________________");
    console.log("Initializing Game");

    // INIT GAME
    await token.connect(owner).transfer(otherAccount.address, ethers.utils.parseEther("100.0"));

    let player1 = otherAccount.address;
    let wagerToken = token.address;
    let wager = ethers.utils.parseEther("1.0");
    let maxTimePerMove = 86400;
    let numberOfGames = 3;

    await token.connect(owner).approve(chess.address, wager);

    let tx = await chess.connect(owner).createGameWager(player1, wagerToken, wager, maxTimePerMove, numberOfGames);
    await tx.wait();

    let gameAddr = await chess.userGames(owner.address, 0);
    let playerMove0 = await chess.getPlayerMove(gameAddr);

    let gameAddr0 = await chess.userGames(owner.address, 0);
    let gameAddr1 = await chess.userGames(otherAccount.address, 0);
    expect(gameAddr0).to.equal(gameAddr1);

    const moves = ["d2d4", "g8f6"];

    // approve chess contract
    await token.connect(otherAccount).approve(chess.address, wager);
    console.log("allowance", await token.allowance(otherAccount.address, chess.address));

    let tx1 = await chess.connect(otherAccount).acceptWager(gameAddr);
    await tx1.wait();

    console.log("________________________");
    console.log("Playing Game");

    for (let i = 0; i < moves.length; i++) {
        let player = null;
        if (i % 2 != 1) {
            player = otherAccount;
        } else {
            player = owner;
        }

        let hex_move = await chess.moveToHex(moves[i]);
        let tx = await chess.connect(player).playMove(gameAddr, hex_move);
        await tx.wait();

        console.log(hex_move);
    }

    // INIT GAME otherAccount
    let player = owner.address;
    let wagerToken1 = token.address;
    let wager1 = ethers.utils.parseEther("1.0");
    let maxTimePerMove1 = 86400;
    let numberOfGames1 = 3;

    await token.connect(otherAccount).approve(chess.address, wager1);

    let tx2 = await chess
        .connect(otherAccount)
        .createGameWager(player, wagerToken1, wager1, maxTimePerMove1, numberOfGames1);
    await tx2.wait();
}

async function main() {
    await deploy();
}

main();
