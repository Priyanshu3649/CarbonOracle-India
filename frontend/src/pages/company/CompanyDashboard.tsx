import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { 
  Coins, 
  Store, 
  Trees, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CompanyDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/company/dashboard')
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">Loading company metrics...</div>;
  }

  const kpis = data?.kpis || {
    total_credits: 0,
    available_credits: 0,
    listed_credits: 0,
    sold_credits: 0,
    retired_credits: 0,
    total_farms: 0,
    pending_visit_requests: 0,
  };

  const upcomingVisit = data?.upcoming_visit;
  const recentActivity = data?.recent_activity;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Company Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time carbon credit inventory, marketplace listings, and MRV verification telemetry.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/company/credits"
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <Coins size={16} /> Manage Credits
          </Link>
          <Link
            to="/company/marketplace"
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-2"
          >
            <Store size={16} /> View Listings
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid (All Derived from Database) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Credits */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Carbon Credits</p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{kpis.total_credits}</h3>
              <p className="text-xs text-slate-500 mt-1 font-mono">1 credit = 1 tCO₂e</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Coins size={22} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-600">
            <span>Issued / Owned</span>
            <span className="font-semibold text-emerald-600">Verified Stock</span>
          </div>
        </div>

        {/* Available Credits */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Inventory</p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{kpis.available_credits}</h3>
              <p className="text-xs text-emerald-600 font-medium mt-1">Ready for sale / transfer</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <CheckCircle2 size={22} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-600">
            <span>Unencumbered</span>
            <span className="font-semibold text-blue-600">{kpis.available_credits} tCO₂e</span>
          </div>
        </div>

        {/* Listed Credits */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Listings</p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{kpis.listed_credits}</h3>
              <p className="text-xs text-amber-600 font-medium mt-1">Listed on Marketplace</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <Store size={22} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-600">
            <span>Marketplace Active</span>
            <Link to="/company/marketplace" className="font-semibold text-amber-600 hover:underline">Manage →</Link>
          </div>
        </div>

        {/* Total Farms */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Managed Farms</p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{kpis.total_farms}</h3>
              <p className="text-xs text-slate-500 mt-1">Monitored land plots</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Trees size={22} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-600">
            <span>Telemetry Active</span>
            <Link to="/company/farms" className="font-semibold text-indigo-600 hover:underline">View Farms →</Link>
          </div>
        </div>
      </div>

      {/* Breakdown Bar & Verification Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Credit Breakdown accounting summary */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center justify-between">
            <span>Credit Inventory Accounting</span>
            <span className="text-xs text-slate-400 font-normal">Derived from DB records</span>
          </h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-600 mb-1.5">
                <span>Available ({kpis.available_credits})</span>
                <span>Listed ({kpis.listed_credits})</span>
                <span>Sold ({kpis.sold_credits})</span>
                <span>Retired ({kpis.retired_credits})</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
                <div 
                  style={{ width: `${kpis.total_credits ? (kpis.available_credits / kpis.total_credits) * 100 : 0}%` }}
                  className="bg-emerald-500"
                  title="Available"
                />
                <div 
                  style={{ width: `${kpis.total_credits ? (kpis.listed_credits / kpis.total_credits) * 100 : 0}%` }}
                  className="bg-amber-500"
                  title="Listed"
                />
                <div 
                  style={{ width: `${kpis.total_credits ? (kpis.sold_credits / kpis.total_credits) * 100 : 0}%` }}
                  className="bg-blue-500"
                  title="Sold"
                />
                <div 
                  style={{ width: `${kpis.total_credits ? (kpis.retired_credits / kpis.total_credits) * 100 : 0}%` }}
                  className="bg-slate-700"
                  title="Retired"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-center">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-[11px] text-slate-500">Available</p>
                <p className="text-base font-bold text-emerald-600 mt-0.5">{kpis.available_credits}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-[11px] text-slate-500">Listed</p>
                <p className="text-base font-bold text-amber-600 mt-0.5">{kpis.listed_credits}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-[11px] text-slate-500">Sold</p>
                <p className="text-base font-bold text-blue-600 mt-0.5">{kpis.sold_credits}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-[11px] text-slate-500">Retired</p>
                <p className="text-base font-bold text-slate-700 mt-0.5">{kpis.retired_credits}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming MRV Visit Notice */}
        <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded border border-emerald-500/30">
                Upcoming MRV Visit
              </span>
              <Calendar size={18} className="text-emerald-400" />
            </div>

            {upcomingVisit ? (
              <div className="space-y-3">
                <h4 className="text-lg font-bold text-white">{upcomingVisit.plot.plot_name}</h4>
                <div className="text-xs text-slate-300 space-y-1.5 font-mono">
                  <p className="flex items-center gap-2">
                    <Clock size={14} className="text-emerald-400" />
                    <span>Date: {new Date(upcomingVisit.scheduled_date).toLocaleDateString()}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    <span>Verifier: {upcomingVisit.assigned_verifier || 'EcoVerify Team'}</span>
                  </p>
                </div>
                {upcomingVisit.notes && (
                  <p className="text-xs text-slate-400 italic bg-slate-800/60 p-2.5 rounded border border-slate-700">
                    "{upcomingVisit.notes}"
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                <p>No upcoming MRV visits scheduled.</p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center">
            <span className="text-xs text-slate-400">
              Pending Requests: <strong className="text-white">{kpis.pending_visit_requests}</strong>
            </span>
            <Link
              to="/company/visits"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              Manage Visits <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity Timeline */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Activity size={18} className="text-emerald-600" />
          <span>Recent Company Activity & Transactions</span>
        </h3>

        <div className="divide-y divide-slate-100 text-xs">
          {recentActivity?.listings?.map((l: any) => (
            <div key={l.id} className="py-3 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <div>
                  <p className="font-semibold text-slate-800">
                    Listed Credit #{l.credit?.serial_number || l.credit_id.substring(0, 8)}
                  </p>
                  <p className="text-slate-500">{l.credit?.project?.title} · ${l.price_per_credit}/credit</p>
                </div>
              </div>
              <span className="font-mono text-slate-400">
                {new Date(l.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}

          {recentActivity?.transactions?.map((t: any) => (
            <div key={t.id} className="py-3 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <div>
                  <p className="font-semibold text-slate-800">
                    {t.transaction_type} — {t.quantity_tonnes} tCO₂e
                  </p>
                  <p className="text-slate-500">Credit #{t.credit?.serial_number || t.credit_id.substring(0,8)}</p>
                </div>
              </div>
              <span className="font-mono text-slate-400">
                {new Date(t.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
