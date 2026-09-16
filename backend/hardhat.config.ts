import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load the backend .env
dotenv.config({ path: path.resolve(__dirname, ".env") });

const POLYGON_RPC_URL        = process.env.POLYGON_RPC_URL        || "";
const BLOCKCHAIN_PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATE_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  plugins: ["@nomicfoundation/hardhat-ethers"],
  networks: {
    hardhat: {
      type: "edr-simulated",
    },
    amoy: {
      type: "http",
      url: POLYGON_RPC_URL,
      accounts: BLOCKCHAIN_PRIVATE_KEY ? [BLOCKCHAIN_PRIVATE_KEY] : [],
      chainId: 80002,
    },
  },
  paths: {
    sources:   "./blockchain/contracts",
    tests:     "./blockchain/test",
    cache:     "./blockchain/cache",
    artifacts: "./blockchain/artifacts",
  },
};

export default config;

