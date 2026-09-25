import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { 
  Store, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  PlusCircle,
  X
} from 'lucide-react';

export default function CompanyCredits() {
  const [credits, setCredits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCredit, setSelectedCredit] = useState<any | null>(null);
  const [listingForm, setListingForm] = useState({ price_per_credit: '', quantity: '1' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchCredits = () => {
    setLoading(true);
    api.get('/company/credits')
      .then((res) => setCredits(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  const handleOpenListModal = (credit: any) => {
    setSelectedCredit(credit);
    setListingForm({ price_per_credit: '25.00', quantity: '1' });
    setMessage(null);
  };

  const handleCloseModal = () => {
    setSelectedCredit(null);
    setMessage(null);
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCredit) return;
    setSubmitting(true);
    setMessage(null);

    try {
      await api.post('/company/listings', {
        credit_id: selectedCredit.id,
        price_per_credit: parseFloat(listingForm.price_per_credit),
        quantity: parseFloat(listingForm.quantity),
      });

      setMessage({ type: 'success', text: 'Credit successfully listed on marketplace!' });
      fetchCredits();
      setTimeout(() => handleCloseModal(), 1200);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to list credit for sale.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">Loading credit inventory...</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Carbon Credits</h1>
          <p className="text-slate-500 text-sm mt-1">
            Verified carbon credit holdings issued to your company projects.
          </p>
        </div>
      </div>

      {/* Credit Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="p-4">Credit Serial ID</th>
                <th className="p-4">Project / Farm</th>
                <th className="p-4">Vintage</th>
                <th className="p-4">Quantity</th>
                <th className="p-4">Verification</th>
                <th className="p-4">Blockchain Status</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {credits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No carbon credits found for your company.
                  </td>
                </tr>
              ) : (
                credits.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-mono font-semibold text-slate-900">{c.serial_number}</td>
                    <td className="p-4 font-medium text-slate-800">
                      <div>{c.project_title}</div>
                      <div className="text-[10px] text-slate-400">{c.plot_name}</div>
                    </td>
                    <td className="p-4 font-mono text-slate-600">{c.vintage_year}</td>
                    <td className="p-4 font-bold text-slate-900">{c.quantity_tonnes} tCO₂e</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-semibold border border-emerald-200">
                        <CheckCircle2 size={10} /> {c.verification_status}
                      </span>
                    </td>
                    <td className="p-4">
                      {c.blockchain_status === 'VERIFIED_ON_CHAIN' ? (
                        <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-semibold border border-indigo-200">
                          <ShieldCheck size={10} /> Polygon Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-semibold">
                          {c.blockchain_status}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {c.marketplace_status === 'LISTED' ? (
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-300">
                          LISTED
                        </span>
                      ) : c.status === 'AVAILABLE' ? (
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-300">
                          AVAILABLE
                        </span>
                      ) : c.status === 'SOLD' ? (
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-300">
                          SOLD
                        </span>
                      ) : (
                        <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          RETIRED
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {c.status === 'AVAILABLE' && c.marketplace_status !== 'LISTED' ? (
                        <button
                          onClick={() => handleOpenListModal(c)}
                          className="bg-emerald-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-emerald-700 transition-colors inline-flex items-center gap-1 shadow-sm"
                        >
                          <PlusCircle size={13} /> List for Sale
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No action</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* List for Sale Modal */}
      {selectedCredit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Store size={18} className="text-emerald-400" /> List Credit for Sale
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedCredit.serial_number}</p>
              </div>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateListing} className="p-6 space-y-4">
              {message && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    message.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {message.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  <span>{message.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Project / Farm</label>
                <input
                  disabled
                  value={selectedCredit.project_title}
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity (tCO₂e)</label>
                  <input
                    type="number"
                    disabled
                    value={selectedCredit.quantity_tonnes}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Price per Credit ($USD) *</label>
                  <input
                    required
                    type="number"
                    step="0.50"
                    min="1"
                    value={listingForm.price_per_credit}
                    onChange={(e) => setListingForm({ ...listingForm, price_per_credit: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:border-emerald-500 outline-none"
                    placeholder="e.g. 25.00"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
