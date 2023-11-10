import { expect } from "chai";
import { ethers } from "hardhat";
const fs = require("fs");

interface ContractAddresses {
    network: string;
    chainID: number;
    owner: string;
    chessFishToken: string;
    treasuryVesting: string;
}

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function deploy(): Promise<void> {
    const [deployer, owner] = await ethers.getSigners();

    const GAS_LIMIT = 5000000; // Adjust this value based on your contract's complexity
    const options = {
        gasLimit: GAS_LIMIT,
    };

    // 1) SET USDC VALUE
    // 2) SET RECIEVER ADDRESS
    // 3) CONFIRM VALUE AMOUNT
    const USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
    const VALUE = ethers.utils.parseUnits("2", 18);
    const OWNER = owner.address;

    const ChessToken = await ethers.getContractFactory("ChessFish");
    const chessToken = await ChessToken.deploy(OWNER, options);
    await chessToken.deployTransaction.wait(); // Wait for confirmation
    console.log("ChessFish token contract deployed");

    console.log("waiting 20 seconds");
    await delay(20000);
    console.log("starting");

    const vestingAmount = ethers.utils.parseEther("100000");
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
        vestingEnd,
        options
    );
    await treasury.deployTransaction.wait(); // Wait for confirmation
    console.log("Treasury contract deployed");
    // nonce 3

    // const tx1 = await chessToken.connect(owner).transfer(treasury.address, vestingAmount, options);
    // await tx1.wait();
    // console.log("40% transfered to treasury");

    const contractAddresses: ContractAddresses = {
        network: ethers.provider._network.name,
        chainID: ethers.provider._network.chainId,
        owner: deployer.address,
        chessFishToken: chessToken.address,
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
    console.log("Deployer: ", contractAddresses.owner);
    console.log("Chess Fish Token", contractAddresses.chessFishToken);
    console.log("TreasuryVesting contract", contractAddresses.treasuryVesting);

    console.log("___________");

    console.log(
        `npx hardhat verify --network mainnet ${contractAddresses.treasuryVesting} "${contractAddresses.chessFishToken}" "${deployer.address}" "${vestingAmount}" "${vestingBegin}" "${vestingCliff}" "${vestingEnd}"`
    );

    console.log("___________");

    console.log(`npx hardhat verify --network mainnet ${contractAddresses.chessFishToken} ${owner.address}`);
}

async function main(): Promise<void> {
    await deploy();
}

main();
