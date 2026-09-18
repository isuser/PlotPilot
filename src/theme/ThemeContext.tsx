import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import Storage from 'expo-sqlite/kv-store';

import { darkColors, lightColors, type ThemeColors } from './colors';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'settings.themePreference';

interface ThemeContextValue {
  preference: ThemePreference;
  colorScheme: 'light' | 'dark';
  colors: ThemeColors;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const systemColorScheme = useColorScheme();

  useEffect(() => {
    Storage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
        Appearance.setColorScheme(stored === 'system' ? 'unspecified' : stored);
      }
    });
  }, []);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    Appearance.setColorScheme(next === 'system' ? 'unspecified' : next);
    Storage.setItem(STORAGE_KEY, next);
  };

  const colorScheme: 'light' | 'dark' = systemColorScheme === 'dark' ? 'dark' : 'light';
  const colors = colorScheme === 'dark' ? darkColors : lightColors;

  const value = useMemo(
    () => ({ preference, colorScheme, colors, setPreference }),
    [preference, colorScheme, colors],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
