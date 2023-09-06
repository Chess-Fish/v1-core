import { expect } from "chai";
import { ethers } from "hardhat";
import ChessArtifact from "../../artifacts/contracts/ChessWager.sol/ChessWager.json";

const coordinates = [
    ["h1", "g1", "f1", "e1", "d1", "c1", "b1", "a1"],
    ["h2", "g2", "f2", "e2", "d2", "c2", "b2", "a2"],
    ["h3", "g3", "f3", "e3", "d3", "c3", "b3", "a3"],
    ["h4", "g4", "f4", "e4", "d4", "c4", "b4", "a4"],
    ["h5", "g5", "f5", "e5", "d5", "c5", "b5", "a5"],
    ["h6", "g6", "f6", "e6", "d6", "c6", "b6", "a6"],
    ["h7", "g7", "f7", "e7", "d7", "c7", "b7", "a7"],
    ["h8", "g8", "f8", "e8", "d8", "c8", "b8", "a8"],
];

const bitCoordinates = [
    ["7", "6", "5", "4", "3", "2", "1", "0"],
    ["15", "14", "13", "12", "11", "10", "9", "8"],
    ["23", "22", "21", "20", "19", "18", "17", "16"],
    ["31", "30", "29", "28", "27", "26", "25", "24"],
    ["39", "38", "37", "36", "35", "34", "33", "32"],
    ["47", "46", "45", "44", "43", "42", "41", "40"],
    ["55", "54", "53", "52", "51", "50", "49", "48"],
    ["63", "62", "61", "60", "59", "58", "57", "56"],
];

async function main() {
    const [owner] = await ethers.getSigners();

    const chessAddress = "0x49C006B271d6D8C9AD7FcE4c2B49C62C7f340d9D"; // replace with deployed Chess contract address
    const chess = new ethers.Contract(chessAddress, ChessArtifact.abi, owner);

    const gasLimit = 500000; // Set the desired gas limit

    for (let i = 6; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            console.log("Here: ", i, j);

            let tx = await chess.initCoordinates(
                coordinates[i][j],
                bitCoordinates[i][j],
                { gasLimit } // Set the gas limit for the transaction
            );
            await tx.wait();

            let tx1 = await chess.initSquareToCoordinates(
                bitCoordinates[i][j],
                coordinates[i][j],
                { gasLimit } // Set the gas limit for the transaction
            );
            await tx1.wait();
        }
    }

    // expect(res).to.equal(bitCoordinates[7][7]);
}

main();
