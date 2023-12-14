import { expect } from "chai";
import { ethers } from "hardhat";
const fs = require("fs");

async function deploy(): Promise<void> {
	const [owner, otherAccount] = await ethers.getSigners();

	const TOKEN = await ethers.getContractFactory("Token");
	const token = await TOKEN.deploy();
	await token.deployed();
	console.log("test token contract deployed", token.address);
}

async function main(): Promise<void> {
	await deploy();
}

main();
