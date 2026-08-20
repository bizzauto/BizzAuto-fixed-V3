import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  const shortcuts: KeyboardShortcut[] = [
    { key: 'd', ctrl: true, action: () => navigate('/dashboard'), description: 'Go to Dashboard' },
    { key: 'c', ctrl: true, action: () => navigate('/crm'), description: 'Go to CRM' },
    { key: 'w', ctrl: true, action: () => navigate('/whatsapp'), description: 'Go to WhatsApp' },
    { key: 'e', ctrl: true, action: () => navigate('/ecommerce'), description: 'Go to E-Commerce' },
    { key: 'a', ctrl: true, action: () => navigate('/appointments'), description: 'Go to Appointments' },
    { key: 'n', ctrl: true, action: () => navigate('/social'), description: 'Go to Social Media' },
    { key: 'k', ctrl: true, action: () => navigate('/settings'), description: 'Open Settings' },
    { key: 'Escape', action: () => (document.activeElement as HTMLElement)?.blur(), description: 'Close focus' },
  ];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    const shortcut = shortcuts.find(s => 
      s.key.toLowerCase() === event.key.toLowerCase() &&
      !!s.ctrl === (event.ctrlKey || event.metaKey) &&
      !!s.shift === event.shiftKey &&
      !!s.alt === event.altKey
    );

    if (shortcut) {
      event.preventDefault();
      shortcut.action();
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
}

export function KeyboardShortcutsHelp() {
  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50 max-w-xs">
      <h3 className="font-bold text-gray-900 dark:text-white mb-3">Keyboard Shortcuts</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Dashboard</span>
          <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl+D</kbd>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Settings</span>
          <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl+K</kbd>
        </div>
      </div>
    </div>
  );
}
