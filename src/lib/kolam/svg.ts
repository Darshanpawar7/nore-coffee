import type { Kolam } from './kolam';

/**
 * A kolam as a standalone SVG file, for the generator's download button and for determinism tests.
 * Built from numbers and fixed strings only: the seed never enters the markup.
 */
export interface SvgOptions {
  /** Line and dot colour, as #rrggbb. */
  readonly colour: string;
  /** Background as #rrggbb, or null for transparent. */
  readonly background?: string | null;
  readonly strokeWidth?: number;
}

const HEX = /^#[0-9a-f]{6}$/i;

export function kolamSvg(figure: Kolam, options: SvgOptions): string {
  const colour = HEX.test(options.colour) ? options.colour : '#1f1410';
  const background = options.background && HEX.test(options.background) ? options.background : null;
  const width = String(options.strokeWidth ?? 2.4);
  const [x, y, size] = figure.viewBox.split(' ');
  const rect = background
    ? `<rect x="${x ?? '0'}" y="${y ?? '0'}" width="${size ?? '0'}" height="${size ?? '0'}" fill="${background}"/>`
    : '';
  const loops = figure.paths.map((path) => `<path d="${path}"/>`).join('');
  const dots = figure.dots
    .map((dot) => `<circle cx="${String(dot.x)}" cy="${String(dot.y)}" r="1.9"/>`)
    .join('');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${figure.viewBox}" width="800" height="800">`,
    rect,
    `<g fill="none" stroke="${colour}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${loops}</g>`,
    `<g fill="${colour}">${dots}</g>`,
    '</svg>',
  ].join('');
}
