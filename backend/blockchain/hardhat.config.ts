import { HardhatUserConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatVerify from "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment from the parent backend/.env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const POLYGON_RPC_URL        = process.env.POLYGON_RPC_URL        || "";
const BLOCKCHAIN_PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATE_KEY || "";
const ETHERSCAN_API_KEY      = process.env.ETHERSCAN_API_KEY      || "";

const config: HardhatUserConfig = {
  plugins: [hardhatEthers, hardhatVerify],
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
    },
    amoyCustom: {
      type: "http",
      url: POLYGON_RPC_URL,
      accounts: BLOCKCHAIN_PRIVATE_KEY ? [BLOCKCHAIN_PRIVATE_KEY] : [],
      chainId: 80002,
    },
  },
  etherscan: {
    apiKey: {
      polygonAmoy: process.env.ETHERSCAN_API_KEY || "VCKNQN7H1Q4PKJZ3IF52ZPK26MYM6AKASK",
      amoyCustom: process.env.ETHERSCAN_API_KEY || "VCKNQN7H1Q4PKJZ3IF52ZPK26MYM6AKASK",
    },
    customChains: [
      {
        network: "amoyCustom",
        chainId: 80002,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=80002",
          browserURL: "https://amoy.polygonscan.com"
        }
      }
    ]
  },
  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },
};

export default config;

