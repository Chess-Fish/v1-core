import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("ChessFish Crowdsale Unit Tests", function () {
	async function deploy() {
		const [deployer, owner, user] = await ethers.getSigners();

		const CFSH = await ethers.getContractFactory("ChessFish");
		const chessToken = await CFSH.deploy(owner.address);

		const USDC = await ethers.getContractFactory("USDC");
		const usdc = await USDC.deploy();

		await usdc.transfer(user.address, ethers.utils.parseUnits("1000000", 6));

		const value = ethers.utils.parseUnits("0.36789051578250315", 18);

		const CROWDSALE = await ethers.getContractFactory("CrowdSale");
		const crowdsale = await CROWDSALE.deploy(owner.address, chessToken.address, usdc.address, value);

		return {
			chessToken,
			crowdsale,
			usdc,
			deployer,
			owner,
			user,
		};
	}

	it("Should deposit", async function () {
		const { chessToken, crowdsale, owner } = await loadFixture(deploy);

		const depositAmount = ethers.utils.parseEther("100000");

		await chessToken.connect(owner).approve(crowdsale.address, depositAmount);
		await chessToken.allowance(owner.address, crowdsale.address);
		await crowdsale.connect(owner).deposit(depositAmount);

		const balance = await chessToken.balanceOf(crowdsale.address);

		expect(balance).to.equal(depositAmount);
	});

	it("Should purchase", async function () {
		const { chessToken, crowdsale, usdc, owner, user } = await loadFixture(deploy);

		const depositAmount = ethers.utils.parseUnits("100000", 18);

		await chessToken.connect(owner).approve(crowdsale.address, depositAmount);
		await chessToken.allowance(owner.address, crowdsale.address);
		await crowdsale.connect(owner).deposit(depositAmount);

		const balance = await chessToken.balanceOf(crowdsale.address);

		expect(balance).to.equal(depositAmount);

		const usdcIn = ethers.utils.parseUnits("100", 6);

		await usdc.connect(user).approve(crowdsale.address, usdcIn);
		await crowdsale.connect(user).getChessFishTokens(usdcIn);
		const recievedTokens = await chessToken.balanceOf(user.address);

		expect(recievedTokens).to.equal(ethers.utils.parseUnits("36.789051578250315000", 18));
	});

	it("Should withdraw", async function () {
		const { chessToken, crowdsale, usdc, deployer, owner, user } = await loadFixture(deploy);

		const depositAmount = ethers.utils.parseUnits("100000", 18);

		await chessToken.connect(owner).approve(crowdsale.address, depositAmount);
		await chessToken.allowance(owner.address, crowdsale.address);
		await crowdsale.connect(owner).deposit(depositAmount);

		const balance = await chessToken.balanceOf(crowdsale.address);

		expect(balance).to.equal(depositAmount);

		const usdcIn = ethers.utils.parseUnits("100", 6);

		await usdc.connect(user).approve(crowdsale.address, usdcIn);
		await crowdsale.connect(user).getChessFishTokens(usdcIn);
		const recievedTokens = await chessToken.balanceOf(user.address);

		expect(recievedTokens).to.equal(ethers.utils.parseUnits("36.789051578250315000", 18));

		const bal0 = await usdc.balanceOf(owner.address);
		await crowdsale.connect(owner).withdrawERC20(usdc.address);
		const bal1 = await usdc.balanceOf(owner.address);

		const payout = bal1 - bal0;

		expect(payout).to.equal(ethers.utils.parseUnits("100", 6));
	});

	it("Should spend max", async function () {
		const { chessToken, crowdsale, usdc, deployer, owner, user } = await loadFixture(deploy);

		const depositAmount = ethers.utils.parseUnits("300000", 18);

		await chessToken.connect(owner).approve(crowdsale.address, depositAmount);
		await chessToken.allowance(owner.address, crowdsale.address);
		await crowdsale.connect(owner).deposit(depositAmount);

		const balance = await chessToken.balanceOf(crowdsale.address);

		expect(balance).to.equal(depositAmount);

		const usdcIn = ethers.utils.parseUnits("150000", 6);

		await usdc.connect(user).approve(crowdsale.address, usdcIn);
		await crowdsale.connect(user).getChessFishTokens(usdcIn);
		const recievedTokens = await chessToken.balanceOf(user.address);

		expect(recievedTokens).to.equal(ethers.utils.parseUnits("55183.577367375472500", 18));

		const bal0 = await usdc.balanceOf(owner.address);
		await crowdsale.connect(owner).withdrawERC20(usdc.address);
		const bal1 = await usdc.balanceOf(owner.address);

		const payout = bal1 - bal0;

		expect(payout).to.equal(ethers.utils.parseUnits("150000", 6));
	});

	it("Should test unauthorized", async function () {
		const { chessToken, crowdsale, usdc, owner, user } = await loadFixture(deploy);

		const depositAmount = ethers.utils.parseUnits("300000", 18);

		await chessToken.connect(owner).approve(crowdsale.address, depositAmount);
		await chessToken.allowance(owner.address, crowdsale.address);
		await crowdsale.connect(owner).deposit(depositAmount);

		const balance = await chessToken.balanceOf(crowdsale.address);

		expect(balance).to.equal(depositAmount);

		const usdcIn = ethers.utils.parseUnits("150000", 6);

		await usdc.connect(user).approve(crowdsale.address, usdcIn);
		await crowdsale.connect(user).getChessFishTokens(usdcIn);
		const recievedTokens = await chessToken.balanceOf(user.address);

		expect(recievedTokens).to.equal(ethers.utils.parseUnits("55183.5773673754725000", 18));

		await expect(crowdsale.connect(user).withdrawERC20(usdc.address)).to.be.revertedWith(
			"Ownable: caller is not the owner"
		);
	});
});
