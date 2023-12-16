import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { network } from "hardhat"; // <-- Ensure you have this import

describe("TreasuryVester tests", function () {
	const SECONDS_IN_A_DAY = 86400;
	const VESTING_AMOUNT = ethers.utils.parseEther("400000");

	const VESTING_AMOUNT1 = ethers.utils.parseEther("100000");

	before(async () => {
		// Reset the Hardhat EVM before all tests
		await network.provider.request({
			method: "hardhat_reset",
		});
	});

	async function deploy() {
		const [deployer, recipient, otherAccount] = await ethers.getSigners();

		const CFSH = await ethers.getContractFactory("ChessFish");
		const cfsh = await CFSH.deploy(deployer.address);

		const timeStamp = Math.floor(Date.now() / 1000);
		const vestingBegin = timeStamp + SECONDS_IN_A_DAY;
		const vestingCliff = timeStamp + SECONDS_IN_A_DAY * 30;
		const vestingEnd = timeStamp + SECONDS_IN_A_DAY * 365;

		const TREASURYVESTER = await ethers.getContractFactory("TreasuryVester");
		const vester = await TREASURYVESTER.deploy(
			cfsh.address,
			recipient.address,
			VESTING_AMOUNT,
			vestingBegin,
			vestingCliff,
			vestingEnd
		);

		return {
			cfsh,
			vester,
			deployer,
			recipient,
			otherAccount,
		};
	}

	it("Should set recipient", async function () {
		const { vester, recipient, otherAccount } = await loadFixture(deploy);
		await vester.connect(recipient).setRecipient(otherAccount.address);
		expect(await vester.recipient()).to.equal(otherAccount.address);
	});

	it("Should not claim before cliff", async function () {
		const { vester, recipient } = await loadFixture(deploy);
		await expect(vester.connect(recipient).claim()).to.be.revertedWith("TreasuryVester::claim: not time yet");
	});

	it("Should allow claim after 3 months but only partial vesting", async function () {
		const { cfsh, vester, recipient } = await loadFixture(deploy);
		await cfsh.transfer(vester.address, VESTING_AMOUNT);

		// Simulate 3 months passing
		await ethers.provider.send("evm_increaseTime", [SECONDS_IN_A_DAY * 30 * 3]);
		await ethers.provider.send("evm_mine");

		const initialRecipientBalance = await cfsh.balanceOf(recipient.address);
		await vester.connect(recipient).claim();

		const diff = (await cfsh.balanceOf(recipient.address)).sub(initialRecipientBalance);
		expect(diff).to.be.lt(VESTING_AMOUNT);
		expect(diff).to.be.gt(0);
	});

	it("Should allow full claim after 1 year", async function () {
		const { cfsh, vester, recipient } = await loadFixture(deploy);
		await cfsh.transfer(vester.address, VESTING_AMOUNT);

		// Simulate 1 year passing
		await ethers.provider.send("evm_increaseTime", [SECONDS_IN_A_DAY * 365]);
		await ethers.provider.send("evm_mine");

		const initialRecipientBalance = await cfsh.balanceOf(recipient.address);
		await vester.connect(recipient).claim();

		const diff = (await cfsh.balanceOf(recipient.address)).sub(initialRecipientBalance);
		expect(diff).to.be.eq(VESTING_AMOUNT);
	});

	it("Should deposit more than initial amount", async function () {
		const { cfsh, vester, recipient } = await loadFixture(deploy);
		await cfsh.transfer(vester.address, VESTING_AMOUNT);

		await cfsh.transfer(vester.address, VESTING_AMOUNT1);
		// Simulate 1 year passing
		await ethers.provider.send("evm_increaseTime", [SECONDS_IN_A_DAY * 365]);
		await ethers.provider.send("evm_mine");

		const initialRecipientBalance = await cfsh.balanceOf(recipient.address);
		await vester.connect(recipient).claim();

		const diff = (await cfsh.balanceOf(recipient.address)).sub(initialRecipientBalance);
		expect(diff).to.be.eq(VESTING_AMOUNT.add(VESTING_AMOUNT1));
	});
});
