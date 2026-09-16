import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import api from '../lib/api';
import { UploadCloud, CheckCircle } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import BlockchainStatus from '../components/BlockchainStatus';

export default function UploadCsv() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [plots, setPlots] = useState<any[]>([]);
  const [species, setSpecies] = useState<any[]>([]);

  const [plotId, setPlotId] = useState('');
  const [speciesId, setSpeciesId] = useState('');
  const [uploadErrors, setUploadErrors] = useState<any[]>([]);
  const [uploadResult, setUploadResult] = useState<{ batchId: string; successCount: number } | null>(null);

  useEffect(() => {
    api.get('/plots').then(res => setPlots(res.data)).catch(console.error);
    api.get('/species').then(res => setSpecies(res.data)).catch(console.error);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setUploadErrors([]);
    setUploadResult(null);

    if (uploadedFile.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (Array.isArray(json)) {
            setData(json);
          } else {
            alert('Invalid JSON format. Expected an array of records.');
          }
        } catch {
          alert('Failed to parse JSON file.');
        }
      };
      reader.readAsText(uploadedFile);
    } else {
      Papa.parse(uploadedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setData(results.data);
        },
      });
    }
  };

  const handleImport = async () => {
    if (!plotId) return alert('Please select a Plot.');
    if (!speciesId) return alert('Please select a Species to apply to this batch.');
    setUploadErrors([]);
    setUploadResult(null);

    const rows = data.map(row => ({ ...row, species_id: speciesId }));

    try {
      const res = await api.post('/trees/csv', {
        plot_id: plotId,
        file_name: file?.name,
        rows,
      });

      if (res.data.successCount > 0) {
        setUploadResult({ batchId: res.data.batchId, successCount: res.data.successCount });
      }

      if (res.data.errors && res.data.errors.length > 0) {
        setUploadErrors(res.data.errors);
      } else {
        setFile(null);
        setData([]);
      }
    } catch {
      alert('Failed to import data');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-dark">Mass Rover Data Upload (CSV/JSON)</h1>
        <p className="text-gray-500">Upload CSV/JSON batches directly from field rovers.</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">

        {/* Step 1: Drop zone */}
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 flex flex-col items-center justify-center text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
          <input
            type="file"
            accept=".csv,.json"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <UploadCloud className="text-brand-green mb-4" size={48} />
          <p className="text-lg font-medium text-brand-dark">Drag &amp; Drop CSV/JSON or click to browse</p>
          <p className="text-sm text-gray-500 mt-1">Expected headers/keys: Longitude, Latitude, Dist_tree, Dia, Height</p>
        </div>

        {/* Success + Blockchain Status (shown after successful import) */}
        {uploadResult && (
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-brand-green">
              <CheckCircle size={20} />
              <span className="font-semibold">
                Import complete — {uploadResult.successCount} tree records saved &amp; carbon calculated.
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">⛓️ Blockchain Anchoring Status</p>
              <BlockchainStatus batchId={uploadResult.batchId} />
            </div>
          </div>
        )}

        {/* Step 2: Mapping & Preview (shown before import) */}
        {file && data.length > 0 && !uploadResult && (
          <div className="space-y-6 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-brand-green">
              <CheckCircle size={20} />
              <span className="font-semibold">Parsed {data.length} rows successfully</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Plot *</label>
                <SearchableSelect
                  options={plots.map(p => ({ value: p.id, label: p.plot_name }))}
                  value={plotId}
                  onChange={setPlotId}
                  placeholder="-- Search & Select Plot --"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Default Species *</label>
                <SearchableSelect
                  options={species.map(s => ({ value: s.id, label: s.common_name }))}
                  value={speciesId}
                  onChange={setSpeciesId}
                  placeholder="-- Search & Select Species --"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-100 rounded-lg">
              <table className="min-w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {Object.keys(data[0] || {}).map(key => (
                      <th key={key} className="p-3 font-semibold text-gray-600">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.slice(0, 5).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {Object.values(row).map((val: any, j) => (
                        <td key={j} className="p-3 text-gray-700">{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.length > 5 && (
                <div className="p-3 text-center text-xs text-gray-500 bg-gray-50/50">
                  Showing 5 of {data.length} rows...
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleImport}
                className="bg-brand-dark text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
              >
                Import and Calculate Carbon
              </button>
            </div>

            {uploadErrors.length > 0 && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg max-h-64 overflow-y-auto">
                <h3 className="text-red-800 font-bold mb-2">Import Failed for {uploadErrors.length} rows</h3>
                <ul className="list-disc pl-5 text-sm text-red-700 space-y-2">
                  {uploadErrors.slice(0, 10).map((err, idx) => (
                    <li key={idx}>
                      <strong>Row {err.row}:</strong> {err.errors.join(', ')}
                      <br />
                      <span className="text-xs text-red-500 font-mono">
                        Data: {JSON.stringify(err.data)}
                      </span>
                    </li>
                  ))}
                  {uploadErrors.length > 10 && (
                    <li className="text-gray-500 italic font-medium">
                      ...and {uploadErrors.length - 10} more rows over limit.
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
