import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { Edit2, Trash2, Plus, X } from 'lucide-react';

export function Plots() {
  const [plots, setPlots] = useState<any[]>([]);
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ plot_name: '', description: '' });

  const fetchPlots = () => {
    api.get('/plots').then(res => setPlots(res.data)).catch(console.error);
  };

  useEffect(() => fetchPlots(), []);

  const openForm = (plot: any = null) => {
    if (plot) {
      setEditingId(plot.id);
      setFormData({ plot_name: plot.plot_name, description: plot.description || '' });
    } else {
      setEditingId(null);
      setFormData({ plot_name: '', description: '' });
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/plots/${editingId}`, formData);
      } else {
        await api.post('/plots', formData);
      }
      fetchPlots();
      closeForm();
    } catch (err) {
      alert('Failed to save plot');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this plot?')) return;
    try {
      await api.delete(`/plots/${id}`);
      fetchPlots();
    } catch (err) {
      alert('Failed to delete plot');
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-brand-dark">Managed Plots</h1>
        {isAdmin && (
          <button onClick={() => openForm()} className="bg-brand-green text-white px-4 py-2 rounded-lg flex items-center hover:bg-brand-green-dark transition-colors">
            <Plus size={18} className="mr-2" /> New Plot
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">{editingId ? 'Edit Plot' : 'New Plot'}</h2>
            <button onClick={closeForm} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plot Name</label>
              <input required value={formData.plot_name} onChange={e => setFormData({ ...formData, plot_name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-brand-green focus:border-brand-green outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-brand-green focus:border-brand-green outline-none" />
            </div>
            <button type="submit" className="bg-brand-dark text-white px-6 py-2 rounded-lg hover:bg-gray-800">Save</button>
          </form>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plots.map((p: any) => (
          <div key={p.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-lg">{p.plot_name}</h3>
                {isAdmin && (
                  <div className="flex space-x-2">
                    <button onClick={() => openForm(p)} className="text-gray-400 hover:text-blue-600"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2 min-h-[40px]">{p.description}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
              <div><span className="font-medium">{p._count.tree_records || p._count.trees || 0}</span> Recorded Trees</div>
              <div className="text-right">
                <span className="font-bold text-brand-green">{p.total_carbon_credits ? p.total_carbon_credits.toFixed(2) : '0.00'}</span> 
                <span className="text-gray-500 ml-1">Credits</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Species() {
  const [species, setSpecies] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ common_name: '', scientific_name: '', wood_density_g_cm3: '', region: '' });

  const fetchSpecies = (query = '') => {
    setLoading(true);
    api.get(`/species?q=${encodeURIComponent(query)}&limit=200`)
      .then(res => setSpecies(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSpecies(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const openForm = (s: any = null) => {
    if (s) {
      setEditingId(s.id);
      setFormData({ 
        common_name: s.common_name, 
        scientific_name: s.scientific_name, 
        wood_density_g_cm3: s.wood_density_g_cm3.toString(), 
        region: s.region || '' 
      });
    } else {
      setEditingId(null);
      setFormData({ common_name: '', scientific_name: '', wood_density_g_cm3: '', region: '' });
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/species/${editingId}`, formData);
      } else {
        await api.post('/species', formData);
      }
      fetchSpecies(searchTerm);
      closeForm();
    } catch (err) {
      alert('Failed to save species');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this species?')) return;
    try {
      await api.delete(`/species/${id}`);
      fetchSpecies(searchTerm);
    } catch (err) {
      alert('Failed to delete species');
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Species Density Master</h1>
          <p className="text-xs text-gray-500 mt-1">
            Global Wood Density Database (GWDDA v2.2) — <span className="font-semibold text-brand-green">17,260+ Tree Species</span> Indexed
          </p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search 17,000+ species..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/50 w-64"
          />
          {isAdmin && (
            <button onClick={() => openForm()} className="bg-brand-green text-white px-4 py-2 rounded-lg flex items-center hover:bg-brand-green-dark transition-colors">
              <Plus size={18} className="mr-2" /> New Species
            </button>
          )}
        </div>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">{editingId ? 'Edit Species' : 'New Species'}</h2>
            <button onClick={closeForm} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Common Name</label>
              <input required value={formData.common_name} onChange={e => setFormData({ ...formData, common_name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-brand-green" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scientific Name</label>
              <input required value={formData.scientific_name} onChange={e => setFormData({ ...formData, scientific_name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-brand-green" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wood Density (g/cm³)</label>
              <input required type="number" step="0.01" value={formData.wood_density_g_cm3} onChange={e => setFormData({ ...formData, wood_density_g_cm3: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-brand-green" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Region / Family</label>
              <input value={formData.region} onChange={e => setFormData({ ...formData, region: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-brand-green" />
            </div>
            <div className="col-span-2 mt-4">
              <button type="submit" className="bg-brand-dark text-white px-6 py-2 rounded-lg hover:bg-gray-800">Save Species</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading && <div className="p-4 text-center text-sm text-gray-400">Loading species...</div>}
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 font-semibold text-sm text-gray-600">Species / Common Name</th>
              <th className="p-4 font-semibold text-sm text-gray-600">Scientific Name</th>
              <th className="p-4 font-semibold text-sm text-gray-600">Wood Density (g/cm³)</th>
              <th className="p-4 font-semibold text-sm text-gray-600">Family / Source</th>
              {isAdmin && <th className="p-4 font-semibold text-sm text-gray-600 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {species.map((s: any) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="p-4 font-medium">{s.common_name}</td>
                <td className="p-4 italic text-gray-600">{s.scientific_name}</td>
                <td className="p-4 text-brand-green font-semibold">{s.wood_density_g_cm3.toFixed(2)}</td>
                <td className="p-4 text-xs text-gray-500">{s.region || 'GWDDA v2.2'}</td>
                {isAdmin && (
                  <td className="p-4 text-right">
                    <button onClick={() => openForm(s)} className="text-gray-400 hover:text-blue-600 mx-2"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(s.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
