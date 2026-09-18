export interface ThemeColors {
  background: string;
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textOnAccent: string;
  accent: string;
  accentText: string;
  danger: string;
  dangerText: string;
}

export const lightColors: ThemeColors = {
  background: '#fff',
  surface: '#F3F4F6',
  border: '#D1D5DB',
  textPrimary: '#111827',
  textSecondary: '#666',
  textOnAccent: '#fff',
  accent: '#2E7D32',
  accentText: '#2E7D32',
  danger: '#C62828',
  dangerText: '#C62828',
};

export const darkColors: ThemeColors = {
  background: '#121212',
  surface: '#1E1E1E',
  border: '#3A3A3C',
  textPrimary: '#F2F2F2',
  textSecondary: '#A1A1AA',
  textOnAccent: '#fff',
  accent: '#2E7D32',
  accentText: '#66BB6A',
  danger: '#C62828',
  dangerText: '#EF5350',
};
