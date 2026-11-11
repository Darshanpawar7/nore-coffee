import type { GridDot } from './arrangement';

/**
 * The construction lattice. Every point the kolam is built from sits on an integer lattice whose
 * step is h/2 (a quarter of the dot spacing):
 *
 *   dot centre   (4c, 4r)
 *   ports        (4c ± 1, 4r ± 1)   on the diagonals of the dot
 *   gate points  (4c ± 2, 4r) and (4c, 4r ± 2)   halfway to each neighbour
 *
 * Working in whole lattice steps keeps every lookup and every invariant exact. Coordinates are
 * converted to SVG user units once, when the paths are written.
 */
export interface LatticePoint {
  readonly x: number;
  readonly y: number;
}

export const SIDES = ['north', 'east', 'south', 'west'] as const;
export type Side = (typeof SIDES)[number];

/** Lattice steps between neighbouring dots: 2h in steps of h/2. */
export const DOT_PITCH = 4;
/** Lattice steps from a dot to the gate point on one of its sides. */
const GATE_REACH = DOT_PITCH / 2;

const DIRECTION: Readonly<Record<Side, LatticePoint>> = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
};

export function pointKey(point: LatticePoint): string {
  return `${point.x},${point.y}`;
}

export function dotCentre(dot: GridDot): LatticePoint {
  return { x: dot.col * DOT_PITCH, y: dot.row * DOT_PITCH };
}

/** The centre of the dot that would sit next to this one on the given side. */
export function neighbourCentre(centre: LatticePoint, side: Side): LatticePoint {
  const direction = DIRECTION[side];
  return { x: centre.x + direction.x * DOT_PITCH, y: centre.y + direction.y * DOT_PITCH };
}

/** The gate point on one side of a dot: the midpoint between the dot and that neighbour. */
export function gateOn(centre: LatticePoint, side: Side): LatticePoint {
  const direction = DIRECTION[side];
  return { x: centre.x + direction.x * GATE_REACH, y: centre.y + direction.y * GATE_REACH };
}

/**
 * The two ports that belong to one side of a dot, in clockwise order as drawn on screen
 * (north: north-west then north-east; east: north-east then south-east; and so on).
 */
export function portsOn(centre: LatticePoint, side: Side): readonly [LatticePoint, LatticePoint] {
  const direction = DIRECTION[side];
  const across = { x: direction.y, y: -direction.x };
  return [
    { x: centre.x + direction.x + across.x, y: centre.y + direction.y + across.y },
    { x: centre.x + direction.x - across.x, y: centre.y + direction.y - across.y },
  ];
}
