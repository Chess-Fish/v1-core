import "@nomicfoundation/hardhat-toolbox";
import { config as dotenvConfig } from "dotenv";
import type { HardhatUserConfig } from "hardhat/config";
import type { NetworkUserConfig } from "hardhat/types";
import { resolve } from "path";
// import "hardhat-gas-reporter";
// import "solidity-coverage";
import "solidity-docgen";

const dotenvConfigPath: string = process.env.DOTENV_CONFIG_PATH || "./.env";
dotenvConfig({ path: resolve(__dirname, dotenvConfigPath) });

// Ensure that we have all the environment variables we need.
const mnemonic: string | undefined = process.env.MNEMONIC;
if (!mnemonic) {
    throw new Error("Please set your MNEMONIC in a .env file");
}

const chainIds = {
    mainnet: 1,
    polygon: 137,
    "arbitrum-mainnet": 42161,
    avalanche: 43114,
    bsc: 56,
    "optimism-mainnet": 10,
    "polygon-mumbai": 80001,
    sepolia: 11155111,
    arb_sepolia: 421614,
    arb_goerli: 421613,
    goerli: 5,
    chiado: 10200,
    "celo-testnet": 44787,
    hardhat: 31337,
};

function getChainConfig(chain: keyof typeof chainIds): NetworkUserConfig {
    let jsonRpcUrl: string;
    switch (chain) {
        case "mainnet":
            jsonRpcUrl = "https://eth.llamarpc.com";
            break;
        case "polygon":
            jsonRpcUrl = "https://polygon.llamarpc.com";
            break;
        case "avalanche":
            jsonRpcUrl = "https://api.avax.network/ext/bc/C/rpc";
            break;
        case "bsc":
            jsonRpcUrl = "https://bsc-dataseed1.binance.org";
            break;
        case "polygon-mumbai":
            jsonRpcUrl = "https://polygon-mumbai-bor.publicnode.com";
            break;
        case "goerli":
            jsonRpcUrl = "https://ethereum-goerli.publicnode.com";
            break;
        case "sepolia":
            jsonRpcUrl = "https://rpc.notadegen.com/eth/sepolia";
            break;
        case "arb_sepolia":
            jsonRpcUrl = "https://sepolia-rollup.arbitrum.io/rpc";
            break;
        case "arb_goerli":
            jsonRpcUrl = "https://sepolia-rollup.arbitrum.io/rpc";
            break;
        case "chiado":
            jsonRpcUrl = "https://rpc.chiado.gnosis.gateway.fm";
            break;
        case "celo-testnet":
            jsonRpcUrl = "https://alfajores-forno.celo-testnet.org";
            break;
        default:
            jsonRpcUrl = "https://matic-mumbai.chainstacklabs.com"; // https://matic-mumbai.chainstacklabs.com
    }
    return {
        accounts: {
            count: 10,
            mnemonic,
            path: "m/44'/60'/0'/0",
        },
        chainId: chainIds[chain],
        url: jsonRpcUrl,
    };
}

const config: HardhatUserConfig = {
    networks: {
        hardhat: {
            accounts: {
                mnemonic,
            },
            chainId: chainIds.hardhat,
        },
        mainnet: getChainConfig("mainnet"),
        polygon: getChainConfig("polygon"),
        arbitrum: getChainConfig("arbitrum-mainnet"),
        avalanche: getChainConfig("avalanche"),
        bsc: getChainConfig("bsc"),
        optimism: getChainConfig("optimism-mainnet"),
        "polygon-mumbai": getChainConfig("polygon-mumbai"),
        goerli: getChainConfig("goerli"),
        sepolia: getChainConfig("sepolia"),
        arb_sepolia: getChainConfig("arb_sepolia"),
        arb_goerli: getChainConfig("arb_goerli"),
        chiado: getChainConfig("chiado"),
        "celo-testnet": getChainConfig("celo-testnet"),
    },
    paths: {
        artifacts: "./artifacts",
        cache: "./cache",
        sources: "./contracts",
        tests: "./test",
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY,
    },
    solidity: {
        version: "0.8.22",
        settings: {
            metadata: {
                // Not including the metadata hash
                // https://github.com/paulrberg/hardhat-template/issues/31
                bytecodeHash: "none",
            },
            // Disable the optimizer when debugging
            // https://hardhat.org/hardhat-network/#solidity-optimizer-support
            optimizer: {
                enabled: true,
                runs: 10000,
            },
        },
    },
    gasReporter: {
        enabled: true,
        currency: "ETH", // currency to show
        outputFile: "gas-report.txt", // optional
        noColors: true, //optional
        coinmarketcap: process.env.COINMARKETCAP_API_KEY, //to fetch gas data
        token: "ETH", //
    },
};

export default config;
