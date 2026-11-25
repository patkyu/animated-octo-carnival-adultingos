import { describe, expect, it } from 'vitest';
import { EXPRESSIONS, MASCOTS, MASCOT_IDS, POSES, VIEWS, logoSymbol, mascotSvg, sceneSvg, toSvgString } from '../index';

describe('mascot system', () => {
  it('renders every mascot × expression × pose × view as well-formed SVG', () => {
    let n = 0;
    for (const id of MASCOT_IDS)
      for (const expression of EXPRESSIONS)
        for (const pose of POSES)
          for (const view of VIEWS) {
            const svg = toSvgString(mascotSvg(id, { expression, pose, view }));
            expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"')).toBe(true);
            expect(svg).not.toMatch(/NaN|undefined/);
            n++;
          }
    expect(n).toBe(6 * 8 * 3 * 3);
  });
  it('every buddy has a name, role and signature phrase', () => {
    for (const id of MASCOT_IDS) {
      expect(MASCOTS[id].name.length).toBeGreaterThan(1);
      expect(MASCOTS[id].phrase.endsWith('.')).toBe(true);
    }
  });
  it('scenes and logo variants serialize', () => {
    for (const k of ['empty', 'error', 'offline', 'success'] as const) expect(toSvgString(sceneSvg('doki', k))).toContain('<svg');
    for (const v of ['color', 'onDark', 'mono', 'glyph', 'glyphMono'] as const) expect(toSvgString(logoSymbol(v))).toContain('viewBox="0 0 120 120"');
  });
  it('escapes attribute values', () => {
    expect(toSvgString({ t: 'path', p: { d: 'M0 0"><script>' } })).not.toContain('<script>');
  });
});
