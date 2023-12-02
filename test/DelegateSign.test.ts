import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import crypto from 'crypto';

function generateRandomHash(): string {
  // Generate a random number (64-bit) using Node.js crypto
  const randomBytes = crypto.randomBytes(8);
  const randomNumber = randomBytes.readBigUInt64LE();

  // Convert the random number to a hexadecimal string
  const randomHex = randomNumber.toString(16);

  // Create a hash (SHA-256) from the hexadecimal string
  const hash = crypto.createHash('sha256').update(randomHex).digest('hex');

  return hash;
}

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
            // 1) Generate random public private key pair
            const entropy = generateRandomHash();
            const wallet = ethers.Wallet.createRandom(entropy);

            // 2) sign new public key (address) string with signer0
            const delegatedAddress = wallet.address.toString();
            const hashedDelegatedAddresss = await delegatedSignature.generateHash(delegatedAddress);
            const signedDelegatedAddressHash = await signer0.signMessage(
                ethers.utils.arrayify(hashedDelegatedAddresss)
            );

            // 4) verify that the signer0 signed the hash of the delegated address
            // await delegatedSignature.verifyDelegatedAddress(hashedDelegatedAddresss, signedDelegatedAddressHash, signer0.address , delegatedAddress);

            // 5) create delegation abstraction
            const delegationData = await delegatedSignature.encodeDelegation(
                hashedDelegatedAddresss,
                signedDelegatedAddressHash,
                signer0.address,
                delegatedAddress
            );

            // 6) sign data with delegated address
            


            // 5) update state using the delegation abstraction
            await delegatedSignature.writeToStateOnBehalfOfDelegator(delegationData, 5);

            const userData = await delegatedSignature.userData(signer0.address);

            expect(userData).to.equal(5);

            // let tx = await delegatedSignature.getSigner(delegator, signature);

            // console.log(tx);
        });
    });
});
