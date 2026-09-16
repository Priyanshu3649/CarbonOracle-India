import React, { useState, useEffect } from 'react';
import { Bell, User, WifiOff } from 'lucide-react';

const Header = () => {
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const checkQueue = async () => {
      try {
        const { getQueuedRequests } = await import('../lib/offlineStore');
        const q = await getQueuedRequests();
        setQueueCount(q.length);
      } catch (e) {
        // ignore
      }
    };
    checkQueue();
    const interval = setInterval(checkQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    if (queueCount === 0 || !navigator.onLine) return;
    try {
      const { getQueuedRequests, removeRequest } = await import('../lib/offlineStore');
      const api = (await import('../lib/api')).default;
      const q = await getQueuedRequests();
      
      for (const req of q) {
        if (req.method.toLowerCase() === 'post') {
          await api.post(req.url, req.body);
        } else if (req.method.toLowerCase() === 'put') {
          await api.put(req.url, req.body);
        }
        await removeRequest(req.id);
      }
      setQueueCount(0);
      alert('Sync successful!');
    } catch (err) {
      alert('Sync failed, check console');
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 z-10">
      <div className="flex items-center gap-4">
        {queueCount > 0 && (
          <button 
            onClick={handleSync}
            className="flex items-center gap-2 text-xs font-semibold bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full hover:bg-orange-200"
          >
            <WifiOff size={14} />
            {queueCount} Offline Item(s)
          </button>
        )}
        <p className="text-sm font-medium text-gray-500">Demo Organization</p>
      </div>
      <div className="flex items-center gap-4">
        <button className="text-gray-400 hover:text-brand-green transition-colors">
          <Bell size={20} />
        </button>
        <div className="h-8 w-8 rounded-full bg-brand-green/20 text-brand-accent flex items-center justify-center font-bold text-sm">
          <User size={16} />
        </div>
      </div>
    </header>
  );
};

export default Header;
