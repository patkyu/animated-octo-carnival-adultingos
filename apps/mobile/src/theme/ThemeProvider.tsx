import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useAppStore } from '@/state/appStore';
import { darkColors, lightColors, radius, space, type as typeScale, type ColorTokens } from './tokens';

export interface Theme {
  dark: boolean;
  c: ColorTokens;
  space: typeof space;
  radius: typeof radius;
  type: typeof typeScale;
}

const ThemeContext = createContext<Theme>({ dark: false, c: lightColors, space, radius, type: typeScale });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const pref = useAppStore((s) => s.prefs.theme);
  const dark = pref === 'dark' || (pref === 'system' && system === 'dark');
  const value = useMemo<Theme>(() => ({ dark, c: dark ? darkColors : lightColors, space, radius, type: typeScale }), [dark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
