import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("ChessFish Delegate Sign Tests", function () {
    // We define a fixture to reuse the same setup in every test.
    async function deploy() {
        const [signer0, signer1] = await ethers.getSigners();

        const DelegatedSignature = await ethers.getContractFactory("DelegatedSignature");
        const delegatedSignature = await DelegatedSignature.deploy();

        return {
            signer0,
            signer1,
            delegatedSignature,
        };
    }

    describe("Address Delegation Unit Test", function () {
        it("Should test delegation", async function () {
            const { signer0, signer1, delegatedSignature } = await loadFixture(deploy);

            // ON THE FRONT END:
            const entropy = "123";
            const wallet = ethers.Wallet.createRandom(entropy);

            // 2) sign private key string with signer0
            const delegatedAddress = wallet.address.toString();

            // const signature = await signer0.signMessage(ethers.utils.arrayify(delegator));
            // const recoveredAddress = ethers.utils.verifyMessage(ethers.utils.arrayify(wallet.address), signature);

            // 1) write delegated address to smart contract
            // await delegatedSignature.connect(signer0).setDelegatedAddress(delegatedAddress);

            // let counter = await delegatedSignature.counter();
            // expect(counter).to.equal(1);

            // 2) hash the address
            const hashedDelegatedAddresss = await delegatedSignature.generateHash(delegatedAddress);

            // 3) sign the hash
            const signedDelegatedAddressHash = await signer0.signMessage(
                ethers.utils.arrayify(hashedDelegatedAddresss)
            );

            // 4) verify that the signer0 signed the hash of the delegated address
            // await delegatedSignature.verifyDelegatedAddress(hashedDelegatedAddresss, signedDelegatedAddressHash, signer0.address , delegatedAddress);

            // 5) delegation abstraction
            const delegationData = await delegatedSignature.encodeDelegation(
                hashedDelegatedAddresss,
                signedDelegatedAddressHash,
                signer0.address,
                delegatedAddress
            );

            // 5) update state using the delegation abstraction
            await delegatedSignature.writeToStateOnBehalfOfDelegator(delegationData, 5);

            const userData = await delegatedSignature.userData(signer0.address);

            expect(userData).to.equal(5);

            // let tx = await delegatedSignature.getSigner(delegator, signature);

            // console.log(tx);
        });
    });
});
