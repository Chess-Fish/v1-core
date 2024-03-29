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

import "./interfaces/interfaces.sol";
import "./MoveHelper.sol";

import "./GaslessGame.sol";

/**
 * @title ChessFish ChessWager Contract
 * @author ChessFish
 * @notice https://github.com/Chess-Fish
 *
 * @dev This contract is designed for managing chess wagers between users, saving
 * game moves, and handling the payout of 1v1 matches. The Tournament
 * Contract can call into this contract to create tournament matches among users.
 */

contract ChessWager is MoveHelper {
	using SafeERC20 for IERC20;

	struct GameWager {
		address player0;
		address player1;
		address wagerToken;
		uint wager;
		uint numberOfGames;
		bool hasPlayerAccepted;
		uint timeLimit;
		uint timeLastMove;
		uint timePlayer0;
		uint timePlayer1;
		bool isTournament;
		bool isComplete;
		bool hasBeenPaid;
	}

	struct WagerStatus {
		bool isPlayer0White;
		uint winsPlayer0;
		uint winsPlayer1;
	}

	struct Game {
		uint16[] moves;
	}

	struct GaslessMoveData {
		address signer;
		address player0;
		address player1;
		uint16 move;
		uint moveNumber;
		uint expiration;
		bytes32 messageHash;
	}

	/// @dev address wager => GameWager
	mapping(address => GameWager) public gameWagers;

	/// @dev address wager => WagerPrize
	mapping(address => uint) public wagerPrizes;

	/// @dev address wager => gameID => Game
	mapping(address => mapping(uint => Game)) games;

	/// @dev address wager => gameIDs
	mapping(address => uint[]) gameIDs;

	/// @dev address wager => Player Wins
	mapping(address => WagerStatus) public wagerStatus;

	/// @dev player can see game challenges
	mapping(address => address[]) public userGames;

	/// @dev address[] wagers
	address[] public allWagers;

	/// @dev CFSH Token Address
	address public ChessFishToken;

	/// @dev Dividend Splitter contract
	address public DividendSplitter;

	/// @dev ChessFish Winner NFT contract
	address public ChessFishNFT;

	/// @dev Gasless Game Helper Contract
	GaslessGame public gaslessGame;

	constructor(
		address moveVerificationAddress,
		address _GaslessGame,
		address _DividendSplitter,
		address _ChessFishNFT
	) {
		moveVerification = MoveVerification(moveVerificationAddress);
		gaslessGame = GaslessGame(_GaslessGame);

		initPieces();

		DividendSplitter = _DividendSplitter;
		ChessFishNFT = _ChessFishNFT;

		deployer = msg.sender;
	}

	/* 
    //// EVENTS ////
    */

	event createGameWagerEvent(address wager, address wagerToken, uint wagerAmount, uint timeLimit, uint numberOfGames);
	event acceptWagerEvent(address wagerAddress, address userAddress);
	event playMoveEvent(address wagerAddress, uint16 move);
	event payoutWagerEvent(
		address wagerAddress,
		address winner,
		address wagerToken,
		uint wagerAmount,
		uint protocolFee
	);
	event cancelWagerEvent(address wagerAddress, address userAddress);

	/* 
    //// VIEW FUNCTIONS ////
    */

	function getAllWagersCount() external view returns (uint) {
		return allWagers.length;
	}

	function getAllWagerAddresses() external view returns (address[] memory) {
		return allWagers;
	}

	function getAllUserGames(address player) external view returns (address[] memory) {
		return userGames[player];
	}

	function getGameLength(address wagerAddress) external view returns (uint) {
		return gameIDs[wagerAddress].length;
	}

	function getGameMoves(address wagerAddress, uint gameID) external view returns (Game memory) {
		return games[wagerAddress][gameID];
	}

	function getLatestGameMoves(address wagerAddress) external view returns (uint16[] memory) {
		return games[wagerAddress][gameIDs[wagerAddress].length].moves;
	}

	function getNumberOfGamesPlayed(address wagerAddress) internal view returns (uint) {
		return gameIDs[wagerAddress].length + 1;
	}

	function getGameWagers(address wagerAddress) external view returns (GameWager memory) {
		return gameWagers[wagerAddress];
	}

	function getWagerPlayers(address wagerAddress) external view returns (address, address) {
		return (gameWagers[wagerAddress].player0, gameWagers[wagerAddress].player1);
	}

	/// @notice Get Wager Status
	/// @dev Returns the current status of a specific wager.
	/// @param wagerAddress The address of the wager for which the status is being requested.
	/// @return player0 The address of the first player in the wager.
	/// @return player1 The address of the second player in the wager.
	/// @return winsPlayer0 The number of wins recorded for player0.
	/// @return winsPlayer1 The number of wins recorded for player1.
	function getWagerStatus(address wagerAddress) public view returns (address, address, uint, uint) {
		return (
			gameWagers[wagerAddress].player0,
			gameWagers[wagerAddress].player1,
			wagerStatus[wagerAddress].winsPlayer0,
			wagerStatus[wagerAddress].winsPlayer1
		);
	}

	/// @notice Checks how much time is remaining in game
	/// @dev using int to quickly check if game lost on time and to prevent underflow revert
	/// @return timeRemainingPlayer0
	/// @return timeRemainingPlayer1
	function checkTimeRemaining(address wagerAddress) public view returns (int, int) {
		address player0 = gameWagers[wagerAddress].player0;

		uint player0Time = gameWagers[wagerAddress].timePlayer0;
		uint player1Time = gameWagers[wagerAddress].timePlayer1;

		uint elapsedTime = block.timestamp - gameWagers[wagerAddress].timeLastMove;
		int timeLimit = int(gameWagers[wagerAddress].timeLimit);

		address player = getPlayerMove(wagerAddress);

		int timeRemainingPlayer0;
		int timeRemainingPlayer1;

		if (player == player0) {
			timeRemainingPlayer0 = timeLimit - int(elapsedTime + player0Time);
			timeRemainingPlayer1 = timeLimit - int(player1Time);
		} else {
			timeRemainingPlayer0 = timeLimit - int(player0Time);
			timeRemainingPlayer1 = timeLimit - int(elapsedTime + player1Time);
		}

		return (timeRemainingPlayer0, timeRemainingPlayer1);
	}

	/// @notice Gets the address of the player whose turn it is
	/// @param wagerAddress address of the wager
	/// @return playerAddress
	function getPlayerMove(address wagerAddress) public view returns (address) {
		uint gameID = gameIDs[wagerAddress].length;
		uint moves = games[wagerAddress][gameID].moves.length;

		bool isPlayer0White = wagerStatus[wagerAddress].isPlayer0White;

		if (isPlayer0White) {
			if (moves % 2 == 1) {
				return gameWagers[wagerAddress].player1;
			} else {
				return gameWagers[wagerAddress].player0;
			}
		} else {
			if (moves % 2 == 1) {
				return gameWagers[wagerAddress].player0;
			} else {
				return gameWagers[wagerAddress].player1;
			}
		}
	}

	/// @notice Returns boolean if player is white or not
	/// @param wagerAddress address of the wager
	/// @param player address player
	/// @return isPlayerWhite
	function isPlayerWhite(address wagerAddress, address player) public view returns (bool) {
		if (gameWagers[wagerAddress].player0 == player) {
			return wagerStatus[wagerAddress].isPlayer0White;
		} else {
			return !wagerStatus[wagerAddress].isPlayer0White;
		}
	}

	/// @notice Gets the game status for the last played game in a wager
	/// @param wagerAddress address of the wager
	/// @return outcome,
	/// @return gameState
	/// @return player0State
	/// @return player1State
	function getGameStatus(address wagerAddress) public view returns (uint8, uint256, uint32, uint32) {
		uint gameID = gameIDs[wagerAddress].length;
		uint16[] memory moves = games[wagerAddress][gameID].moves;

		if (moves.length == 0) {
			moves = games[wagerAddress][gameID - 1].moves;
		}

		(uint8 outcome, uint256 gameState, uint32 player0State, uint32 player1State) = moveVerification
			.checkGameFromStart(moves);

		return (outcome, gameState, player0State, player1State);
	}

	/// @notice Returns chainId
	/// @dev used for ensuring unique hash independent of chain
	/// @return chainId
	function getChainId() internal view returns (uint256) {
		uint256 chainId;
		assembly {
			chainId := chainid()
		}
		return chainId;
	}

	/// @notice Generates unique hash for a game wager
	/// @dev using keccak256 to generate a hash which is converted to an address
	/// @return wagerAddress
	function getWagerAddress(GameWager memory wager) internal view returns (address) {
		require(wager.player0 != wager.player1, "players must be different");
		require(wager.numberOfGames % 2 == 1, "number of games must be odd");

		uint blockNumber = block.number;
		uint chainId = getChainId();
		bytes32 blockHash = blockhash(blockNumber);

		bytes32 salt = keccak256(
			abi.encodePacked(
				wager.player0,
				wager.player1,
				wager.wagerToken,
				wager.wager,
				wager.timeLimit,
				wager.numberOfGames,
				blockNumber,
				chainId,
				blockHash
			)
		);

		address wagerAddress = address(uint160(bytes20(salt)));

		return wagerAddress;
	}

	/* 
    //// GASLESS GAME FUNCTIONS ////
    */

	/// @notice Verifies game moves and updates the state of the wager
	/// @return isEndGame
	function verifyGameUpdateState(bytes[] memory message, bytes[] memory signature) external returns (bool) {
		(address wagerAddress, uint outcome, uint16[] memory moves) = gaslessGame.verifyGameView(message, signature);

		uint gameID = gameIDs[wagerAddress].length;
		games[wagerAddress][gameID].moves = moves;

		if (outcome != 0) {
			updateWagerState(wagerAddress);
			return true;
		}
		if (outcome == 0) {
			return updateWagerStateInsufficientMaterial(wagerAddress);
		} else {
			return false;
		}
	}

	/// @notice Verifies game moves and updates the state of the wager
	/// @return isEndGame
	function verifyGameUpdateStateDelegated(
		bytes[2] memory delegations,
		bytes[] memory messages,
		bytes[] memory signatures
	) external returns (bool) {
		(address wagerAddress, uint outcome, uint16[] memory moves) = gaslessGame.verifyGameViewDelegated(
			delegations,
			messages,
			signatures
		);

		uint gameID = gameIDs[wagerAddress].length;
		games[wagerAddress][gameID].moves = moves;

		if (outcome != 0) {
			updateWagerState(wagerAddress);
			return true;
		}
		if (outcome == 0) {
			return updateWagerStateInsufficientMaterial(wagerAddress);
		} else {
			return false;
		}
	}

	/* 
    //// TOURNAMENT FUNCTIONS ////
    */

	// Tournament Contract Address
	address public TournamentHandler;

	modifier onlyTournament() {
		require(msg.sender == address(TournamentHandler), "not tournament contract");
		_;
	}

	/// @notice Adds Tournament contract
	function addTournamentHandler(address _tournamentHandler) external OnlyDeployer {
		TournamentHandler = _tournamentHandler;
	}

	/// @notice Starts tournament wagers
	function startWagersInTournament(address wagerAddress) external onlyTournament {
		gameWagers[wagerAddress].timeLastMove = block.timestamp;
	}

	/// @notice Creates a wager between two players
	/// @dev only the tournament contract can call
	/// @return wagerAddress created wager address
	function createGameWagerTournamentSingle(
		address player0,
		address player1,
		address wagerToken,
		uint wagerAmount,
		uint numberOfGames,
		uint timeLimit
	) external onlyTournament returns (address wagerAddress) {
		GameWager memory gameWager = GameWager(
			player0,
			player1,
			wagerToken,
			wagerAmount,
			numberOfGames,
			true, // hasPlayerAccepted
			timeLimit,
			0, // timeLastMove => setting to zero since tournament hasn't started
			0, // timePlayer0
			0, // timePlayer1
			true, // isTournament
			false, // isComplete
			false // hasBeenPaid
		);
		wagerAddress = getWagerAddress(gameWager);

		gameWagers[wagerAddress] = gameWager;

		WagerStatus memory status = WagerStatus(false, 0, 0);
		wagerStatus[wagerAddress] = status;

		userGames[player0].push(wagerAddress);
		userGames[player1].push(wagerAddress);

		// update global state
		allWagers.push(wagerAddress);

		emit createGameWagerEvent(wagerAddress, wagerToken, wagerAmount, timeLimit, numberOfGames);

		return wagerAddress;
	}

	/*
    //// WRITE FUNCTIONS ////
    */

	/// @notice Creates a 1v1 chess wager
	function createGameWager(
		address player1,
		address wagerToken,
		uint wager,
		uint timeLimit,
		uint numberOfGames
	) external payable returns (address wagerAddress) {
		GameWager memory gameWager = GameWager(
			msg.sender, // player0
			player1,
			wagerToken,
			wager,
			numberOfGames,
			false, // hasPlayerAccepted
			timeLimit,
			0, // timeLastMove
			0, // timePlayer0
			0, // timePlayer1
			false, // isTournament
			false, // isComplete
			false // hasBeenPaid
		);

		wagerAddress = getWagerAddress(gameWager);

		require(gameWagers[wagerAddress].player0 == address(0), "failed to create wager");

		gameWagers[wagerAddress] = gameWager;

		WagerStatus memory status = WagerStatus(false, 0, 0);
		wagerStatus[wagerAddress] = status;

		userGames[msg.sender].push(wagerAddress);
		userGames[player1].push(wagerAddress);

		// update global state
		allWagers.push(wagerAddress);

		IERC20(wagerToken).safeTransferFrom(msg.sender, address(this), wager);

		emit createGameWagerEvent(wagerAddress, wagerToken, wager, timeLimit, numberOfGames);

		return wagerAddress;
	}

	/// @notice Player1 calls if they accept challenge
	function acceptWager(address wagerAddress) external {
		address player1 = gameWagers[wagerAddress].player1;

		if (player1 == address(0)) {
			gameWagers[wagerAddress].player1 = msg.sender;
			userGames[msg.sender].push(wagerAddress);
		} else {
			require(gameWagers[wagerAddress].player1 == msg.sender, "msg.sender != player1");
		}

		address wagerToken = gameWagers[wagerAddress].wagerToken;
		uint wager = gameWagers[wagerAddress].wager;

		gameWagers[wagerAddress].hasPlayerAccepted = true;
		gameWagers[wagerAddress].timeLastMove = block.timestamp;

		IERC20(wagerToken).safeTransferFrom(msg.sender, address(this), wager);

		emit acceptWagerEvent(wagerAddress, msg.sender);
	}

	/// @notice Plays move on the board
	/// @return bool true if endGame, adds extra game if stalemate
	function playMove(address wagerAddress, uint16 move) external returns (bool) {
		require(getPlayerMove(wagerAddress) == msg.sender, "Not your turn");
		require(getNumberOfGamesPlayed(wagerAddress) <= gameWagers[wagerAddress].numberOfGames, "Wager ended");
		require(gameWagers[wagerAddress].timeLastMove != 0, "Tournament not started yet");

		/// @dev checking if time ran out
		updateTime(wagerAddress, msg.sender);

		bool isEndgameTime = updateWagerStateTime(wagerAddress);
		if (isEndgameTime) {
			return true;
		}

		uint gameID = gameIDs[wagerAddress].length;
		uint size = games[wagerAddress][gameID].moves.length;

		uint16[] memory moves = new uint16[](size + 1);

		/// @dev copy array
		for (uint i = 0; i < size; ) {
			moves[i] = games[wagerAddress][gameID].moves[i];
			unchecked {
				i++;
			}
		}

		/// @dev append move to last place in array
		moves[size] = move;

		/// @dev optimistically write to state
		games[wagerAddress][gameID].moves = moves;

		/// @dev fails on invalid move
		bool isEndgame = updateWagerState(wagerAddress);

		emit playMoveEvent(wagerAddress, move);

		return isEndgame;
	}

	/// @notice Handles payout of wager
	/// @dev smallest wager amount is 18 wei before fees => 0
	function payoutWager(address wagerAddress) external returns (bool) {
		require(
			gameWagers[wagerAddress].player0 == msg.sender || gameWagers[wagerAddress].player1 == msg.sender,
			"not listed"
		);
		require(gameWagers[wagerAddress].isComplete == true, "wager not finished");
		require(gameWagers[wagerAddress].isTournament == false, "tournament payment handled by tournament contract");
		require(gameWagers[wagerAddress].hasBeenPaid == false, "already paid");

		gameWagers[wagerAddress].hasBeenPaid = true;

		address winner;

		/// @dev if there was a stalemate and now both players have the same score
		/// @dev add another game to play, and return payout successful as false
		if (wagerStatus[wagerAddress].winsPlayer0 == wagerStatus[wagerAddress].winsPlayer1) {
			gameWagers[wagerAddress].numberOfGames++;
			return false;
		}

		if (wagerStatus[wagerAddress].winsPlayer0 > wagerStatus[wagerAddress].winsPlayer1) {
			winner = gameWagers[wagerAddress].player0;
		} else {
			winner = gameWagers[wagerAddress].player1;
		}

		address token = gameWagers[wagerAddress].wagerToken;
		uint wagerAmount = gameWagers[wagerAddress].wager * 2;
		uint prize = wagerPrizes[wagerAddress];

		gameWagers[wagerAddress].wager = 0;
		wagerPrizes[wagerAddress] = 0;

		/// @dev Mint NFT for Winner
		IChessFishNFT(ChessFishNFT).awardWinner(winner, wagerAddress);

		/// @dev 5% shareholder fee
		uint shareHolderFee = ((wagerAmount + prize) * protocolFee) / 10000;
		uint wagerPayout = (wagerAmount + prize) - shareHolderFee;

		IERC20(token).safeTransfer(DividendSplitter, shareHolderFee);
		IERC20(token).safeTransfer(winner, wagerPayout);

		emit payoutWagerEvent(wagerAddress, winner, token, wagerPayout, protocolFee);

		return true;
	}

	/// @notice mint tournament winner NFT
	function mintWinnerNFT(address wagerAddress) external {
		require(gameWagers[wagerAddress].isComplete == true, "wager not finished");
		require(gameWagers[wagerAddress].hasBeenPaid == false, "already paid");

		gameWagers[wagerAddress].hasBeenPaid == true;

		(address player0, address player1, uint wins0, uint wins1) = getWagerStatus(wagerAddress);

		address winner;
		if (wins0 > wins1) {
			winner = player0;
		} else {
			winner = player1;
		}

		IChessFishNFT(ChessFishNFT).awardWinner(winner, wagerAddress);
	}

	/// @notice Cancel wager
	/// @dev cancel wager only if other player has not yet accepted
	/// @dev && only if msg.sender is one of the players
	function cancelWager(address wagerAddress) external {
		require(gameWagers[wagerAddress].hasPlayerAccepted == false, "in progress");
		require(gameWagers[wagerAddress].player0 == msg.sender, "not listed");
		require(gameWagers[wagerAddress].isTournament == false, "cannot cancel tournament wager");

		address token = gameWagers[wagerAddress].wagerToken;
		uint wagerAmount = gameWagers[wagerAddress].wager;

		gameWagers[wagerAddress].wager = 0;

		IERC20(token).safeTransfer(msg.sender, wagerAmount);

		emit cancelWagerEvent(wagerAddress, msg.sender);
	}

	/// @notice Updates the state of the wager if player time is < 0
	/// @dev check when called with timeout w tournament
	/// @dev set to public so that anyone can update time if player disappears
	/// @return wasUpdated returns true if status was updated
	function updateWagerStateTime(address wagerAddress) public returns (bool) {
		require(getNumberOfGamesPlayed(wagerAddress) <= gameWagers[wagerAddress].numberOfGames, "wager ended");
		require(gameWagers[wagerAddress].timeLastMove != 0, "tournament match not started yet");

		(int timePlayer0, int timePlayer1) = checkTimeRemaining(wagerAddress);

		uint addedWins = gameWagers[wagerAddress].numberOfGames - getNumberOfGamesPlayed(wagerAddress) + 1;

		if (timePlayer0 < 0) {
			wagerStatus[wagerAddress].winsPlayer1 += addedWins;
			gameWagers[wagerAddress].isComplete = true;
			return true;
		}
		if (timePlayer1 < 0) {
			wagerStatus[wagerAddress].winsPlayer0 += addedWins;
			gameWagers[wagerAddress].isComplete = true;
			return true;
		}
		return false;
	}

	/// @notice Update wager state if insufficient material
	/// @dev set to public so that anyone can update
	/// @return wasUpdated returns true if status was updated
	function updateWagerStateInsufficientMaterial(address wagerAddress) public returns (bool) {
		require(getNumberOfGamesPlayed(wagerAddress) <= gameWagers[wagerAddress].numberOfGames, "wager ended");

		uint gameID = gameIDs[wagerAddress].length;
		uint16[] memory moves = games[wagerAddress][gameID].moves;

		(, uint256 gameState, , ) = moveVerification.checkGameFromStart(moves);

		bool isInsufficientMaterial = moveVerification.isStalemateViaInsufficientMaterial(gameState);

		if (isInsufficientMaterial) {
			wagerStatus[wagerAddress].winsPlayer0 += 1;
			wagerStatus[wagerAddress].winsPlayer1 += 1;
			wagerStatus[wagerAddress].isPlayer0White = !wagerStatus[wagerAddress].isPlayer0White;
			gameIDs[wagerAddress].push(gameIDs[wagerAddress].length);
			gameWagers[wagerAddress].numberOfGames += 1;
			return true;
		} else {
			return false;
		}
	}

	/// @notice Deposits prize to wager address
	/// @dev used to deposit prizes to wager
	function depositToWager(address wagerAddress, uint amount) external {
		require(!gameWagers[wagerAddress].isComplete, "wager completed");
		wagerPrizes[wagerAddress] += amount;
		IERC20(gameWagers[wagerAddress].wagerToken).safeTransferFrom(msg.sender, address(this), amount);
	}

	/// @notice Checks the moves of the wager and updates state if neccessary
	/// @return isEndGame
	function updateWagerState(address wagerAddress) private returns (bool) {
		require(getNumberOfGamesPlayed(wagerAddress) <= gameWagers[wagerAddress].numberOfGames, "wager ended");

		uint gameID = gameIDs[wagerAddress].length;
		uint16[] memory moves = games[wagerAddress][gameID].moves;

		// fails on invalid move
		(uint8 outcome, , , ) = moveVerification.checkGameFromStart(moves);

		// Inconclusive Outcome
		if (outcome == 0) {
			return false;
		}
		// Stalemate
		if (outcome == 1) {
			wagerStatus[wagerAddress].winsPlayer0 += 1;
			wagerStatus[wagerAddress].winsPlayer1 += 1;
			wagerStatus[wagerAddress].isPlayer0White = !wagerStatus[wagerAddress].isPlayer0White;
			gameIDs[wagerAddress].push(gameIDs[wagerAddress].length);
			gameWagers[wagerAddress].numberOfGames += 1;
			return true;
		}
		// Checkmate White
		if (outcome == 2) {
			if (isPlayerWhite(wagerAddress, gameWagers[wagerAddress].player0)) {
				wagerStatus[wagerAddress].winsPlayer0 += 1;
			} else {
				wagerStatus[wagerAddress].winsPlayer1 += 1;
			}
			wagerStatus[wagerAddress].isPlayer0White = !wagerStatus[wagerAddress].isPlayer0White;
			gameIDs[wagerAddress].push(gameIDs[wagerAddress].length);
			if (gameIDs[wagerAddress].length == gameWagers[wagerAddress].numberOfGames) {
				gameWagers[wagerAddress].isComplete = true;
			}
			return true;
		}
		// Checkmate Black
		if (outcome == 3) {
			if (isPlayerWhite(wagerAddress, gameWagers[wagerAddress].player0)) {
				wagerStatus[wagerAddress].winsPlayer1 += 1;
			} else {
				wagerStatus[wagerAddress].winsPlayer0 += 1;
			}
			wagerStatus[wagerAddress].isPlayer0White = !wagerStatus[wagerAddress].isPlayer0White;
			gameIDs[wagerAddress].push(gameIDs[wagerAddress].length);
			if (gameIDs[wagerAddress].length == gameWagers[wagerAddress].numberOfGames) {
				gameWagers[wagerAddress].isComplete = true;
			}
			return true;
		}
		return false;
	}

	/// @notice Updates wager time
	function updateTime(address wagerAddress, address player) private {
		bool isPlayer0 = gameWagers[wagerAddress].player0 == player;
		uint startTime = gameWagers[wagerAddress].timeLastMove;
		uint currentTime = block.timestamp;
		uint dTime = currentTime - startTime;

		if (isPlayer0) {
			gameWagers[wagerAddress].timePlayer0 += dTime;
			gameWagers[wagerAddress].timeLastMove = currentTime; // Update the start time for the next turn
		} else {
			gameWagers[wagerAddress].timePlayer1 += dTime;
			gameWagers[wagerAddress].timeLastMove = currentTime; // Update the start time for the next turn
		}
	}
}
