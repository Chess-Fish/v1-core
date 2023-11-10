// SPDX-License-Identifier: MIT

/* 
   _____ _                   ______ _     _     
  / ____| |                 |  ____(_)   | |    
 | |    | |__   ___  ___ ___| |__   _ ___| |__  
 | |    | '_ \ / _ \/ __/ __|  __| | / __| '_ \ 
 | |____| | | |  __/\__ \__ \ |    | \__ \ | | |
  \_____|_| |_|\___||___/___/_|    |_|___/_| |_|
                             
*/

/// @title ChessFish ChessFishNFT Contract
/// @author ChessFish
/// @notice https://github.com/Chess-Fish

pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract ChessFishNFT is ERC721 {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    mapping(uint => address) public wagerAddresses;

    address public ChessWager;

    address public deployer;

    modifier onlyChessFishWager() {
        require(msg.sender == address(ChessWager));
        _;
    }

    modifier onlyDeployer() {
        require(msg.sender == deployer);
        _;
    }

    constructor() ERC721("ChessFishWinner", "WINNER") {
        deployer = msg.sender;
    }

    function setChessFishAddress(address _chessFish) external onlyDeployer {
        ChessWager = _chessFish;
    }

    function awardWinner(address player, address wagerAddress) external onlyChessFishWager returns (uint256) {
        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();
        _mint(player, newItemId);

        wagerAddresses[newItemId] = wagerAddress;

        return newItemId;
    }
}
