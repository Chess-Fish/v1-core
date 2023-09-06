// SPDX-License-Identifier: MIT

/* 
   _____ _                   ______ _     _     
  / ____| |                 |  ____(_)   | |    
 | |    | |__   ___  ___ ___| |__   _ ___| |__  
 | |    | '_ \ / _ \/ __/ __|  __| | / __| '_ \ 
 | |____| | | |  __/\__ \__ \ |    | \__ \ | | |
  \_____|_| |_|\___||___/___/_|    |_|___/_| |_|
                             
*/

/// @title ChessFish CrowdSale Contract
/// @author ChessFish
/// @notice https://github.com/Chess-Fish

pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract CrowdSale {
    using SafeERC20 for IERC20;

    address public deployer;
    address public ChessFishToken;
    address public USDC;

    uint public value;

    event TokensPurchased(address indexed buyer, uint256 amountIn, uint256 amountOut);

    modifier OnlyDeployer() {
        require(msg.sender == deployer, "not deployer");
        _;
    }

    constructor(address _chessFishToken, address _USDC, uint _value) {
        deployer = msg.sender;
        ChessFishToken = _chessFishToken;
        USDC = _USDC;
        value = _value;
    }

    function deposit(uint amount) external {
        IERC20(ChessFishToken).safeTransferFrom(msg.sender, address(this), amount);
    }

    function getChessFishTokens(uint amountIn) external {
        require(amountIn > 0, "can't be zero");
        IERC20(USDC).safeTransferFrom(msg.sender, address(this), amountIn);

        uint amountOut = (amountIn * 1e12 * value) / 1e18; // convert 1e6 to 1e18;
        require(amountOut <= IERC20(ChessFishToken).balanceOf(address(this)), "not enough balance");
        IERC20(ChessFishToken).safeTransfer(msg.sender, amountOut);

        emit TokensPurchased(msg.sender, amountIn, amountOut);
    }

    function endCrowdSale() external OnlyDeployer {
        uint balanceCFSH = IERC20(ChessFishToken).balanceOf(address(this));
        IERC20(ChessFishToken).safeTransfer(msg.sender, balanceCFSH);
        uint balanceUSDC = IERC20(USDC).balanceOf(address(this));
        IERC20(USDC).safeTransfer(msg.sender, balanceUSDC);
        uint256 balance = address(this).balance;
        payable(deployer).transfer(balance);
    }

    function withdraw() external OnlyDeployer {
        uint256 balance = address(this).balance;
        payable(deployer).transfer(balance);
    }

    function withdrawERC20(address token) external OnlyDeployer {
        uint256 balance = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(msg.sender, balance);
    }
}
