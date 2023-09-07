import { expect } from "chai";
import { ethers } from "hardhat";
const fs = require("fs");

interface ContractAddresses {
    network: string;
    chainID: number;
    owner: string;
    chessFishToken: string;
    crowdSale: string;
    treasuryVesting: string;
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
    const USDC = "0x46F18dc8C616CB0829BC0579E092e2429faF7fea";
    const VALUE = ethers.utils.parseUnits("2", 18);
    const OWNER = owner.address;

    const ChessToken = await ethers.getContractFactory("ChessFish");
    const chessToken = await ChessToken.deploy(OWNER, options);
    await chessToken.deployTransaction.wait(); // Wait for confirmation
    console.log("ChessFish token contract deployed");

    const CROWDSALE = await ethers.getContractFactory("CrowdSale");
    const crowdsale = await CROWDSALE.deploy(chessToken.address, USDC, VALUE, options);
    await crowdsale.deployTransaction.wait(); // Wait for confirmation
    const crowdSaleAmount = ethers.utils.parseEther("300000");
    const tx = await chessToken.connect(owner).transfer(crowdsale.address, crowdSaleAmount, options);
    await tx.wait();
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
        vestingEnd,
        options
    );
    await treasury.deployTransaction.wait(); // Wait for confirmation
    console.log("Treasury contract deployed");
    // nonce 3

    const tx1 = await chessToken.connect(owner).transfer(treasury.address, vestingAmount, options);
    await tx1.wait();
    console.log("40% transfered to treasury");

    const contractAddresses: ContractAddresses = {
        network: ethers.provider._network.name,
        chainID: ethers.provider._network.chainId,
        owner: deployer.address,
        chessFishToken: chessToken.address,
        crowdSale: crowdsale.address,
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
    console.log("CrowdSale contract", contractAddresses.crowdSale);
    console.log("TreasuryVesting contract", contractAddresses.treasuryVesting);

    console.log("___________");

    console.log(
        `npx hardhat verify --network goerli ${contractAddresses.crowdSale} "${contractAddresses.chessFishToken}" "${USDC}" "${VALUE}"`
    );

    console.log("___________");

    console.log(
        `npx hardhat verify --network goerli ${contractAddresses.treasuryVesting} "${contractAddresses.chessFishToken}" "${deployer.address}" "${vestingAmount}" "${vestingBegin}" "${vestingCliff}" "${vestingEnd}"`
    );

    console.log("___________");

    console.log(`npx hardhat verify --network goerli ${contractAddresses.chessFishToken} ${owner.address}`);
}

async function main(): Promise<void> {
    await deploy();
}

main();
