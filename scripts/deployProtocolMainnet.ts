import { expect } from "chai";
import { ethers } from "hardhat";
const fs = require("fs");

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

interface ContractAddresses {
    network: string;
    chainID: number;
    deployer: string;
    chessFishToken: string;
    dividendSplitter: string;
    chessNFT: string;
    moveVerification: string;
    chessWager: string;
    crowdSale: string;
    tournament: string;
    treasuryVesting: string;
}

async function deploy(): Promise<void> {
    const [deployer, owner] = await ethers.getSigners();

    // const USDC = ""
    const USDC = "0xB3B459dC93D93B538E3f9ac655553D90EB0F1739";
    const VALUE = ethers.utils.parseUnits("2", 18);
    const OWNER = owner.address;

    const ChessToken = await ethers.getContractFactory("ChessFish");
    const chessToken = await ChessToken.deploy(OWNER);
    await chessToken.deployed();
    console.log("ChessFish token contract deployed");

    const CROWDSALE = await ethers.getContractFactory("CrowdSale");
    const crowdsale = await CROWDSALE.deploy(chessToken.address, USDC, VALUE);
    const crowdSaleAmount = ethers.utils.parseEther("300000");
    await chessToken.connect(owner).transfer(crowdsale.address, crowdSaleAmount);
    console.log("CrowdSale contract deployed");

    const vestingAmount = ethers.utils.parseEther("400000");
    const timeNow = Date.now();
    const timeStamp = Math.floor(timeNow / 1000);
    const vestingBegin = timeStamp + 86400; // plus 1 day
    const vestingCliff = timeStamp + 86400 * 30; // 1 month
    const vestingEnd = timeStamp + 86400 * 365; // 1 year

    const TREASURY = await ethers.getContractFactory("TreasuryVester");
    const treasury = await TREASURY.deploy(
        chessToken.address,
        deployer.address,
        vestingAmount,
        vestingBegin,
        vestingCliff,
        vestingEnd
    );
    console.log("Treasury contract deployed");
    // END nonce 3

    await chessToken.connect(owner).transfer(treasury.address, vestingAmount);
    console.log("40% transfered to treasury");


    const SPLITTER = await ethers.getContractFactory("PaymentSplitter");
    const splitter = await SPLITTER.deploy(chessToken.address);
    await splitter.deployed();
    console.log("Dividend splitter contract deployed");

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

    const ChessTournament = await ethers.getContractFactory("ChessFishTournament");
    const tournament = await ChessTournament.deploy(chess.address, splitter.address);
    console.log("Chess Tournament contract deployed");

    await chess.addTournamentHandler(tournament.address);

    const contractAddresses: ContractAddresses = {
        network: ethers.provider._network.name,
        chainID: ethers.provider._network.chainId,
        deployer: deployer.address,
        chessFishToken: chessToken.address,
        dividendSplitter: splitter.address,
        chessNFT: chessNFT.address,
        moveVerification: moveVerification.address,
        chessWager: chess.address,
        crowdSale: crowdsale.address,
        tournament: tournament.address,
        treasuryVesting: treasury.address,
    };

    let existingAddresses: ContractAddresses[] = [];

    try {
        const data = fs.readFileSync("contractAddresses.json", "utf8");
        const parsedData = JSON.parse(data);
        existingAddresses = Array.isArray(parsedData) ? parsedData : [parsedData];
    } catch (err) {
        console.error("Error reading contractAddresses.json file:", err);
    }

    const index = existingAddresses.findIndex((addr) => addr.chainID === contractAddresses.chainID);

    if (index !== -1) {
        existingAddresses[index] = contractAddresses; // Update the existing entry
    } else {
        existingAddresses.push(contractAddresses); // Add new entry
    }

    fs.writeFileSync("contractAddresses.json", JSON.stringify(existingAddresses, null, 2));

    console.log("Network: ", contractAddresses.network);
    console.log("Deployer: ", contractAddresses.deployer);
    console.log("Chess Fish Token", contractAddresses.chessFishToken);
    console.log("dividend Splittern", contractAddresses.dividendSplitter);
    console.log("ChessNFT address", contractAddresses.chessNFT);
    console.log("Move Verification address", contractAddresses.moveVerification);
    console.log("Chess Contract address", contractAddresses.chessWager);
    console.log("CrowdSale contract", contractAddresses.crowdSale);
    console.log("Tournament contract", contractAddresses.tournament);

    await chess.initCoordinates(coordinates_array, bitCoordinates_array);
    console.log("board coodinates initialized in chess wager contract");
    await chessNFT.setChessFishAddress(chess.address);
    console.log("Chess Wager address set in ChessNFT contract");

    console.log("___________");

    console.log(
        `npx hardhat verify --network polygon-mumbai ${contractAddresses.chessWager} "${contractAddresses.moveVerification}" "${contractAddresses.chessFishToken}" "${contractAddresses.dividendSplitter}" "${contractAddresses.chessNFT}"`
    );

    console.log("___________");

    console.log(
        `npx hardhat verify --network polygon-mumbai ${contractAddresses.crowdSale} "${contractAddresses.chessFishToken}" "${USDC}" "${VALUE}"`
    );

    console.log("___________");

    console.log(
        `npx hardhat verify --network polygon-mumbai ${contractAddresses.treasuryVesting} "${contractAddresses.chessFishToken}" "${deployer.address}" "${vestingAmount}" "${vestingBegin}" "${vestingCliff}" "${vestingEnd}"`
    );

    console.log("___________");

    console.log(`npx hardhat verify --network polygon-mumbai ${contractAddresses.chessFishToken} "${owner}"`);
}

async function main(): Promise<void> {
    await deploy();
}

main();
