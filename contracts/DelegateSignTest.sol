// SPDX-License-Identifier: MIT

pragma solidity ^0.8.22;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "hardhat/console.sol";

contract DelegatedSignature {

    mapping(address => uint) public userData; // on chain data

    /*     
    function setUserData(address user ) public {
        if (user == msg.sender) {
            // continue
            userData[user] = data;
        } else {
            // check if delegated signer

        }
    } 
    */

    // DELEGATED SIGNER FUNCTIONS

    function getEthSignedMessageHash(bytes32 _messageHash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageHash));
    }

    // 1) hash public key
    function generateHash(address delegator) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(delegator));
    }

    // 3) recover delegated address, signer address
    function verifyDelegatedAddress(
        bytes32 delegatedAddressBytes,
        bytes memory signature,
        address delegatorAddress,
        address delegatedAddress
    ) public pure {
        bytes32 delegatedHash = generateHash(delegatedAddress);
        require(delegatedHash == delegatedAddressBytes);

        bytes32 ethSignedMessageHash = getEthSignedMessageHash(delegatedAddressBytes);
        require(ECDSA.recover(ethSignedMessageHash, signature) == delegatorAddress, "invalid sig");
    }

    function encodeDelegation(
        bytes32 delegatedAddressBytes,
        bytes memory signature,
        address delegatorAddress,
        address delegatedAddress
    ) public pure returns (bytes memory) {
        return abi.encode(delegatedAddressBytes, signature, delegatorAddress, delegatedAddress);
    }

    function decodeDelegation(bytes memory delegation) public pure returns (bytes32, bytes memory, address, address) {
        return abi.decode(delegation, (bytes32, bytes, address, address));
    }

    function verifyDelegation(bytes memory delegation) internal pure returns (address) {
        (
            bytes32 delegatedAddressBytes,
            bytes memory signature,
            address delegatorAddress,
            address delegatedAddress
        ) = decodeDelegation(delegation);

        verifyDelegatedAddress(delegatedAddressBytes, signature, delegatorAddress, delegatedAddress);

        return delegatorAddress;
    }

    function writeToStateOnBehalfOfDelegator(bytes memory delegation, uint data) public {
        address delegatorAddress = verifyDelegation(delegation);
        userData[delegatorAddress] = data;
    }
}
