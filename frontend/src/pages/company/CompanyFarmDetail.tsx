import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../lib/api';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Calendar, 
} from 'lucide-react';

export default function CompanyFarmDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/company/farms/${id}`)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">Loading farm telemetry details...</div>;
  }

  if (!data || !data.plot) {
    return <div className="p-8 text-center text-rose-500 font-medium">Farm not found or access denied.</div>;
  }

  const { plot, project, summary, blockchain_proof } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center space-x-4">
        <Link
          to="/company/farms"
          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1 shadow-sm"
        >
          <ArrowLeft size={16} /> Back to Farms
        </Link>
        <span className="text-xs text-slate-400 font-mono">ID: {plot.id}</span>
      </div>

      {/* Main Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md flex justify-between items-start">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded border border-emerald-500/30">
            {project?.status || 'VERIFIED'}
          </span>
          <h1 className="text-2xl font-bold mt-2">{plot.plot_name}</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">{plot.description}</p>
        </div>

        <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 text-right">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider">Estimated Carbon Stock</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">{summary.total_co2e_tco2e} tCO₂e</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{summary.tree_count} verified trees</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <p className="text-slate-400 font-semibold uppercase">Total Trees</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{summary.tree_count}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <p className="text-slate-400 font-semibold uppercase">Above-Ground Carbon</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{(summary.total_carbon_kg * 0.47).toFixed(1)} kg</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <p className="text-slate-400 font-semibold uppercase">Total CO₂e</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{summary.total_co2e_tco2e} t</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <p className="text-slate-400 font-semibold uppercase">Blockchain Proof</p>
          <p className="text-xs font-semibold text-emerald-600 mt-2 flex items-center justify-center gap-1">
            <ShieldCheck size={14} /> Polygon Anchored
          </p>
        </div>
      </div>

      {/* Species Distribution Table & MRV Visits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Species Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
            <span>Species Composition</span>
            <span className="text-xs text-slate-400 font-mono">GWDDA v2.2</span>
          </h3>

          <div className="divide-y divide-slate-100 text-xs">
            {Object.entries(summary.species_breakdown || {}).map(([spName, data]: any) => (
              <div key={spName} className="py-2.5 flex justify-between items-center">
                <span className="font-medium text-slate-800">{spName}</span>
                <div className="text-right">
                  <span className="font-bold text-slate-900">{data.count} trees</span>
                  <span className="text-slate-400 ml-2 font-mono">({(data.carbon_kg).toFixed(1)} kg C)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visit History */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Calendar size={16} className="text-emerald-600" />
            <span>MRV Visit History</span>
          </h3>

          <div className="divide-y divide-slate-100 text-xs">
            {plot.visits?.length === 0 ? (
              <p className="text-slate-400 py-4 text-center">No MRV visits recorded yet.</p>
            ) : (
              plot.visits?.map((v: any) => (
                <div key={v.id} className="py-3 space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-900">{v.visit_type}</span>
                    <span className="text-emerald-600 font-mono">{new Date(v.scheduled_date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-500 text-[11px]">Verifier: {v.assigned_verifier || 'EcoVerify Team'}</p>
                  {v.mrv_summary && (
                    <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 italic">
                      "{v.mrv_summary}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          {blockchain_proof && (
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-slate-800 flex items-center gap-1">
                <ShieldCheck size={14} className="text-indigo-600" /> Polygon Amoy Data Proof
              </p>
              <p className="font-mono text-[10px] text-slate-500 truncate">Hash: {blockchain_proof.report_hash}</p>
              {blockchain_proof.transaction_hash && (
                <p className="font-mono text-[10px] text-emerald-600 truncate">Tx: {blockchain_proof.transaction_hash}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

