import { ethers } from "hardhat";
const fs = require("fs");

interface ContractAddresses {
    network: string;
    chainID: number;
    owner: string;
    token: string;
    chessToken: string;
    moveVerification: string;
    chess: string;
}

async function runInitCoordinates(): Promise<void> {
    const [deployer, otherAccount] = await ethers.getSigners();

    let existingAddresses: ContractAddresses[] = [];
    try {
        const data = fs.readFileSync("contractAddresses.json", "utf8");
        const parsedData = JSON.parse(data);
        existingAddresses = Array.isArray(parsedData) ? parsedData : [parsedData];
    } catch (err) {
        console.error("Error reading contractAddresses.json file:", err);
        return;
    }

    const contractAddresses = existingAddresses.find((addr) => addr.network === "maticmum");

    if (!contractAddresses) {
        console.error("Could not find contract addresses for the 'unknown' network");
        return;
    }

    const ChessWager = await ethers.getContractFactory("ChessWager");
    const chess = await ChessWager.attach(contractAddresses.chess);

    console.log("Network: ", contractAddresses.network);
    console.log("Owner: ", contractAddresses.owner);
    console.log("Test ERC20 token address", contractAddresses.token);
    console.log("Chess Fish Token", contractAddresses.chessToken);
    console.log("Move Verification address", contractAddresses.moveVerification);
    console.log("Chess Contract address", contractAddresses.chess);

    const ERC20Token = await ethers.getContractFactory("ERC20");
    const token = await ERC20Token.attach(contractAddresses.token);

    console.log("balance other account", await token.balanceOf(otherAccount.address));

    // transfer tokens to other account
    let tx1 = await token.connect(deployer).transfer(otherAccount.address, ethers.utils.parseEther("1000.0"));
    await tx1.wait();

    // wager params
    let wagerToken = contractAddresses.token;
    let wager = ethers.utils.parseEther("1.0");
    let maxTimePerMove = 86400;
    let numberOfGames = 3;

    // approve tokens
    let tx2 = await token.approve(chess.address, wager);
    await tx2.wait();

    // send tx
    let tx3 = await chess
        .connect(deployer)
        .createGameWager(otherAccount.address, wagerToken, wager, maxTimePerMove, numberOfGames);
    await tx3.wait();

    // let gameAddr = await chess.userGames(deployer.address, 0);

    let gameAddrs = await chess.getAllUserGames(deployer.address);

    let gameAddr = gameAddrs[gameAddrs.length - 1];

    console.log("Game Address:", gameAddr);

    // approve chess contract
    let tx4 = await token.connect(otherAccount).approve(chess.address, ethers.utils.parseEther("1000.0"));
    await tx4.wait();
    let allowance = await token.allowance(otherAccount.address, chess.address);

    if (allowance.lt(wager)) {
        console.error(`Not enough allowance: got ${allowance.toString()}, but expected at least ${wager.toString()}`);
        return;
    }

    console.log("allowance", allowance.toString());

    // accept wager terms
    let tx5 = await chess.connect(otherAccount).acceptWager(gameAddr);
    await tx5.wait();

    // fastest moves to checkmate
    const moves = ["f2f3", "e7e5", "g2g4", "d8h4"];

    //// #### FIRST GAME #### ////
    for (let i = 0; i < moves.length; i++) {
        console.log("LOOP", i);

        // let player = null;
        if (i % 2 != 1) {
            var player = otherAccount;
        } else {
            var player = deployer;
        }
        let hex_move = await chess.moveToHex(moves[i]);
        let moveTx = await chess.connect(player).playMove(gameAddr, hex_move, {
            gasLimit: 1000000,
        });
        await moveTx.wait();
        console.log(hex_move);
    }

    const wins = await chess.wagerStatus(gameAddr);

    const winsPlayer0 = Number(wins.winsPlayer0);
    const winsPlayer1 = Number(wins.winsPlayer1);

    console.log("Wins player0", winsPlayer0);
    console.log("Wins player1", winsPlayer1);
}

async function main(): Promise<void> {
    await runInitCoordinates();
}

main();
