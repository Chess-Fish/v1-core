import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import crypto from "crypto";

function generateRandomHash() {
    // Generate a random number (64-bit) using Node.js crypto
    const randomBytes = crypto.randomBytes(8);
    const randomNumber = randomBytes.readBigUInt64LE();

    // Convert the random number to a hexadecimal string
    const randomHex = randomNumber.toString(16);

    // Get the current timestamp in milliseconds
    const timestamp = Date.now().toString();

    // Append the timestamp to the random hexadecimal string
    const combinedString = randomHex + timestamp;

    // Create a hash (SHA-256) from the combined string
    const hash = crypto.createHash("sha256").update(combinedString).digest("hex");

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
            const hashedDelegatedAddresss = await delegatedSignature.hashDelegatedAddress(delegatedAddress);
            const signedDelegatedAddressHash = await signer0.signMessage(
                ethers.utils.arrayify(hashedDelegatedAddresss)
            );

            // 3) verify that the signer0 signed the hash of the delegated address
            await delegatedSignature.verifyDelegatedAddress(
                hashedDelegatedAddresss,
                signedDelegatedAddressHash,
                signer0.address,
                delegatedAddress
            );

            // 4) create delegation abstraction
            const delegationData = await delegatedSignature.encodeDelegation(
                hashedDelegatedAddresss,
                signedDelegatedAddressHash,
                signer0.address,
                delegatedAddress
            );

            // 5) update state using the delegation abstraction
            await delegatedSignature.verifyDelegation(delegationData);
        });

        it("Should test delegation, sign move with delegator, and write to state", async function () {
            const { signer0, signer1, delegatedSignature } = await loadFixture(deploy);

            // ON THE FRONT END:
            // 1) Generate random public private key pair
            const entropy = generateRandomHash();
            const delegatedSigner = ethers.Wallet.createRandom(entropy);

            // 2) sign new public key (address) string with signer0
            const delegatedAddress = delegatedSigner.address.toString();
            const hashedDelegatedAddresss = await delegatedSignature.hashDelegatedAddress(delegatedAddress);
            const signedDelegatedAddressHash = await signer0.signMessage(
                ethers.utils.arrayify(hashedDelegatedAddresss)
            );

            // 3) create delegation abstraction
            const delegationData = await delegatedSignature.encodeDelegation(
                hashedDelegatedAddresss,
                signedDelegatedAddressHash,
                signer0.address,
                delegatedAddress
            );

            // 4) sign game data with delegated address
            const gameAddress = ethers.constants.AddressZero;
            const move = 731;
            const gameNumber = 0;
            const expiration = 1;

            const moveMessage = await delegatedSignature.encodeMoveData(gameAddress, move, gameNumber, expiration);
            const moveDataHash = await delegatedSignature.hashMoveData(gameAddress, move, gameNumber, expiration);
            const signedMoveData = await delegatedSigner.signMessage(ethers.utils.arrayify(moveDataHash));

            await delegatedSignature.writeToStateOnBehalfOfDelegator(delegationData, moveMessage, signedMoveData);

            // 5) check state update
            let moveData = await delegatedSignature.userData(gameAddress, 0);
            expect(moveData).to.equal(move);
        });

        it("Should test dual address delegation", async function () {
            const { signer0, signer1, delegatedSignature } = await loadFixture(deploy);

            // ON THE FRONT END:
            // 1) Generate random public private key pair
            const entropy = generateRandomHash();
            const delegatedSigner = ethers.Wallet.createRandom(entropy);

            // 2) sign new public key (address) string with signer0
            const delegatedAddress = delegatedSigner.address.toString();
            const hashedDelegatedAddresss = await delegatedSignature.hashDelegatedAddress(delegatedAddress);
            const signedDelegatedAddressHash = await signer0.signMessage(
                ethers.utils.arrayify(hashedDelegatedAddresss)
            );

            // 3) create delegation abstraction
            const delegationData = await delegatedSignature.encodeDelegation(
                hashedDelegatedAddresss,
                signedDelegatedAddressHash,
                signer0.address,
                delegatedAddress
            );

            // 4) sign game data with delegated address
            const gameAddress = ethers.constants.AddressZero;
            const move = 731;
            const gameNumber = 0;
            const expiration = 1;

            const moveMessage = await delegatedSignature.encodeMoveData(gameAddress, move, gameNumber, expiration);
            const moveDataHash = await delegatedSignature.hashMoveData(gameAddress, move, gameNumber, expiration);
            const signedMoveData = await delegatedSigner.signMessage(ethers.utils.arrayify(moveDataHash));

            await delegatedSignature.writeToStateOnBehalfOfDelegator(delegationData, moveMessage, signedMoveData);

            // 5) check state update
            let moveData = await delegatedSignature.userData(gameAddress, 0);
            expect(moveData).to.equal(move);
        });
    });
});
