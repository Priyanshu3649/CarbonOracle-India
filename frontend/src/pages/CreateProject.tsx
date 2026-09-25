import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { PlusCircle, AlertCircle, CheckCircle } from 'lucide-react';

interface Plot {
  id: string;
  plot_name: string;
  description?: string;
  total_carbon_credits: number;
  _count: { tree_records: number };
}

export default function CreateProject() {
  const navigate = useNavigate();
  const [plots, setPlots]               = useState<Plot[]>([]);
  const [selectedPlot, setSelectedPlot] = useState('');
  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [price, setPrice]               = useState('');
  const [vintage, setVintage]           = useState(String(new Date().getFullYear()));
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');

  useEffect(() => {
    api.get('/plots').then(r => setPlots(r.data)).catch(console.error);
  }, []);

  const selectedPlotData = plots.find(p => p.id === selectedPlot);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!selectedPlot || !title || !price || !vintage) {
      setError('All fields marked * are required.'); return;
    }
    setLoading(true);
    try {
      const res = await api.post('/marketplace/projects', {
        plot_id:          selectedPlot,
        title,
        description,
        price_per_credit: price,
        vintage_year:     vintage,
      });
      setSuccess(
        `Project created! ${res.data.credits_minted} credits minted (${Number(res.data.total_credits).toFixed(2)} tCO₂e). Redirecting...`
      );
      setTimeout(() => navigate('/marketplace/my-projects'), 2200);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark flex items-center gap-2">
          <PlusCircle size={26} className="text-brand-green" />
          Create Carbon Project
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Turn a verified forest plot into a tradeable carbon credit project
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">

        {/* Plot */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Forest Plot *</label>
          <select
            value={selectedPlot}
            onChange={e => setSelectedPlot(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green outline-none w-full text-sm"
          >
            <option value="">Select a plot...</option>
            {plots.map(p => (
              <option key={p.id} value={p.id}>
                {p.plot_name} — {p.total_carbon_credits.toFixed(2)} tCO₂e
              </option>
            ))}
          </select>
          {selectedPlotData && (
            <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
              <p className="font-medium text-brand-dark">{selectedPlotData.plot_name}</p>
              {selectedPlotData.description && (
                <p className="text-gray-500 text-xs mt-0.5">{selectedPlotData.description}</p>
              )}
              <div className="flex gap-4 mt-2 text-xs">
                <span className="text-brand-green font-semibold">
                  {selectedPlotData.total_carbon_credits.toFixed(2)} tCO₂e total
                </span>
                <span className="text-gray-500">
                  → {Math.floor(selectedPlotData.total_carbon_credits)} credits will be minted
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project Title *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Western Ghats Moist Forest Carbon"
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green outline-none w-full text-sm"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe the forest, conservation activities, co-benefits..."
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green outline-none w-full text-sm resize-none"
          />
        </div>

        {/* Price + Vintage */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price per Credit (USD) *</label>
            <input
              type="number" min="0.01" step="0.01"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="e.g. 12.50"
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green outline-none w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vintage Year *</label>
            <input
              type="number" min="2020" max="2030"
              value={vintage}
              onChange={e => setVintage(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green outline-none w-full text-sm"
            />
          </div>
        </div>

        {/* Methodology note */}
        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 border border-gray-200">
          <span className="font-medium text-gray-700">Methodology:</span> CarbonOracle-MRV-v1.0 —
          IPCC allometric equations (Chave et al.), carbon fraction 0.47, root-to-shoot ratio 0.26.
          All outputs are <em>estimated</em> CO₂e.
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle size={15} /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-emerald-700 text-sm bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <CheckCircle size={15} /> {success}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => navigate('/marketplace/my-projects')}
            className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !!success}
            className="flex-1 bg-brand-green text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Project & Mint Credits'}
          </button>
        </div>
      </form>
    </div>
  );
}
