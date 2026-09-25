import { ShieldCheck, Bell, Building, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export default function CompanyHeader() {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-sm">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 text-slate-800 font-semibold text-sm">
          <Building className="text-emerald-600" size={18} />
          <span>{user?.name || 'GreenX Energy Corp'}</span>
        </div>
        <span className="flex items-center gap-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
          <CheckCircle2 size={12} className="text-emerald-600" /> Verified Seller
        </span>
        <span className="flex items-center gap-1 text-[11px] font-medium bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200">
          <ShieldCheck size={12} className="text-indigo-600" /> Polygon Amoy Anchored
        </span>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative">
          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white"></span>
          </button>
        </div>

        <div className="h-6 w-px bg-slate-200"></div>

        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
            {user?.name ? user.name.substring(0, 2).toUpperCase() : 'GX'}
          </div>
          <div className="text-xs">
            <p className="font-semibold text-slate-800">{user?.name || 'Seller Account'}</p>
            <p className="text-slate-500 font-mono text-[10px] uppercase">{user?.role || 'PROJECT_OWNER'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
