import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { ShoppingCart, Leaf, MapPin, Calendar, TrendingUp, Search } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description?: string;
  status: string;
  total_credits: number;
  available_credits: number;
  price_per_credit: number;
  vintage_year: number;
  methodology: string;
  owner: { name: string; email: string };
  plot: { plot_name: string; description?: string };
}

export default function Marketplace() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filtered, setFiltered] = useState<Project[]>([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/marketplace/projects')
      .then(r => { setProjects(r.data); setFiltered(r.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(projects.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.plot.plot_name.toLowerCase().includes(q) ||
      (p.owner.name || '').toLowerCase().includes(q)
    ));
  }, [search, projects]);

  const totalAvailable = projects.reduce((s, p) => s + p.available_credits, 0);
  const avgPrice = projects.length
    ? projects.reduce((s, p) => s + p.price_per_credit, 0) / projects.length
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark flex items-center gap-2">
            <ShoppingCart size={26} className="text-brand-green" />
            Carbon Credit Marketplace
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse and purchase verified carbon credits from Indian forest plots
          </p>
        </div>
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ⚠️ Estimated CO₂e — not formal carbon credit issuance
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Listed Projects',        value: projects.length,                        icon: Leaf },
          { label: 'Total Credits Available', value: totalAvailable.toLocaleString() + ' tCO₂e', icon: TrendingUp },
          { label: 'Avg. Price / tonne',      value: projects.length ? `$${avgPrice.toFixed(2)}` : '—', icon: ShoppingCart },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
            <div className="p-2 bg-brand-green/10 rounded-lg">
              <Icon size={20} className="text-brand-green" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold text-brand-dark">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
        <Search size={16} className="text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by project title, plot, or owner..."
          className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading projects...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
          <Leaf size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No listed projects found</p>
          <p className="text-sm text-gray-400 mt-1">
            Project owners can list their verified forest plots here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(p => (
            <div
              key={p.id}
              onClick={() => navigate(`/marketplace/projects/${p.id}`)}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 cursor-pointer hover:shadow-md hover:border-brand-green/40 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">
                  LISTED
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar size={11} /> {p.vintage_year}
                </span>
              </div>

              <h3 className="font-semibold text-brand-dark group-hover:text-brand-green transition-colors mb-1 leading-snug">
                {p.title}
              </h3>
              {p.description && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{p.description}</p>
              )}

              <div className="flex items-center gap-1 text-xs text-gray-500 mb-4">
                <MapPin size={12} className="text-brand-green" />
                {p.plot.plot_name}
              </div>

              <div className="border-t border-gray-100 pt-3 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-400">Available</p>
                  <p className="font-bold text-brand-dark">
                    {p.available_credits.toLocaleString()}{' '}
                    <span className="text-xs font-normal text-gray-500">tCO₂e</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Price / tonne</p>
                  <p className="font-bold text-brand-green">${p.price_per_credit.toFixed(2)}</p>
                </div>
              </div>

              <button className="mt-4 w-full bg-brand-dark text-white text-sm py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                <ShoppingCart size={14} /> View & Buy
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
