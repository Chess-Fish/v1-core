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
 * @dev This contract handles the logic for storing chess wagers between users, storing game moves, and handling the payout of 1v1 matches.
 * The Tournament Contract is able to call into this contract to create tournament matches between users.
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

    /// @dev addres wager => Player Wins
    mapping(address => WagerStatus) public wagerStatus;

    /// @dev player can see game challenges
    mapping(address => address[]) public userGames;

    /// @dev address[] wagers
    address[] public allWagers;

    /// @dev  CFSH Token Address
    address public ChessFishToken;

    /// @dev  Dividend Splitter contract
    address public DividendSplitter;

    /// @dev ChessFish Winner NFT contract
    address public ChessFishNFT;

    constructor(
        address moveVerificationAddress,
        address _ChessFishToken,
        address _DividendSplitter,
        address _ChessFishNFT
    ) {
        moveVerification = MoveVerification(moveVerificationAddress);
        initPieces();

        ChessFishToken = _ChessFishToken;
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

    function getNumberOfGamesPlayed(address wagerAddress) internal view returns (uint) {
        return gameIDs[wagerAddress].length + 1;
    }

    /// @notice Get Wager Status
    /// @dev returns the status of the wager
    /// @return (address, address, uint, uint) address player0, address player1, winsPlayer0, winsPlayer1
    function getWagerStatus(address wagerAddress) external view returns (address, address, uint, uint) {
        return (
            gameWagers[wagerAddress].player0,
            gameWagers[wagerAddress].player1,
            wagerStatus[wagerAddress].winsPlayer0,
            wagerStatus[wagerAddress].winsPlayer1
        );
    }

    /// @notice Checks how much time is remaining in game
    /// @dev using int to quickly check if game lost on time and to prevent underflow revert
    /// @return timeRemainingPlayer0, timeRemainingPlayer1
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
    /// @return user
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
    /// @return bool
    function isPlayerWhite(address wagerAddress, address player) public view returns (bool) {
        if (gameWagers[wagerAddress].player0 == player) {
            return wagerStatus[wagerAddress].isPlayer0White;
        } else {
            return !wagerStatus[wagerAddress].isPlayer0White;
        }
    }

    /// @notice Gets the game status for the last played game in a wager
    /// @param wagerAddress address of the wager
    /// @return (outcome, gameState, player0State, player1State)
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

    /// @notice gets chainId
    /// @dev used for ensuring unique hash independent of chain
    function getChainId() internal view returns (uint256) {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        return chainId;
    }

    /// @notice Generates unique hash for a game wager
    /// @dev using keccak256 to generate a hash which is converted to an address
    /// @return address wagerAddress
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
    //// TOURNAMENT FUNCTIONS ////
    */

    // Tournament Contract Address
    address public TournamentHandler;

    modifier onlyTournament() {
        require(msg.sender == address(TournamentHandler), "not tournament contract");
        _;
    }

    function addTournamentHandler(address _tournamentHandler) external OnlyDeployer {
        TournamentHandler = _tournamentHandler;
    }

    function startWagersInTournament(address wagerAddress) external onlyTournament {
        gameWagers[wagerAddress].timeLastMove = block.timestamp;
    }

    /// @notice Function that creates a wager between two players
    /// @dev only the tournament contract can call
    /// @return wagerAddress wager address
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
            0, // timeLastMove // setting to zero since tournament hasn't started
            0, // timePlayer0
            0, // timePlayer1
            true, // isTournament
            false // isComplete
        );
        wagerAddress = getWagerAddress(gameWager);

        gameWagers[wagerAddress] = gameWager;

        // player0 is black since randomness is impossible
        // but each subsequent game players switch colors
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
    //// GASLESS MOVE VERIFICATION FUNCTIONS ////
    */

    function generateMoveMessage(
        address wager,
        uint16 move,
        uint moveNumber,
        uint expiration
    ) public pure returns (bytes memory) {
        return abi.encode(wager, move, moveNumber, expiration);
    }

    function getMessageHash(
        address wager,
        uint16 move,
        uint moveNumber,
        uint expiration
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(generateMoveMessage(wager, move, moveNumber, expiration)));
    }

    function decodeMoveMessage(bytes memory message) public pure returns (address, uint16, uint, uint) {
        (address wager, uint16 move, uint moveNumber, uint expiration) = abi.decode(
            message,
            (address, uint16, uint, uint)
        );
        return (wager, move, moveNumber, expiration);
    }

    function decodeWagerAddress(bytes memory message) internal pure returns (address) {
        (address wager, , , ) = abi.decode(message, (address, uint16, uint, uint));
        return wager;
    }

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
            // Determine signer based on the move index
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

        address playerToMove = getPlayerMove(wagerAddress);
        address player0 = gameWagers[wagerAddress].player0;
        address player1 = gameWagers[wagerAddress].player1;

        moves = verifyMoves(playerToMove, player0, player1, messages, signatures);

        // appending moves to onChainMoves if they exist
        uint16[] memory onChainMoves = games[wagerAddress][gameIDs[wagerAddress].length].moves;
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

    /// @notice Verifies game moves and updates the state of the wager
    function verifyGameUpdateState(bytes[] memory message, bytes[] memory signature) external returns (bool) {
        (address wagerAddress, uint outcome, uint16[] memory moves) = verifyGameView(message, signature);

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
    //// WRITE FUNCTIONS ////
    */

    /// @notice create a 1v1 chess wager
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
            false // isComplete
        );

        IERC20(wagerToken).safeTransferFrom(msg.sender, address(this), wager);

        wagerAddress = getWagerAddress(gameWager);

        require(gameWagers[wagerAddress].player0 == address(0), "failed to create wager");

        gameWagers[wagerAddress] = gameWager;

        // first player to challenge is black since randomness is impossible
        // each subsequent game players switch colors
        WagerStatus memory status = WagerStatus(false, 0, 0);
        wagerStatus[wagerAddress] = status;

        userGames[msg.sender].push(wagerAddress);
        userGames[player1].push(wagerAddress);

        // update global state
        allWagers.push(wagerAddress);

        emit createGameWagerEvent(wagerAddress, wagerToken, wager, timeLimit, numberOfGames);

        return wagerAddress;
    }

    /// @notice player1 calls if they accept challenge
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

    /// @notice handles payout of wager
    /// @dev smallest wager amount is 18 wei before fees => 0
    function payoutWager(address wagerAddress) external returns (bool) {
        require(
            gameWagers[wagerAddress].player0 == msg.sender || gameWagers[wagerAddress].player1 == msg.sender,
            "not listed"
        );
        require(gameWagers[wagerAddress].isComplete == true, "wager not finished");
        require(gameWagers[wagerAddress].isTournament == false, "tournament payment handled by tournament contract");

        address winner;

        /// @notice if there was a stalemate and now both players have the same score
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

        // 5% shareholder fee
        uint shareHolderFee = ((wagerAmount + prize) * protocolFee) / 10000;
        uint wagerPayout = (wagerAmount + prize) - shareHolderFee;

        IERC20(token).safeTransfer(DividendSplitter, shareHolderFee);
        IERC20(token).safeTransfer(winner, wagerPayout);

        // Mint NFT for Winner
        IChessFishNFT(ChessFishNFT).awardWinner(winner, wagerAddress);

        emit payoutWagerEvent(wagerAddress, winner, token, wagerPayout, protocolFee);

        return true;
    }

    /// @notice Cancel wager
    /// @dev Cancel wager only if other player has not yet accepted
    /// @dev && only if msg.sender is one of the players
    function cancelWager(address wagerAddress) external returns (bool) {
        require(gameWagers[wagerAddress].hasPlayerAccepted == false, "in progress");
        require(gameWagers[wagerAddress].player0 == msg.sender, "not listed");
        require(gameWagers[wagerAddress].isTournament == false, "cannot cancel tournament wager");

        address token = gameWagers[wagerAddress].wagerToken;
        uint wagerAmount = gameWagers[wagerAddress].wager;

        gameWagers[wagerAddress].wager = 0;

        IERC20(token).safeTransfer(msg.sender, wagerAmount);

        emit cancelWagerEvent(wagerAddress, msg.sender);

        return true;
    }

    /// @notice Updates the state of the wager if player time is < 0
    /// @dev check when called with timeout w tournament
    /// @dev Set to public so that anyone can update time if player disappears
    function updateWagerStateTime(address wagerAddress) public returns (bool) {
        require(getNumberOfGamesPlayed(wagerAddress) <= gameWagers[wagerAddress].numberOfGames, "wager ended");
        require(gameWagers[wagerAddress].timeLastMove != 0, "tournament match not started yet");

        (int timePlayer0, int timePlayer1) = checkTimeRemaining(wagerAddress);

        if (timePlayer0 < 0) {
            wagerStatus[wagerAddress].winsPlayer1 += 1;
            wagerStatus[wagerAddress].isPlayer0White = !wagerStatus[wagerAddress].isPlayer0White;
            gameIDs[wagerAddress].push(gameIDs[wagerAddress].length);
            return true;
        }
        if (timePlayer1 < 0) {
            wagerStatus[wagerAddress].winsPlayer0 += 1;
            wagerStatus[wagerAddress].isPlayer0White = !wagerStatus[wagerAddress].isPlayer0White;
            gameIDs[wagerAddress].push(gameIDs[wagerAddress].length);
            return true;
        }
        return false;
    }

    /// @notice Update wager state if insufficient material
    /// @dev Set to public so that anyone can update
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

    /// @notice used to deposit prizes to wager
    function depositToWager(address wagerAddress, uint amount) external {
        require(!gameWagers[wagerAddress].isComplete, "wager completed");
        IERC20(gameWagers[wagerAddress].wagerToken).safeTransferFrom(msg.sender, address(this), amount);
        wagerPrizes[wagerAddress] += amount;
    }

    /// @notice checks the moves of the wager and updates state if neccessary
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

    /// @notice update wager time
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
