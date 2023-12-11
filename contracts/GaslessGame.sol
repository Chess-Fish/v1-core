// SPDX-License-Identifier: MIT

/* 
   _____ _                   ______ _     _     
  / ____| |                 |  ____(_)   | |    
 | |    | |__   ___  ___ ___| |__   _ ___| |__  
 | |    | '_ \ / _ \/ __/ __|  __| | / __| '_ \ 
 | |____| | | |  __/\__ \__ \ |    | \__ \ | | |
  \_____|_| |_|\___||___/___/_|    |_|___/_| |_|
                             
*/

pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "./MoveVerification.sol";
import "./ChessWager.sol";

/**
 * @title ChessFish GaslessGame Contract
 * @author ChessFish
 * @notice https://github.com/Chess-Fish
 *
 * @dev This contract handles the logic for ...
 */

contract GaslessGame {
    struct GaslessMoveData {
        address signer;
        address player0;
        address player1;
        uint16 move;
        uint moveNumber;
        uint expiration;
        bytes32 messageHash;
    }

    MoveVerification public immutable moveVerification;

    ChessWager public chessWager;

    address deployer;

    constructor(address moveVerificationAddress) {
        moveVerification = MoveVerification(moveVerificationAddress);
        deployer = msg.sender;
    }

    modifier onlyDeployer() {
        _;
        require(msg.sender == deployer);
    }

    function setChessWager(address _chessWager) external onlyDeployer {
        chessWager = ChessWager(_chessWager);
    }

    /// @notice Generates gasless move message
    function generateMoveMessage(
        address wager,
        uint16 move,
        uint moveNumber,
        uint expiration
    ) public pure returns (bytes memory) {
        return abi.encode(wager, move, moveNumber, expiration);
    }

    /// @notice Generates gasless move hash
    function getMessageHash(
        address wager,
        uint16 move,
        uint moveNumber,
        uint expiration
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(generateMoveMessage(wager, move, moveNumber, expiration)));
    }

    /// @notice Decodes gasless move message
    function decodeMoveMessage(bytes memory message) public pure returns (address, uint16, uint, uint) {
        (address wager, uint16 move, uint moveNumber, uint expiration) = abi.decode(
            message,
            (address, uint16, uint, uint)
        );
        return (wager, move, moveNumber, expiration);
    }

    /// @notice Decodes gasless move message and returns wager address
    function decodeWagerAddress(bytes memory message) internal pure returns (address) {
        (address wager, , , ) = abi.decode(message, (address, uint16, uint, uint));
        return wager;
    }

    /// @notice Gets signed message from gasless move hash
    function getEthSignedMessageHash(bytes32 _messageHash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageHash));
    }

    /// @notice Validates that the signed hash was signed by the player
    function validate(bytes32 messageHash, bytes memory signature, address signer) internal pure {
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);
        require(ECDSA.recover(ethSignedMessageHash, signature) == signer, "invalid sig");
    }

    /// @notice Verifies signed messages and signatures in for loop
    /// @dev returns array of the gasless moves
    function verifyMoves(
        address playerToMove,
        address player0,
        address player1,
        bytes[] memory messages,
        bytes[] memory signatures
    ) internal view returns (uint16[] memory moves) {
        moves = new uint16[](messages.length);
        uint[] memory moveNumbers = new uint[](messages.length);

        GaslessMoveData memory moveData;
        moveData.player0 = player0;
        moveData.player1 = player1;

        for (uint i = 0; i < messages.length; ) {
            /// @dev determine signer based on the move index
            moveData.signer = (i % 2 == 0) == (playerToMove == moveData.player0) ? moveData.player0 : moveData.player1;

            (, moveData.move, moveData.moveNumber, moveData.expiration) = decodeMoveMessage(messages[i]);
            require(moveData.expiration >= block.timestamp, "move expired");

            moveData.messageHash = getMessageHash(
                decodeWagerAddress(messages[i]),
                moveData.move,
                moveData.moveNumber,
                moveData.expiration
            );
            validate(moveData.messageHash, signatures[i], moveData.signer);

            if (i != 0) {
                require(moveNumbers[i - 1] < moveData.moveNumber, "moves must be sequential");
            }
            moveNumbers[i] = moveData.moveNumber;
            moves[i] = moveData.move;

            unchecked {
                i++;
            }
        }

        return moves;
    }

    /// @notice Verifies all signed messages and signatures
    /// @dev appends onchain moves to gasless moves
    /// @dev reverts if invalid signature
    function verifyGameView(
        bytes[] memory messages,
        bytes[] memory signatures
    ) public view returns (address wagerAddress, uint8 outcome, uint16[] memory moves) {
        require(messages.length == signatures.length, "msg.len == sig.len");

        // optimistically use the wagerAddress from the first index
        wagerAddress = decodeWagerAddress(messages[0]);

        address playerToMove = chessWager.getPlayerMove(wagerAddress);

        (address player0, address player1) = chessWager.getWagerPlayers(wagerAddress);
        // address player0 = chessWager.gameWagers[wagerAddress].player0;
        // address player1 = chessWager.gameWagers[wagerAddress].player1;

        moves = verifyMoves(playerToMove, player0, player1, messages, signatures);

        // appending moves to onChainMoves if they exist
        // uint16[] memory onChainMoves = chessWager.games[wagerAddress][chessWager.gameIDs[wagerAddress].length].moves;
        uint16[] memory onChainMoves = chessWager.getLatestGameMoves(wagerAddress);

        if (onChainMoves.length > 0) {
            uint16[] memory combinedMoves = new uint16[](onChainMoves.length + moves.length);
            for (uint i = 0; i < onChainMoves.length; i++) {
                combinedMoves[i] = onChainMoves[i];
            }
            for (uint i = 0; i < moves.length; i++) {
                combinedMoves[i + onChainMoves.length] = moves[i];
            }
            moves = combinedMoves;
        }

        (outcome, , , ) = moveVerification.checkGameFromStart(moves);

        return (wagerAddress, outcome, moves);
    }

    /*
    //// DELEGATED GASLESS MOVE VERIFICATION FUNCTIONS ////
    */

    function hashDelegatedAddress(address delegator) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(delegator));
    }

    function encodeDelegation(
        bytes32 delegatedAddressBytes,
        bytes memory signature,
        address delegatorAddress,
        address delegatedAddress
    ) external pure returns (bytes memory) {
        return abi.encode(delegatedAddressBytes, signature, delegatorAddress, delegatedAddress);
    }

    function decodeDelegation(bytes memory delegation) internal pure returns (bytes32, bytes memory, address, address) {
        return abi.decode(delegation, (bytes32, bytes, address, address));
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

    function verifyDelegatedAddress(
        bytes32 delegatedAddressBytes,
        bytes memory signature,
        address delegatorAddress,
        address delegatedAddress
    ) internal pure {
        bytes32 delegatedAddressHash = hashDelegatedAddress(delegatedAddress);
        require(delegatedAddressHash == delegatedAddressBytes);

        bytes32 ethSignedMessageHash = getEthSignedMessageHash(delegatedAddressBytes);
        require(ECDSA.recover(ethSignedMessageHash, signature) == delegatorAddress, "557");
    }

    function checkDelegation(bytes[2] memory delegations) internal pure {
        (, address delegatedAddress0) = verifyDelegation(delegations[0]);
        (, address delegatedAddress1) = verifyDelegation(delegations[1]);

        require(delegatedAddress0 == delegatedAddress1, "565");
    }

    function verifyGameViewDelegated(
        bytes[2] memory delegations,
        bytes[] memory messages,
        bytes[] memory signatures
    ) external view returns (address wagerAddress, uint8 outcome, uint16[] memory moves) {
        require(messages.length == signatures.length, "573");

        checkDelegation(delegations);

        // optimistically use the wagerAddress from the first index
        wagerAddress = decodeWagerAddress(messages[0]);

        address playerToMove = chessWager.getPlayerMove(wagerAddress);

        (, , address player0, ) = decodeDelegation(delegations[0]);
        (, , address player1, ) = decodeDelegation(delegations[1]);

        moves = verifyMoves(playerToMove, player0, player1, messages, signatures);

        // appending moves to onChainMoves if they exist
        uint16[] memory onChainMoves = chessWager.getLatestGameMoves(wagerAddress);
        if (onChainMoves.length > 0) {
            uint16[] memory combinedMoves = new uint16[](onChainMoves.length + moves.length);
            for (uint i = 0; i < onChainMoves.length; i++) {
                combinedMoves[i] = onChainMoves[i];
            }
            for (uint i = 0; i < moves.length; i++) {
                combinedMoves[i + onChainMoves.length] = moves[i];
            }
            moves = combinedMoves;
        }

        (outcome, , , ) = moveVerification.checkGameFromStart(moves);

        return (wagerAddress, outcome, moves);
    }
}
