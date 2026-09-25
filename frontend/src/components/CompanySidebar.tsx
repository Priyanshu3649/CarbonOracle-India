import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Coins, 
  Store, 
  Trees, 
  CalendarCheck, 
  ArrowLeftRight,
  LogOut,
  Building2
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export default function CompanySidebar() {
  const { user, logout } = useAuth();

  const navItems = [
    { path: '/company/dashboard', label: 'Company Overview', icon: LayoutDashboard },
    { path: '/company/credits', label: 'My Credits', icon: Coins },
    { path: '/company/marketplace', label: 'My Listings', icon: Store },
    { path: '/company/farms', label: 'My Farms', icon: Trees },
    { path: '/company/visits', label: 'MRV Visits', icon: CalendarCheck },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 shadow-xl shrink-0">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shadow-inner">
              <Building2 size={22} />
            </div>
            <div>
              <h2 className="font-bold text-white text-base tracking-wide flex items-center gap-1.5">
                CarbonOracle
              </h2>
              <span className="text-[10px] tracking-wider uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
                Company Portal
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          <div className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Seller Management
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                      : 'hover:bg-slate-800/60 hover:text-white text-slate-400'
                  }`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Switch Portal & User Info */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <NavLink
          to="/dashboard"
          className="flex items-center justify-center space-x-2 w-full py-2 px-3 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-xs font-medium text-slate-300 transition-colors"
        >
          <ArrowLeftRight size={14} />
          <span>Switch to Public Portal</span>
        </NavLink>

        <div className="pt-2 flex items-center justify-between px-2">
          <div className="truncate">
            <p className="text-xs font-semibold text-white truncate">{user?.name || 'Company Seller'}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
