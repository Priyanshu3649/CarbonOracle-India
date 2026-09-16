import prisma from '../../prisma';
import { hashReport, MrvReportData } from './hash.service';
import { registerReport as contractRegister, getOnChainReport } from './contract.service';

/**
 * blockchain.service.ts — Orchestrator
 *
 * Given a batchId (UploadBatch), this service:
 *  1. Aggregates carbon data from the batch's tree measurements
 *  2. Builds an MrvReportData object
 *  3. Canonicalizes + SHA-256 hashes it
 *  4. Submits the hash to the CarbonOracleRegistry smart contract
 *  5. Persists the BlockchainRecord in MySQL
 *
 * It is called automatically after every successful CSV upload.
 */

const METHODOLOGY_VERSION   = process.env.METHODOLOGY_VERSION    || 'CarbonOracle-MRV-v1.0';
const CALCULATION_VERSION   = process.env.CALCULATION_VERSION    || 'CarbonOracle-Calc-v1.0';
const BLOCKCHAIN_NETWORK    = process.env.POLYGON_NETWORK        || 'amoy';
const CHAIN_ID              = parseInt(process.env.POLYGON_CHAIN_ID || '80002');
const CONTRACT_ADDRESS      = process.env.CARBON_ORACLE_CONTRACT_ADDRESS || '';
const BLOCK_EXPLORER_URL    = process.env.BLOCK_EXPLORER_URL || 'https://amoy.polygonscan.com';

export async function orchestrateBlockchainAnchor(batchId: string): Promise<void> {
  console.log(`[blockchain] Starting anchor for batch: ${batchId}`);

  try {
    // ── 1. Fetch batch + all its tree measurements ─────────────────────────
    const batch = await prisma.uploadBatch.findUnique({
      where: { id: batchId },
      include: {
        plot: true,
        tree_measurements: {
          include: { tree: true },
        },
      },
    });

    if (!batch) {
      console.error(`[blockchain] Batch ${batchId} not found`);
      return;
    }

    // ── 2. Check if already registered (idempotency) ───────────────────────
    const existing = await prisma.blockchainRecord.findUnique({
      where: { report_id: batchId },
    });
    if (existing && existing.status === 'CONFIRMED') {
      console.log(`[blockchain] Batch ${batchId} already CONFIRMED on-chain. Skipping.`);
      return;
    }

    // ── 3. Aggregate carbon from measurements ─────────────────────────────
    const measurements = batch.tree_measurements;
    const treeCount    = measurements.length;

    if (treeCount === 0) {
      console.log(`[blockchain] Batch ${batchId} has no measurements — skipping anchor.`);
      return;
    }

    const totalCarbonKg = measurements.reduce((sum, m) => sum + m.total_carbon_kg, 0);
    const co2eKg        = measurements.reduce((sum, m) => sum + m.co2e_kg,        0);
    const agcKg         = measurements.reduce((sum, m) => sum + m.agc_kg,         0);
    const bgcKg         = measurements.reduce((sum, m) => sum + m.bgc_kg,         0);

    // ── 4. Build MRV report data object ──────────────────────────────────
    const reportId = `BATCH-${batchId}-V1`;
    const now      = new Date().toISOString();

    const reportData: MrvReportData = {
      reportId,
      batchId,
      plotId:             batch.plot_id,
      plotName:           batch.plot.plot_name,
      treeCount,
      totalCarbonKg:      parseFloat(totalCarbonKg.toFixed(6)),
      co2eKg:             parseFloat(co2eKg.toFixed(6)),
      agcKg:              parseFloat(agcKg.toFixed(6)),
      bgcKg:              parseFloat(bgcKg.toFixed(6)),
      methodologyVersion: METHODOLOGY_VERSION,
      calculationVersion: CALCULATION_VERSION,
      dataSource:         'rover-csv',
      uploadedAt:         batch.uploaded_at.toISOString(),
      canonicalizedAt:    now,
    };

    // ── 5. Canonicalize + hash ─────────────────────────────────────────────
    const { canonical, hash } = hashReport(reportData);
    console.log(`[blockchain] Report hash: ${hash}`);

    // ── 6. Upsert PENDING record ───────────────────────────────────────────
    await prisma.blockchainRecord.upsert({
      where:  { report_id: batchId },
      create: {
        report_id:          batchId,
        report_hash:        hash,
        blockchain_network: BLOCKCHAIN_NETWORK,
        chain_id:           CHAIN_ID,
        contract_address:   CONTRACT_ADDRESS,
        methodology_version: METHODOLOGY_VERSION,
        calculation_version: CALCULATION_VERSION,
        status:             'PENDING',
      },
      update: {
        report_hash:  hash,
        status:       'PENDING',
        failure_reason: null,
      },
    });

    // ── 7. Submit to smart contract ────────────────────────────────────────
    const result = await contractRegister(
      reportId,
      hash,
      totalCarbonKg,
      co2eKg,
      METHODOLOGY_VERSION,
    );

    // ── 8. Persist confirmed record ────────────────────────────────────────
    await prisma.blockchainRecord.update({
      where: { report_id: batchId },
      data: {
        transaction_hash:   result.transactionHash,
        block_number:       result.blockNumber,
        status:             'CONFIRMED',
        recorded_at:        new Date(),
        explorer_url:       `${BLOCK_EXPLORER_URL}/tx/${result.transactionHash}`,
      },
    });

    console.log(`[blockchain] ✅ Batch ${batchId} anchored. TX: ${result.transactionHash}`);

  } catch (err: any) {
    console.error(`[blockchain] ❌ Failed for batch ${batchId}:`, err.message);

    // Mark as FAILED (never expose private key info in stored messages)
    const safeError = err.message?.replace(/0x[a-fA-F0-9]{60,}/g, '[REDACTED]');

    try {
      await prisma.blockchainRecord.upsert({
        where:  { report_id: batchId },
        create: {
          report_id:          batchId,
          report_hash:        '',
          blockchain_network: BLOCKCHAIN_NETWORK,
          chain_id:           CHAIN_ID,
          contract_address:   CONTRACT_ADDRESS,
          methodology_version: METHODOLOGY_VERSION,
          calculation_version: CALCULATION_VERSION,
          status:             'FAILED',
          failure_reason:     safeError,
        },
        update: {
          status:         'FAILED',
          failure_reason: safeError,
        },
      });
    } catch (dbErr) {
      console.error('[blockchain] Could not persist failure record:', dbErr);
    }
  }
}

// ─── Verification ──────────────────────────────────────────────────────────

export async function verifyReport(batchId: string): Promise<{
  verified:        boolean;
  reportId:        string;
  currentHash:     string;
  blockchainHash:  string | null;
  transactionHash: string | null;
  blockNumber:     number | null;
  network:         string;
  reason?:         string;
}> {
  const record = await prisma.blockchainRecord.findUnique({
    where: { report_id: batchId },
  });

  if (!record) {
    return {
      verified:        false,
      reportId:        batchId,
      currentHash:     '',
      blockchainHash:  null,
      transactionHash: null,
      blockNumber:     null,
      network:         BLOCKCHAIN_NETWORK,
      reason:          'No blockchain record found for this batch.',
    };
  }

  // Re-generate the hash from current DB data
  const batch = await prisma.uploadBatch.findUnique({
    where: { id: batchId },
    include: {
      plot: true,
      tree_measurements: { include: { tree: true } },
    },
  });

  if (!batch) {
    return {
      verified:        false,
      reportId:        batchId,
      currentHash:     '',
      blockchainHash:  record.report_hash,
      transactionHash: record.transaction_hash,
      blockNumber:     record.block_number,
      network:         BLOCKCHAIN_NETWORK,
      reason:          'Batch data not found in database.',
    };
  }

  const measurements = batch.tree_measurements;
  const totalCarbonKg = measurements.reduce((s, m) => s + m.total_carbon_kg, 0);
  const co2eKg        = measurements.reduce((s, m) => s + m.co2e_kg,        0);
  const agcKg         = measurements.reduce((s, m) => s + m.agc_kg,         0);
  const bgcKg         = measurements.reduce((s, m) => s + m.bgc_kg,         0);

  const reportData: MrvReportData = {
    reportId:           `BATCH-${batchId}-V1`,
    batchId,
    plotId:             batch.plot_id,
    plotName:           batch.plot.plot_name,
    treeCount:          measurements.length,
    totalCarbonKg:      parseFloat(totalCarbonKg.toFixed(6)),
    co2eKg:             parseFloat(co2eKg.toFixed(6)),
    agcKg:              parseFloat(agcKg.toFixed(6)),
    bgcKg:              parseFloat(bgcKg.toFixed(6)),
    methodologyVersion: record.methodology_version,
    calculationVersion: record.calculation_version,
    dataSource:         'rover-csv',
    uploadedAt:         batch.uploaded_at.toISOString(),
    canonicalizedAt:    record.recorded_at?.toISOString() || new Date().toISOString(),
  };

  const { hash: currentHash } = hashReport(reportData);
  const blockchainHash = record.report_hash;
  const verified = currentHash === blockchainHash;

  return {
    verified,
    reportId:        batchId,
    currentHash,
    blockchainHash,
    transactionHash: record.transaction_hash,
    blockNumber:     record.block_number,
    network:         `Polygon ${BLOCKCHAIN_NETWORK.charAt(0).toUpperCase() + BLOCKCHAIN_NETWORK.slice(1)}`,
    reason:          verified
      ? undefined
      : 'Report data does not match the blockchain-recorded version. Data may have been modified after anchoring.',
  };
}
