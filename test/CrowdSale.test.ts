import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Crowdsale tests", function () {
    // We define a fixture to reuse the same setup in every test.
    async function deploy() {
        const [deployer, otherAccount] = await ethers.getSigners();

        const CFSH = await ethers.getContractFactory("ChessFish");
        const chessToken = await CFSH.deploy(deployer.address);

        const USDC = await ethers.getContractFactory("USDC");
        const usdc = await USDC.deploy();

        await usdc.transfer(otherAccount.address, ethers.utils.parseUnits("150000", 6));

        const value = ethers.utils.parseUnits("0.31459", 18);

        const CROWDSALE = await ethers.getContractFactory("CrowdSale");
        const crowdsale = await CROWDSALE.deploy(chessToken.address, usdc.address, value);

        return {
            chessToken,
            crowdsale,
            usdc,
            deployer,
            otherAccount,
        };
    }

    it("Should deposit", async function () {
        const { chessToken, crowdsale, deployer } = await loadFixture(deploy);

        const depositAmount = ethers.utils.parseEther("100000");

        await chessToken.connect(deployer).approve(crowdsale.address, depositAmount);
        await chessToken.allowance(deployer.address, crowdsale.address);
        await crowdsale.connect(deployer).deposit(depositAmount);

        const balance = await chessToken.balanceOf(crowdsale.address);

        expect(balance).to.equal(depositAmount);
    });

    it("Should purchase", async function () {
        const { chessToken, crowdsale, usdc, deployer, otherAccount } = await loadFixture(deploy);

        const depositAmount = ethers.utils.parseUnits("100000", 18);

        await chessToken.connect(deployer).approve(crowdsale.address, depositAmount);
        await chessToken.allowance(deployer.address, crowdsale.address);
        await crowdsale.connect(deployer).deposit(depositAmount);

        const balance = await chessToken.balanceOf(crowdsale.address);

        expect(balance).to.equal(depositAmount);

        const usdcIn = ethers.utils.parseUnits("100", 6);

        await usdc.connect(otherAccount).approve(crowdsale.address, usdcIn);
        await crowdsale.connect(otherAccount).getChessFishTokens(usdcIn);
        const recievedTokens = await chessToken.balanceOf(otherAccount.address);

        expect(recievedTokens).to.equal(ethers.utils.parseUnits("31.459", 18));
    });

    it("Should withdraw", async function () {
        const { chessToken, crowdsale, usdc, deployer, otherAccount } = await loadFixture(deploy);

        const depositAmount = ethers.utils.parseUnits("100000", 18);

        await chessToken.connect(deployer).approve(crowdsale.address, depositAmount);
        await chessToken.allowance(deployer.address, crowdsale.address);
        await crowdsale.connect(deployer).deposit(depositAmount);

        const balance = await chessToken.balanceOf(crowdsale.address);

        expect(balance).to.equal(depositAmount);

        const usdcIn = ethers.utils.parseUnits("100", 6);

        await usdc.connect(otherAccount).approve(crowdsale.address, usdcIn);
        await crowdsale.connect(otherAccount).getChessFishTokens(usdcIn);
        const recievedTokens = await chessToken.balanceOf(otherAccount.address);

        expect(recievedTokens).to.equal(ethers.utils.parseUnits("31.459", 18));

        const bal0 = await usdc.balanceOf(deployer.address);
        await crowdsale.connect(deployer).withdrawERC20(usdc.address);
        const bal1 = await usdc.balanceOf(deployer.address);

        const payout = bal1 - bal0;

        expect(payout).to.equal(ethers.utils.parseUnits("100", 6));
    });

    it("Should spend max", async function () {
        const { chessToken, crowdsale, usdc, deployer, otherAccount } = await loadFixture(deploy);

        const depositAmount = ethers.utils.parseUnits("300000", 18);

        await chessToken.connect(deployer).approve(crowdsale.address, depositAmount);
        await chessToken.allowance(deployer.address, crowdsale.address);
        await crowdsale.connect(deployer).deposit(depositAmount);

        const balance = await chessToken.balanceOf(crowdsale.address);

        expect(balance).to.equal(depositAmount);

        const usdcIn = ethers.utils.parseUnits("150000", 6);

        await usdc.connect(otherAccount).approve(crowdsale.address, usdcIn);
        await crowdsale.connect(otherAccount).getChessFishTokens(usdcIn);
        const recievedTokens = await chessToken.balanceOf(otherAccount.address);

        expect(recievedTokens).to.equal(ethers.utils.parseUnits("47188.5", 18));

        const bal0 = await usdc.balanceOf(deployer.address);
        await crowdsale.connect(deployer).withdrawERC20(usdc.address);
        const bal1 = await usdc.balanceOf(deployer.address);

        const payout = bal1 - bal0;

        expect(payout).to.equal(ethers.utils.parseUnits("150000", 6));
    });
});
