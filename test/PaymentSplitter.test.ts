import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Payment Splitter Token Tests", function () {
    // We define a fixture to reuse the same setup in every test.
    async function deploy() {
        const [deployer, account0, account1] = await ethers.getSigners();

        // chess fish token
        const ChessFishToken = await ethers.getContractFactory("ChessFishToken");
        const chessFishToken = await ChessFishToken.deploy();
        await chessFishToken.deployed();

        // payment splitter contract
        const PaymentSplitter = await ethers.getContractFactory("PaymentSplitter");
        const paymentSplitter = await PaymentSplitter.deploy(chessFishToken.address);
        await paymentSplitter.deployed();

        // test erc20 token
        const Token = await ethers.getContractFactory("Token");
        const erc20token = await Token.deploy();
        await erc20token.deployed();

        return { chessFishToken, paymentSplitter, erc20token, deployer, account0, account1 };
    }

    describe("Functionality Tests", function () {
        it("Should check if properly deployed", async function () {
            const { chessFishToken } = await loadFixture(deploy);

            const name = await chessFishToken.name();
            const symbol = await chessFishToken.symbol();
            const decimals = await chessFishToken.decimals();

            expect(name == "Chess.fish");
            expect(symbol == "CFSH");
            expect(decimals == 18);
        });

        it("Should split native token", async function () {
            const { chessFishToken, paymentSplitter, deployer, account0, account1 } = await loadFixture(deploy);

            await deployer.sendTransaction({
                to: paymentSplitter.address,
                value: ethers.utils.parseEther("1"),
            });

            await chessFishToken.connect(deployer).transfer(account0.address, ethers.utils.parseEther("100000"));
            await chessFishToken.connect(deployer).transfer(account1.address, ethers.utils.parseEther("100000"));

            const releasableNative = await paymentSplitter.releasableNative(deployer.address);

            const balance = await ethers.provider.getBalance(deployer.address);
            await paymentSplitter.releaseNative(deployer.address);
            const balance1 = await ethers.provider.getBalance(deployer.address);
            expect(Number(balance1 - balance) == Number(releasableNative));

            const amountReleased = await paymentSplitter.totalReleasedNative();
            expect(Number(amountReleased) == Number(balance1 - balance));
        });

        it("Should split ERC20 token", async function () {
            const { chessFishToken, paymentSplitter, erc20token, deployer, account0, account1 } = await loadFixture(
                deploy
            );

            await erc20token.connect(deployer).transfer(paymentSplitter.address, ethers.utils.parseEther("100"));

            await chessFishToken.connect(deployer).transfer(account0.address, ethers.utils.parseEther("100000"));
            await chessFishToken.connect(deployer).transfer(account1.address, ethers.utils.parseEther("100000"));

            const releasableNative = await paymentSplitter.releasableERC20(erc20token.address, deployer.address);

            const balance = await ethers.provider.getBalance(deployer.address);
            await paymentSplitter.releaseERC20(erc20token.address, deployer.address);
            const balance1 = await ethers.provider.getBalance(deployer.address);
            expect(Number(balance1 - balance) == Number(releasableNative));

            const amountReleased = await paymentSplitter.totalReleasedERC20(erc20token.address);
            expect(Number(amountReleased) == Number(balance1 - balance));
        });
    });
});
