# Solidity API

## ChessWager

https://github.com/Chess-Fish

_This contract is designed for managing chess wagers between users, saving
game moves, and handling the payout of 1v1 matches. The Tournament
Contract can call into this contract to create tournament matches among users._

### GameWager

```solidity
struct GameWager {
  address player0;
  address player1;
  address wagerToken;
  uint256 wager;
  uint256 numberOfGames;
  bool hasPlayerAccepted;
  uint256 timeLimit;
  uint256 timeLastMove;
  uint256 timePlayer0;
  uint256 timePlayer1;
  bool isTournament;
  bool isComplete;
  bool hasBeenPaid;
}
```

### WagerStatus

```solidity
struct WagerStatus {
  bool isPlayer0White;
  uint256 winsPlayer0;
  uint256 winsPlayer1;
}
```

### Game

```solidity
struct Game {
  uint16[] moves;
}
```

### GaslessMoveData

```solidity
struct GaslessMoveData {
  address signer;
  address player0;
  address player1;
  uint16 move;
  uint256 moveNumber;
  uint256 expiration;
  bytes32 messageHash;
}
```

### gameWagers

```solidity
mapping(address => struct ChessWager.GameWager) gameWagers
```

_address wager => GameWager_

### wagerPrizes

```solidity
mapping(address => uint256) wagerPrizes
```

_address wager => WagerPrize_

### games

```solidity
mapping(address => mapping(uint256 => struct ChessWager.Game)) games
```

_address wager => gameID => Game_

### gameIDs

```solidity
mapping(address => uint256[]) gameIDs
```

_address wager => gameIDs_

### wagerStatus

```solidity
mapping(address => struct ChessWager.WagerStatus) wagerStatus
```

_address wager => Player Wins_

### userGames

```solidity
mapping(address => address[]) userGames
```

_player can see game challenges_

### allWagers

```solidity
address[] allWagers
```

_address[] wagers_

### ChessFishToken

```solidity
address ChessFishToken
```

_CFSH Token Address_

### DividendSplitter

```solidity
address DividendSplitter
```

_Dividend Splitter contract_

### ChessFishNFT

```solidity
address ChessFishNFT
```

_ChessFish Winner NFT contract_

### gaslessGame

```solidity
contract GaslessGame gaslessGame
```

_Gasless Game Helper Contract_

### constructor

```solidity
constructor(address moveVerificationAddress, address _GaslessGame, address _DividendSplitter, address _ChessFishNFT) public
```

### createGameWagerEvent

```solidity
event createGameWagerEvent(address wager, address wagerToken, uint256 wagerAmount, uint256 timeLimit, uint256 numberOfGames)
```

### acceptWagerEvent

```solidity
event acceptWagerEvent(address wagerAddress, address userAddress)
```

### playMoveEvent

```solidity
event playMoveEvent(address wagerAddress, uint16 move)
```

### payoutWagerEvent

```solidity
event payoutWagerEvent(address wagerAddress, address winner, address wagerToken, uint256 wagerAmount, uint256 protocolFee)
```

### cancelWagerEvent

```solidity
event cancelWagerEvent(address wagerAddress, address userAddress)
```

### getAllWagersCount

```solidity
function getAllWagersCount() external view returns (uint256)
```

### getAllWagerAddresses

```solidity
function getAllWagerAddresses() external view returns (address[])
```

### getAllUserGames

```solidity
function getAllUserGames(address player) external view returns (address[])
```

### getGameLength

```solidity
function getGameLength(address wagerAddress) external view returns (uint256)
```

### getGameMoves

```solidity
function getGameMoves(address wagerAddress, uint256 gameID) external view returns (struct ChessWager.Game)
```

### getLatestGameMoves

```solidity
function getLatestGameMoves(address wagerAddress) external view returns (uint16[])
```

### getNumberOfGamesPlayed

```solidity
function getNumberOfGamesPlayed(address wagerAddress) internal view returns (uint256)
```

### getGameWagers

```solidity
function getGameWagers(address wagerAddress) external view returns (struct ChessWager.GameWager)
```

### getWagerPlayers

```solidity
function getWagerPlayers(address wagerAddress) external view returns (address, address)
```

### getWagerStatus

```solidity
function getWagerStatus(address wagerAddress) public view returns (address, address, uint256, uint256)
```

Get Wager Status

_Returns the current status of a specific wager._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| wagerAddress | address | The address of the wager for which the status is being requested. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | player0 The address of the first player in the wager. |
| [1] | address | player1 The address of the second player in the wager. |
| [2] | uint256 | winsPlayer0 The number of wins recorded for player0. |
| [3] | uint256 | winsPlayer1 The number of wins recorded for player1. |

### checkTimeRemaining

```solidity
function checkTimeRemaining(address wagerAddress) public view returns (int256, int256)
```

Checks how much time is remaining in game

_using int to quickly check if game lost on time and to prevent underflow revert_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int256 | timeRemainingPlayer0 |
| [1] | int256 | timeRemainingPlayer1 |

### getPlayerMove

```solidity
function getPlayerMove(address wagerAddress) public view returns (address)
```

Gets the address of the player whose turn it is

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| wagerAddress | address | address of the wager |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | playerAddress |

### isPlayerWhite

```solidity
function isPlayerWhite(address wagerAddress, address player) public view returns (bool)
```

Returns boolean if player is white or not

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| wagerAddress | address | address of the wager |
| player | address | address player |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | isPlayerWhite |

### getGameStatus

```solidity
function getGameStatus(address wagerAddress) public view returns (uint8, uint256, uint32, uint32)
```

Gets the game status for the last played game in a wager

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| wagerAddress | address | address of the wager |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint8 | outcome, |
| [1] | uint256 | gameState |
| [2] | uint32 | player0State |
| [3] | uint32 | player1State |

### getChainId

```solidity
function getChainId() internal view returns (uint256)
```

Returns chainId

_used for ensuring unique hash independent of chain_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | chainId |

### getWagerAddress

```solidity
function getWagerAddress(struct ChessWager.GameWager wager) internal view returns (address)
```

Generates unique hash for a game wager

_using keccak256 to generate a hash which is converted to an address_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | wagerAddress |

### verifyGameUpdateState

```solidity
function verifyGameUpdateState(bytes[] message, bytes[] signature) external returns (bool)
```

Verifies game moves and updates the state of the wager

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | isEndGame |

### verifyGameUpdateStateDelegated

```solidity
function verifyGameUpdateStateDelegated(bytes[2] delegations, bytes[] messages, bytes[] signatures) external returns (bool)
```

Verifies game moves and updates the state of the wager

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | isEndGame |

### TournamentHandler

```solidity
address TournamentHandler
```

### onlyTournament

```solidity
modifier onlyTournament()
```

### addTournamentHandler

```solidity
function addTournamentHandler(address _tournamentHandler) external
```

Adds Tournament contract

### startWagersInTournament

```solidity
function startWagersInTournament(address wagerAddress) external
```

Starts tournament wagers

### createGameWagerTournamentSingle

```solidity
function createGameWagerTournamentSingle(address player0, address player1, address wagerToken, uint256 wagerAmount, uint256 numberOfGames, uint256 timeLimit) external returns (address wagerAddress)
```

Creates a wager between two players

_only the tournament contract can call_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| wagerAddress | address | created wager address |

### createGameWager

```solidity
function createGameWager(address player1, address wagerToken, uint256 wager, uint256 timeLimit, uint256 numberOfGames) external payable returns (address wagerAddress)
```

Creates a 1v1 chess wager

### acceptWager

```solidity
function acceptWager(address wagerAddress) external
```

Player1 calls if they accept challenge

### playMove

```solidity
function playMove(address wagerAddress, uint16 move) external returns (bool)
```

Plays move on the board

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool true if endGame, adds extra game if stalemate |

### payoutWager

```solidity
function payoutWager(address wagerAddress) external returns (bool)
```

Handles payout of wager

_smallest wager amount is 18 wei before fees => 0_

### mintWinnerNFT

```solidity
function mintWinnerNFT(address wagerAddress) external
```

mint tournament winner NFT

### cancelWager

```solidity
function cancelWager(address wagerAddress) external
```

Cancel wager

_cancel wager only if other player has not yet accepted
&& only if msg.sender is one of the players_

### updateWagerStateTime

```solidity
function updateWagerStateTime(address wagerAddress) public returns (bool)
```

Updates the state of the wager if player time is < 0

_check when called with timeout w tournament
set to public so that anyone can update time if player disappears_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | wasUpdated returns true if status was updated |

### updateWagerStateInsufficientMaterial

```solidity
function updateWagerStateInsufficientMaterial(address wagerAddress) public returns (bool)
```

Update wager state if insufficient material

_set to public so that anyone can update_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | wasUpdated returns true if status was updated |

### depositToWager

```solidity
function depositToWager(address wagerAddress, uint256 amount) external
```

Deposits prize to wager address

_used to deposit prizes to wager_

## GaslessGame

https://github.com/Chess-Fish

_This smart contract is designed to handle gasless game moves. Key features include:

1. Off-Chain Move Signing: This contract enables game moves to be signed off-chain,
   significantly reducing the need for constant on-chain transactions. This approach
   substantially lowers transaction costs.

2. Delegated Signer Functionality: Players have the option to delegate a signer
   (generated on the front end) to execute moves on their behalf. This delegated
   signer functionality reduces the frequency of wallet signature requests,
   providing a smoother and more uninterrupted gameplay experience. It ensures
   that players can focus on strategy rather than managing transaction confirmations._

### GaslessMoveData

```solidity
struct GaslessMoveData {
  address signer;
  address player0;
  address player1;
  uint16 move;
  uint256 moveNumber;
  uint256 expiration;
  bytes32 messageHash;
}
```

### Delegation

```solidity
struct Delegation {
  address delegatorAddress;
  address delegatedAddress;
  address wagerAddress;
}
```

### SignedDelegation

```solidity
struct SignedDelegation {
  struct GaslessGame.Delegation delegation;
  bytes signature;
}
```

### moveVerification

```solidity
contract MoveVerification moveVerification
```

_MoveVerification contract_

### chessWager

```solidity
contract ChessWager chessWager
```

### deployer

```solidity
address deployer
```

_address deployer_

### onlyDeployer

```solidity
modifier onlyDeployer()
```

### constructor

```solidity
constructor(address moveVerificationAddress) public
```

### setChessWager

```solidity
function setChessWager(address _chessWager) external
```

set ChessWager contract

### generateMoveMessage

```solidity
function generateMoveMessage(address wager, uint16 move, uint256 moveNumber, uint256 expiration) public pure returns (bytes)
```

Generates gasless move message

### getMessageHash

```solidity
function getMessageHash(address wager, uint16 move, uint256 moveNumber, uint256 expiration) public pure returns (bytes32)
```

Generates gasless move hash

### decodeMoveMessage

```solidity
function decodeMoveMessage(bytes message) public pure returns (address, uint16, uint256, uint256)
```

Decodes gasless move message

### decodeWagerAddress

```solidity
function decodeWagerAddress(bytes message) internal pure returns (address)
```

Decodes gasless move message and returns wager address

### getEthSignedMessageHash

```solidity
function getEthSignedMessageHash(bytes32 _messageHash) internal pure returns (bytes32)
```

Gets signed message from gasless move hash

### validate

```solidity
function validate(bytes32 messageHash, bytes signature, address signer) internal pure
```

Validates that the signed hash was signed by the player

### verifyMoves

```solidity
function verifyMoves(address playerToMove, address player0, address player1, bytes[] messages, bytes[] signatures) internal view returns (uint16[] moves)
```

Verifies signed messages and signatures in for loop

_returns array of the gasless moves_

### verifyGameView

```solidity
function verifyGameView(bytes[] messages, bytes[] signatures) public view returns (address wagerAddress, uint8 outcome, uint16[] moves)
```

Verifies all signed messages and signatures

_appends onchain moves to gasless moves
reverts if invalid signature_

### createDelegation

```solidity
function createDelegation(address delegatorAddress, address delegatedAddress, address wagerAddress) external pure returns (struct GaslessGame.Delegation)
```

Create delegation data type helper function

### encodeSignedDelegation

```solidity
function encodeSignedDelegation(struct GaslessGame.Delegation delegation, bytes signature) external pure returns (bytes)
```

Encode signed delegation helper function

### checkDelegations

```solidity
function checkDelegations(struct GaslessGame.SignedDelegation signedDelegation0, struct GaslessGame.SignedDelegation signedDelegation1) internal pure
```

Check delegations

### verifyDelegation

```solidity
function verifyDelegation(struct GaslessGame.SignedDelegation signedDelegation) public pure
```

Verify delegation signature

### decodeSignedDelegation

```solidity
function decodeSignedDelegation(bytes signedDelegationBytes) public pure returns (struct GaslessGame.SignedDelegation signedDelegation)
```

Decode Signed Delegation

_this can be internal unless it's somehow required on the frontend_

### hashDelegation

```solidity
function hashDelegation(struct GaslessGame.Delegation delegationData) public pure returns (bytes32)
```

Hash Delegation data type

### verifyDelegatedAddress

```solidity
function verifyDelegatedAddress(bytes32 hashedDelegation, bytes signature, address delegatorAddress) internal pure
```

Verify delegator signature

### checkIfAddressesArePlayers

```solidity
function checkIfAddressesArePlayers(address delegator0, address delegator1, address wagerAddress) internal view
```

Check if delegators match players in wagerAddress

### verifyGameViewDelegated

```solidity
function verifyGameViewDelegated(bytes[2] delegations, bytes[] messages, bytes[] signatures) external view returns (address wagerAddress, uint8 outcome, uint16[] moves)
```

Verify game moves via delegated signature

## MoveHelper

https://github.com/Chess-Fish

_This contract handles move conversion functionality to the MoveVerification contract as well as setting board coordinates._

### pieces

```solidity
mapping(uint8 => string) pieces
```

### coordinates

```solidity
mapping(string => uint256) coordinates
```

_algebraic chess notation string => uint (0-63)_

### squareToCoordinate

```solidity
mapping(uint256 => string) squareToCoordinate
```

### deployer

```solidity
address deployer
```

_address deployer_

### moveVerification

```solidity
contract MoveVerification moveVerification
```

_MoveVerification contract_

### protocolFee

```solidity
uint256 protocolFee
```

_5% fee to token holders_

### OnlyDeployer

```solidity
modifier OnlyDeployer()
```

### initCoordinates

```solidity
function initCoordinates(string[64] coordinate, uint256[64] value) external
```

_called from ts since hardcoding the mapping makes the contract too large_

### initPieces

```solidity
function initPieces() internal
```

_Initialize pieces
This function significantly increases the size of the compiled bytecode..._

### getLetter

```solidity
function getLetter(uint8 piece) public view returns (string)
```

_Convert the number of a piece to the string character
        @param piece is the number of the piece
        @return string is the letter of the piece_

### convertFromMove

```solidity
function convertFromMove(uint16 move) public pure returns (uint8, uint8)
```

_Converts a move from a 16-bit integer to a 2 8-bit integers.
        @param move is the move to convert
        @return fromPos and toPos_

### convertToMove

```solidity
function convertToMove(uint8 fromPos, uint8 toPos) public pure returns (uint16)
```

_Converts two 8-bit integers to a 16-bit integer
        @param fromPos is the position to move a piece from.
        @param toPos is the position to move a piece to.
        @return move_

### moveToHex

```solidity
function moveToHex(string move) external view returns (uint16 hexMove)
```

_Converts an algebraic chess notation string move to uint16 format
        @param move is the move to convert i.e. e2e4 to hex move
        @return hexMove is the resulting uint16 value_

### hexToMove

```solidity
function hexToMove(uint16 hexMove) public view returns (string move)
```

_Converts a uint16 hex value to move in algebraic chess notation
        @param hexMove is the move to convert to string 
        @return move is the resulting string value_

### getBoard

```solidity
function getBoard(uint256 gameState) external view returns (string[64])
```

_returns string of letters representing the board
        @dev only to be called by user or ui
        @param gameState is the uint256 game state of the board 
        @return string[64] is the resulting array_

## MoveVerification

https://github.com/Chess-Fish
Forked from: https://github.com/marioevz/chess.eth (Updated from Solidity 0.7.6 to 0.8.17 & Added features and functionality)

This contract handles the logic for verifying the validity moves on the chessboard. Currently, pawns autoqueen by default.

### empty_const

```solidity
uint8 empty_const
```

### pawn_const

```solidity
uint8 pawn_const
```

### bishop_const

```solidity
uint8 bishop_const
```

### knight_const

```solidity
uint8 knight_const
```

### rook_const

```solidity
uint8 rook_const
```

### queen_const

```solidity
uint8 queen_const
```

### king_const

```solidity
uint8 king_const
```

### type_mask_const

```solidity
uint8 type_mask_const
```

### color_const

```solidity
uint8 color_const
```

### piece_bit_size

```solidity
uint8 piece_bit_size
```

### piece_pos_shift_bit

```solidity
uint8 piece_pos_shift_bit
```

### en_passant_const

```solidity
uint32 en_passant_const
```

### king_pos_mask

```solidity
uint32 king_pos_mask
```

### king_pos_zero_mask

```solidity
uint32 king_pos_zero_mask
```

### king_pos_bit

```solidity
uint16 king_pos_bit
```

### rook_king_side_move_mask

```solidity
uint32 rook_king_side_move_mask
```

_For castling masks, mask only the last bit of an uint8, to block any under/overflows._

### rook_king_side_move_bit

```solidity
uint16 rook_king_side_move_bit
```

### rook_queen_side_move_mask

```solidity
uint32 rook_queen_side_move_mask
```

### rook_queen_side_move_bit

```solidity
uint16 rook_queen_side_move_bit
```

### king_move_mask

```solidity
uint32 king_move_mask
```

### pieces_left_bit

```solidity
uint16 pieces_left_bit
```

### king_white_start_pos

```solidity
uint8 king_white_start_pos
```

### king_black_start_pos

```solidity
uint8 king_black_start_pos
```

### pos_move_mask

```solidity
uint16 pos_move_mask
```

### request_draw_const

```solidity
uint16 request_draw_const
```

### accept_draw_const

```solidity
uint16 accept_draw_const
```

### resign_const

```solidity
uint16 resign_const
```

### inconclusive_outcome

```solidity
uint8 inconclusive_outcome
```

### draw_outcome

```solidity
uint8 draw_outcome
```

### white_win_outcome

```solidity
uint8 white_win_outcome
```

### black_win_outcome

```solidity
uint8 black_win_outcome
```

### game_state_start

```solidity
uint256 game_state_start
```

### full_long_word_mask

```solidity
uint256 full_long_word_mask
```

### invalid_move_constant

```solidity
uint256 invalid_move_constant
```

### initial_white_state

```solidity
uint32 initial_white_state
```

_Initial white state:
                0f: 15 (non-king) pieces left
                00: Queen-side rook at a1 position
                07: King-side rook at h1 position
                04: King at e1 position
                ff: En-passant at invalid position_

### initial_black_state

```solidity
uint32 initial_black_state
```

_Initial black state:
                0f: 15 (non-king) pieces left
                38: Queen-side rook at a8 position
                3f: King-side rook at h8 position
                3c: King at e8 position
                ff: En-passant at invalid position_

### checkGameFromStart

```solidity
function checkGameFromStart(uint16[] moves) public pure returns (uint8, uint256, uint32, uint32)
```

### checkGame

```solidity
function checkGame(uint256 startingGameState, uint32 startingPlayerState, uint32 startingOpponentState, bool startingTurnBlack, uint16[] moves) public pure returns (uint8 outcome, uint256 gameState, uint32 playerState, uint32 opponentState)
```

_Calculates the outcome of a game depending on the moves from a starting position.
             Reverts when an invalid move is found.
        @param startingGameState Game state from which start the movements
        @param startingPlayerState State of the first playing player
        @param startingOpponentState State of the other playing player
        @param startingTurnBlack Whether the starting player is the black pieces
        @param moves is the input array containing all the moves in the game
        @return outcome can be 0 for inconclusive, 1 for draw, 2 for white winning, 3 for black winning_

### verifyExecuteMove

```solidity
function verifyExecuteMove(uint256 gameState, uint16 move, uint32 playerState, uint32 opponentState, bool currentTurnBlack) public pure returns (uint256 newGameState, uint32 newPlayerState, uint32 newOpponentState)
```

_Calculates the outcome of a single move given the current game state.
             Reverts for invalid movement.
        @param gameState current game state on which to perform the movement.
        @param move is the move to execute: 16-bit var, high word = from pos, low word = to pos
                move can also be: resign, request draw, accept draw.
        @param currentTurnBlack true if it's black turn
        @return newGameState the new game state after it's executed._

### verifyExecutePawnMove

```solidity
function verifyExecutePawnMove(uint256 gameState, uint8 fromPos, uint8 toPos, uint8 moveExtra, bool currentTurnBlack, uint32 playerState, uint32 opponentState) public pure returns (uint256 newGameState, uint32 newPlayerState)
```

_Calculates the outcome of a single move of a pawn given the current game state.
             Returns invalid_move_constant for invalid movement.
        @param gameState current game state on which to perform the movement.
        @param fromPos is position moving from.
        @param toPos is position moving to.
        @param currentTurnBlack true if it's black turn
        @return newGameState the new game state after it's executed._

### verifyExecuteKnightMove

```solidity
function verifyExecuteKnightMove(uint256 gameState, uint8 fromPos, uint8 toPos, bool currentTurnBlack) public pure returns (uint256)
```

_Calculates the outcome of a single move of a knight given the current game state.
             Returns invalid_move_constant for invalid movement.
        @param gameState current game state on which to perform the movement.
        @param fromPos is position moving from.
        @param toPos is position moving to.
        @param currentTurnBlack true if it's black turn
        @return newGameState the new game state after it's executed._

### verifyExecuteBishopMove

```solidity
function verifyExecuteBishopMove(uint256 gameState, uint8 fromPos, uint8 toPos, bool currentTurnBlack) public pure returns (uint256)
```

_Calculates the outcome of a single move of a bishop given the current game state.
             Returns invalid_move_constant for invalid movement.
        @param gameState current game state on which to perform the movement.
        @param fromPos is position moving from.
        @param toPos is position moving to.
        @param currentTurnBlack true if it's black turn
        @return newGameState the new game state after it's executed._

### verifyExecuteRookMove

```solidity
function verifyExecuteRookMove(uint256 gameState, uint8 fromPos, uint8 toPos, bool currentTurnBlack) public pure returns (uint256)
```

_Calculates the outcome of a single move of a rook given the current game state.
             Returns invalid_move_constant for invalid movement.
        @param gameState current game state on which to perform the movement.
        @param fromPos is position moving from.
        @param toPos is position moving to.
        @param currentTurnBlack true if it's black turn
        @return newGameState the new game state after it's executed._

### verifyExecuteQueenMove

```solidity
function verifyExecuteQueenMove(uint256 gameState, uint8 fromPos, uint8 toPos, bool currentTurnBlack) public pure returns (uint256)
```

_Calculates the outcome of a single move of the queen given the current game state.
             Returns invalid_move_constant for invalid movement.
        @param gameState current game state on which to perform the movement.
        @param fromPos is position moving from.
        @param toPos is position moving to.
        @param currentTurnBlack true if it's black turn
        @return newGameState the new game state after it's executed._

### verifyExecuteKingMove

```solidity
function verifyExecuteKingMove(uint256 gameState, uint8 fromPos, uint8 toPos, bool currentTurnBlack, uint32 playerState) public pure returns (uint256 newGameState, uint32 newPlayerState)
```

_Calculates the outcome of a single move of the king given the current game state.
             Returns invalid_move_constant for invalid movement.
        @param gameState current game state on which to perform the movement.
        @param fromPos is position moving from. Behavior is undefined for values >= 0x40.
        @param toPos is position moving to. Behavior is undefined for values >= 0x40.
        @param currentTurnBlack true if it's black turn
        @return newGameState the new game state after it's executed._

### checkQueenValidMoves

```solidity
function checkQueenValidMoves(uint256 gameState, uint8 fromPos, uint32 playerState, bool currentTurnBlack) public pure returns (bool)
```

_Checks if a move is valid for the queen in the given game state.
            Returns true if the move is valid, false otherwise.
        @param gameState The current game state on which to perform the movement.
        @param fromPos The position from which the queen is moving.
        @param playerState The player's state containing information about the king position.
        @param currentTurnBlack True if it's black's turn, false otherwise.
        @return A boolean indicating whether the move is valid or not._

### checkBishopValidMoves

```solidity
function checkBishopValidMoves(uint256 gameState, uint8 fromPos, uint32 playerState, bool currentTurnBlack) public pure returns (bool)
```

_Checks if a move is valid for the bishop in the given game state.
            Returns true if the move is valid, false otherwise.
        @param gameState The current game state on which to perform the movement.
        @param fromPos The position from which the bishop is moving. Behavior is undefined for values >= 0x40.
        @param playerState The player's state containing information about the king position.
        @param currentTurnBlack True if it's black's turn, false otherwise.
        @return A boolean indicating whether the move is valid or not._

### checkRookValidMoves

```solidity
function checkRookValidMoves(uint256 gameState, uint8 fromPos, uint32 playerState, bool currentTurnBlack) public pure returns (bool)
```

_Checks if a move is valid for the rook in the given game state.
            Returns true if the move is valid, false otherwise.
        @param gameState The current game state on which to perform the movement.
        @param fromPos The position from which the rook is moving. Behavior is undefined for values >= 0x40.
        @param playerState The player's state containing information about the king position.
        @param currentTurnBlack True if it's black's turn, false otherwise.
        @return A boolean indicating whether the move is valid or not._

### checkKnightValidMoves

```solidity
function checkKnightValidMoves(uint256 gameState, uint8 fromPos, uint32 playerState, bool currentTurnBlack) public pure returns (bool)
```

_Checks if a move is valid for the knight in the given game state.
            Returns true if the move is valid, false otherwise.
        @param gameState The current game state on which to perform the movement.
        @param fromPos The position from which the knight is moving. Behavior is undefined for values >= 0x40.
        @param playerState The player's state containing information about the king position.
        @param currentTurnBlack True if it's black's turn, false otherwise.
        @return A boolean indicating whether the move is valid or not._

### checkPawnValidMoves

```solidity
function checkPawnValidMoves(uint256 gameState, uint8 fromPos, uint32 playerState, uint32 opponentState, bool currentTurnBlack) public pure returns (bool)
```

_Checks if a move is valid for the pawn in the given game state.
            Returns true if the move is valid, false otherwise.
        @param gameState The current game state on which to perform the movement.
        @param fromPos The position from which the knight is moving. Behavior is undefined for values >= 0x40.
        @param playerState The player's state containing information about the king position.
        @param currentTurnBlack True if it's black's turn, false otherwise.
        @return A boolean indicating whether the move is valid or not._

### checkKingValidMoves

```solidity
function checkKingValidMoves(uint256 gameState, uint8 fromPos, uint32 playerState, bool currentTurnBlack) public pure returns (bool)
```

### searchPiece

```solidity
function searchPiece(uint256 gameState, uint32 playerState, uint32 opponentState, uint8 color, uint16 pBitOffset, uint16 bitSize) public pure returns (bool)
```

_Performs one iteration of recursive search for pieces. 
        @param gameState Game state from which start the movements
        @param playerState State of the player
        @param opponentState State of the opponent
        @return returns true if any of the pieces in the current offest has legal moves_

### checkEndgame

```solidity
function checkEndgame(uint256 gameState, uint32 playerState, uint32 opponentState) public pure returns (uint8)
```

_Checks the endgame state and determines whether the last user is checkmate'd or
             stalemate'd, or neither.
        @param gameState Game state from which start the movements
        @param playerState State of the player
        @return outcome can be 0 for inconclusive/only check, 1 stalemate, 2 checkmate_

### getInBetweenMask

```solidity
function getInBetweenMask(uint8 fromPos, uint8 toPos) public pure returns (uint256)
```

_Gets the mask of the in-between squares.
             Basically it performs bit-shifts depending on the movement.
             Down: >> 8
             Up: << 8
             Right: << 1
             Left: >> 1
             UpRight: << 9
             DownLeft: >> 9
             DownRight: >> 7
             UpLeft: << 7
             Reverts for invalid movement.
        @param fromPos is position moving from.
        @param toPos is position moving to.
        @return mask of the in-between squares, can be bit-wise-and with the game state to check squares_

### getPositionMask

```solidity
function getPositionMask(uint8 pos) public pure returns (uint256)
```

_Gets the mask (0xF) of a square
        @param pos square position.
        @return mask_

### getHorizontalMovement

```solidity
function getHorizontalMovement(uint8 fromPos, uint8 toPos) public pure returns (uint8)
```

_Calculates the horizontal movement between two positions on a chessboard.
        @param fromPos The starting position from which the movement is measured.
        @param toPos The ending position to which the movement is measured.
        @return The horizontal movement between the two positions._

### getVerticalMovement

```solidity
function getVerticalMovement(uint8 fromPos, uint8 toPos) public pure returns (uint8)
```

_Calculates the vertical movement between two positions on a chessboard.
        @param fromPos The starting position from which the movement is measured.
        @param toPos The ending position to which the movement is measured.
        @return The vertical movement between the two positions._

### checkForCheck

```solidity
function checkForCheck(uint256 gameState, uint32 playerState) public pure returns (bool)
```

_Checks if the king in the given game state is under attack (check condition).
        @param gameState The current game state to analyze.
        @param playerState The player's state containing information about the king position.
        @return A boolean indicating whether the king is under attack (check) or not._

### pieceUnderAttack

```solidity
function pieceUnderAttack(uint256 gameState, uint8 pos) public pure returns (bool)
```

_Checks if a piece at the given position is under attack in the given game state.
    @param gameState The current game state to analyze.
    @param pos The position of the piece to check for attack.
    @return A boolean indicating whether the piece at the given position is under attack._

### isStalemateViaInsufficientMaterial

```solidity
function isStalemateViaInsufficientMaterial(uint256 gameState) public pure returns (bool)
```

_Checks if gameState has insufficient material
        @param gameState current game state
        @return isInsufficient returns true if insufficient material_

### commitMove

```solidity
function commitMove(uint256 gameState, uint8 fromPos, uint8 toPos) public pure returns (uint256)
```

_Commits a move into the game state. Validity of the move is not checked.
        @param gameState current game state
        @param fromPos is the position to move a piece from.
        @param toPos is the position to move a piece to.
        @return newGameState_

### zeroPosition

```solidity
function zeroPosition(uint256 gameState, uint8 pos) public pure returns (uint256)
```

_Zeroes out a piece position in the current game state.
             Behavior is undefined for position values greater than 0x3f
        @param gameState current game state
        @param pos is the position to zero out: 6-bit var, 3-bit word, high word = row, low word = column.
        @return newGameState_

### setPosition

```solidity
function setPosition(uint256 gameState, uint8 pos, uint8 piece) public pure returns (uint256 newGameState)
```

_Sets a piece position in the current game state.
             Behavior is undefined for position values greater than 0x3f
        @param gameState current game state
        @param pos is the position to set the piece: 6-bit var, 3-bit word, high word = row, low word = column.
        @param piece to set, including color
        @return newGameState_

### pieceAtPosition

```solidity
function pieceAtPosition(uint256 gameState, uint8 pos) public pure returns (uint8)
```

_Gets the piece at a given position in the current gameState.
             Behavior is undefined for position values greater than 0x3f
        @param gameState current game state
        @param pos is the position to get the piece: 6-bit var, 3-bit word, high word = row, low word = column.
        @return piece value including color_

## IChessFishNFT

### awardWinner

```solidity
function awardWinner(address player, address wagerHash) external returns (uint256)
```

## IChessWager

### createGameWagerTournamentSingle

```solidity
function createGameWagerTournamentSingle(address player0, address player1, address wagerToken, uint256 wagerAmount, uint256 numberOfGames, uint256 timeLimit) external returns (address wagerAddress)
```

### startWagersInTournament

```solidity
function startWagersInTournament(address wagerAddress) external
```

### getWagerStatus

```solidity
function getWagerStatus(address wagerAddress) external view returns (address, address, uint256, uint256)
```

## ChessFishTournament

https://github.com/Chess-Fish

This contract handles the functionality of creating Round Robbin style tournaments as well as handling the payouts of ERC-20 tokens to tournament winners.
This contract creates wagers in the ChessWager smart contract and then reads the result of the created wagers to calculate the number of wins for each user in the tournament.

### Tournament

```solidity
struct Tournament {
  uint256 numberOfPlayers;
  address[] players;
  uint256 numberOfGames;
  address token;
  uint256 tokenAmount;
  uint256 prizePool;
  bool isInProgress;
  uint256 startTime;
  uint256 timeLimit;
  bool isComplete;
}
```

### PlayerWins

```solidity
struct PlayerWins {
  address player;
  uint256 wins;
}
```

### protocolFee

```solidity
uint256 protocolFee
```

_7% protocol fee_

### payoutProfile3

```solidity
uint256[3] payoutProfile3
```

_56% 37%_

### payoutProfile4_9

```solidity
uint256[4] payoutProfile4_9
```

_40% 25% 20% 15%_

### payoutProfile10_25

```solidity
uint256[7] payoutProfile10_25
```

_40% 25% 13.5% 10% 5% 2.5% 2.5%_

### tournamentNonce

```solidity
uint256 tournamentNonce
```

_increments for each new tournament_

### tournaments

```solidity
mapping(uint256 => struct ChessFishTournament.Tournament) tournaments
```

_uint tournamentNonce => Tournament struct_

### tournamentWagerAddresses

```solidity
mapping(uint256 => address[]) tournamentWagerAddresses
```

_uint tournament nonce => address[] wagerIDs_

### tournamentWins

```solidity
mapping(uint256 => mapping(address => uint256)) tournamentWins
```

_uint tournamentID = > address player => wins_

### ChessWagerAddress

```solidity
address ChessWagerAddress
```

### PaymentSplitter

```solidity
address PaymentSplitter
```

### constructor

```solidity
constructor(address _chessWager, address _paymentSplitter) public
```

### getTournamentPlayers

```solidity
function getTournamentPlayers(uint256 tournamentID) external view returns (address[])
```

Returns players in tournament

### getTournamentWagerAddresses

```solidity
function getTournamentWagerAddresses(uint256 tournamentID) external view returns (address[])
```

Returns wager addresses in tournament

### viewTournamentScore

```solidity
function viewTournamentScore(uint256 tournamentID) external view returns (address[], uint256[])
```

Calculates score

_designed as view only
returns addresses[] players
returns uint[] scores_

### getPlayersSortedByWins

```solidity
function getPlayersSortedByWins(uint256 tournamentID) public view returns (address[])
```

Returns addresses winners sorted by highest wins

### isPlayerInTournament

```solidity
function isPlayerInTournament(uint256 tournamentID, address player) internal view returns (bool)
```

Checks if address is in tournament

### createTournament

```solidity
function createTournament(uint256 numberOfPlayers, uint256 numberOfGames, address token, uint256 tokenAmount, uint256 timeLimit) external returns (uint256)
```

Creates a Tournament

_creates a tournament, and increases the global tournament nonce_

### joinTournament

```solidity
function joinTournament(uint256 tournamentID) external
```

Join tournament

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tournamentID | uint256 | the tournamentID of the tournament that the user wants to join |

### startTournament

```solidity
function startTournament(uint256 tournamentID) external
```

Starts the tournament

_minimum number of players = 3
if the number of players is greater than 3 and not equal to
the maxNumber of players the tournament can start 1 day after creation_

### exitTournament

```solidity
function exitTournament(uint256 tournamentID) external
```

Exit tournament

_user can exit if tournament is not in progress_

### payoutTournament

```solidity
function payoutTournament(uint256 tournamentID) external
```

Handle payout of tournament

_tallies, gets payout profile, sorts players by wins, handles payout_

### depositToTournament

```solidity
function depositToTournament(uint256 tournamentID, uint256 amount) external
```

Used to deposit prizes to tournament

## Token

_Test Token with large supply_

### _initial_supply

```solidity
uint256 _initial_supply
```

### value

```solidity
uint256 value
```

### constructor

```solidity
constructor() public
```

## USDC

_Test Token with large supply_

### _initial_supply

```solidity
uint256 _initial_supply
```

### value

```solidity
uint256 value
```

### constructor

```solidity
constructor() public
```

### decimals

```solidity
function decimals() public pure returns (uint8)
```

_Returns the number of decimals used to get its user representation.
For example, if `decimals` equals `2`, a balance of `505` tokens should
be displayed to a user as `5.05` (`505 / 10 ** 2`).

Tokens usually opt for a value of 18, imitating the relationship between
Ether and Wei. This is the value {ERC20} uses, unless this function is
overridden;

NOTE: This information is only used for _display_ purposes: it in
no way affects any of the arithmetic of the contract, including
{IERC20-balanceOf} and {IERC20-transfer}._

## ChessFish

### _initial_supply

```solidity
uint256 _initial_supply
```

### name_

```solidity
string name_
```

### symbol_

```solidity
string symbol_
```

### constructor

```solidity
constructor(address _owner) public
```

## CrowdSale

### deployer

```solidity
address deployer
```

### ChessFishToken

```solidity
address ChessFishToken
```

### USDC

```solidity
address USDC
```

### value

```solidity
uint256 value
```

### TokensPurchased

```solidity
event TokensPurchased(address buyer, uint256 amountIn, uint256 amountOut)
```

### OnlyDeployer

```solidity
modifier OnlyDeployer()
```

### constructor

```solidity
constructor(address _chessFishToken, address _USDC, uint256 _value) public
```

### deposit

```solidity
function deposit(uint256 amount) external
```

### getChessFishTokens

```solidity
function getChessFishTokens(uint256 amountIn) external
```

### endCrowdSale

```solidity
function endCrowdSale() external
```

### withdraw

```solidity
function withdraw() external
```

### withdrawERC20

```solidity
function withdrawERC20(address token) external
```

## PaymentSplitter

_This contract allows to split Ether payments among a group of accounts. The sender does not need to be aware
that the Ether will be split in this way, since it is handled transparently by the contract.

The split can be in equal parts or in any other arbitrary proportion. The way this is specified is by assigning each
account to a number of shares. Of all the Ether that this contract receives, each account will then be able to claim
an amount proportional to the percentage of total shares they were assigned. The distribution of shares is set at the
time of contract deployment and can't be updated thereafter.

`PaymentSplitter` follows a _pull payment_ model. This means that payments are not automatically forwarded to the
accounts but kept in this contract, and the actual transfer is triggered as a separate step by calling the {release}
function.

NOTE: This contract assumes that ERC20 tokens will behave similarly to native tokens (Ether). Rebasing tokens, and
tokens that apply fees during transfers, are likely to not be supported as expected. If in doubt, we encourage you
to run tests before sending real value to this contract._

### PayeeAdded

```solidity
event PayeeAdded(address account, uint256 shares)
```

### PaymentReleased

```solidity
event PaymentReleased(address to, uint256 amount)
```

### ERC20PaymentReleased

```solidity
event ERC20PaymentReleased(contract IERC20 token, address to, uint256 amount)
```

### PaymentReceived

```solidity
event PaymentReceived(address from, uint256 amount)
```

### CFSH_token

```solidity
address CFSH_token
```

### constructor

```solidity
constructor(address _token) public
```

_Creates an instance of `PaymentSplitter` where each account in `payees` is assigned the number of shares at
the matching position in the `shares` array.

All addresses in `payees` must be non-zero. Both arrays must have the same non-zero length, and there must be no
duplicates in `payees`._

### receive

```solidity
receive() external payable
```

_The Ether received will be logged with {PaymentReceived} events. Note that these events are not fully
reliable: it's possible for a contract to receive Ether without triggering this function. This only affects the
reliability of the events, and not the actual splitting of Ether.

To learn more about this see the Solidity documentation for
https://solidity.readthedocs.io/en/latest/contracts.html#fallback-function[fallback
functions]._

### totalShares

```solidity
function totalShares() public view returns (uint256)
```

_Getter for the total shares held by payees._

### totalReleasedNative

```solidity
function totalReleasedNative() public view returns (uint256)
```

_Getter for the total amount of Ether already released._

### totalReleasedERC20

```solidity
function totalReleasedERC20(contract IERC20 token) public view returns (uint256)
```

_Getter for the total amount of `token` already released. `token` should be the address of an IERC20
contract._

### shares

```solidity
function shares(address account) public view returns (uint256)
```

_Getter for the amount of shares held by an account._

### releasedNative

```solidity
function releasedNative(address account) public view returns (uint256)
```

_Getter for the amount of Ether already released to a payee._

### releasedERC20

```solidity
function releasedERC20(contract IERC20 token, address account) public view returns (uint256)
```

_Getter for the amount of `token` tokens already released to a payee. `token` should be the address of an
IERC20 contract._

### releasableNative

```solidity
function releasableNative(address account) public view returns (uint256)
```

_Getter for the amount of payee's releasable Ether._

### releasableERC20

```solidity
function releasableERC20(contract IERC20 token, address account) public view returns (uint256)
```

_Getter for the amount of payee's releasable `token` tokens. `token` should be the address of an
IERC20 contract._

### releaseNative

```solidity
function releaseNative(address payable account) public
```

_Triggers a transfer to `account` of the amount of Ether they are owed, according to their percentage of the
total shares and their previous withdrawals._

### releaseERC20

```solidity
function releaseERC20(contract IERC20 token, address account) public
```

_Triggers a transfer to `account` of the amount of `token` tokens they are owed, according to their
percentage of the total shares and their previous withdrawals. `token` must be the address of an IERC20
contract._

## TreasuryVester

### splitter

```solidity
address splitter
```

### cfsh

```solidity
address cfsh
```

### recipient

```solidity
address recipient
```

### vestingAmount

```solidity
uint256 vestingAmount
```

### vestingBegin

```solidity
uint256 vestingBegin
```

### vestingCliff

```solidity
uint256 vestingCliff
```

### vestingEnd

```solidity
uint256 vestingEnd
```

### lastUpdate

```solidity
uint256 lastUpdate
```

### constructor

```solidity
constructor(address cfsh_, address recipient_, uint256 vestingAmount_, uint256 vestingBegin_, uint256 vestingCliff_, uint256 vestingEnd_) public
```

### setRecipient

```solidity
function setRecipient(address recipient_) public
```

### claim

```solidity
function claim() public
```

### releaseDividendsERC20

```solidity
function releaseDividendsERC20(address token) external
```

### releaseDividendsNative

```solidity
function releaseDividendsNative() external
```

### setSplitterContract

```solidity
function setSplitterContract(address _splitter) external
```

## ICFSH

### balanceOf

```solidity
function balanceOf(address account) external view returns (uint256)
```

### transfer

```solidity
function transfer(address dst, uint256 rawAmount) external returns (bool)
```

## IPaymentSplitter

### releasableERC20

```solidity
function releasableERC20(address token, address account) external returns (uint256)
```

### releasableNative

```solidity
function releasableNative(address account) external returns (uint256)
```

### releaseERC20

```solidity
function releaseERC20(address token, address account) external
```

### releaseNative

```solidity
function releaseNative(address account) external
```

## ChessFishNFT

### wagerAddresses

```solidity
mapping(uint256 => address) wagerAddresses
```

### ChessWager

```solidity
address ChessWager
```

### deployer

```solidity
address deployer
```

### onlyChessFishWager

```solidity
modifier onlyChessFishWager()
```

### onlyDeployer

```solidity
modifier onlyDeployer()
```

### constructor

```solidity
constructor() public
```

### setChessFishAddress

```solidity
function setChessFishAddress(address _chessFish) external
```

### awardWinner

```solidity
function awardWinner(address player, address wagerAddress) external returns (uint256)
```

