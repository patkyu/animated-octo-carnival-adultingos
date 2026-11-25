import { el, g, svgDocument, type SvgNode } from './svg';
import { palette } from './tokens';

/**
 * AdultingOS symbol: a rounded square holding a checkmark (accomplishment)
 * circled by an open orbit (a personal operating system keeping things in
 * motion), with a small peach "planet" — the user's next step.
 *
 * Variants:
 *  - color:   teal tile, mint check/orbit, peach dot
 *  - onDark:  mint tile, teal check/orbit (for teal or dark backgrounds)
 *  - mono:    single colour (Android themed icon, embossing, fax-safe)
 *  - glyph:   tile omitted, artwork only (adaptive-icon foreground / splash)
 */
export type LogoVariant = 'color' | 'onDark' | 'mono' | 'glyph' | 'glyphMono';

function artwork(stroke: string, dot: string, orbitOpacity: number): SvgNode[] {
  return [
    // Orbit: an open elliptical arc that wraps behind the check.
    el('path', {
      d: 'M 27 77 C 14 62 30 40 60 33 C 84 27 101 33 100 46',
      fill: 'none',
      stroke,
      strokeWidth: 5,
      strokeLinecap: 'round',
      opacity: orbitOpacity,
    }),
    el('path', {
      d: 'M 95 60 C 88 77 66 88 44 88',
      fill: 'none',
      stroke,
      strokeWidth: 5,
      strokeLinecap: 'round',
      opacity: orbitOpacity,
    }),
    // Checkmark
    el('path', {
      d: 'M 39 61 L 54 76 L 83 45',
      fill: 'none',
      stroke,
      strokeWidth: 11,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
    // Next-step planet
    el('circle', { cx: 100, cy: 46, r: 7, fill: dot }),
  ];
}

export function logoSymbol(variant: LogoVariant = 'color', monoColor: string = palette.deepTeal): SvgNode {
  switch (variant) {
    case 'color':
      return svgDocument('0 0 120 120', [
        el('rect', { x: 6, y: 6, width: 108, height: 108, rx: 32, fill: palette.deepTeal }),
        ...artwork(palette.softMint, palette.peach, 0.7),
      ]);
    case 'onDark':
      return svgDocument('0 0 120 120', [
        el('rect', { x: 6, y: 6, width: 108, height: 108, rx: 32, fill: palette.softMint }),
        ...artwork(palette.deepTeal, palette.peachDeep, 0.6),
      ]);
    case 'mono':
      return svgDocument('0 0 120 120', [
        el('rect', { x: 6, y: 6, width: 108, height: 108, rx: 32, fill: 'none', stroke: monoColor, strokeWidth: 6 }),
        ...artwork(monoColor, monoColor, 1),
      ]);
    case 'glyph':
      return svgDocument('0 0 120 120', artwork(palette.softMint, palette.peach, 0.7));
    case 'glyphMono':
      return svgDocument('0 0 120 120', artwork(monoColor, monoColor, 1));
  }
}

/** Children of the symbol without the outer <svg>, for embedding in compositions. */
export function logoSymbolGroup(variant: LogoVariant, transform: string, monoColor?: string): SvgNode {
  return g({ transform }, logoSymbol(variant, monoColor).c ?? []);
}
