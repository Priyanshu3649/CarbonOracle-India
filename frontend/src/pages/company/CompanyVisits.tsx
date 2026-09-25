import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { 
  CalendarCheck, 
  Clock, 
  CheckCircle2, 
  PlusCircle, 
  X
} from 'lucide-react';

export default function CompanyVisits() {
  const [data, setData] = useState<any>({ visits: [], requests: [] });
  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    farmId: '',
    requestedDate: '',
    reason: 'GROWTH_VERIFICATION',
    description: '',
    priority: 'MEDIUM',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/company/visits'),
      api.get('/company/farms')
    ])
      .then(([vRes, fRes]) => {
        setData(vRes.data);
        setFarms(fRes.data);
        if (fRes.data.length > 0 && !requestForm.farmId) {
          setRequestForm((prev) => ({ ...prev, farmId: fRes.data[0].id }));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = () => {
    const inSevenDays = new Date(Date.now() + 7 * 86400 * 1000).toISOString().split('T')[0];
    setRequestForm({
      farmId: farms[0]?.id || '',
      requestedDate: inSevenDays,
      reason: 'GROWTH_VERIFICATION',
      description: '',
      priority: 'MEDIUM',
    });
    setMessage(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setMessage(null);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestForm.farmId) return alert('Please select a farm');
    setSubmitting(true);
    setMessage(null);

    try {
      await api.post('/company/visits/request', {
        farmId: requestForm.farmId,
        requestedDate: requestForm.requestedDate,
        reason: requestForm.reason,
        description: requestForm.description,
        priority: requestForm.priority,
      });

      setMessage({ type: 'success', text: 'Visit request submitted successfully! Pending verifier review.' });
      fetchData();
      setTimeout(() => handleCloseModal(), 1500);
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
    return <div className="p-8 text-center text-slate-500 font-medium">Loading visit telemetry & requests...</div>;
  }

  const { visits, requests } = data;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">MRV Visits & Verification Requests</h1>
          <p className="text-slate-500 text-sm mt-1">
            Track scheduled field auditor visits and request intermediate plot verifications.
          </p>
        </div>
        <button
          onClick={handleOpenModal}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm"
        >
          <PlusCircle size={16} /> Request Intermediate Visit
        </button>
      </div>

      {/* Scheduled / Completed Visits */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <CalendarCheck size={18} className="text-emerald-600" />
          <span>Scheduled & Completed MRV Field Visits</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="p-3">Visit Type</th>
                <th className="p-3">Farm / Plot</th>
                <th className="p-3">Scheduled Date</th>
                <th className="p-3">Status</th>
                <th className="p-3">Assigned Verifier</th>
                <th className="p-3">Audit Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {visits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">No scheduled or completed visits.</td>
                </tr>
              ) : (
                visits.map((v: any) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">{v.visit_type}</td>
                    <td className="p-3 font-medium text-slate-800">{v.plot.plot_name}</td>
                    <td className="p-3 font-mono text-slate-600">{new Date(v.scheduled_date).toLocaleDateString()}</td>
                    <td className="p-3">
                      {v.status === 'SCHEDULED' ? (
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-300">
                          SCHEDULED
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-300">
                          COMPLETED
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-medium text-slate-700">{v.assigned_verifier || 'EcoVerify Audit Team'}</td>
                    <td className="p-3 text-slate-500 italic max-w-xs truncate">{v.mrv_summary || v.notes || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Visit Requests */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Clock size={18} className="text-amber-600" />
          <span>Intermediate Visit Requests</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="p-3">Farm / Plot</th>
                <th className="p-3">Requested Date</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Status</th>
                <th className="p-3">Submitted At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">No visit requests submitted yet.</td>
                </tr>
              ) : (
                requests.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-900">{r.plot.plot_name}</td>
                    <td className="p-3 font-mono text-slate-600">{new Date(r.requested_date).toLocaleDateString()}</td>
                    <td className="p-3 font-semibold text-slate-800">{r.reason}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.priority === 'HIGH' || r.priority === 'URGENT' 
                          ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {r.priority}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'PENDING' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-400">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <CalendarCheck size={18} className="text-emerald-400" /> Request Intermediate Visit
                </h3>
              </div>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="p-6 space-y-4 text-xs">
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
                <label className="block font-semibold text-slate-700 mb-1">Select Farm / Plot *</label>
                <select
                  required
                  value={requestForm.farmId}
                  onChange={(e) => setRequestForm({ ...requestForm, farmId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium focus:border-emerald-500 outline-none"
                >
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.farm_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Requested Date *</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">Reason *</label>
                  <select
                    value={requestForm.reason}
                    onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium focus:border-emerald-500 outline-none"
                  >
                    <option value="GROWTH_VERIFICATION">Growth Audit</option>
                    <option value="MID_SEASON_AUDIT">Mid-Season Inspection</option>
                    <option value="CREDIT_ISSUANCE">Credit Issuance Audit</option>
                    <option value="DAMAGE_INSPECTION">Damage Inspection</option>
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
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={requestForm.description}
                  onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-3 font-normal focus:border-emerald-500 outline-none"
                  placeholder="Notes for the verifier team..."
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
