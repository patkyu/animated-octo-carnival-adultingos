import { el, g, svgDocument, type SvgNode } from './svg';
import { palette } from './tokens';

/**
 * The Adulting Buddies — original characters with one shared visual
 * language: rounded silhouettes, 4px soft outlines in a deeper tone of the
 * body colour, dot-or-arc eyes, blush cheeks and short stroke limbs.
 *
 * Every mascot × expression × pose is generated from this file, so the
 * in-app components and the exported asset files can never drift apart.
 */
export const MASCOT_IDS = ['adu', 'doki', 'piso', 'tiki', 'homi', 'sunny'] as const;
export type MascotId = (typeof MASCOT_IDS)[number];

export const EXPRESSIONS = [
  'neutral', 'happy', 'excited', 'confused', 'thoughtful', 'sleepy', 'celebrating', 'concern',
] as const;
export type Expression = (typeof EXPRESSIONS)[number];

export const POSES = ['idle', 'wave', 'hold'] as const;
export type Pose = (typeof POSES)[number];

/** Front is the canonical view; side and three-quarter are reference turns. */
export const VIEWS = ['front', 'threeQuarter', 'side'] as const;
export type View = (typeof VIEWS)[number];

export interface MascotMeta {
  id: MascotId;
  name: string;
  role: string;
  phrase: string;
  personality: string;
  colors: { body: string; outline: string; accent: string };
  surface: string; // pastel card background in the app
}

export const MASCOTS: Record<MascotId, MascotMeta> = {
  adu: {
    id: 'adu', name: 'Adu', role: 'Your main companion', phrase: 'One step at a time.',
    personality: 'Calm, encouraging, dependable, curious and organized.',
    colors: { body: palette.softMint, outline: palette.deepTeal, accent: palette.softGreen }, surface: palette.softMint,
  },
  doki: {
    id: 'doki', name: 'Doki', role: 'The paperwork buddy', phrase: "Paperwork doesn't have to be painful.",
    personality: 'Knowledgeable, detail-oriented, meticulous and friendly.',
    colors: { body: palette.lavender, outline: palette.lavenderDeep, accent: '#CFC6F2' }, surface: palette.lavender,
  },
  piso: {
    id: 'piso', name: 'Piso', role: 'The money buddy', phrase: 'Every little peso counts.',
    personality: 'Resourceful, practical, cheerful and financially responsible.',
    colors: { body: palette.peach, outline: palette.peachDeep, accent: palette.coinGold }, surface: palette.peach,
  },
  tiki: {
    id: 'tiki', name: 'Tiki', role: 'The time buddy', phrase: "You've got time to get this done.",
    personality: 'Punctual, energetic, helpful and optimistic.',
    colors: { body: palette.softBlue, outline: palette.softBlueDeep, accent: '#A9CBEF' }, surface: palette.softBlue,
  },
  homi: {
    id: 'homi', name: 'Homi', role: 'The household buddy', phrase: 'A little care makes a happy home.',
    personality: 'Caring, practical, comforting and dependable.',
    colors: { body: palette.cream, outline: '#B07A4F', accent: palette.roofOrange }, surface: '#FFEBDD',
  },
  sunny: {
    id: 'sunny', name: 'Sunny', role: 'The wellness buddy', phrase: 'Rest is productive, too.',
    personality: 'Gentle, supportive, optimistic and nonjudgmental.',
    colors: { body: palette.sunYellow, outline: palette.sunDeep, accent: '#FFD04D' }, surface: palette.softYellow,
  },
};

const INK = palette.ink;
const SW = 4; // outline width

/* ----------------------------------------------------------------------------
 * Face system — shared by all buddies. (fx, fy) is the point between the eyes.
 * `look` shifts the whole face for side/three-quarter views.
 * --------------------------------------------------------------------------*/
function face(fx: number, fy: number, expr: Expression, s = 1, gap = 22): SvgNode[] {
  const lx = fx - gap / 2;
  const rx = fx + gap / 2;
  const my = fy + 16 * s;
  const n: SvgNode[] = [];
  const stroke = { stroke: INK, strokeWidth: 3.5 * s, strokeLinecap: 'round' as const, fill: 'none' };
  const dotEye = (x: number, y: number, r = 4.6) => [
    el('ellipse', { cx: x, cy: y, rx: r * s, ry: (r + 1.2) * s, fill: INK }),
    el('circle', { cx: x + 1.5 * s, cy: y - 2 * s, r: 1.4 * s, fill: '#FFFFFF' }),
  ];
  const arcEye = (x: number, y: number) =>
    el('path', { d: `M ${x - 6 * s} ${y + 2 * s} Q ${x} ${y - 6 * s} ${x + 6 * s} ${y + 2 * s}`, ...stroke });
  const closedEye = (x: number, y: number) =>
    el('path', { d: `M ${x - 6 * s} ${y} Q ${x} ${y + 5 * s} ${x + 6 * s} ${y}`, ...stroke });
  const cheeks = (opacity = 0.55) => [
    el('ellipse', { cx: lx - 9 * s, cy: my - 4 * s, rx: 6 * s, ry: 3.6 * s, fill: palette.blush, opacity }),
    el('ellipse', { cx: rx + 9 * s, cy: my - 4 * s, rx: 6 * s, ry: 3.6 * s, fill: palette.blush, opacity }),
  ];
  const smile = (w: number, depth: number) =>
    el('path', { d: `M ${fx - w * s} ${my - 2 * s} Q ${fx} ${my + depth * s} ${fx + w * s} ${my - 2 * s}`, ...stroke });
  const openMouth = (w: number, h: number) =>
    el('path', {
      d: `M ${fx - w * s} ${my - 3 * s} Q ${fx} ${my - 1 * s} ${fx + w * s} ${my - 3 * s} Q ${fx} ${my + h * s} ${fx - w * s} ${my - 3 * s} Z`,
      fill: INK,
    });
  const sparkle = (x: number, y: number, r: number, color: string) =>
    el('path', {
      d: `M ${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z`,
      fill: color,
    });

  switch (expr) {
    case 'neutral':
      n.push(...dotEye(lx, fy), ...dotEye(rx, fy), smile(5, 4), ...cheeks(0.35));
      break;
    case 'happy':
      n.push(arcEye(lx, fy), arcEye(rx, fy), smile(8, 9), ...cheeks());
      break;
    case 'excited':
      n.push(...dotEye(lx, fy, 5.6), ...dotEye(rx, fy, 5.6), openMouth(8, 14), ...cheeks(0.7));
      n.push(sparkle(fx - 46 * s, fy - 26 * s, 7 * s, palette.coinGold), sparkle(fx + 48 * s, fy - 34 * s, 5 * s, palette.coinGold));
      break;
    case 'confused':
      n.push(...dotEye(lx, fy, 4.6), ...dotEye(rx, fy + 1, 3.6));
      n.push(el('path', { d: `M ${lx - 6 * s} ${fy - 11 * s} L ${lx + 4 * s} ${fy - 9 * s}`, ...stroke, strokeWidth: 3 * s }));
      n.push(el('path', { d: `M ${fx - 7 * s} ${my} q ${3.5 * s} ${-4 * s} ${7 * s} 0 t ${7 * s} 0`, ...stroke }));
      n.push(
        el('path', { d: `M ${fx + 40 * s} ${fy - 38 * s} q 0 ${-8 * s} ${7 * s} ${-8 * s} q ${7 * s} 0 ${7 * s} ${7 * s} q 0 ${5 * s} ${-7 * s} ${8 * s} l 0 ${4 * s}`, ...stroke, stroke: palette.slate, strokeWidth: 3.4 * s }),
        el('circle', { cx: fx + 47 * s, cy: fy - 13 * s, r: 2.2 * s, fill: palette.slate }),
      );
      break;
    case 'thoughtful':
      n.push(
        el('ellipse', { cx: lx + 2 * s, cy: fy - 1 * s, rx: 4.4 * s, ry: 5.6 * s, fill: INK }),
        el('ellipse', { cx: rx + 2 * s, cy: fy - 1 * s, rx: 4.4 * s, ry: 5.6 * s, fill: INK }),
        el('circle', { cx: lx + 4 * s, cy: fy - 4 * s, r: 1.4 * s, fill: '#FFFFFF' }),
        el('circle', { cx: rx + 4 * s, cy: fy - 4 * s, r: 1.4 * s, fill: '#FFFFFF' }),
        el('path', { d: `M ${fx - 3 * s} ${my} L ${fx + 7 * s} ${my - 2 * s}`, ...stroke }),
        el('circle', { cx: fx + 38 * s, cy: fy - 22 * s, r: 3 * s, fill: palette.slate, opacity: 0.6 }),
        el('circle', { cx: fx + 46 * s, cy: fy - 33 * s, r: 4.5 * s, fill: palette.slate, opacity: 0.6 }),
        el('circle', { cx: fx + 57 * s, cy: fy - 46 * s, r: 6.5 * s, fill: palette.slate, opacity: 0.6 }),
      );
      break;
    case 'sleepy':
      n.push(closedEye(lx, fy), closedEye(rx, fy), el('ellipse', { cx: fx, cy: my + 1 * s, rx: 3 * s, ry: 3.6 * s, fill: INK }), ...cheeks(0.4));
      n.push(
        el('path', { d: `M ${fx + 36 * s} ${fy - 30 * s} h ${10 * s} l ${-10 * s} ${10 * s} h ${10 * s}`, ...stroke, stroke: palette.slate, strokeWidth: 3 * s, strokeLinejoin: 'round' }),
        el('path', { d: `M ${fx + 50 * s} ${fy - 46 * s} h ${7 * s} l ${-7 * s} ${7 * s} h ${7 * s}`, ...stroke, stroke: palette.slate, strokeWidth: 2.6 * s, strokeLinejoin: 'round' }),
      );
      break;
    case 'celebrating':
      n.push(arcEye(lx, fy), arcEye(rx, fy), openMouth(9, 15), ...cheeks(0.7));
      for (const [x, y, c, r] of [
        [-52, -30, palette.coinGold, 0], [50, -40, palette.lavenderDeep, 30], [-40, -52, palette.peachDeep, 60],
        [58, -16, palette.softGreen, 15], [36, -58, palette.coinGold, 45],
      ] as const) {
        n.push(el('rect', { x: fx + x * s, y: fy + y * s, width: 7 * s, height: 4 * s, rx: 1.5 * s, fill: c, transform: `rotate(${r} ${fx + x * s} ${fy + y * s})` }));
      }
      break;
    case 'concern':
      n.push(...dotEye(lx, fy + 1, 4.2), ...dotEye(rx, fy + 1, 4.2));
      n.push(
        el('path', { d: `M ${lx - 6 * s} ${fy - 9 * s} L ${lx + 4 * s} ${fy - 12 * s}`, ...stroke, strokeWidth: 3 * s }),
        el('path', { d: `M ${rx + 6 * s} ${fy - 9 * s} L ${rx - 4 * s} ${fy - 12 * s}`, ...stroke, strokeWidth: 3 * s }),
        el('path', { d: `M ${fx - 6 * s} ${my + 1 * s} Q ${fx} ${my - 3 * s} ${fx + 6 * s} ${my + 1 * s}`, ...stroke }),
        ...cheeks(0.3),
      );
      break;
  }
  return n;
}

/* ---------------------------------------------------------------------------
 * Limbs
 * -------------------------------------------------------------------------*/
function limb(d: string, color: string, w = 7): SvgNode {
  return el('path', { d, fill: 'none', stroke: color, strokeWidth: w, strokeLinecap: 'round', strokeLinejoin: 'round' });
}

/** Arms anchored at the given shoulder points; right arm waves or holds. */
function arms(l: [number, number], r: [number, number], pose: Pose, color: string, expr: Expression): SvgNode[] {
  const raised = expr === 'celebrating' || expr === 'excited';
  const left = raised
    ? limb(`M ${l[0]} ${l[1]} q -14 -10 -18 -30`, color)
    : limb(`M ${l[0]} ${l[1]} q -14 8 -16 24`, color);
  let right: SvgNode;
  if (pose === 'wave' || raised) {
    right = g({}, [
      limb(`M ${r[0]} ${r[1]} q 14 -10 18 -30`, color),
      el('circle', { cx: r[0] + 18, cy: r[1] - 32, r: 5.5, fill: color }),
      ...(pose === 'wave'
        ? [
            limb(`M ${r[0] + 30} ${r[1] - 44} q 6 6 4 14`, palette.slate, 2.5),
            limb(`M ${r[0] + 34} ${r[1] - 30} q 5 3 6 9`, palette.slate, 2.5),
          ]
        : []),
    ]);
  } else if (pose === 'hold') {
    right = limb(`M ${r[0]} ${r[1]} q 12 4 16 14`, color);
  } else {
    right = limb(`M ${r[0]} ${r[1]} q 14 8 16 24`, color);
  }
  return [left, right];
}

function feet(x1: number, x2: number, y: number, color: string): SvgNode[] {
  return [
    el('ellipse', { cx: x1, cy: y, rx: 11, ry: 6, fill: color }),
    el('ellipse', { cx: x2, cy: y, rx: 11, ry: 6, fill: color }),
  ];
}

/** The object each buddy holds in the `hold` pose. */
function heldObject(id: MascotId, x: number, y: number): SvgNode {
  switch (id) {
    case 'adu': // checklist card
      return g({ transform: `translate(${x} ${y}) rotate(8)` }, [
        el('rect', { x: -2, y: -4, width: 30, height: 36, rx: 6, fill: '#FFFFFF', stroke: palette.deepTeal, strokeWidth: 3 }),
        limb('M 4 8 l 4 4 l 8 -8', palette.deepTeal, 3),
        el('line', { x1: 5, y1: 20, x2: 22, y2: 20, stroke: palette.softGreen, strokeWidth: 3, strokeLinecap: 'round' }),
      ]);
    case 'doki': // ID card
      return g({ transform: `translate(${x} ${y}) rotate(-6)` }, [
        el('rect', { x: 0, y: 0, width: 34, height: 24, rx: 5, fill: '#FFFFFF', stroke: palette.lavenderDeep, strokeWidth: 3 }),
        el('circle', { cx: 10, cy: 11, r: 5, fill: '#CFC6F2' }),
        el('line', { x1: 19, y1: 9, x2: 28, y2: 9, stroke: palette.lavenderDeep, strokeWidth: 2.5, strokeLinecap: 'round' }),
        el('line', { x1: 19, y1: 15, x2: 26, y2: 15, stroke: '#CFC6F2', strokeWidth: 2.5, strokeLinecap: 'round' }),
      ]);
    case 'piso': // coin
      return g({ transform: `translate(${x + 12} ${y + 10})` }, [
        el('circle', { cx: 0, cy: 0, r: 14, fill: palette.coinGold, stroke: '#B8860B', strokeWidth: 3 }),
        el('path', { d: 'M -4 -7 v 14 M -4 -7 h 5 a 4 4 0 0 1 0 8 h -5 M -8 -3 h 13 M -8 1 h 13', fill: 'none', stroke: '#8A6408', strokeWidth: 2, strokeLinecap: 'round' }),
      ]);
    case 'tiki': // calendar page
      return g({ transform: `translate(${x} ${y}) rotate(6)` }, [
        el('rect', { x: 0, y: 0, width: 30, height: 30, rx: 6, fill: '#FFFFFF', stroke: palette.softBlueDeep, strokeWidth: 3 }),
        el('rect', { x: 0, y: 0, width: 30, height: 9, rx: 4, fill: palette.softBlueDeep }),
        el('circle', { cx: 15, cy: 19, r: 4, fill: palette.red, opacity: 0.8 }),
      ]);
    case 'homi': // heart
      return g({ transform: `translate(${x + 14} ${y + 8})` }, [
        el('path', { d: 'M 0 18 C -16 6 -14 -6 -6 -7 C -2 -7 0 -4 0 -2 C 0 -4 2 -7 6 -7 C 14 -6 16 6 0 18 Z', fill: palette.roofOrange, stroke: '#B07A4F', strokeWidth: 3, strokeLinejoin: 'round' }),
      ]);
    case 'sunny': // tea cup
      return g({ transform: `translate(${x} ${y + 4})` }, [
        el('path', { d: 'M 0 4 h 26 v 10 a 13 11 0 0 1 -26 0 Z', fill: '#FFFFFF', stroke: palette.sunDeep, strokeWidth: 3, strokeLinejoin: 'round' }),
        el('path', { d: 'M 26 8 a 5 5 0 0 1 0 10', fill: 'none', stroke: palette.sunDeep, strokeWidth: 3 }),
        limb('M 8 -2 q -3 -5 0 -9 M 16 -2 q -3 -5 0 -9', palette.slate, 2),
      ]);
  }
}

/* ---------------------------------------------------------------------------
 * Bodies. Each returns [behind-limbs, body, face-anchor, shoulders, feet-y].
 * -------------------------------------------------------------------------*/
interface BodySpec {
  back: SvgNode[];
  body: SvgNode[];
  front?: SvgNode[];
  face: [number, number, number?]; // fx, fy, scale
  shoulders: [[number, number], [number, number]];
  feet: [number, number, number];
  limbColor: string;
  hold: [number, number];
}

function aduBody(): BodySpec {
  const m = MASCOTS.adu.colors;
  return {
    back: [
      // sprout
      limb('M 100 58 q -2 -14 4 -24', palette.deepTeal, 5),
      el('path', { d: 'M 104 36 C 112 18 136 18 140 28 C 130 40 112 42 104 36 Z', fill: m.accent, stroke: palette.deepTeal, strokeWidth: SW, strokeLinejoin: 'round' }),
      el('path', { d: 'M 101 40 C 92 26 70 26 66 36 C 76 46 94 46 101 40 Z', fill: m.accent, stroke: palette.deepTeal, strokeWidth: SW, strokeLinejoin: 'round' }),
    ],
    body: [
      el('path', {
        d: 'M 100 56 C 140 56 160 88 158 124 C 156 158 132 176 100 176 C 68 176 44 158 42 124 C 40 88 60 56 100 56 Z',
        fill: m.body, stroke: m.outline, strokeWidth: SW,
      }),
      el('path', { d: 'M 62 92 C 68 76 80 68 92 66', fill: 'none', stroke: '#FFFFFF', strokeWidth: 5, strokeLinecap: 'round', opacity: 0.7 }),
      // checkmark emblem
      el('circle', { cx: 100, cy: 150, r: 12, fill: '#FFFFFF', stroke: m.outline, strokeWidth: 3 }),
      limb('M 94 150 l 4 4 l 8 -8', palette.deepTeal, 3.5),
    ],
    face: [100, 106, 1],
    shoulders: [[50, 132], [150, 132]],
    feet: [80, 120, 178],
    limbColor: palette.deepTeal,
    hold: [158, 140],
  };
}

function dokiBody(): BodySpec {
  const m = MASCOTS.doki.colors;
  return {
    back: [
      el('path', { d: 'M 44 62 a 8 8 0 0 1 8 -8 h 30 l 10 10 h 56 a 8 8 0 0 1 8 8 v 96 a 8 8 0 0 1 -8 8 h -96 a 8 8 0 0 1 -8 -8 Z', fill: m.accent, stroke: m.outline, strokeWidth: SW, strokeLinejoin: 'round' }),
      el('rect', { x: 62, y: 52, width: 70, height: 44, rx: 4, fill: '#FFFFFF', stroke: m.outline, strokeWidth: 3, transform: 'rotate(-4 97 74)' }),
      el('line', { x1: 72, y1: 66, x2: 118, y2: 63, stroke: '#CFC6F2', strokeWidth: 3, strokeLinecap: 'round' }),
    ],
    body: [
      el('path', { d: 'M 40 86 a 10 10 0 0 1 10 -10 h 102 a 10 10 0 0 1 10 10 l -4 78 a 10 10 0 0 1 -10 10 h -94 a 10 10 0 0 1 -10 -10 Z', fill: m.body, stroke: m.outline, strokeWidth: SW, strokeLinejoin: 'round' }),
      el('rect', { x: 86, y: 152, width: 30, height: 8, rx: 4, fill: m.accent }),
    ],
    face: [100, 112, 1],
    shoulders: [[44, 128], [158, 128]],
    feet: [78, 124, 180],
    limbColor: m.outline,
    hold: [162, 132],
  };
}

function pisoBody(): BodySpec {
  const m = MASCOTS.piso.colors;
  return {
    back: [
      el('path', { d: 'M 62 74 L 58 46 L 84 62 Z', fill: m.body, stroke: m.outline, strokeWidth: SW, strokeLinejoin: 'round' }),
      el('path', { d: 'M 138 74 L 142 46 L 116 62 Z', fill: m.body, stroke: m.outline, strokeWidth: SW, strokeLinejoin: 'round' }),
      // coin peeking from slot
      el('circle', { cx: 100, cy: 56, r: 13, fill: m.accent, stroke: '#B8860B', strokeWidth: 3 }),
    ],
    body: [
      el('ellipse', { cx: 100, cy: 120, rx: 62, ry: 56, fill: m.body, stroke: m.outline, strokeWidth: SW }),
      el('rect', { x: 86, y: 63, width: 28, height: 6, rx: 3, fill: m.outline }),
      // snout
      el('ellipse', { cx: 100, cy: 134, rx: 17, ry: 12, fill: '#FFC3A6', stroke: m.outline, strokeWidth: 3 }),
      el('ellipse', { cx: 94, cy: 134, rx: 3, ry: 4, fill: m.outline }),
      el('ellipse', { cx: 106, cy: 134, rx: 3, ry: 4, fill: m.outline }),
      el('path', { d: 'M 161 112 q 12 -4 8 8 q -4 8 4 8', fill: 'none', stroke: m.outline, strokeWidth: 3.5, strokeLinecap: 'round' }),
    ],
    face: [100, 104, 1],
    shoulders: [[46, 132], [154, 132]],
    feet: [74, 126, 176],
    limbColor: m.outline,
    hold: [156, 140],
  };
}

function tikiBody(): BodySpec {
  const m = MASCOTS.tiki.colors;
  return {
    back: [
      el('circle', { cx: 60, cy: 64, r: 16, fill: m.accent, stroke: m.outline, strokeWidth: SW }),
      el('circle', { cx: 140, cy: 64, r: 16, fill: m.accent, stroke: m.outline, strokeWidth: SW }),
      limb('M 100 58 v -12', m.outline, 5),
      el('circle', { cx: 100, cy: 44, r: 5, fill: m.outline }),
    ],
    body: [
      el('circle', { cx: 100, cy: 118, r: 60, fill: m.accent, stroke: m.outline, strokeWidth: SW }),
      el('circle', { cx: 100, cy: 118, r: 49, fill: m.body }),
      // tick marks
      ...[0, 90, 180, 270].map((a) =>
        el('line', { x1: 100, y1: 74, x2: 100, y2: 80, stroke: m.outline, strokeWidth: 3, strokeLinecap: 'round', transform: `rotate(${a} 100 118)` }),
      ),
      // hands
      limb('M 100 118 L 100 92', m.outline, 3.5),
      limb('M 100 118 L 118 108', m.outline, 3.5),
      el('circle', { cx: 100, cy: 118, r: 4, fill: m.outline }),
    ],
    face: [100, 132, 0.85],
    shoulders: [[44, 126], [156, 126]],
    feet: [78, 122, 180],
    limbColor: m.outline,
    hold: [158, 134],
  };
}

function homiBody(): BodySpec {
  const m = MASCOTS.homi.colors;
  return {
    back: [el('rect', { x: 126, y: 40, width: 16, height: 30, rx: 4, fill: '#E9967A', stroke: m.outline, strokeWidth: SW })],
    body: [
      el('rect', { x: 50, y: 84, width: 100, height: 90, rx: 14, fill: m.body, stroke: m.outline, strokeWidth: SW }),
      el('path', { d: 'M 38 92 Q 34 84 42 78 L 92 40 Q 100 34 108 40 L 158 78 Q 166 84 162 92 Q 158 98 150 94 L 100 58 L 50 94 Q 42 98 38 92 Z', fill: m.accent, stroke: m.outline, strokeWidth: SW, strokeLinejoin: 'round' }),
      el('path', { d: 'M 50 90 L 100 54 L 150 90 L 150 96 L 50 96 Z', fill: m.body, opacity: 0 }),
      // round window (attic)
      el('circle', { cx: 100, cy: 76, r: 8, fill: palette.softBlue, stroke: m.outline, strokeWidth: 3 }),
      // door
      el('path', { d: 'M 88 174 v -18 a 12 12 0 0 1 24 0 v 18', fill: m.accent, stroke: m.outline, strokeWidth: 3 }),
    ],
    face: [100, 116, 1],
    shoulders: [[52, 130], [148, 130]],
    feet: [76, 124, 180],
    limbColor: m.outline,
    hold: [150, 136],
  };
}

function sunnyBody(): BodySpec {
  const m = MASCOTS.sunny.colors;
  const rays: SvgNode[] = [];
  for (let i = 0; i < 10; i++) {
    rays.push(el('rect', { x: 94, y: 34, width: 12, height: 22, rx: 6, fill: m.accent, stroke: m.outline, strokeWidth: 3, transform: `rotate(${i * 36} 100 112)` }));
  }
  return {
    back: rays,
    body: [
      el('circle', { cx: 100, cy: 112, r: 56, fill: m.body, stroke: m.outline, strokeWidth: SW }),
      el('path', { d: 'M 64 92 C 70 76 82 68 96 66', fill: 'none', stroke: '#FFFFFF', strokeWidth: 5, strokeLinecap: 'round', opacity: 0.6 }),
    ],
    face: [100, 108, 1],
    shoulders: [[48, 130], [152, 130]],
    feet: [80, 120, 176],
    limbColor: m.outline,
    hold: [154, 136],
  };
}

const BODIES: Record<MascotId, () => BodySpec> = {
  adu: aduBody, doki: dokiBody, piso: pisoBody, tiki: tikiBody, homi: homiBody, sunny: sunnyBody,
};

export interface MascotOptions {
  expression?: Expression;
  pose?: Pose;
  view?: View;
  /** Adds a soft ground shadow. */
  shadow?: boolean;
}

/**
 * Full mascot as an SVG document (viewBox 0 0 200 200, transparent background).
 * Side and three-quarter views are produced by horizontally compressing the
 * body and shifting the face toward the facing side — a consistent turnaround
 * reference for illustrators, not a re-drawn 3D turn.
 */
export function mascotSvg(id: MascotId, opts: MascotOptions = {}): SvgNode {
  const expression = opts.expression ?? 'neutral';
  const pose = opts.pose ?? 'idle';
  const view = opts.view ?? 'front';
  const b = BODIES[id]();
  const [fx, fy, fs = 1] = b.face;

  const viewTransform =
    view === 'front' ? undefined : view === 'threeQuarter' ? 'translate(100 0) scale(0.86 1) translate(-100 0)' : 'translate(100 0) scale(0.66 1) translate(-100 0)';
  const faceShift = view === 'front' ? 0 : view === 'threeQuarter' ? 12 : 26;
  const faceGap = view === 'side' ? 14 : view === 'threeQuarter' ? 19 : 22;

  const showLeftArm = view !== 'side';
  const armNodes = arms(b.shoulders[0], b.shoulders[1], pose, b.limbColor, expression);
  const children: SvgNode[] = [];
  if (opts.shadow !== false) children.push(el('ellipse', { cx: 100, cy: 188, rx: 50, ry: 6, fill: palette.ink, opacity: 0.08 }));
  const bodyGroup: SvgNode[] = [
    ...feet(b.feet[0], b.feet[1], b.feet[2], b.limbColor),
    ...b.back,
    ...(showLeftArm ? [armNodes[0]!] : []),
    ...b.body,
    ...(b.front ?? []),
  ];
  children.push(viewTransform ? g({ transform: viewTransform }, bodyGroup) : g({}, bodyGroup));
  children.push(g({}, face(fx + faceShift, fy, expression, fs, faceGap)));
  children.push(armNodes[1]!);
  if (pose === 'hold') children.push(heldObject(id, b.hold[0], b.hold[1]));
  return svgDocument('0 0 200 200', children);
}

/* ---------------------------------------------------------------------------
 * Scene illustrations for empty and error states.
 * -------------------------------------------------------------------------*/
export type SceneKind = 'empty' | 'error' | 'offline' | 'success';

export function sceneSvg(id: MascotId, kind: SceneKind): SvgNode {
  const m = MASCOTS[id];
  const expression: Expression = kind === 'empty' ? 'thoughtful' : kind === 'error' ? 'concern' : kind === 'offline' ? 'sleepy' : 'celebrating';
  const pose: Pose = kind === 'empty' ? 'hold' : kind === 'success' ? 'wave' : 'idle';
  const mascot = mascotSvg(id, { expression, pose, shadow: false });
  const decor: SvgNode[] =
    kind === 'error'
      ? [el('path', { d: 'M 214 52 l 10 -18 l 10 18 Z', fill: palette.softYellow, stroke: palette.amber, strokeWidth: 3, strokeLinejoin: 'round' }), el('line', { x1: 224, y1: 41, x2: 224, y2: 46, stroke: palette.amber, strokeWidth: 3, strokeLinecap: 'round' })]
      : kind === 'offline'
        ? [el('path', { d: 'M 206 52 a 22 22 0 0 1 36 0 M 212 60 a 14 14 0 0 1 24 0', fill: 'none', stroke: palette.slate, strokeWidth: 3.5, strokeLinecap: 'round' }), el('circle', { cx: 224, cy: 68, r: 3, fill: palette.slate })]
        : [el('circle', { cx: 30, cy: 60, r: 6, fill: m.colors.accent, opacity: 0.8 }), el('circle', { cx: 222, cy: 40, r: 9, fill: m.colors.accent, opacity: 0.6 })];
  return svgDocument('0 0 252 220', [
    el('ellipse', { cx: 126, cy: 196, rx: 104, ry: 16, fill: m.surface }),
    ...decor,
    g({ transform: 'translate(26 6)' }, mascot.c ?? []),
  ]);
}
