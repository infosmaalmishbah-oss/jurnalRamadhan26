import React, { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'jurnal_ramadhan_theme';

export type ThemeMode = 'light' | 'dark';

type Ctx = { theme: ThemeMode; toggle: () => void; setTheme: (t: ThemeMode) => void };

const ThemeContext = createContext<Ctx>({
  theme: 'light',
  toggle: () => {},
  setTheme: () => {},
});

function readInitial(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const s = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (s === 'dark' || s === 'light') return s;
  } catch {
    /* ignore */
  }
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(readInitial);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const setTheme = (t: ThemeMode) => setThemeState(t);
  const toggle = () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
