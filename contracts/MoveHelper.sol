// SPDX-License-Identifier: MIT

/* 
   _____ _                   ______ _     _     
  / ____| |                 |  ____(_)   | |    
 | |    | |__   ___  ___ ___| |__   _ ___| |__  
 | |    | '_ \ / _ \/ __/ __|  __| | / __| '_ \ 
 | |____| | | |  __/\__ \__ \ |    | \__ \ | | |
  \_____|_| |_|\___||___/___/_|    |_|___/_| |_|
                             
*/

pragma solidity ^0.8.19;

import "./MoveVerification.sol";

/**
 * @title ChessFish MoveHelper Contract
 * @author ChessFish
 * @notice https://github.com/Chess-Fish
 *
 * @dev This contract handles move conversion functionality to the MoveVerifican contract as well as admin functionality.
 */

contract MoveHelper {
    // @dev uint pieces => letter pieces
    mapping(uint8 => string) pieces;

    /// @dev algebraic chess notation string => uint (0-63)
    mapping(string => uint) public coordinates;
    mapping(uint => string) public squareToCoordinate;

    /// @dev address deployer
    address public deployer;

    /// @dev MoveVerification contract
    MoveVerification public moveVerification;

    /// @dev 5% fee to token holders
    uint public protocolFee = 500;

    modifier OnlyDeployer() {
        require(msg.sender == deployer, "Only deployer");
        _;
    }

    /// @dev called from ts since hardcoding the mapping makes the contract too large
    function initCoordinates(string[64] calldata coordinate, uint[64] calldata value) external OnlyDeployer {
        for (int i = 0; i < 64; i++) {
            coordinates[coordinate[uint(i)]] = value[uint(i)];
            squareToCoordinate[value[uint(i)]] = coordinate[uint(i)];
        }
    }

    /// @dev Initialize pieces
    /// @dev This function significantly increases the size of the compiled bytecode...
    function initPieces() internal {
        // blank square
        pieces[0] = ".";

        // white pieces
        pieces[1] = "P";
        pieces[2] = "B";
        pieces[3] = "N";
        pieces[4] = "R";
        pieces[5] = "Q";
        pieces[6] = "K";

        // black pieces
        pieces[9] = "p";
        pieces[10] = "b";
        pieces[11] = "n";
        pieces[12] = "r";
        pieces[13] = "q";
        pieces[14] = "k";
    }

    /**
        @dev Convert the number of a piece to the string character
        @param piece is the number of the piece
        @return string is the letter of the piece
    */
    function getLetter(uint8 piece) public view returns (string memory) {
        string memory letter = pieces[piece];
        return letter;
    }

    /**
        @dev Converts a move from a 16-bit integer to a 2 8-bit integers.
        @param move is the move to convert
        @return fromPos and toPos
    */
    function convertFromMove(uint16 move) public pure returns (uint8, uint8) {
        uint8 fromPos = (uint8)((move >> 6) & 0x3f);
        uint8 toPos = (uint8)(move & 0x3f);
        return (fromPos, toPos);
    }

    /**
        @dev Converts two 8-bit integers to a 16-bit integer
        @param fromPos is the position to move a piece from.
        @param toPos is the position to move a piece to.
        @return move
    */
    function convertToMove(uint8 fromPos, uint8 toPos) public pure returns (uint16) {
        uint16 move = (uint16)(fromPos);
        move = move << 6;
        move = move + (uint16)(toPos);
        return move;
    }

    /**
        @dev Converts an algebraic chess notation string move to uint16 format
        @param move is the move to convert i.e. e2e4 to hex move
        @return hexMove is the resulting uint16 value
    */
    function moveToHex(string memory move) external view returns (uint16 hexMove) {
        bytes memory byteString = bytes(move);

        bytes memory bFromPos = "00";
        bytes memory bToPos = "00";

        bFromPos[0] = byteString[0];
        bFromPos[1] = byteString[1];

        bToPos[0] = byteString[2];
        bToPos[1] = byteString[3];

        string memory sFromPos = string(bFromPos);
        string memory sToPos = string(bToPos);

        uint8 fromPos = uint8(coordinates[sFromPos]);
        uint8 toPos = uint8(coordinates[sToPos]);

        hexMove = convertToMove(fromPos, toPos);

        return hexMove;
    }

    /**
        @dev Converts a uint16 hex value to move in algebraic chess notation
        @param hexMove is the move to convert to string 
        @return move is the resulting string value
    */
    function hexToMove(uint16 hexMove) public view returns (string memory move) {
        uint8 fromPos = uint8(hexMove >> 6);
        uint8 toPos = uint8(hexMove & 0x3f);

        string memory fromCoord = squareToCoordinate[fromPos];
        string memory toCoord = squareToCoordinate[toPos];

        move = string(abi.encodePacked(fromCoord, toCoord));

        return move;
    }

    /**
        @dev returns string of letters representing the board
        @dev only to be called by user or ui
        @param gameState is the uint256 game state of the board 
        @return string[64] is the resulting array 
    */
    function getBoard(uint gameState) external view returns (string[64] memory) {
        string[64] memory board;
        uint j = 0;

        for (uint i = 0; i <= 7; i++) {
            int pos = ((int(i) + 1) * 8) - 1;
            int last = pos - 7;
            for (pos; pos >= last; pos--) {
                uint8 piece = moveVerification.pieceAtPosition(gameState, uint8(uint(pos)));

                board[j] = getLetter(piece);

                j++;
            }
        }
        return board;
    }
}
