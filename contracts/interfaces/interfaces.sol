// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

interface IChessFishNFT {
    function awardWinner(address player, address wagerHash) external returns (uint256);
}

interface IChessWager {
    function createGameWagerTournamentSingle(
        address player0,
        address player1,
        address wagerToken,
        uint wagerAmount,
        uint numberOfGames,
        uint timeLimit
    ) external returns (address wagerAddress);

    function startWagersInTournament(address wagerAddress) external;

    function getWagerStatus(address wagerAddress) external view returns (address, address, uint, uint);
}
