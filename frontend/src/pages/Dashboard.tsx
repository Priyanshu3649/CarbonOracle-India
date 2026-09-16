import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { TreePine, Map as MapIcon, Droplets, Leaf } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix for default leaflet markers in react
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const COLORS = ['#10b981', '#047857', '#34d399', '#059669', '#6ee7b7'];

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [plots, setPlots] = useState<any[]>([]);
  const [species, setSpecies] = useState<any[]>([]);
  const [roverConfig, setRoverConfig] = useState({ plot_id: '', species_id: '' });

  useEffect(() => {
    api.get('/analytics/dashboard').then(res => setData(res.data)).catch(console.error);
    api.get('/plots').then(res => setPlots(res.data)).catch(console.error);
    api.get('/species').then(res => setSpecies(res.data)).catch(console.error);
    api.get('/trees/rover-config').then(res => setRoverConfig(res.data)).catch(console.error);
  }, []);

  const handleRoverConfigChange = (field: string, value: string) => {
    const newConfig = { ...roverConfig, [field]: value };
    setRoverConfig(newConfig);
    api.post('/trees/rover-config', newConfig).catch(console.error);
  };

  useEffect(() => {
    let ws: WebSocket;
    const connect = () => {
      ws = new WebSocket('ws://localhost:5010');
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'NEW_TREE') {
            api.get('/analytics/dashboard').then(res => setData(res.data)).catch(console.error);
          }
        } catch (err) {
          console.error(err);
        }
      };
      ws.onclose = () => {
        setTimeout(connect, 2000); // Reconnect after 2 seconds
      };
    };
    connect();
    return () => {
      ws.onclose = null;
      ws.close();
    };
  }, []);

  if (!data) return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Carbon Estimation Dashboard</h1>
          <p className="text-gray-500">High-level overview of estimated carbon stocks.</p>
        </div>
      </div>

      <div className="bg-brand-green/10 border border-brand-green/20 p-6 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-brand-dark flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div> Live Rover Link</h3>
          <p className="text-sm text-gray-600">Route incoming hardware scans perfectly.</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="w-full md:w-56">
            <SearchableSelect 
              options={plots.map((p: any) => ({ value: p.id, label: p.plot_name }))}
              value={roverConfig.plot_id}
              onChange={(val) => handleRoverConfigChange('plot_id', val)}
              placeholder="Select Target Plot"
            />
          </div>
          <div className="w-full md:w-56">
            <SearchableSelect 
              options={species.map((s: any) => ({ value: s.id, label: s.common_name }))}
              value={roverConfig.species_id}
              onChange={(val) => handleRoverConfigChange('species_id', val)}
              placeholder="Select Scanned Species"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="Total Plots" value={data.summary.totalPlots} icon={<MapIcon />} />
        <KPICard title="Trees Recorded" value={data.summary.totalTrees} icon={<TreePine />} />
        <KPICard title="Estimated Total Carbon" value={`${data.summary.carbon_tonnes.toFixed(2)} t`} icon={<Leaf />} highlight />
        <KPICard title="Estimated CO₂e" value={`${data.summary.co2e_tonnes.toFixed(2)} t`} icon={<Droplets />} highlight />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-brand-dark">AGC vs BGC Split (tonnes)</h3>
          <div className="w-full" style={{ height: 300, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.charts.agcVsBgc}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" fill="#10b981" radius={[4,4,0,0]} barSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-brand-dark">Carbon Contribution by Species</h3>
          <div className="w-full" style={{ height: 300, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.charts.speciesDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="carbon"
                >
                  {data.charts.speciesDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => val.toFixed(2) + ' kg'} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {data.charts.speciesDistribution.slice(0,4).map((s: any, i: number) => (
              <span key={s.name} className="flex items-center text-xs text-gray-600 gap-1">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                {s.name}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      {/* GIS Mapping */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-[500px] flex flex-col z-0">
        <h3 className="text-lg font-semibold mb-4 text-brand-dark flex items-center gap-2">
          <MapIcon size={20} className="text-brand-green" /> Geospatial Distribution
        </h3>
        {data.mapTrees && data.mapTrees.length > 0 ? (
          <MapContainer 
            center={[data.mapTrees[0].latitude, data.mapTrees[0].longitude]} 
            zoom={18} 
            className="w-full h-full rounded-lg relative z-0"
            style={{ zIndex: 0 }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {data.mapTrees.map((t: any) => (
              <Marker key={t.id} position={[t.latitude, t.longitude]}>
                <Popup>
                  <div className="text-sm">
                    <strong>{t.species}</strong><br />
                    CO₂e: {t.co2e.toFixed(2)} kg<br />
                    Height: {t.height.toFixed(1)} m
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg text-gray-500">
            No trees plotted yet.
          </div>
        )}
      </div>

    </div>
  );
}

function KPICard({ title, value, icon, highlight = false }: { title: string, value: string|number, icon: React.ReactNode, highlight?: boolean }) {
  return (
    <div className={`p-6 rounded-xl border ${highlight ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white border-gray-100 shadow-sm'}`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className={`text-sm font-medium ${highlight ? 'text-gray-300' : 'text-gray-500'}`}>{title}</h3>
        <div className={highlight ? 'text-brand-green' : 'text-brand-accent'}>{icon}</div>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
