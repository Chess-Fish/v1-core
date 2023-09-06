<p align="center">
   <img src="/doc/4d_chess.jpeg" width="250">
</p>

# ChessFish v1-Core
![X (formerly Twitter) Follow](https://img.shields.io/twitter/follow/:evmchess)


In-depth documentation on ChessFish located at [docs.chess.fish](http://docs.chess.fish)

### About
ChessFish is a non-custodial chess wager smart contract and chess move verification algorithm implemented for the Ethereum Virtual Machine. ChessFish V1 offers the ability to play 1v1 chess or in tournaments up to 25 players while betting cryptocurrency on the outcome of the game. Users have the ability to specify different parameters for 1v1 wagers and tournaments. Users can set the ERC-20 token to wager, the number of games, and the time limit of the wager. Games can be played without paying for transaction fees by using ECDSA signatures.

### Run tests: 
```
npx hardhat test
```

### Linter
```
npx prettier --write '**/*.sol'  
npx prettier --write '**/*.ts'
```

### Test Coverage 
```
npx hardhat coverage
```

#### Docgen
```
npx hardhat docgen
```
