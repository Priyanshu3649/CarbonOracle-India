import { Router, Request, Response } from 'express';
import { authenticateToken } from './auth';
import {
  orchestrateBlockchainAnchor,
  verifyReport,
} from '../services/blockchain/blockchain.service';
import { checkWalletBalance } from '../services/blockchain/contract.service';
import prisma from '../prisma';

const router = Router();

// ─── GET /api/blockchain/status/:batchId ──────────────────────────────────
// Returns the current blockchain record for a batch (DB only, no chain call)
router.get('/status/:batchId', async (req: Request, res: Response) => {
  try {
    const batchId = req.params.batchId as string;
    const record = await prisma.blockchainRecord.findUnique({
      where: { report_id: batchId },
    });

    if (!record) {
      return res.status(404).json({
        error: 'No blockchain record found for this batch.',
        batchId,
      });
    }

    // Never expose private key — only safe metadata
    res.json({
      batchId,
      reportId:           `BATCH-${batchId}-V1`,
      status:             record.status,
      reportHash:         record.report_hash,
      transactionHash:    record.transaction_hash,
      blockNumber:        record.block_number,
      blockchainNetwork:  record.blockchain_network,
      chainId:            record.chain_id,
      contractAddress:    record.contract_address,
      explorerUrl:        record.explorer_url,
      methodologyVersion: record.methodology_version,
      calculationVersion: record.calculation_version,
      recordedAt:         record.recorded_at,
      failureReason:      record.status === 'FAILED' ? record.failure_reason : undefined,
    });
  } catch (err: any) {
    console.error('[blockchain route] status error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve blockchain status' });
  }
});

// ─── GET /api/blockchain/verify/:batchId ─────────────────────────────────
// Recomputes hash from DB and compares against stored blockchain hash
router.get('/verify/:batchId', async (req: Request, res: Response) => {
  try {
    const batchId = req.params.batchId as string;
    const result = await verifyReport(batchId);
    res.json(result);
  } catch (err: any) {
    console.error('[blockchain route] verify error:', err.message);
    res.status(500).json({ error: 'Verification failed', detail: err.message });
  }
});

// ─── POST /api/blockchain/register/:batchId ───────────────────────────────
// Manually (re-)trigger blockchain registration for a batch
// Only ADMIN role may trigger this
router.post('/register/:batchId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const batchId = req.params.batchId as string;
    const user = (req as any).user;

    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin role required to trigger blockchain registration' });
    }

    const batch = await prisma.uploadBatch.findUnique({ where: { id: batchId } });
    if (!batch) {
      return res.status(404).json({ error: `Batch ${batchId} not found` });
    }

    // Check if already confirmed — prevent re-submission
    const existing = await prisma.blockchainRecord.findUnique({ where: { report_id: batchId } });
    if (existing?.status === 'CONFIRMED') {
      return res.status(409).json({
        error: 'This batch is already CONFIRMED on-chain.',
        transactionHash: existing.transaction_hash,
        explorerUrl:     existing.explorer_url,
      });
    }

    // Fire async — return immediately, client polls /status
    orchestrateBlockchainAnchor(batchId).catch(console.error);

    res.status(202).json({
      message: 'Blockchain registration started. Poll /api/blockchain/status/:batchId for updates.',
      batchId,
    });
  } catch (err: any) {
    console.error('[blockchain route] register error:', err.message);
    res.status(500).json({ error: 'Failed to start registration' });
  }
});

// ─── GET /api/blockchain/transaction/:batchId ────────────────────────────
// Full transaction details for a confirmed batch
router.get('/transaction/:batchId', async (req: Request, res: Response) => {
  try {
    const batchId = req.params.batchId as string;
    const record = await prisma.blockchainRecord.findUnique({ where: { report_id: batchId } });

    if (!record) {
      return res.status(404).json({ error: 'No blockchain record found' });
    }
    if (record.status !== 'CONFIRMED') {
      return res.status(202).json({ status: record.status, message: 'Transaction not yet confirmed' });
    }

    res.json({
      reportId:          `BATCH-${batchId}-V1`,
      transactionHash:   record.transaction_hash,
      blockNumber:       record.block_number,
      network:           record.blockchain_network,
      chainId:           record.chain_id,
      contractAddress:   record.contract_address,
      explorerUrl:       record.explorer_url,
      recordedAt:        record.recorded_at,
    });
  } catch (err: any) {
    console.error('[blockchain route] transaction error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve transaction details' });
  }
});

// ─── GET /api/blockchain/records ─────────────────────────────────────────
// List all blockchain records (paginated)
router.get('/records', async (req: Request, res: Response) => {
  try {
    const page  = parseInt(req.query.page  as string || '1');
    const limit = parseInt(req.query.limit as string || '20');
    const skip  = (page - 1) * limit;

    const [records, total] = await Promise.all([
      prisma.blockchainRecord.findMany({
        orderBy: { recorded_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.blockchainRecord.count(),
    ]);

    res.json({ records, total, page, limit });
  } catch (err: any) {
    console.error('[blockchain route] records error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve records' });
  }
});

// ─── GET /api/blockchain/wallet-status ───────────────────────────────────
// Check backend wallet balance (ADMIN only)
router.get('/wallet-status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    const status = await checkWalletBalance();
    res.json({
      address:    status.address,
      balancePOL: status.balancePOL,
      sufficient: status.sufficient,
      network:    process.env.POLYGON_NETWORK || 'amoy',
    });
  } catch (err: any) {
    console.error('[blockchain route] wallet-status error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
