import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getExpandedRowModel, useReactTable } from '@tanstack/react-table';
import { FileDown, Search, ChevronDown, ChevronRight, Activity } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const columnHelper = createColumnHelper<any>();

const columns = [
  columnHelper.display({
    id: 'expander',
    header: () => null,
    cell: ({ row }) => (
      row.getCanExpand() ? (
        <button
          onClick={row.getToggleExpandedHandler()}
          className="p-1 hover:bg-gray-100 rounded text-gray-500"
        >
          {row.getIsExpanded() ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      ) : null
    ),
  }),
  columnHelper.accessor('internal_tree_id', { header: 'Tree ID', cell: info => <span className="text-xs font-mono">{info.getValue().split('_').slice(1,4).join('_')}</span> }),
  columnHelper.accessor('species.common_name', { header: 'Species' }),
  columnHelper.accessor('diameter_cm', { header: 'DBH (cm)', cell: info => info.getValue().toFixed(1) }),
  columnHelper.accessor('tree_height_m', { header: 'Height (m)', cell: info => info.getValue().toFixed(1) }),
  columnHelper.accessor('total_carbon_kg', { header: 'Total Carbon (kg)', cell: info => <span className="font-semibold text-brand-green">{info.getValue().toFixed(2)}</span> }),
  columnHelper.accessor('co2e_kg', { header: 'CO₂e (kg)', cell: info => <span className="font-semibold text-brand-dark">{info.getValue().toFixed(2)}</span> }),
  columnHelper.accessor('co2e_kg', { id: 'carbon_credits', header: 'Carbon Credits (tCO₂e)', cell: info => <span className="font-semibold text-blue-600">{(info.getValue() / 1000).toFixed(4)}</span> }),
  columnHelper.accessor('data_source', { header: 'Source', cell: info => <span className="uppercase text-xs bg-gray-100 px-2 py-1 rounded">{info.getValue()}</span> }),
];

export default function TreeRecords() {
  const [data, setData] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');

  useEffect(() => {
    api.get('/trees').then(res => setData(res.data as any)).catch(console.error);
  }, []);

  useEffect(() => {
    let ws: WebSocket;
    const connect = () => {
      ws = new WebSocket('ws://localhost:5010');
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'NEW_TREE') {
            setData((prevData) => [message.data, ...prevData].slice(0, 100) as any);
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

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
    },
    getRowCanExpand: (row) => row.original.measurements && row.original.measurements.length > 1,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("CarbonOracle India - Tree Records", 14, 15);
    
    autoTable(doc, {
      head: [['Tree ID', 'Species', 'DBH', 'Height', 'Carbon (kg)', 'CO2e (kg)', 'Credits (tCO2e)', 'Source']],
      body: data.map((row: any) => [
        row.internal_tree_id.split('_').slice(1,4).join('_'),
        row.species.common_name,
        row.diameter_cm.toFixed(1),
        row.tree_height_m.toFixed(1),
        row.total_carbon_kg.toFixed(2),
        row.co2e_kg.toFixed(2),
        (row.co2e_kg / 1000).toFixed(4),
        row.data_source
      ]),
      startY: 20
    });
    
    doc.save("Carbon_Records.pdf");
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Tree Records</h1>
          <p className="text-gray-500">Database of all recorded trees and estimated carbon.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search records..." 
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green/50"
            />
          </div>
          <button 
            onClick={exportPDF}
            className="flex items-center gap-2 bg-brand-dark text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <FileDown size={18} />
            Export PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className="border-b border-gray-200 bg-gray-50">
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <React.Fragment key={row.id}>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="p-4 text-sm text-gray-700">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {row.getIsExpanded() && (
                    <tr className="bg-gray-50/50">
                      <td colSpan={row.getVisibleCells().length} className="p-0 border-b border-gray-100">
                        <div className="p-6">
                          <h4 className="flex items-center text-sm font-semibold text-gray-700 mb-4">
                            <Activity size={16} className="mr-2 text-brand-green" /> 
                            Measurement History
                          </h4>
                          <div className="bg-white border text-sm border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-left">
                              <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                  <th className="px-4 py-2 font-medium text-gray-600">Date</th>
                                  <th className="px-4 py-2 font-medium text-gray-600">DBH (cm)</th>
                                  <th className="px-4 py-2 font-medium text-gray-600">Height (m)</th>
                                  <th className="px-4 py-2 font-medium text-gray-600">CO₂e (kg)</th>
                                  <th className="px-4 py-2 font-medium text-gray-600">Source</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {row.original.measurements.map((m: any) => (
                                  <tr key={m.id}>
                                    <td className="px-4 py-2 text-gray-600">{new Date(m.measured_at).toLocaleDateString()} {new Date(m.measured_at).toLocaleTimeString()}</td>
                                    <td className="px-4 py-2">{m.diameter_cm.toFixed(1)}</td>
                                    <td className="px-4 py-2">{m.tree_height_m.toFixed(1)}</td>
                                    <td className="px-4 py-2 font-medium text-brand-dark">{m.co2e_kg.toFixed(2)}</td>
                                    <td className="px-4 py-2 text-xs uppercase text-gray-500">{m.data_source}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
