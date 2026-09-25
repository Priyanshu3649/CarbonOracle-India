import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import {
  MapPin, Calendar, Leaf, ShoppingCart, CheckCircle, AlertCircle,
  TrendingUp, ArrowLeft, ExternalLink, Trees
} from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description?: string;
  status: string;
  total_credits: number;
  price_per_credit: number;
  vintage_year: number;
  methodology: string;
  owner: { id: string; name: string; email: string };
  plot: {
    plot_name: string;
    description?: string;
    trees: Array<{
      id: string;
      species: { common_name: string; scientific_name: string };
      measurements: Array<{ co2e_kg: number; diameter_cm: number; tree_height_m: number }>;
    }>;
  };
  credits: Array<{ id: string; serial_number: string; status: string; quantity_tonnes: number }>;
  stats: { available: number; sold: number; retired: number };
}

export default function ProjectDetail() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject]   = useState<Project | null>(null);
  const [loading, setLoading]   = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying]     = useState(false);
  const [buyMsg, setBuyMsg]     = useState('');
  const [buyErr, setBuyErr]     = useState('');

  useEffect(() => {
    api.get(`/marketplace/projects/${id}`)
      .then(r => setProject(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleBuy = async () => {
    if (!project) return;
    setBuyErr(''); setBuyMsg('');
    setBuying(true);
    try {
      const res = await api.post(`/marketplace/projects/${project.id}/buy`, { quantity });
      setBuyMsg(`✅ Purchased ${res.data.credits_purchased} credits for $${res.data.total_paid_usd.toFixed(2)}`);
      // Refresh
      const refreshed = await api.get(`/marketplace/projects/${id}`);
      setProject(refreshed.data);
    } catch (e: any) {
      setBuyErr(e.response?.data?.error || 'Purchase failed');
    } finally {
      setBuying(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-400">Loading project...</div>;
  if (!project) return <div className="p-6 text-gray-500">Project not found.</div>;

  const isOwner   = user?.id === project.owner.id;
  const canBuy    = !isOwner && project.status === 'LISTED' && project.stats.available > 0;
  const totalCo2e = project.plot.trees.reduce((s, t) => s + (t.measurements[0]?.co2e_kg || 0), 0) / 1000;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-dark transition-colors"
      >
        <ArrowLeft size={16} /> Back to Marketplace
      </button>

      {/* Title */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">
                {project.status}
              </span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Calendar size={11} /> Vintage {project.vintage_year}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-brand-dark">{project.title}</h1>
            {project.description && (
              <p className="text-gray-500 mt-2 text-sm leading-relaxed">{project.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <span className="flex items-center gap-1"><MapPin size={14} className="text-brand-green" />{project.plot.plot_name}</span>
              <span className="flex items-center gap-1"><Leaf size={14} className="text-brand-green" />{project.methodology}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-brand-green">${project.price_per_credit.toFixed(2)}</p>
            <p className="text-xs text-gray-400">per tonne CO₂e</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Stats */}
        <div className="col-span-2 space-y-5">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Available',    value: project.stats.available, color: 'text-emerald-600' },
              { label: 'Sold',         value: project.stats.sold,      color: 'text-blue-600'    },
              { label: 'Retired',      value: project.stats.retired,   color: 'text-purple-600'  },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-xs text-gray-400">{label} Credits</p>
                <p className={`text-2xl font-bold mt-1 ${color}`}>{value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* Plot info */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-brand-dark mb-3 flex items-center gap-2">
              <Trees size={18} className="text-brand-green" /> Forest Plot Details
            </h3>
            <p className="text-sm text-gray-500 mb-3">{project.plot.description || 'No description available.'}</p>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400">Total Trees</p>
                <p className="font-semibold text-brand-dark">{project.plot.trees.length}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400">Total CO₂e</p>
                <p className="font-semibold text-brand-dark">{totalCo2e.toFixed(2)} t</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400">Species</p>
                <p className="font-semibold text-brand-dark">
                  {new Set(project.plot.trees.map(t => t.species.common_name)).size}
                </p>
              </div>
            </div>

            {/* Species breakdown */}
            <div className="mt-4">
              <p className="text-xs text-gray-400 mb-2">Species present</p>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(project.plot.trees.map(t => t.species.common_name))).map(name => (
                  <span key={name} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Credits table (first 10) */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-brand-dark text-sm">Credit Ledger (first 10)</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Serial</th>
                  <th className="px-4 py-2 text-left">Quantity</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {project.credits.slice(0, 10).map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs text-gray-600">{c.serial_number}</td>
                    <td className="px-4 py-2">{c.quantity_tonnes} tCO₂e</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' :
                        c.status === 'SOLD'      ? 'bg-blue-100 text-blue-700' :
                                                   'bg-purple-100 text-purple-700'
                      }`}>{c.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {project.credits.length > 10 && (
              <p className="px-5 py-2 text-xs text-gray-400 border-t border-gray-100">
                +{project.credits.length - 10} more credits not shown
              </p>
            )}
          </div>
        </div>

        {/* Buy panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sticky top-6">
            <h3 className="font-semibold text-brand-dark mb-4 flex items-center gap-2">
              <ShoppingCart size={16} className="text-brand-green" /> Purchase Credits
            </h3>

            {isOwner ? (
              <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                You own this project.
              </div>
            ) : project.status !== 'LISTED' ? (
              <div className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
                This project is not listed for sale yet.
              </div>
            ) : project.stats.available === 0 ? (
              <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                All credits have been sold.
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Quantity (tonnes)</label>
                    <input
                      type="number" min={1} max={project.stats.available}
                      value={quantity}
                      onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green outline-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">{project.stats.available} available</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Price / tonne</span>
                      <span className="font-medium">${project.price_per_credit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-500">Quantity</span>
                      <span className="font-medium">{quantity} t</span>
                    </div>
                    <div className="flex justify-between font-bold text-brand-dark border-t border-gray-200 mt-2 pt-2">
                      <span>Total</span>
                      <span className="text-brand-green">${(quantity * project.price_per_credit).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {buyMsg && (
                  <div className="flex items-start gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm mb-3">
                    <CheckCircle size={14} className="mt-0.5 shrink-0" /> {buyMsg}
                  </div>
                )}
                {buyErr && (
                  <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm mb-3">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" /> {buyErr}
                  </div>
                )}

                <button
                  onClick={handleBuy}
                  disabled={buying}
                  className="w-full bg-brand-green text-white py-2.5 rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 text-sm"
                >
                  {buying ? 'Processing...' : `Buy ${quantity} Credit${quantity > 1 ? 's' : ''}`}
                </button>

                {buyMsg && (
                  <button
                    onClick={() => navigate('/marketplace/my-credits')}
                    className="w-full mt-2 bg-brand-dark text-white py-2 rounded-lg text-sm hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                  >
                    View My Credits <ExternalLink size={13} />
                  </button>
                )}
              </>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 space-y-1">
              <p>Seller: {project.owner.name || project.owner.email}</p>
              <p>Methodology: {project.methodology}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
