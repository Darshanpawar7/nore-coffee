import { pointKey, type LatticePoint } from './lattice';
import type { Stroke } from './strokes';

/**
 * Chains strokes into closed loops, so each loop can be one SVG path: round joins everywhere, and a
 * single dash animation draws it.
 *
 * Through an open gate, the straight stroke from one dot and the stroke from the facing dot that
 * continues in the same direction are the two halves of one straight line. They are joined first,
 * into a segment from port to port. After that every port ends exactly two segments, and walking
 * from segment to segment always comes back to where it started.
 */

export type Segment =
  | {
      readonly kind: 'arc';
      readonly from: LatticePoint;
      readonly to: LatticePoint;
      readonly centre: LatticePoint;
    }
  | { readonly kind: 'line'; readonly from: LatticePoint; readonly to: LatticePoint };

/** A loop as segments in walking order; each segment runs from the end of the one before. */
export type Loop = readonly Segment[];

function reflect(point: LatticePoint, through: LatticePoint): LatticePoint {
  return { x: 2 * through.x - point.x, y: 2 * through.y - point.y };
}

/** Joins the half-lines that meet at each open gate into full straight segments. */
export function segmentsOf(strokes: readonly Stroke[]): readonly Segment[] {
  const segments: Segment[] = [];
  const halves = new Map<string, LatticePoint>();
  for (const stroke of strokes) {
    if (stroke.kind === 'arc') {
      segments.push(stroke);
      continue;
    }
    // A half-line runs from a port to the gate; its partner starts at the port mirrored through the gate.
    const partner = reflect(stroke.from, stroke.to);
    const partnerKey = `${pointKey(partner)}>${pointKey(stroke.to)}`;
    if (halves.has(partnerKey)) {
      halves.delete(partnerKey);
      segments.push({ kind: 'line', from: partner, to: stroke.from });
    } else {
      halves.set(`${pointKey(stroke.from)}>${pointKey(stroke.to)}`, stroke.from);
    }
  }
  if (halves.size > 0)
    throw new Error('A straight stroke reached a gate that no facing stroke crosses.');
  return segments;
}

/** Walks the segments into loops. Throws if a port does not end exactly two segments. */
export function loopsOf(segments: readonly Segment[]): readonly Loop[] {
  const atPort = new Map<string, number[]>();
  segments.forEach((segment, index) => {
    for (const end of [segment.from, segment.to]) {
      const key = pointKey(end);
      atPort.set(key, [...(atPort.get(key) ?? []), index]);
    }
  });
  for (const [port, ends] of atPort) {
    if (ends.length !== 2)
      throw new Error(`Port ${port} ends ${String(ends.length)} segments, not two.`);
  }

  const used = new Set<number>();
  const loops: Loop[] = [];
  segments.forEach((first, start) => {
    if (used.has(start)) return;
    const loop: Segment[] = [];
    let index = start;
    let from = first.from;
    for (;;) {
      used.add(index);
      const segment = segments[index];
      if (!segment) break;
      const forwards = pointKey(segment.from) === pointKey(from);
      const oriented: Segment = forwards
        ? segment
        : { ...segment, from: segment.to, to: segment.from };
      loop.push(oriented);
      from = oriented.to;
      const next = (atPort.get(pointKey(from)) ?? []).find((candidate) => candidate !== index);
      if (next === undefined || next === start) break;
      index = next;
    }
    loops.push(loop);
  });
  return loops;
}

/**
 * SVG path data for a loop, in user units of `unit` per lattice step. An arc is a quarter circle of
 * radius √2 lattice steps around its dot; its sweep follows the direction the loop walks it.
 */
export function pathOf(loop: Loop, unit: number): string {
  const first = loop[0];
  if (!first) return '';
  const number = (value: number) => String(Math.round(value * unit * 1000) / 1000);
  const radius = number(Math.SQRT2);
  const parts = [`M${number(first.from.x)} ${number(first.from.y)}`];
  for (const segment of loop) {
    const end = `${number(segment.to.x)} ${number(segment.to.y)}`;
    if (segment.kind === 'line') {
      parts.push(`L${end}`);
      continue;
    }
    const { from, to, centre } = segment;
    // The cross product's sign says whether the walk turns clockwise on screen (y grows downwards).
    const cross = (from.x - centre.x) * (to.y - centre.y) - (from.y - centre.y) * (to.x - centre.x);
    parts.push(`A${radius} ${radius} 0 0 ${cross > 0 ? '1' : '0'} ${end}`);
  }
  parts.push('Z');
  return parts.join('');
}
