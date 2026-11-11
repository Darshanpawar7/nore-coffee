/**
 * The two marks as geometry, so the logo, the favicon and the brand page all draw the same shapes.
 *
 * The froth ring (primary): a steel tumbler seen from above, its rim a ring, the coffee a disc, and a
 * crown of froth bubbles around the edge of the coffee, where the nore gathers after a good pull.
 *
 * The pull (secondary): a single line falling from a tumbler held high into a davara held low.
 */

export interface Bubble {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/** Bubbles round the inside of the rim: big and small in turn, with a few strays nearer the middle. */
export function frothBubbles(): readonly Bubble[] {
  const ring: Bubble[] = [];
  const count = 15;
  for (let index = 0; index < count; index++) {
    const angle = (index / count) * 2 * Math.PI - Math.PI / 2;
    const r = index % 3 === 0 ? 3.1 : index % 3 === 1 ? 2.2 : 2.6;
    const reach = 17.2 + (index % 2 === 0 ? 0.6 : -0.4);
    ring.push({
      x: round(32 + reach * Math.cos(angle)),
      y: round(32 + reach * Math.sin(angle)),
      r,
    });
  }
  const strays: Bubble[] = [
    { x: 25.5, y: 27, r: 1.5 },
    { x: 38.5, y: 36.5, r: 1.2 },
    { x: 33, y: 41.5, r: 1 },
  ];
  return [...ring, ...strays];
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export const RIM = { cx: 32, cy: 32, outer: 29, inner: 23.5 } as const;

/** The pull: a tumbler, the stream, and the davara, in a 64 x 64 box. */
export const PULL = {
  tumbler: 'M20 6h11l-1.4 14h-8.2z',
  stream: 'M26 20c0 9 1.2 18 1.6 30',
  davara: 'M12 50h32l-3.5 8h-25z',
} as const;
