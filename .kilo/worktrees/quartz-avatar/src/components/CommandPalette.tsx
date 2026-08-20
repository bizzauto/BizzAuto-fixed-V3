import React, { useState, useEffect, useRef } from 'react';
import { Search, ArrowRight, Settings, Users, MessageSquare, BarChart3, FileText, Zap, CreditCard, Key, Shield } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (isOpen) { inputRef.current?.focus(); setQuery(''); setSelectedIndex(0); } }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); isOpen ? onClose() : onClose(); }
      if (!isOpen) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => (prev + 1) % filtered.length); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length); }
      if (e.key === 'Enter' && filtered[selectedIndex]) { filtered[selectedIndex].action(); onClose(); }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, selectedIndex, onClose]);

  const commands = [
    { label: 'Go to Dashboard', icon: <BarChart3 size={16} />, action: () => onNavigate('dashboard'), category: 'Navigation' },
    { label: 'Go to CRM', icon: <Users size={16} />, action: () => onNavigate('crm'), category: 'Navigation' },
    { label: 'Go to WhatsApp', icon: <MessageSquare size={16} />, action: () => onNavigate('whatsapp'), category: 'Navigation' },
    { label: 'Go to Automation', icon: <Zap size={16} />, action: () => onNavigate('automation'), category: 'Navigation' },
    { label: 'Go to Reports', icon: <BarChart3 size={16} />, action: () => onNavigate('reports'), category: 'Navigation' },
    { label: 'Go to Team', icon: <Users size={16} />, action: () => onNavigate('team'), category: 'Navigation' },
    { label: 'Go to Settings', icon: <Settings size={16} />, action: () => onNavigate('settings'), category: 'Navigation' },
    { label: 'Go to Profile', icon: <Settings size={16} />, action: () => onNavigate('profile'), category: 'Navigation' },
    { label: 'Go to Billing', icon: <CreditCard size={16} />, action: () => onNavigate('billing'), category: 'Navigation' },
    { label: 'Go to API Keys', icon: <Key size={16} />, action: () => onNavigate('api-keys'), category: 'Navigation' },
    { label: 'Go to Audit Log', icon: <Shield size={16} />, action: () => onNavigate('audit-log'), category: 'Navigation' },
    { label: 'Import Contacts', icon: <FileText size={16} />, action: () => onNavigate('contacts'), category: 'Actions' },
    { label: 'Create Campaign', icon: <MessageSquare size={16} />, action: () => onNavigate('automation'), category: 'Actions' },
    { label: 'Generate AI Content', icon: <Zap size={16} />, action: () => onNavigate('automation'), category: 'Actions' },
  ];

  const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[100] pt-20" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search size={20} className="text-gray-400" />
          <input ref={inputRef} value={query} onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            className="flex-1 outline-none text-gray-900 placeholder-gray-400" placeholder="Type a command or search..." />
          <kbd className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {filtered.map((cmd, i) => (
            <button key={i} onClick={() => { cmd.action(); onClose(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${i === selectedIndex ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}>
              <span className="text-gray-400">{cmd.icon}</span>
              <span className="flex-1">{cmd.label}</span>
              <ArrowRight size={14} className="text-gray-400" />
            </button>
          ))}
          {filtered.length === 0 && <div className="text-center py-8 text-gray-500">No results found</div>}
        </div>
        <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
          <span><kbd className="bg-gray-100 px-1 rounded">↑↓</kbd> Navigate</span>
          <span><kbd className="bg-gray-100 px-1 rounded">↵</kbd> Select</span>
          <span><kbd className="bg-gray-100 px-1 rounded">ESC</kbd> Close</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
