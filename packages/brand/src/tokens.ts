/** Brand palette (raw). Components should use semantic tokens from the app theme, not these directly. */
export const palette = {
  deepTeal: '#174B49',
  deepTealDark: '#0F3533',
  softMint: '#C9F0DF',
  softGreen: '#91CDB7',
  warmIvory: '#FAF8F3',
  white: '#FFFFFF',
  ink: '#172B36',
  slate: '#526575',
  lavender: '#E6E1F8',
  lavenderDeep: '#6B5FA8',
  peach: '#FFDCC8',
  peachDeep: '#C9734A',
  softBlue: '#DCEBFA',
  softBlueDeep: '#3F6E9E',
  softYellow: '#FFF1C2',
  sunYellow: '#FFE07A',
  sunDeep: '#B8860B',
  cream: '#FFF6E6',
  roofOrange: '#FFB48A',
  amber: '#925B12',
  red: '#B42318',
  blush: '#FF9E9E',
  coinGold: '#F4C24E',
} as const;

export type PaletteKey = keyof typeof palette;
