import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { TriangleAlert, CheckCircle2, Plus, Calculator, Save, Trash2 } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';

export default function ManualEntry() {
  const [plots, setPlots] = useState<any[]>([]);
  const [species, setSpecies] = useState<any[]>([]);
  
  // Single tree form state
  const [formData, setFormData] = useState({
    plot_id: '',
    species_id: '',
    latitude: '',
    longitude: '',
    diameter_cm: '',
    tree_height_m: '',
    distance_from_tree_m: ''
  });
  const [warning, setWarning] = useState<string | null>(null);

  // Batch session state
  const [treeList, setTreeList] = useState<any[]>([]);
  const [calculatedTotals, setCalculatedTotals] = useState<{ carbon: number, co2e: number, credits: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api.get('/plots').then(res => setPlots(res.data)).catch(console.error);
    api.get('/species').then(res => setSpecies(res.data)).catch(console.error);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'diameter_cm') {
      const v = parseFloat(value);
      if (v < 2) setWarning('Warning: DBH is exceptionally small (< 2cm)');
      else if (v > 300) setWarning('Warning: DBH is exceptionally large (> 300cm)');
      else setWarning(null);
    }
  };

  const handleAddTree = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plot_id || !formData.species_id || !formData.latitude || !formData.longitude || !formData.diameter_cm || !formData.tree_height_m) {
      alert("Please fill all required fields before adding.");
      return;
    }

    const speciesObj = species.find(s => s.id === formData.species_id);
    const plotObj = plots.find(p => p.id === formData.plot_id);

    const newTree = {
      ...formData,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      diameter_cm: parseFloat(formData.diameter_cm),
      tree_height_m: parseFloat(formData.tree_height_m),
      distance_from_tree_m: formData.distance_from_tree_m ? parseFloat(formData.distance_from_tree_m) : null,
      _speciesName: speciesObj?.common_name,
      _plotName: plotObj?.plot_name,
      _wd: speciesObj?.wood_density_g_cm3
    };

    setTreeList(prev => [...prev, newTree]);
    
    // Clear measurements but keep Plot & Species for easy rapid entry
    setFormData(prev => ({
      ...prev,
      diameter_cm: '',
      tree_height_m: '',
      distance_from_tree_m: ''
    }));
    setWarning(null);
    setCalculatedTotals(null); // reset totals since list changed
  };

  const removeTree = (index: number) => {
    setTreeList(prev => prev.filter((_, i) => i !== index));
    setCalculatedTotals(null);
  };

  const handleCalculateCredits = () => {
    if (treeList.length === 0) {
      alert("Add at least one tree to calculate credits.");
      return;
    }

    let totalCarbonKg = 0;
    
    treeList.forEach(tree => {
      const dbh = tree.diameter_cm;
      const height = tree.tree_height_m;
      const wd = tree._wd;
      
      const agb = Math.exp(-2.409 + 0.9522 * Math.log(Math.pow(dbh, 2) * height * wd));
      const agc = agb * 0.47;
      const bgc = (agb * 0.26) * 0.47;
      totalCarbonKg += (agc + bgc);
    });

    const totalCo2eKg = totalCarbonKg * 3.667;
    // Standard approximation: 1 Carbon Credit = 1 Tonne of CO2e (1000 kg)
    const totalCredits = totalCo2eKg / 1000;

    setCalculatedTotals({
      carbon: totalCarbonKg,
      co2e: totalCo2eKg,
      credits: totalCredits
    });
  };

  const handleSaveRecords = async () => {
    if (treeList.length === 0) return;
    setIsSaving(true);
    
    try {
      // For simplicity in the prototype, we fire them in parallel using the manual endpoint
      await Promise.all(
        treeList.map(tree => {
          // remove UI helper keys before sending
          const { _speciesName, _plotName, _wd, ...payload } = tree;
          return api.post('/trees/manual', payload);
        })
      );
      
      alert(`Successfully saved ${treeList.length} tree records to the database!`);
      setTreeList([]);
      setCalculatedTotals(null);
    } catch (error) {
      console.error(error);
      alert("An error occurred while saving the records.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto h-full overflow-y-auto">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Batch Manual Data Entry</h1>
          <p className="text-gray-500">Record trees sequentially, calculate predicted credits, and bulk save.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 flex flex-col">
          {/* Entry Form */}
          <div className="border border-gray-200 bg-white p-6 rounded-xl shadow-sm h-fit">
          <h3 className="text-lg font-semibold text-brand-dark mb-4 border-b pb-2">Record a Tree</h3>
          <form onSubmit={handleAddTree} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plot *</label>
              <SearchableSelect 
                options={plots.map((p: any) => ({ value: p.id, label: p.plot_name }))}
                value={formData.plot_id}
                onChange={(val) => setFormData(prev => ({ ...prev, plot_id: val }))}
                placeholder="Search and Select Plot..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Species *</label>
              <SearchableSelect 
                options={species.map((s: any) => ({ value: s.id, label: s.common_name }))}
                value={formData.species_id}
                onChange={(val) => setFormData(prev => ({ ...prev, species_id: val }))}
                placeholder="Search and Select Species..."
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lat *</label>
                <input required type="number" step="any" name="latitude" value={formData.latitude} onChange={handleChange} className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2" placeholder="e.g. 20.12"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lon *</label>
                <input required type="number" step="any" name="longitude" value={formData.longitude} onChange={handleChange} className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2" placeholder="e.g. 78.12"/>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DBH (cm) *</label>
                <input required type="number" step="any" name="diameter_cm" value={formData.diameter_cm} onChange={handleChange} className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2" placeholder="e.g. 35.5"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Height (m) *</label>
                <input required type="number" step="any" name="tree_height_m" value={formData.tree_height_m} onChange={handleChange} className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2" placeholder="e.g. 12"/>
              </div>
            </div>

            {warning && (
              <div className="bg-amber-50 text-amber-800 p-2 rounded-md flex items-center gap-2 text-xs border border-amber-200">
                <TriangleAlert size={14} /> {warning}
              </div>
            )}

            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-white border-2 border-brand-green text-brand-green hover:bg-brand-green hover:text-white px-4 py-2 rounded-lg font-semibold transition-colors shadow-sm mt-4">
              <Plus size={18} /> Add Tree to Batch
            </button>
          </form>
        </div>

        {/* Formula Explanation Guide */}
        <div className="lg:col-span-1 border border-brand-green/20 bg-brand-green/5 p-6 rounded-xl shadow-sm text-sm text-gray-700 h-fit mt-6">
          <h3 className="font-semibold text-brand-dark mb-3 flex items-center gap-2 border-b border-brand-green/20 pb-2">
            <Calculator size={16} className="text-brand-green" /> Estimation Methodology
          </h3>
          <p className="mb-4 text-xs">CarbonOracle uses standard non-destructive allometric equations to predict carbon yield.</p>
          
          <div className="space-y-4">
            <div>
              <strong className="text-gray-900 block mb-1">1. Inputs & Parameters</strong>
              <ul className="list-disc pl-4 space-y-1 text-xs">
                <li><span className="font-medium text-gray-800">DBH (D)</span> & <span className="font-medium text-gray-800">Height (H)</span>: Sourced from manual entry or hardware scan.</li>
                <li><span className="font-medium text-brand-dark">Wood Density (WD)</span>: Fetched dynamically from the Species Master database based on selection.</li>
              </ul>
            </div>
            
            <div>
              <strong className="text-gray-900 block mb-1">2. Above Ground Biomass (AGB)</strong>
              <div className="bg-white p-2 border border-brand-green/20 rounded font-mono text-[10.5px] text-brand-dark">
                AGB = exp(-2.409 + 0.9522 * ln(D² * H * WD))
              </div>
            </div>

            <div>
              <strong className="text-gray-900 block mb-1">3. Carbon & CO₂e Conversion</strong>
              <ul className="list-disc pl-4 space-y-1 text-xs">
                <li><span className="font-medium text-gray-800">BGB</span> = AGB × 0.26 <span className="text-gray-500 italic">(Root-to-shoot ratio)</span></li>
                <li><span className="font-medium text-gray-800">Total Carbon</span> = (AGB + BGB) × 0.47 <span className="text-gray-500 italic">(Carbon fraction)</span></li>
                <li><span className="font-medium text-brand-dark">Total CO₂e</span> = Carbon × 3.667</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Wrapping the Batch Session into a div alongside the form column */}
      <div className="lg:col-span-2 space-y-6 flex flex-col h-full">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-brand-dark">Current Batch ({treeList.length} trees)</h3>
              
              <div className="flex gap-3">
                <button 
                  onClick={handleCalculateCredits}
                  disabled={treeList.length === 0}
                  className="flex items-center gap-2 bg-brand-dark hover:bg-gray-800 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm"
                >
                  <Calculator size={16} /> Calculate Credits
                </button>
                <button 
                  onClick={handleSaveRecords}
                  disabled={treeList.length === 0 || isSaving}
                  className="flex items-center gap-2 bg-brand-green hover:bg-brand-accent disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm"
                >
                  <Save size={16} /> {isSaving ? 'Saving...' : 'Save Records'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-0">
              {treeList.length === 0 ? (
                <div className="text-center p-12 text-gray-400 flex flex-col items-center">
                  <Plus size={48} className="mb-4 opacity-20" />
                  <p>No trees added yet.</p>
                  <p className="text-sm">Use the form to add trees to this batch.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                    <tr>
                      <th className="p-3 font-semibold text-gray-600">Species</th>
                      <th className="p-3 font-semibold text-gray-600">Plot</th>
                      <th className="p-3 font-semibold text-gray-600">DBH</th>
                      <th className="p-3 font-semibold text-gray-600">Height</th>
                      <th className="p-3 font-semibold text-gray-600"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {treeList.map((tree, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-3 text-gray-800">{tree._speciesName}</td>
                        <td className="p-3 text-gray-600">{tree._plotName}</td>
                        <td className="p-3 text-gray-600">{tree.diameter_cm} cm</td>
                        <td className="p-3 text-gray-600">{tree.tree_height_m} m</td>
                        <td className="p-3 text-right">
                          <button onClick={() => removeTree(i)} className="text-red-400 hover:text-red-600 p-1">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Credits Preview Panel */}
          {calculatedTotals && (
            <div className="bg-brand-dark p-6 rounded-xl border border-gray-800 shadow-lg text-white relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-48 h-48 bg-brand-green opacity-10 rounded-bl-full translate-x-1/4 -translate-y-1/4"></div>
              
              <h3 className="text-sm uppercase tracking-wider text-green-400 font-bold mb-6 flex items-center gap-2">
                <CheckCircle2 size={18} /> Batch Estimator Results
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                <div>
                  <p className="text-gray-400 text-xs uppercase font-medium mb-1">Total Carbon</p>
                  <p className="text-2xl font-bold text-white">{calculatedTotals.carbon.toFixed(2)} <span className="text-sm font-normal text-gray-400">kg</span></p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs uppercase font-medium mb-1">Total CO₂e</p>
                  <p className="text-2xl font-bold text-white">{calculatedTotals.co2e.toFixed(2)} <span className="text-sm font-normal text-gray-400">kg</span></p>
                </div>
                <div className="bg-white/10 p-3 rounded-lg border border-white/20">
                  <p className="text-green-300 text-xs uppercase font-bold mb-1">Est. Carbon Credits</p>
                  <p className="text-3xl font-black text-brand-green">{calculatedTotals.credits.toFixed(3)} <span className="text-sm font-medium text-green-300">Credits</span></p>
                  <p className="text-[10px] text-gray-400 mt-1">Based on 1 Credit = 1 Tonne CO₂e</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
