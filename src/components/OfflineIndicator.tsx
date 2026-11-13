import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex items-center space-x-2 rounded-xl bg-amber-500 px-3.5 py-2.5 text-xs font-mono font-bold text-slate-950 shadow-2xl">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Offline Mode · Dexie IndexedDB Cache Active</span>
    </div>
  );
};
