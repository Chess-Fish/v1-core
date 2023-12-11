// SPDX-License-Identifier: MIT

pragma solidity ^0.8.23;

import "./ChessWager.sol";

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract DelegatedSignature {
    // gameAddress => uint16 moves
    mapping(address => uint16[]) public userData; // on chain data

    // AUTHORIZE DELEGATED SIGNER FUNCTIONS

    function verifyDelegatedAddress(
        bytes32 delegatedAddressBytes,
        bytes memory signature,
        address delegatorAddress,
        address delegatedAddress
    ) public pure {
        bytes32 delegatedAddressHash = hashDelegatedAddress(delegatedAddress);
        require(delegatedAddressHash == delegatedAddressBytes);

        bytes32 ethSignedMessageHash = getEthSignedMessageHash(delegatedAddressBytes);
        require(
            ECDSA.recover(ethSignedMessageHash, signature) == delegatorAddress,
            "Delegated signature verification failed"
        );
    }

    function encodeDelegation(
        bytes32 delegatedAddressBytes,
        bytes memory signature,
        address delegatorAddress,
        address delegatedAddress
    ) public pure returns (bytes memory) {
        return abi.encode(delegatedAddressBytes, signature, delegatorAddress, delegatedAddress);
    }

    function decodeDelegation(bytes memory delegation) internal pure returns (bytes32, bytes memory, address, address) {
        return abi.decode(delegation, (bytes32, bytes, address, address));
    }

    function hashDelegatedAddress(address delegator) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(delegator));
    }

    function verifyDelegation(bytes memory delegation) public pure returns (address, address) {
        (
            bytes32 delegatedAddressBytes,
            bytes memory signature,
            address delegatorAddress,
            address delegatedAddress
        ) = decodeDelegation(delegation);

        verifyDelegatedAddress(delegatedAddressBytes, signature, delegatorAddress, delegatedAddress);

        return (delegatorAddress, delegatedAddress);
    }

    // DELEGATED SIGNER FUNCTIONS

    function writeToStateOnBehalfOfDelegator(
        bytes memory delegation,
        bytes memory moveData,
        bytes memory moveSignature
    ) public {
        (, address delegatedAddress) = verifyDelegation(delegation);
        (address gameAddress, uint16 move, uint gameNumber, uint expiration) = decodeMoveData(moveData);

        bytes32 moveDataHash = hashMoveData(gameAddress, move, gameNumber, expiration);

        verifyMove(moveDataHash, moveSignature, delegatedAddress);

        uint moveLength = userData[gameAddress].length;
        uint16[] memory newMoves = new uint16[](moveLength + 1);

        newMoves[moveLength] = move;
        userData[gameAddress] = newMoves;
    }

    function checkDelegation(bytes[2] memory delegations) internal pure {
        (, address delegatedAddress0) = verifyDelegation(delegations[0]);
        (, address delegatedAddress1) = verifyDelegation(delegations[1]);

        require(delegatedAddress0 == delegatedAddress1, "non matching");
    }

    /*     function verifyGameUpdateStateDelegated(
        bytes[2] memory delegations,
        bytes[] memory moveData,
        bytes[] memory moveSignature
    ) public {

        // check delegations
        checkDelegation(delegations);

        // (, address delegatedAddress) = verifyDelegation(delegation);
        (address gameAddress, uint16 move, uint gameNumber, uint expiration) = decodeMoveData(moveData);

        bytes32 moveDataHash = hashMoveData(gameAddress, move, gameNumber, expiration);

        // verifyMove(moveDataHash, moveSignature, delegatedAddress);

        uint moveLength = userData[gameAddress].length;
        uint16[] memory newMoves = new uint16[](moveLength + 1);

        newMoves[moveLength] = move;
        userData[gameAddress] = newMoves;
    } */

    function encodeMoveData(
        address gameAddress,
        uint16 move,
        uint gameNumber,
        uint expiration
    ) public pure returns (bytes memory) {
        return abi.encode(gameAddress, move, gameNumber, expiration);
    }

    function decodeMoveData(bytes memory moveData) internal pure returns (address, uint16, uint, uint) {
        return abi.decode(moveData, (address, uint16, uint, uint));
    }

    function hashMoveData(address wager, uint16 move, uint moveNumber, uint expiration) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(encodeMoveData(wager, move, moveNumber, expiration)));
    }

    function verifyMove(bytes32 moveDataHash, bytes memory moveSignature, address delegatorAddress) internal pure {
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(moveDataHash);
        require(ECDSA.recover(ethSignedMessageHash, moveSignature) == delegatorAddress, "invalid sig");
    }

    function getEthSignedMessageHash(bytes32 _messageHash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageHash));
    }
}
