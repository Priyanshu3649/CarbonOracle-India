import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { 
  Store, 
  XCircle, 
  CheckCircle2, 
  Trash2,
} from 'lucide-react';

export default function CompanyListings() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchListings = () => {
    setLoading(true);
    api.get('/company/listings')
      .then((res) => setListings(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const handleCancelListing = async (listingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this listing? The credits will return to your available inventory.')) {
      return;
    }

    setCancellingId(listingId);
    try {
      await api.delete(`/company/listings/${listingId}`);
      fetchListings();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel listing');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">Loading marketplace listings...</div>;
  }

  const activeListings = listings.filter((l) => l.status === 'ACTIVE');
  const soldListings = listings.filter((l) => l.status === 'SOLD');
  const cancelledListings = listings.filter((l) => l.status === 'CANCELLED');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Marketplace Management</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your company's active carbon credit listings and view sales history.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Active Listings</p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1">{activeListings.length}</h4>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
            <Store size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Sold Listings</p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1">{soldListings.length}</h4>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Cancelled Listings</p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1">{cancelledListings.length}</h4>
          </div>
          <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg border border-slate-200">
            <XCircle size={20} />
          </div>
        </div>
      </div>

      {/* Listings Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 text-sm">All Company Listings</h3>
          <span className="text-xs text-slate-500 font-mono">Total: {listings.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="p-4">Listing ID</th>
                <th className="p-4">Credit Serial Number</th>
                <th className="p-4">Project / Farm</th>
                <th className="p-4">Quantity</th>
                <th className="p-4">Price / Credit</th>
                <th className="p-4">Status</th>
                <th className="p-4">Listed Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {listings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No marketplace listings found.
                  </td>
                </tr>
              ) : (
                listings.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-mono text-slate-500">{l.id.substring(0, 8)}...</td>
                    <td className="p-4 font-mono font-semibold text-slate-900">
                      {l.credit?.serial_number || 'N/A'}
                    </td>
                    <td className="p-4 font-medium text-slate-800">
                      <div>{l.credit?.project?.title || 'Forest Carbon Project'}</div>
                      <div className="text-[10px] text-slate-400">{l.credit?.project?.plot?.plot_name}</div>
                    </td>
                    <td className="p-4 font-bold text-slate-900">{l.quantity_listed} tCO₂e</td>
                    <td className="p-4 font-semibold text-emerald-600">${l.price_per_credit.toFixed(2)} USD</td>
                    <td className="p-4">
                      {l.status === 'ACTIVE' ? (
                        <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded text-[10px] font-bold border border-amber-300">
                          ACTIVE
                        </span>
                      ) : l.status === 'SOLD' ? (
                        <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded text-[10px] font-bold border border-blue-300">
                          SOLD
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded text-[10px] font-bold border border-slate-200">
                          CANCELLED
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-slate-500">
                      {new Date(l.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      {l.status === 'ACTIVE' ? (
                        <button
                          disabled={cancellingId === l.id}
                          onClick={() => handleCancelListing(l.id)}
                          className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded text-xs font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          <Trash2 size={13} /> {cancellingId === l.id ? 'Cancelling...' : 'Cancel Listing'}
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Archived</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
