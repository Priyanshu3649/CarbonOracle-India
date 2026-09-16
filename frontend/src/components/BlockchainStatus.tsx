import React, { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

const EXPLORER_BASE = 'https://amoy.polygonscan.com';

type BlockchainStatus = 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED' | 'NONE';

interface BlockchainRecord {
  batchId: string;
  reportId: string;
  status: BlockchainStatus;
  reportHash: string;
  transactionHash?: string;
  blockNumber?: number;
  blockchainNetwork?: string;
  contractAddress?: string;
  explorerUrl?: string;
  methodologyVersion?: string;
  recordedAt?: string;
  failureReason?: string;
}

interface VerifyResult {
  verified: boolean;
  reportId: string;
  currentHash: string;
  blockchainHash: string | null;
  transactionHash: string | null;
  blockNumber: number | null;
  network: string;
  reason?: string;
}

interface Props {
  batchId: string;
  onStatusChange?: (status: BlockchainStatus) => void;
}

const STATUS_CONFIG: Record<BlockchainStatus | 'NONE', { label: string; color: string; bg: string; border: string; dot: string }> = {
  NONE:      { label: 'Not Anchored',          color: 'text-slate-500', bg: 'bg-slate-50',    border: 'border-slate-200', dot: 'bg-slate-300' },
  PENDING:   { label: 'Anchoring…',            color: 'text-amber-600', bg: 'bg-amber-50',    border: 'border-amber-200', dot: 'bg-amber-400 animate-pulse' },
  SUBMITTED: { label: 'TX Submitted',          color: 'text-blue-600',  bg: 'bg-blue-50',     border: 'border-blue-200',  dot: 'bg-blue-400 animate-pulse' },
  CONFIRMED: { label: 'Blockchain Recorded',   color: 'text-emerald-600',bg: 'bg-emerald-50', border: 'border-emerald-200',dot: 'bg-emerald-500' },
  FAILED:    { label: 'Anchor Failed',         color: 'text-red-600',   bg: 'bg-red-50',      border: 'border-red-200',   dot: 'bg-red-500' },
};

function truncate(str: string, chars = 12): string {
  if (!str) return '';
  if (str.length <= chars * 2 + 3) return str;
  return `${str.slice(0, chars)}…${str.slice(-chars)}`;
}

export default function BlockchainStatus({ batchId, onStatusChange }: Props) {
  const [record, setRecord]         = useState<BlockchainRecord | null>(null);
  const [status, setStatus]         = useState<BlockchainStatus | 'NONE'>('NONE');
  const [loading, setLoading]       = useState(true);
  const [verifying, setVerifying]   = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [copied, setCopied]         = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      // Use the shared api instance which automatically attaches the JWT token
      const res = await api.get(`/blockchain/status/${batchId}`);
      setRecord(res.data);
      const s = res.data.status as BlockchainStatus;
      setStatus(s);
      onStatusChange?.(s);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setStatus('NONE');
        setRecord(null);
      }
    } finally {
      setLoading(false);
    }
  }, [batchId, onStatusChange]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll while PENDING or SUBMITTED
  useEffect(() => {
    if (status !== 'PENDING' && status !== 'SUBMITTED') return;
    const id = setInterval(fetchStatus, 4000);
    return () => clearInterval(id);
  }, [status, fetchStatus]);

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await api.get(`/blockchain/verify/${batchId}`);
      setVerifyResult(res.data);
    } catch (err: any) {
      setVerifyResult({
        verified: false,
        reportId: batchId,
        currentHash: '',
        blockchainHash: null,
        transactionHash: null,
        blockNumber: null,
        network: 'Polygon Amoy',
        reason: err.response?.data?.detail || 'Verification request failed.',
      });
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const cfg = STATUS_CONFIG[status];

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 animate-pulse py-2">
        <span className="w-2 h-2 rounded-full bg-slate-200 inline-block" />
        Checking blockchain status…
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 space-y-3`}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
          <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
          {status === 'CONFIRMED' && (
            <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
              ✓ MRV Integrity Anchored
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400 font-mono">Polygon Amoy Testnet</span>
      </div>

      {/* Details grid */}
      {record && (record.reportHash || record.transactionHash) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
          {record.reportHash && (
            <div className="space-y-0.5">
              <div className="text-slate-400 font-sans text-[11px] uppercase tracking-wide">Report Hash (SHA-256)</div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-700" title={record.reportHash}>{truncate(record.reportHash, 10)}</span>
                <button
                  onClick={() => copyToClipboard(record.reportHash, 'hash')}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  title="Copy full hash"
                >
                  {copied === 'hash' ? '✓' : '⧉'}
                </button>
              </div>
            </div>
          )}
          {record.transactionHash && (
            <div className="space-y-0.5">
              <div className="text-slate-400 font-sans text-[11px] uppercase tracking-wide">Transaction</div>
              <div className="flex items-center gap-1.5">
                <a
                  href={record.explorerUrl || `${EXPLORER_BASE}/tx/${record.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                  title={record.transactionHash}
                >
                  {truncate(record.transactionHash, 8)}
                </a>
                <button
                  onClick={() => copyToClipboard(record.transactionHash!, 'tx')}
                  className="text-slate-400 hover:text-slate-600"
                  title="Copy TX hash"
                >
                  {copied === 'tx' ? '✓' : '⧉'}
                </button>
                <a
                  href={record.explorerUrl || `${EXPLORER_BASE}/tx/${record.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-slate-600"
                  title="View on Polygonscan"
                >
                  ↗
                </a>
              </div>
            </div>
          )}
          {record.blockNumber && (
            <div className="space-y-0.5">
              <div className="text-slate-400 font-sans text-[11px] uppercase tracking-wide">Block</div>
              <span className="text-slate-700">#{record.blockNumber.toLocaleString()}</span>
            </div>
          )}
          {record.recordedAt && (
            <div className="space-y-0.5">
              <div className="text-slate-400 font-sans text-[11px] uppercase tracking-wide">Anchored At</div>
              <span className="text-slate-700">{new Date(record.recordedAt).toLocaleString()}</span>
            </div>
          )}
          {record.methodologyVersion && (
            <div className="space-y-0.5">
              <div className="text-slate-400 font-sans text-[11px] uppercase tracking-wide">Methodology</div>
              <span className="text-slate-700 font-sans">{record.methodologyVersion}</span>
            </div>
          )}
        </div>
      )}

      {/* FAILED reason */}
      {status === 'FAILED' && record?.failureReason && (
        <div className="rounded-lg bg-red-50 border border-red-100 p-2.5 space-y-1">
          <p className="text-xs font-semibold text-red-600">Why anchoring failed:</p>
          <p className="text-xs text-red-500">{record.failureReason}</p>
          {record.failureReason.includes('PRIVATE_KEY') && (
            <p className="text-xs text-red-400 mt-1">
              → Add <code className="bg-red-100 px-1 rounded">BLOCKCHAIN_PRIVATE_KEY</code> to{' '}
              <code className="bg-red-100 px-1 rounded">backend/.env</code> then restart the backend.
            </p>
          )}
          {record.failureReason.includes('CONTRACT_ADDRESS') && (
            <p className="text-xs text-red-400 mt-1">
              → Deploy the contract first:{' '}
              <code className="bg-red-100 px-1 rounded">npm run deploy:contract</code>
            </p>
          )}
          {record.failureReason.includes('POL') && (
            <p className="text-xs text-red-400 mt-1">
              → Get free test POL from{' '}
              <a href="https://faucet.polygon.technology" target="_blank" rel="noopener noreferrer" className="underline">
                faucet.polygon.technology
              </a>
            </p>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[11px] text-slate-400 leading-relaxed italic">
        This record proves MRV data integrity only. It does not constitute carbon-credit issuance or regulatory verification.
      </p>

      {/* Verify button — only when CONFIRMED */}
      {status === 'CONFIRMED' && (
        <div className="pt-1 border-t border-slate-200 space-y-2">
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {verifying ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin inline-block" />
                Verifying…
              </>
            ) : (
              <><span>🔍</span> Verify MRV Integrity</>
            )}
          </button>

          {verifyResult && (
            <div className={`rounded-lg p-3 text-sm font-medium flex items-start gap-2 ${
              verifyResult.verified
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              <span className="text-lg leading-none flex-shrink-0">{verifyResult.verified ? '✓' : '✕'}</span>
              <div>
                <div className="font-semibold">
                  {verifyResult.verified
                    ? 'BLOCKCHAIN INTEGRITY VERIFIED'
                    : 'DATA MODIFIED — INTEGRITY MISMATCH'}
                </div>
                {!verifyResult.verified && verifyResult.reason && (
                  <div className="mt-1 text-xs font-normal opacity-80">{verifyResult.reason}</div>
                )}
                {verifyResult.verified && (
                  <div className="mt-1 text-xs font-normal opacity-70">
                    Current database hash matches the on-chain record. Data is intact.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
