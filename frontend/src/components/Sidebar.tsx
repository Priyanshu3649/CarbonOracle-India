import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileUp, PenTool, Trees, Map, LeafyGreen, Settings, Link2 } from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Upload CSV', path: '/upload', icon: FileUp },
    { name: 'Manual Entry', path: '/manual', icon: PenTool },
    { name: 'Tree Records', path: '/trees', icon: Trees },
    { name: 'Plots', path: '/plots', icon: Map },
    { name: 'Species Master', path: '/species', icon: LeafyGreen },
    { name: 'Blockchain', path: '/blockchain', icon: Link2 },
  ];

  return (
    <div className="w-64 bg-brand-dark text-white flex flex-col pt-6 h-full shadow-lg">
      <div className="px-6 pb-6 border-b border-gray-700">
        <h2 className="text-xl font-bold text-brand-green flex items-center gap-2">
          <LeafyGreen size={24} />
          CarbonOracle
        </h2>
        <p className="text-xs text-gray-400 mt-1">India Protocol - Phase 1</p>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                  isActive 
                    ? 'bg-brand-accent text-white font-medium' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon size={20} />
              {item.name}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <button className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors w-full px-3 py-2">
          <Settings size={20} />
          Settings
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
