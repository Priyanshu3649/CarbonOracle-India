import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function main() {
  const rpcUrl = process.env.POLYGON_RPC_URL;
  const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    throw new Error("Missing POLYGON_RPC_URL or BLOCKCHAIN_PRIVATE_KEY in .env");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const deployer = new ethers.Wallet(privateKey, provider);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  CarbonOracle Registry — Deployment Script  ");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Deploying from: ${deployer.address}`);

  const balance = await provider.getBalance(deployer.address);
  console.log(`Wallet balance: ${ethers.formatEther(balance)} POL`);

  if (balance === 0n) {
    throw new Error(
      `Insufficient POL balance on ${process.env.POLYGON_NETWORK}.`
    );
  }

  console.log("\nDeploying CarbonOracleRegistry...");
  
  const artifactPath = path.resolve(__dirname, "../artifacts/contracts/CarbonOracleRegistry.sol/CarbonOracleRegistry.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  
  const Factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();

  console.log("\n✅ CarbonOracleRegistry deployed!");
  console.log(`   Contract Address : ${address}`);
  console.log(`   Transaction Hash : ${deployTx?.hash}`);
  console.log(`   Network          : ${process.env.POLYGON_NETWORK} (chain ${process.env.POLYGON_CHAIN_ID})`);
  console.log(`   Block Explorer   : ${process.env.BLOCK_EXPLORER_URL}/address/${address}`);
  console.log("\n🔧 Add this to your backend/.env:");
  console.log(`   CARBON_ORACLE_CONTRACT_ADDRESS=${address}`);

  const deploymentInfo = {
    contractName: "CarbonOracleRegistry",
    address,
    deployer: deployer.address,
    network: process.env.POLYGON_NETWORK || "polygon",
    chainId: parseInt(process.env.POLYGON_CHAIN_ID || "137"),
    transactionHash: deployTx?.hash,
    deployedAt: new Date().toISOString(),
  };

  const outPath = path.resolve(__dirname, "../deployments.json");
  let deployments: any[] = [];
  if (fs.existsSync(outPath)) {
    deployments = JSON.parse(fs.readFileSync(outPath, "utf-8"));
  }
  deployments.push(deploymentInfo);
  fs.writeFileSync(outPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📝 Deployment info saved to blockchain/deployments.json`);
}

main().catch((err) => {
  console.error("Deployment failed:", err.message);
  process.exit(1);
});
