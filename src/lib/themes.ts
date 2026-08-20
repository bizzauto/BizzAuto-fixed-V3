export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    secondary: string;
    secondaryDark: string;
    secondaryLight: string;
    accent: string;
    accentDark: string;
    accentLight: string;
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
  };
}

export const themes: Theme[] = [
  {
    id: 'default',
    name: 'Indigo Night',
    description: 'Original dark theme with indigo & purple',
    colors: {
      primary: '#6366f1',
      primaryDark: '#4f46e5',
      primaryLight: '#818cf8',
      secondary: '#8b5cf6',
      secondaryDark: '#7c3aed',
      secondaryLight: '#a78bfa',
      accent: '#ec4899',
      accentDark: '#db2777',
      accentLight: '#f472b6',
      bgPrimary: '#0f172a',
      bgSecondary: '#1e293b',
      bgTertiary: '#334155',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    description: 'Cool blue tones like the sea',
    colors: {
      primary: '#0ea5e9',
      primaryDark: '#0284c7',
      primaryLight: '#38bdf8',
      secondary: '#06b6d4',
      secondaryDark: '#0891b2',
      secondaryLight: '#22d3ee',
      accent: '#f97316',
      accentDark: '#ea580c',
      accentLight: '#fb923c',
      bgPrimary: '#0c1222',
      bgSecondary: '#162032',
      bgTertiary: '#1e293b',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald Green',
    description: 'Fresh green with nature vibes',
    colors: {
      primary: '#10b981',
      primaryDark: '#059669',
      primaryLight: '#34d399',
      secondary: '#14b8a6',
      secondaryDark: '#0d9488',
      secondaryLight: '#2dd4bf',
      accent: '#f43f5e',
      accentDark: '#e11d48',
      accentLight: '#fb7185',
      bgPrimary: '#0a1a15',
      bgSecondary: '#132a20',
      bgTertiary: '#1a3a2d',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset Orange',
    description: 'Warm orange & pink sunset vibes',
    colors: {
      primary: '#f97316',
      primaryDark: '#ea580c',
      primaryLight: '#fb923c',
      secondary: '#f43f5e',
      secondaryDark: '#e11d48',
      secondaryLight: '#fb7185',
      accent: '#fbbf24',
      accentDark: '#f59e0b',
      accentLight: '#fcd34d',
      bgPrimary: '#1a0f0a',
      bgSecondary: '#2a1a10',
      bgTertiary: '#3a2518',
    },
  },
  {
    id: 'royal',
    name: 'Royal Purple',
    description: 'Rich purple with gold accents',
    colors: {
      primary: '#a855f7',
      primaryDark: '#9333ea',
      primaryLight: '#c084fc',
      secondary: '#7c3aed',
      secondaryDark: '#6d28d9',
      secondaryLight: '#8b5cf6',
      accent: '#eab308',
      accentDark: '#ca8a04',
      accentLight: '#facc15',
      bgPrimary: '#130a1a',
      bgSecondary: '#1f1029',
      bgTertiary: '#2a1838',
    },
  },
  {
    id: 'rose',
    name: 'Rose Pink',
    description: 'Elegant pink with soft tones',
    colors: {
      primary: '#f472b6',
      primaryDark: '#ec4899',
      primaryLight: '#f9a8d4',
      secondary: '#e879f9',
      secondaryDark: '#d946ef',
      secondaryLight: '#f0abfc',
      accent: '#34d399',
      accentDark: '#10b981',
      accentLight: '#6ee7b7',
      bgPrimary: '#1a0a14',
      bgSecondary: '#2a1020',
      bgTertiary: '#3a182d',
    },
  },
  {
    id: 'cyber',
    name: 'Cyber Neon',
    description: 'Futuristic neon green on dark',
    colors: {
      primary: '#22d3ee',
      primaryDark: '#06b6d4',
      primaryLight: '#67e8f9',
      secondary: '#a3e635',
      secondaryDark: '#84cc16',
      secondaryLight: '#bef264',
      accent: '#f0abfc',
      accentDark: '#e879f9',
      accentLight: '#f5d0fe',
      bgPrimary: '#0a0f0a',
      bgSecondary: '#101a10',
      bgTertiary: '#182818',
    },
  },
];

export const getThemeById = (id: string): Theme => {
  return themes.find(t => t.id === id) || themes[0];
};

export const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  const { colors } = theme;
  
  root.style.setProperty('--color-primary', colors.primary);
  root.style.setProperty('--color-primary-dark', colors.primaryDark);
  root.style.setProperty('--color-primary-light', colors.primaryLight);
  root.style.setProperty('--color-secondary', colors.secondary);
  root.style.setProperty('--color-secondary-dark', colors.secondaryDark);
  root.style.setProperty('--color-secondary-light', colors.secondaryLight);
  root.style.setProperty('--color-accent', colors.accent);
  root.style.setProperty('--color-accent-dark', colors.accentDark);
  root.style.setProperty('--color-accent-light', colors.accentLight);
  root.style.setProperty('--color-bg-primary', colors.bgPrimary);
  root.style.setProperty('--color-bg-secondary', colors.bgSecondary);
  root.style.setProperty('--color-bg-tertiary', colors.bgTertiary);
  root.style.setProperty('--shadow-glow', `0 0 20px ${colors.primary}40`);
};

export const getStoredTheme = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('app-theme') || 'default';
  }
  return 'default';
};

export const setStoredTheme = (themeId: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('app-theme', themeId);
  }
};