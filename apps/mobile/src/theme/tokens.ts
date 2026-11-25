import { palette } from '@adultingos/brand';

/**
 * Semantic design tokens. Components reference these names only — never raw
 * hex values — so light/dark themes and future rebrands are one-file changes.
 * Text/background pairings were chosen for WCAG AA (≥4.5:1 for body text);
 * see docs/branding/accessibility-contrast.md for measured ratios.
 */
export interface ColorTokens {
  background: string;
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  primarySoft: string;
  onPrimarySoft: string;
  focus: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;
  // Category surfaces (pastels) and their readable foregrounds.
  catDocuments: string;
  catFinance: string;
  catCalendar: string;
  catCelebrate: string;
  catHome: string;
  catPositive: string;
  onCategory: string;
  overlay: string;
  shadow: string;
}

export const lightColors: ColorTokens = {
  background: palette.warmIvory,
  surface: palette.white,
  surfaceRaised: palette.white,
  surfaceSunken: '#F1EEE6',
  border: '#E6E1D6',
  borderStrong: '#C9C2B3',
  text: palette.ink,
  textMuted: palette.slate,
  textInverse: palette.warmIvory,
  primary: palette.deepTeal,
  primaryPressed: palette.deepTealDark,
  onPrimary: '#FFFFFF',
  primarySoft: palette.softMint,
  onPrimarySoft: palette.deepTealDark,
  focus: '#2F7D79',
  success: '#1F6B4A',
  successSoft: '#DDF3E8',
  warning: palette.amber,
  warningSoft: '#FDF0D9',
  danger: palette.red,
  dangerSoft: '#FDE7E4',
  info: '#2F5F8A',
  infoSoft: palette.softBlue,
  catDocuments: palette.lavender,
  catFinance: palette.peach,
  catCalendar: palette.softBlue,
  catCelebrate: palette.softYellow,
  catHome: '#FFEBDD',
  catPositive: palette.softMint,
  onCategory: palette.ink,
  overlay: 'rgba(23,43,54,0.45)',
  shadow: 'rgba(23,43,54,0.08)',
};

export const darkColors: ColorTokens = {
  background: '#0F1E22',
  surface: '#16292E',
  surfaceRaised: '#1C3238',
  surfaceSunken: '#0B171A',
  border: '#27424A',
  borderStrong: '#3A5A63',
  text: '#EEF3F1',
  textMuted: '#A9BAC0',
  textInverse: palette.ink,
  primary: '#7FD3B8',
  primaryPressed: '#9BE0C9',
  onPrimary: '#0B2A27',
  primarySoft: '#1F4A44',
  onPrimarySoft: '#C9F0DF',
  focus: '#9BE0C9',
  success: '#7FD3A6',
  successSoft: '#1C3B2E',
  warning: '#F2C374',
  warningSoft: '#3A2E17',
  danger: '#FF9C91',
  dangerSoft: '#3E1F1C',
  info: '#9CC7F0',
  infoSoft: '#1D3346',
  catDocuments: '#2B2843',
  catFinance: '#43302A',
  catCalendar: '#1D3346',
  catCelebrate: '#3D3620',
  catHome: '#3E3027',
  catPositive: '#1F4A44',
  onCategory: '#EEF3F1',
  overlay: 'rgba(0,0,0,0.6)',
  shadow: 'rgba(0,0,0,0.35)',
};

/** 8dp grid. */
export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 12, md: 16, lg: 20, xl: 24, pill: 999 } as const;
export const touch = { min: 48 } as const;

export const fonts = {
  brand: 'PlusJakartaSans_800ExtraBold',
  brandSemi: 'PlusJakartaSans_700Bold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/** sp sizes per the brand hierarchy; line heights ≈1.3–1.5×. */
export const type = {
  display: { fontFamily: fonts.brand, fontSize: 32, lineHeight: 40, letterSpacing: -0.5 },
  title: { fontFamily: fonts.brand, fontSize: 24, lineHeight: 32, letterSpacing: -0.3 },
  section: { fontFamily: fonts.brandSemi, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 24 },
  support: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  supportStrong: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  number: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26, fontVariant: ['tabular-nums' as const] },
} as const;
export type TypeVariant = keyof typeof type;
