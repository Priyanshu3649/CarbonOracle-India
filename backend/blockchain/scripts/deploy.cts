const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deploys CarbonOracleRegistry to Polygon Amoy.
 *
 * Usage:
 *   npx hardhat run blockchain/scripts/deploy.cts --network amoy
 *
 * After deployment, copy the printed contract address to:
 *   backend/.env  →  CARBON_ORACLE_CONTRACT_ADDRESS=0x...
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  CarbonOracle Registry — Deployment Script  ");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Deploying from: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Wallet balance: ${ethers.formatEther(balance)} POL`);

  if (balance === 0n) {
    throw new Error(
      "Insufficient Polygon Amoy test POL. Visit https://faucet.polygon.technology to get test tokens."
    );
  }

  console.log("\nDeploying CarbonOracleRegistry...");
  const Factory = await ethers.getContractFactory("CarbonOracleRegistry");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();

  console.log("\n✅ CarbonOracleRegistry deployed!");
  console.log(`   Contract Address : ${address}`);
  console.log(`   Transaction Hash : ${deployTx?.hash}`);
  console.log(`   Network          : Polygon Amoy (chain 80002)`);
  console.log(`   Block Explorer   : https://amoy.polygonscan.com/address/${address}`);
  console.log("\n🔧 Add this to your backend/.env:");
  console.log(`   CARBON_ORACLE_CONTRACT_ADDRESS=${address}`);

  // Persist deployment info for reference
  const deploymentInfo = {
    contractName: "CarbonOracleRegistry",
    address,
    deployer: deployer.address,
    network: "polygon-amoy",
    chainId: 80002,
    transactionHash: deployTx?.hash,
    deployedAt: new Date().toISOString(),
  };

  const outPath = path.resolve(__dirname, "../deployments.json");
  let deployments = [];
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
