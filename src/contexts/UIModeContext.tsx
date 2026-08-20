import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type UIMode = 'classic' | 'ai';

interface UIModeContextType {
  mode: UIMode;
  setMode: (mode: UIMode) => void;
  toggle: () => void;
}

const UIModeContext = createContext<UIModeContextType | undefined>(undefined);

const STORAGE_KEY = 'bizzauto_ui_mode';

export const UIModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<UIMode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return (stored === 'ai' ? 'ai' : 'classic') as UIMode;
    } catch {
      return 'classic';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
      if (mode === 'ai') {
        document.documentElement.classList.add('ui-ai-mode');
      } else {
        document.documentElement.classList.remove('ui-ai-mode');
      }
    } catch {
      // localStorage unavailable
    }
  }, [mode]);

  const setMode = useCallback((newMode: UIMode) => setModeState(newMode), []);
  const toggle = useCallback(() => setModeState((m) => (m === 'classic' ? 'ai' : 'classic')), []);

  return (
    <UIModeContext.Provider value={{ mode, setMode, toggle }}>
      {children}
    </UIModeContext.Provider>
  );
};

export const useUIMode = (): UIModeContextType => {
  const ctx = useContext(UIModeContext);
  if (!ctx) {
    return { mode: 'classic', setMode: () => {}, toggle: () => {} };
  }
  return ctx;
};
