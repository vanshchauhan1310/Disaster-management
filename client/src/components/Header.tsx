import React from 'react';
import { AlertTriangle, Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface HeaderProps {
  wsConnected: boolean;
  onReconnect?: () => void;
}

export function Header({ wsConnected, onReconnect }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-500" size={24} />
            <h1 className="text-xl font-semibold text-gray-900">Disaster Response Platform</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {wsConnected ? (
                <Wifi className="text-green-500" size={16} />
              ) : (
                <WifiOff className="text-red-500" size={16} />
              )}
              <span className={`text-sm ${wsConnected ? 'text-green-600' : 'text-red-600'}`}>
                {wsConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {!wsConnected && onReconnect && (
              <button
                onClick={onReconnect}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                <RefreshCw size={12} />
                Reconnect
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 