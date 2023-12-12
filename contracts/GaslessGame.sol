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

    /*
    //// DELEGATED GASLESS MOVE VERIFICATION FUNCTIONS ////
    */

    struct Delegation {
        address delegatorAddress;
        address delegatedAddress;
        address wagerAddress;
    }

    struct SignedDelegation {
        Delegation delegation;
        bytes signature;
    }

    function createDelegation(
        address delegatorAddress,
        address delegatedAddress,
        address wagerAddress
    ) external pure returns (Delegation memory) {
        Delegation memory delegation = Delegation(delegatorAddress, delegatedAddress, wagerAddress);
        return delegation;
    }

    function encodeSignedDelegation(
        Delegation memory delegation,
        bytes memory signature
    ) external pure returns (bytes memory) {
        SignedDelegation memory signedDelegation = SignedDelegation(delegation, signature);
        return abi.encode(signedDelegation);
    }

    function checkDelegations(
        SignedDelegation memory signedDelegation0,
        SignedDelegation memory signedDelegation1
    ) internal pure {
        require(
            signedDelegation0.delegation.wagerAddress == signedDelegation1.delegation.wagerAddress,
            "non matching addresses"
        );

        verifyDelegation(signedDelegation0);
        verifyDelegation(signedDelegation1);
    }

    function verifyDelegation(SignedDelegation memory signedDelegation) public pure {
        bytes32 hashedDelegation = hashDelegation(signedDelegation.delegation);
        verifyDelegatedAddress(
            hashedDelegation,
            signedDelegation.signature,
            signedDelegation.delegation.delegatorAddress
        );
    }

    function decodeSignedDelegation(
        bytes memory signedDelegationBytes
    ) internal pure returns (SignedDelegation memory signedDelegation) {
        return abi.decode(signedDelegationBytes, (SignedDelegation));
    }

    function hashDelegation(Delegation memory delegationData) public pure returns (bytes32) {
        return keccak256(abi.encode(delegationData));
    }

    function verifyDelegatedAddress(
        bytes32 hashedDelegation,
        bytes memory signature,
        address delegatorAddress
    ) internal pure {
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(hashedDelegation);
        require(ECDSA.recover(ethSignedMessageHash, signature) == delegatorAddress, "invalid signature");
    }

    function checkIfAddressesArePlayers(address delegator0, address delegator1, address wagerAddress) internal view {
        (address player0, address player1) = chessWager.getWagerPlayers(wagerAddress);
        require(delegator0 == player0 && delegator1 == player1, "players don't match");
    }

    function verifyGameViewDelegated(
        bytes[2] memory delegations,
        bytes[] memory messages,
        bytes[] memory signatures
    ) external view returns (address wagerAddress, uint8 outcome, uint16[] memory moves) {
        require(messages.length == signatures.length, "573");

        // Decode each delegation once
        SignedDelegation memory signedDelegation0 = decodeSignedDelegation(delegations[0]);
        SignedDelegation memory signedDelegation1 = decodeSignedDelegation(delegations[1]);

        // Pass the decoded delegations to checkDelegations
        checkDelegations(signedDelegation0, signedDelegation1);

        address player0 = signedDelegation0.delegation.delegatedAddress;
        address player1 = signedDelegation1.delegation.delegatedAddress;
        wagerAddress = signedDelegation0.delegation.wagerAddress;

        // add check for delegator addresses are infact players in sc
        checkIfAddressesArePlayers(
            signedDelegation0.delegation.delegatorAddress,
            signedDelegation1.delegation.delegatorAddress,
            wagerAddress
        );

        address playerToMove = chessWager.getPlayerMove(wagerAddress) == signedDelegation0.delegation.delegatorAddress
            ? player0
            : player1;

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
