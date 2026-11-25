/**
 * A tiny renderer-agnostic SVG tree. Mascots and logos are defined once as
 * data; the mobile app maps nodes onto react-native-svg components and the
 * asset pipeline serializes them to .svg files. Prop names are camelCase
 * (react-native-svg style) and converted to kebab-case on serialization.
 */
export type SvgTag =
  | 'svg' | 'g' | 'path' | 'circle' | 'ellipse' | 'rect' | 'line' | 'polyline' | 'polygon'
  | 'defs' | 'linearGradient' | 'radialGradient' | 'stop' | 'text';

export type SvgProps = Record<string, string | number | undefined>;

export interface SvgNode {
  t: SvgTag;
  p: SvgProps;
  c?: SvgNode[];
  /** Text content (only for `text`). */
  text?: string;
}

export const el = (t: SvgTag, p: SvgProps = {}, c?: SvgNode[]): SvgNode => (c ? { t, p, c } : { t, p });
export const g = (p: SvgProps, c: SvgNode[]): SvgNode => el('g', p, c);

const KEEP_CAMEL = new Set(['viewBox', 'gradientUnits', 'gradientTransform', 'preserveAspectRatio']);
const toKebab = (k: string) => (KEEP_CAMEL.has(k) ? k : k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`));
const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function toSvgString(node: SvgNode, indent = ''): string {
  const attrs = Object.entries(node.p)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => ` ${toKebab(k)}="${esc(String(v))}"`)
    .join('');
  const ns = node.t === 'svg' ? ' xmlns="http://www.w3.org/2000/svg"' : '';
  if (node.t === 'text') return `${indent}<text${ns}${attrs}>${esc(node.text ?? '')}</text>`;
  if (!node.c || node.c.length === 0) return `${indent}<${node.t}${ns}${attrs}/>`;
  const inner = node.c.map((c) => toSvgString(c, indent + '  ')).join('\n');
  return `${indent}<${node.t}${ns}${attrs}>\n${inner}\n${indent}</${node.t}>`;
}

export function svgDocument(viewBox: string, children: SvgNode[], extra: SvgProps = {}): SvgNode {
  return el('svg', { viewBox, ...extra }, children);
}
