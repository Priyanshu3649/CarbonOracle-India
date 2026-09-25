import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BlockchainStatus from '../components/BlockchainStatus';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5010';

interface Record {
  id: string;
  report_id: string;
  report_hash: string;
  status: string;
  transaction_hash?: string;
  block_number?: number;
  blockchain_network: string;
  explorer_url?: string;
  methodology_version: string;
  recorded_at?: string;
  failure_reason?: string;
}

export default function BlockchainReports() {
  const [records, setRecords]   = useState<Record[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    setLoading(true);
    axios.get(`${API_BASE}/api/blockchain/records?page=${page}&limit=10`, { headers })
      .then(r => { setRecords(r.data.records); setTotal(r.data.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const statusBadge = (status: string) => {
    const map: { [key: string]: string } = {
      CONFIRMED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      PENDING:   'bg-amber-100 text-amber-700 border-amber-200',
      SUBMITTED: 'bg-blue-100 text-blue-700 border-blue-200',
      FAILED:    'bg-red-100 text-red-700 border-red-200',
    };
    return map[status] || 'bg-slate-100 text-slate-600 border-slate-200';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            ⛓️ Blockchain Integrity Records
          </h1>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            Every CSV upload batch is anchored on <strong>Polygon Amoy</strong> via a SHA-256 hash
            of the canonical MRV report. These records prove data integrity — they do not constitute
            carbon-credit issuance.
          </p>
        </div>
        <a
          href="https://amoy.polygonscan.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
        >
          Polygon Amoy Explorer ↗
        </a>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['CONFIRMED','PENDING','FAILED','SUBMITTED'] as const).map(s => {
          const count = records.filter(r => r.status === s).length;
          return (
            <div key={s} className={`rounded-xl border p-3 ${statusBadge(s)}`}>
              <div className="text-lg font-bold">{count}</div>
              <div className="text-xs">{s}</div>
            </div>
          );
        })}
      </div>

      {/* Records table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">All Anchored Batches ({total})</span>
          <span className="text-xs text-slate-400">Auto-refreshes on upload</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 animate-pulse">Loading records…</div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <div className="text-3xl mb-2">📭</div>
            <div className="font-medium">No blockchain records yet.</div>
            <div className="text-sm mt-1">Upload a CSV batch to anchor your first MRV report.</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {records.map(r => (
              <div key={r.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                <div
                  className="flex items-start justify-between gap-3 cursor-pointer"
                  onClick={() => setSelected(selected === r.report_id ? null : r.report_id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-mono font-medium text-slate-700 truncate">
                        {r.report_id.substring(0, 20)}…
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${statusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-400 flex flex-wrap gap-3">
                      {r.recorded_at && <span>📅 {new Date(r.recorded_at).toLocaleString()}</span>}
                      {r.block_number && <span>🔲 Block #{r.block_number.toLocaleString()}</span>}
                      <span className="capitalize">🌐 {r.blockchain_network}</span>
                    </div>
                  </div>
                  <span className="text-slate-400 text-sm select-none">{selected === r.report_id ? '▲' : '▼'}</span>
                </div>

                {/* Expanded detail */}
                {selected === r.report_id && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <BlockchainStatus batchId={r.report_id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 10 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-sm">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              ← Prev
            </button>
            <span className="text-slate-500">Page {page} of {Math.ceil(total / 10)}</span>
            <button
              disabled={page >= Math.ceil(total / 10)}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-slate-400 text-center leading-relaxed max-w-2xl mx-auto">
        Blockchain anchoring proves MRV report data integrity. Carbon estimates are calculated by
        the CarbonOracle scientific engine (IPCC methodology). Blockchain does not create, validate,
        or issue carbon credits.
      </p>
    </div>
  );
}
