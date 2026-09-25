import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Wallet, Leaf, Award, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

interface Credit {
  id: string;
  serial_number: string;
  vintage_year: number;
  quantity_tonnes: number;
  status: string;
  retired_at?: string;
  retirement_reason?: string;
  project: { id: string; title: string; vintage_year: number; methodology: string };
  certificate?: { id: string; certificate_number: string };
}

interface RetireModal {
  credit: Credit;
  beneficiary: string;
  reason: string;
  loading: boolean;
  error: string;
  done: boolean;
  certId: string;
}

export default function MyCredits() {
  const navigate = useNavigate();
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<RetireModal | null>(null);

  const load = () => {
    api.get('/marketplace/my-credits')
      .then(r => setCredits(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openRetire = (credit: Credit) =>
    setModal({ credit, beneficiary: '', reason: '', loading: false, error: '', done: false, certId: '' });

  const handleRetire = async () => {
    if (!modal) return;
    if (!modal.beneficiary.trim()) {
      setModal(m => m ? { ...m, error: 'Beneficiary name is required' } : null); return;
    }
    setModal(m => m ? { ...m, loading: true, error: '' } : null);
    try {
      const res = await api.post(`/marketplace/credits/${modal.credit.id}/retire`, {
        beneficiary_name:  modal.beneficiary,
        retirement_reason: modal.reason,
      });
      setModal(m => m ? { ...m, loading: false, done: true, certId: res.data.certificate.id } : null);
      load();
    } catch (e: any) {
      setModal(m => m ? { ...m, loading: false, error: e.response?.data?.error || 'Retirement failed' } : null);
    }
  };

  const available = credits.filter(c => c.status === 'AVAILABLE' || c.status === 'SOLD');
  const retired   = credits.filter(c => c.status === 'RETIRED');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark flex items-center gap-2">
          <Wallet size={26} className="text-brand-green" />
          My Carbon Credits
        </h1>
        <p className="text-sm text-gray-500 mt-1">Carbon credits you own — retire them to generate offset certificates</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Credits Owned',    value: available.length,                    color: 'text-brand-dark' },
          { label: 'Tonnes CO₂e',      value: available.reduce((s,c) => s + c.quantity_tonnes, 0).toFixed(1), color: 'text-brand-green' },
          { label: 'Credits Retired',  value: retired.length,                      color: 'text-purple-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading credits...</div>
      ) : credits.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <Wallet size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No credits yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Purchase credits from the marketplace to see them here.</p>
          <button
            onClick={() => navigate('/marketplace')}
            className="bg-brand-green text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-600"
          >
            Browse Marketplace
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Active credits */}
          {available.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                Active Credits ({available.length})
              </h2>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left">Serial Number</th>
                      <th className="px-4 py-3 text-left">Project</th>
                      <th className="px-4 py-3 text-left">Vintage</th>
                      <th className="px-4 py-3 text-left">Quantity</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {available.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.serial_number}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigate(`/marketplace/projects/${c.project.id}`)}
                            className="text-brand-dark hover:text-brand-green transition-colors text-left leading-snug"
                          >
                            {c.project.title}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{c.vintage_year}</td>
                        <td className="px-4 py-3 font-medium">{c.quantity_tonnes} tCO₂e</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            c.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                          }`}>{c.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openRetire(c)}
                            className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-lg hover:bg-purple-200 transition-colors"
                          >
                            <Leaf size={11} /> Retire
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Retired credits */}
          {retired.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                Retired Credits ({retired.length})
              </h2>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left">Serial Number</th>
                      <th className="px-4 py-3 text-left">Project</th>
                      <th className="px-4 py-3 text-left">Quantity</th>
                      <th className="px-4 py-3 text-left">Retired At</th>
                      <th className="px-4 py-3 text-left">Certificate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {retired.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-400 line-through">{c.serial_number}</td>
                        <td className="px-4 py-3 text-gray-500">{c.project.title}</td>
                        <td className="px-4 py-3">{c.quantity_tonnes} tCO₂e</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {c.retired_at ? new Date(c.retired_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {c.certificate ? (
                            <button
                              onClick={() => navigate(`/marketplace/certificates/${c.certificate!.id}`)}
                              className="flex items-center gap-1 text-xs text-brand-green hover:underline"
                            >
                              <Award size={11} /> View Cert <ExternalLink size={10} />
                            </button>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Retire Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            {modal.done ? (
              <div className="text-center space-y-4">
                <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                  <Award size={28} className="text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-brand-dark">Credit Retired!</h3>
                <p className="text-sm text-gray-500">
                  Your retirement certificate has been generated.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(`/marketplace/certificates/${modal.certId}`)}
                    className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm hover:bg-purple-700 transition-colors"
                  >
                    View Certificate
                  </button>
                  <button
                    onClick={() => setModal(null)}
                    className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-brand-dark mb-1">Retire Credit</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Retiring <span className="font-medium text-brand-dark">{modal.credit.serial_number}</span> permanently
                  removes it from circulation and generates a certificate.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      Beneficiary Name *
                    </label>
                    <input
                      value={modal.beneficiary}
                      onChange={e => setModal(m => m ? { ...m, beneficiary: e.target.value } : null)}
                      placeholder="Organisation or person offsetting emissions"
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      Retirement Reason (optional)
                    </label>
                    <input
                      value={modal.reason}
                      onChange={e => setModal(m => m ? { ...m, reason: e.target.value } : null)}
                      placeholder="e.g. Annual carbon offset 2026"
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green outline-none"
                    />
                  </div>
                  {modal.error && (
                    <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg p-2">
                      <AlertCircle size={13} /> {modal.error}
                    </div>
                  )}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                    ⚠️ Retirement is permanent and cannot be undone.
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => setModal(null)}
                    className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRetire}
                    disabled={modal.loading}
                    className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {modal.loading ? 'Retiring...' : 'Confirm Retirement'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
