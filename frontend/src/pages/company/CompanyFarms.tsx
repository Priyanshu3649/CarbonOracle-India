import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { 
  Trees, 
  Calendar, 
  ArrowRight,
  PlusCircle,
  Clock,
  X,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CompanyFarms() {
  const [farms, setFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFarm, setSelectedFarm] = useState<any | null>(null);
  const [requestForm, setRequestForm] = useState({
    requestedDate: '',
    reason: 'GROWTH_VERIFICATION',
    description: '',
    priority: 'MEDIUM',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchFarms = () => {
    setLoading(true);
    api.get('/company/farms')
      .then((res) => setFarms(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFarms();
  }, []);

  const handleOpenVisitModal = (farm: any) => {
    setSelectedFarm(farm);
    const inSevenDays = new Date(Date.now() + 7 * 86400 * 1000).toISOString().split('T')[0];
    setRequestForm({
      requestedDate: inSevenDays,
      reason: 'GROWTH_VERIFICATION',
      description: '',
      priority: 'MEDIUM',
    });
    setMessage(null);
  };

  const handleCloseVisitModal = () => {
    setSelectedFarm(null);
    setMessage(null);
  };

  const handleSubmitVisitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm) return;
    setSubmitting(true);
    setMessage(null);

    try {
      await api.post('/company/visits/request', {
        farmId: selectedFarm.id,
        requestedDate: requestForm.requestedDate,
        reason: requestForm.reason,
        description: requestForm.description,
        priority: requestForm.priority,
      });

      setMessage({ type: 'success', text: 'Intermediate MRV visit requested successfully! Status: PENDING' });
      fetchFarms();
      setTimeout(() => handleCloseVisitModal(), 1500);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to submit visit request.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">Loading company farms...</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Managed Farms & Plots</h1>
          <p className="text-slate-500 text-sm mt-1">
            Geo-referenced forest plots and carbon stock monitoring.
          </p>
        </div>
      </div>

      {/* Farm Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {farms.map((f) => (
          <div key={f.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 relative">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                  {f.verification_status}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-2">{f.farm_name}</h3>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{f.description || 'Monitored land plot.'}</p>
              </div>
              <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl">
                <Trees size={22} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-center text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <p className="text-slate-400 text-[10px]">Trees Count</p>
                <p className="font-bold text-slate-900 mt-0.5">{f.tree_count}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <p className="text-slate-400 text-[10px]">Estimated Carbon</p>
                <p className="font-bold text-emerald-600 mt-0.5">{f.estimated_carbon_tco2e} tCO₂e</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <p className="text-slate-400 text-[10px]">Issued Credits</p>
                <p className="font-bold text-indigo-600 mt-0.5">{f.total_credits}</p>
              </div>
            </div>

            <div className="pt-2 text-xs text-slate-500 space-y-1.5 font-mono">
              <p className="flex items-center gap-2">
                <Clock size={14} className="text-slate-400" />
                <span>Last MRV Visit: {f.last_mrv_visit ? new Date(f.last_mrv_visit).toLocaleDateString() : 'N/A'}</span>
              </p>
              <p className="flex items-center gap-2">
                <Calendar size={14} className="text-emerald-600" />
                <span>Next Scheduled Visit: {f.next_scheduled_visit ? new Date(f.next_scheduled_visit).toLocaleDateString() : 'None Scheduled'}</span>
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => handleOpenVisitModal(f)}
                className="text-xs font-semibold text-slate-700 hover:text-emerald-600 flex items-center gap-1"
              >
                <PlusCircle size={14} /> Request Visit
              </button>

              <Link
                to={`/company/farms/${f.id}`}
                className="bg-slate-900 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1 shadow-sm"
              >
                View Details <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Request Intermediate Visit Modal */}
      {selectedFarm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Calendar size={18} className="text-emerald-400" /> Request Intermediate MRV Visit
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedFarm.farm_name}</p>
              </div>
              <button onClick={handleCloseVisitModal} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitVisitRequest} className="p-6 space-y-4 text-xs">
              {message && (
                <div
                  className={`p-3 rounded-lg flex items-center gap-2 ${
                    message.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  <CheckCircle2 size={16} />
                  <span>{message.text}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Requested Visit Date *</label>
                <input
                  required
                  type="date"
                  value={requestForm.requestedDate}
                  onChange={(e) => setRequestForm({ ...requestForm, requestedDate: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reason for Visit *</label>
                  <select
                    value={requestForm.reason}
                    onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium focus:border-emerald-500 outline-none"
                  >
                    <option value="GROWTH_VERIFICATION">Growth & Canopy Audit</option>
                    <option value="MID_SEASON_AUDIT">Mid-Season Intermediate Audit</option>
                    <option value="CREDIT_ISSUANCE">Credit Issuance Verification</option>
                    <option value="DAMAGE_INSPECTION">Damage / Storm Inspection</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={requestForm.priority}
                    onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium focus:border-emerald-500 outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={3}
                  value={requestForm.description}
                  onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-3 font-normal focus:border-emerald-500 outline-none"
                  placeholder="Provide specific notes or requests for the verifier team..."
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseVisitModal}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Visit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
