import { ethers } from 'ethers';
import { hashToBytes32 } from './hash.service';

/**
 * contract.service.ts
 *
 * Handles all interactions with the CarbonOracleRegistry smart contract.
 * - Wallet and provider are created from environment variables.
 * - Private key is NEVER logged or exposed through API responses.
 */

// ─── ABI (minimal — only the functions we call) ────────────────────────────
const CONTRACT_ABI = [
  // Write
  'function registerReport(string calldata reportId, bytes32 reportHash, uint256 totalCarbonKg, uint256 co2eKg, string calldata methodologyVersion) external',
  // Read
  'function getReport(string calldata reportId) external view returns (string memory reportId_, bytes32 reportHash, uint256 totalCarbonKg, uint256 co2eKg, string memory methodologyVersion, uint256 timestamp)',
  'function reportExists_(string calldata reportId) external view returns (bool)',
  'function totalReports() external view returns (uint256)',
  // Events
  'event ReportRegistered(string indexed reportId, bytes32 indexed reportHash, uint256 totalCarbonKg, uint256 co2eKg, string methodologyVersion, uint256 timestamp)',
];

export interface OnChainReport {
  reportId:           string;
  reportHash:         string;
  totalCarbonKg:      number;
  co2eKg:             number;
  methodologyVersion: string;
  timestamp:          number;
}

export interface RegistrationResult {
  transactionHash: string;
  blockNumber:     number;
  gasUsed:         string;
  status:          'CONFIRMED' | 'FAILED';
}

// ─── Provider / Wallet (lazy-initialized) ─────────────────────────────────
let _provider: ethers.JsonRpcProvider | null = null;
let _wallet:   ethers.Wallet            | null = null;
let _contract: ethers.Contract          | null = null;

function getProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    const rpcUrl = process.env.POLYGON_RPC_URL;
    if (!rpcUrl) throw new Error('POLYGON_RPC_URL is not configured in environment');
    _provider = new ethers.JsonRpcProvider(rpcUrl);
  }
  return _provider;
}

function getWallet(): ethers.Wallet {
  if (!_wallet) {
    const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
    if (!privateKey) throw new Error('BLOCKCHAIN_PRIVATE_KEY is not configured in environment');
    _wallet = new ethers.Wallet(privateKey, getProvider());
  }
  return _wallet;
}

function getContract(): ethers.Contract {
  if (!_contract) {
    const address = process.env.CARBON_ORACLE_CONTRACT_ADDRESS;
    if (!address) throw new Error('CARBON_ORACLE_CONTRACT_ADDRESS is not configured in environment');
    _contract = new ethers.Contract(address, CONTRACT_ABI, getWallet());
  }
  return _contract;
}

// ─── Balance check ─────────────────────────────────────────────────────────

export async function checkWalletBalance(): Promise<{
  address: string;
  balancePOL: string;
  sufficient: boolean;
}> {
  const wallet = getWallet();
  const balance = await getProvider().getBalance(wallet.address);
  const balancePOL = ethers.formatEther(balance);
  // Require at least 0.001 POL to cover gas
  const sufficient = balance > ethers.parseEther('0.001');
  return { address: wallet.address, balancePOL, sufficient };
}

// ─── Registration ──────────────────────────────────────────────────────────

/**
 * Register a finalized MRV report hash on Polygon Amoy.
 *
 * @param reportId          Unique report/batch ID
 * @param reportHashHex     SHA-256 hex string (64 chars, without 0x prefix also ok)
 * @param totalCarbonKg     Total carbon in kg (float)
 * @param co2eKg            CO₂-equivalent in kg (float)
 * @param methodologyVersion Methodology version string
 */
export async function registerReport(
  reportId:           string,
  reportHashHex:      string,
  totalCarbonKg:      number,
  co2eKg:             number,
  methodologyVersion: string,
): Promise<RegistrationResult> {
  const { sufficient, balancePOL, address } = await checkWalletBalance();
  if (!sufficient) {
    throw new Error(
      `Insufficient Polygon Amoy test POL for blockchain transaction. ` +
      `Wallet ${address} has ${balancePOL} POL. ` +
      `Visit https://faucet.polygon.technology to get test tokens.`
    );
  }

  const contract = getContract();

  // Convert float kg → integer (×1000) for on-chain storage (no floats in Solidity)
  const totalCarbonScaled = BigInt(Math.round(totalCarbonKg * 1000));
  const co2eScaled        = BigInt(Math.round(co2eKg        * 1000));

  const reportHashBytes32 = hashToBytes32(reportHashHex);

  // Check duplicate BEFORE sending tx (saves gas)
  const alreadyExists = await contract.reportExists_(reportId);
  if (alreadyExists) {
    throw new Error(
      `Report "${reportId}" is already registered on-chain. ` +
      `Create a new version (e.g., "${reportId}-V2") instead of overwriting.`
    );
  }

  console.log(`[blockchain] Submitting report ${reportId} to Polygon Amoy...`);

  const tx: ethers.ContractTransactionResponse = await contract.registerReport(
    reportId,
    reportHashBytes32,
    totalCarbonScaled,
    co2eScaled,
    methodologyVersion,
  );

  console.log(`[blockchain] TX submitted: ${tx.hash}`);

  // Wait for 2 confirmations for reliability on Amoy
  const receipt = await tx.wait(2);
  if (!receipt || receipt.status !== 1) {
    throw new Error(`Transaction failed or reverted. Hash: ${tx.hash}`);
  }

  console.log(`[blockchain] ✅ Confirmed in block ${receipt.blockNumber}`);

  return {
    transactionHash: receipt.hash,
    blockNumber:     receipt.blockNumber,
    gasUsed:         receipt.gasUsed.toString(),
    status:          'CONFIRMED',
  };
}

// ─── Read ──────────────────────────────────────────────────────────────────

export async function getOnChainReport(reportId: string): Promise<OnChainReport | null> {
  try {
    const contract = getContract();
    const exists = await contract.reportExists_(reportId);
    if (!exists) return null;

    const result = await contract.getReport(reportId);
    return {
      reportId:           result.reportId_,
      reportHash:         result.reportHash,
      totalCarbonKg:      Number(result.totalCarbonKg) / 1000,
      co2eKg:             Number(result.co2eKg)        / 1000,
      methodologyVersion: result.methodologyVersion,
      timestamp:          Number(result.timestamp),
    };
  } catch (err: any) {
    if (err.message?.includes('report not found')) return null;
    throw err;
  }
}

export async function isReportRegistered(reportId: string): Promise<boolean> {
  const contract = getContract();
  return await contract.reportExists_(reportId);
}
