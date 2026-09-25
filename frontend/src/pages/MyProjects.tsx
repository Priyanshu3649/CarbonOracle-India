import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { FolderOpen, Plus, TrendingUp, CheckCircle, Clock } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description?: string;
  status: string;
  total_credits: number;
  price_per_credit: number;
  vintage_year: number;
  plot: { plot_name: string };
  stats: { available: number; sold: number; retired: number };
  created_at: string;
}

const STATUS_META: Record<string, { color: string; icon: React.ReactNode }> = {
  DRAFT:     { color: 'bg-gray-100 text-gray-600',      icon: <Clock size={11} /> },
  VERIFIED:  { color: 'bg-blue-100 text-blue-700',      icon: <CheckCircle size={11} /> },
  LISTED:    { color: 'bg-emerald-100 text-emerald-700', icon: <TrendingUp size={11} /> },
  COMPLETED: { color: 'bg-purple-100 text-purple-700',  icon: <CheckCircle size={11} /> },
};

export default function MyProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/marketplace/my-projects')
      .then(r => setProjects(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleList = async (id: string) => {
    try {
      await api.put(`/marketplace/projects/${id}/list`);
      setProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'LISTED' } : p));
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to list project');
    }
  };

  const totalRevenue = projects.reduce((s, p) => s + p.stats.sold * p.price_per_credit, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark flex items-center gap-2">
            <FolderOpen size={26} className="text-brand-green" />
            My Carbon Projects
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your forest carbon projects and credit listings
          </p>
        </div>
        <button
          onClick={() => navigate('/marketplace/projects/new')}
          className="bg-brand-green text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <Plus size={16} /> Create Project
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Projects',        value: projects.length },
          { label: 'Credits Minted',        value: projects.reduce((s, p) => s + Math.floor(p.total_credits), 0).toLocaleString() },
          { label: 'Credits Sold',          value: projects.reduce((s, p) => s + p.stats.sold, 0).toLocaleString() },
          { label: 'Est. Revenue (USD)',     value: `$${totalRevenue.toFixed(2)}` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-xl font-bold text-brand-dark mt-1">{value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <FolderOpen size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No projects yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">
            Create a carbon project from one of your verified forest plots.
          </p>
          <button
            onClick={() => navigate('/marketplace/projects/new')}
            className="bg-brand-green text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-600"
          >
            Create Your First Project
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map(p => {
            const meta = STATUS_META[p.status] || STATUS_META.DRAFT;
            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-brand-dark text-lg">{p.title}</h3>
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${meta.color}`}>
                        {meta.icon} {p.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{p.plot.plot_name} · Vintage {p.vintage_year}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(p.status === 'DRAFT' || p.status === 'VERIFIED') && (
                      <button
                        onClick={() => handleList(p.id)}
                        className="bg-brand-green text-white px-3 py-1.5 rounded-lg text-sm hover:bg-emerald-600 transition-colors"
                      >
                        List for Sale
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/marketplace/projects/${p.id}`)}
                      className="bg-brand-dark text-white px-3 py-1.5 rounded-lg text-sm hover:bg-gray-800 transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400">Total Credits</p>
                    <p className="font-semibold text-brand-dark">{Math.floor(p.total_credits).toLocaleString()} tCO₂e</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Available</p>
                    <p className="font-semibold text-emerald-600">{p.stats.available.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Sold</p>
                    <p className="font-semibold text-blue-600">{p.stats.sold.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Price / tonne</p>
                    <p className="font-semibold text-brand-green">${p.price_per_credit.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
