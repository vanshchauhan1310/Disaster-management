import React from 'react';
import { LucideIcon } from 'lucide-react';

interface TabButtonProps {
  id: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: (id: string) => void;
}

export function TabButton({ id, icon: Icon, label, active, disabled, onClick }: TabButtonProps) {
  return (
    <button
      onClick={() => onClick(id)}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        active ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <Icon size={20} />
      {label}
    </button>
  );
} 