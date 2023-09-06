// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Test Token - For development purposes only
/// @dev Test Token with large supply

contract USDC is ERC20 {
    uint constant _initial_supply = 1_000_000 * (10 ** 6);

    uint public value;

    constructor() ERC20("USDC", "USDC") {
        _mint(msg.sender, _initial_supply);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
