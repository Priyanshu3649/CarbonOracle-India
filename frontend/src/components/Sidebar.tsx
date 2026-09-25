import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileUp, PenTool, Trees, Map, LeafyGreen, Settings, Link2, ShoppingCart, FolderOpen, Wallet } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

const Sidebar = () => {
  const { user, logout } = useAuth();

  const coreItems = [
    { name: 'Dashboard',      path: '/dashboard', icon: LayoutDashboard },
    { name: 'Upload CSV',     path: '/upload',    icon: FileUp },
    { name: 'Manual Entry',   path: '/manual',    icon: PenTool },
    { name: 'Tree Records',   path: '/trees',     icon: Trees },
    { name: 'Plots',          path: '/plots',     icon: Map },
    { name: 'Species Master', path: '/species',   icon: LeafyGreen },
    { name: 'Blockchain',     path: '/blockchain',icon: Link2 },
  ];

  const marketplaceItems = [
    { name: 'Marketplace',    path: '/marketplace',               icon: ShoppingCart },
    { name: 'My Projects',    path: '/marketplace/my-projects',   icon: FolderOpen },
    { name: 'My Credits',     path: '/marketplace/my-credits',    icon: Wallet },
  ];

  const NavItem = ({ name, path, icon: Icon }: { name: string; path: string; icon: any }) => (
    <NavLink
      to={path}
      end={path === '/marketplace'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
          isActive
            ? 'bg-brand-accent text-white font-medium'
            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
        }`
      }
    >
      <Icon size={20} />
      {name}
    </NavLink>
  );

  return (
    <div className="w-64 bg-brand-dark text-white flex flex-col pt-6 h-full shadow-lg">
      <div className="px-6 pb-6 border-b border-gray-700">
        <h2 className="text-xl font-bold text-brand-green flex items-center gap-2">
          <LeafyGreen size={24} />
          CarbonOracle
        </h2>
        <p className="text-xs text-gray-400 mt-1">India Protocol - Phase 1</p>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {coreItems.map(item => <NavItem key={item.name} {...item} />)}

        <div className="pt-4 pb-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-3 mb-1">Marketplace</p>
        </div>
        {marketplaceItems.map(item => <NavItem key={item.name} {...item} />)}
      </nav>

      <div className="p-4 border-t border-gray-700 space-y-1">
        {user && (
          <div className="px-3 py-1.5">
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
            <p className="text-xs text-brand-green">{user.role}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors w-full px-3 py-2 rounded-md hover:bg-gray-800 text-sm"
        >
          <Settings size={18} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
