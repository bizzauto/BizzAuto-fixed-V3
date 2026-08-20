import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
  setDark: (val: boolean) => void;
}

// Initialize theme from localStorage
const initialDark = localStorage.getItem('theme') === 'dark';
if (typeof document !== 'undefined') {
  document.documentElement.classList.toggle('dark', initialDark);
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: initialDark,
  toggle: () =>
    set((state) => {
      const next = !state.isDark;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', next);
      return { isDark: next };
    }),
  setDark: (val) => {
    localStorage.setItem('theme', val ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', val);
    set({ isDark: val });
  },
}));
