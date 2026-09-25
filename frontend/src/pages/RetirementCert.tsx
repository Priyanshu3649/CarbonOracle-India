import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Award, Leaf, Calendar, User, Hash, CheckCircle, ArrowLeft, Printer } from 'lucide-react';

interface Certificate {
  id: string;
  certificate_number: string;
  beneficiary_name: string;
  quantity_tonnes: number;
  retirement_date: string;
  blockchain_tx_hash?: string;
  created_at: string;
  credit: {
    serial_number: string;
    project: { title: string; methodology: string; vintage_year: number };
  };
  retired_by: { name: string; email: string };
}

export default function RetirementCert() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cert, setCert]     = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/marketplace/certificates/${id}`)
      .then(r => setCert(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 text-gray-400">Loading certificate...</div>;
  if (!cert)   return <div className="p-6 text-gray-500">Certificate not found.</div>;

  const retiredDate = new Date(cert.retirement_date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-dark"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 text-sm bg-brand-dark text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Printer size={14} /> Print / Save PDF
        </button>
      </div>

      {/* Certificate card */}
      <div className="bg-white rounded-2xl border-2 border-brand-green/30 shadow-lg overflow-hidden print:shadow-none">

        {/* Header band */}
        <div className="bg-brand-dark px-8 py-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Leaf size={28} className="text-brand-green" />
            <span className="text-2xl font-bold text-white">CarbonOracle India</span>
            <Leaf size={28} className="text-brand-green" />
          </div>
          <p className="text-gray-400 text-sm">Carbon Offset Retirement Certificate</p>
          <p className="text-xs text-gray-500 mt-1">CarbonOracle-MRV-v1.0 · Estimated CO₂e</p>
        </div>

        {/* Body */}
        <div className="px-8 py-8 space-y-6">
          {/* Cert number + verified badge */}
          <div className="flex items-center justify-between">
            <div className="font-mono text-sm text-gray-500">
              <span className="text-xs text-gray-400 block">Certificate No.</span>
              {cert.certificate_number}
            </div>
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-3 py-1.5 rounded-full font-medium">
              <CheckCircle size={15} /> Verified & Retired
            </div>
          </div>

          {/* Big quantity */}
          <div className="text-center py-6 border-y border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Carbon Offset</p>
            <p className="text-6xl font-bold text-brand-dark">{cert.quantity_tonnes}</p>
            <p className="text-lg text-brand-green font-medium mt-1">tonne{cert.quantity_tonnes !== 1 ? 's' : ''} CO₂ equivalent</p>
            <p className="text-xs text-gray-400 mt-2">Estimated — not a formal carbon credit instrument</p>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-5">
            <Detail icon={<User size={15} />}    label="Beneficiary"    value={cert.beneficiary_name} />
            <Detail icon={<Calendar size={15} />} label="Retirement Date" value={retiredDate} />
            <Detail icon={<Award size={15} />}    label="Project"        value={cert.credit.project.title} />
            <Detail icon={<Leaf size={15} />}     label="Vintage Year"   value={String(cert.credit.project.vintage_year)} />
            <Detail icon={<Hash size={15} />}     label="Credit Serial"  value={cert.credit.serial_number} mono />
            <Detail icon={<User size={15} />}     label="Retired By"     value={cert.retired_by.name || cert.retired_by.email} />
          </div>

          {/* Methodology */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs font-medium text-gray-600 mb-1">Methodology</p>
            <p className="text-sm text-gray-700">{cert.credit.project.methodology}</p>
            <p className="text-xs text-gray-400 mt-1">
              Above-ground biomass calculated using IPCC allometric equations (Chave et al.).
              Carbon fraction: 0.47. Root-to-shoot ratio: 0.26. CO₂e conversion: ×3.667.
            </p>
          </div>

          {cert.blockchain_tx_hash && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-xs font-medium text-emerald-700 mb-1 flex items-center gap-1">
                <CheckCircle size={12} /> Blockchain Anchored
              </p>
              <p className="font-mono text-xs text-emerald-600 break-all">{cert.blockchain_tx_hash}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-100 px-8 py-4 text-center text-xs text-gray-400">
          This certificate is issued by CarbonOracle India and represents an estimated carbon offset
          based on field measurements. It is not a formal carbon credit instrument.
          Generated on {new Date(cert.created_at).toLocaleDateString()}.
        </div>
      </div>
    </div>
  );
}

function Detail({ icon, label, value, mono = false }: {
  icon: React.ReactNode; label: string; value: string; mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-1.5 bg-brand-green/10 rounded-lg mt-0.5 shrink-0 text-brand-green">{icon}</div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className={`text-sm font-medium text-brand-dark mt-0.5 ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
      </div>
    </div>
  );
}
