// SPDX-License-Identifier: MIT

/* 
   _____ _                   ______ _     _     
  / ____| |                 |  ____(_)   | |    
 | |    | |__   ___  ___ ___| |__   _ ___| |__  
 | |    | '_ \ / _ \/ __/ __|  __| | / __| '_ \ 
 | |____| | | |  __/\__ \__ \ |    | \__ \ | | |
  \_____|_| |_|\___||___/___/_|    |_|___/_| |_|
                             
*/

pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "./interfaces/interfaces.sol";
import "./MoveHelper.sol";

/**
 * @title ChessFish ChessWager Contract
 * @author ChessFish
 * @notice https://github.com/Chess-Fish
 *
 * @dev This contract handles the logic for storing chess wagers between users,
 * storing game moves, and handling the payout of 1v1 matches.
 * The Tournament Contract is able to call into this contract to create tournament matches between users.
 */

/* contract MoveSignature is Chess {
    // using SafeERC20 for IERC20;



} */