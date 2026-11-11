import type { GridDot } from './arrangement';
import {
  SIDES,
  dotCentre,
  gateOn,
  neighbourCentre,
  pointKey,
  portsOn,
  type LatticePoint,
} from './lattice';

/** A quarter circle centred on a dot, joining the two ports of one closed side. */
export interface ArcStroke {
  readonly kind: 'arc';
  readonly from: LatticePoint;
  readonly to: LatticePoint;
  readonly centre: LatticePoint;
}

/** A straight segment from a port to the gate point of an open side. */
export interface LineStroke {
  readonly kind: 'line';
  readonly from: LatticePoint;
  readonly to: LatticePoint;
}

export type Stroke = ArcStroke | LineStroke;

/** Answers whether the gate at a lattice point is open (the line crosses) or closed. */
export type GateTest = (gate: LatticePoint) => boolean;

/**
 * The strokes of the sikku weave, one side of one dot at a time.
 *
 * A closed side gets the quarter arc that joins its two ports. An open side gets two straight
 * segments, one from each port to the gate point; the neighbour draws the matching pair, so two
 * straight lines cross at the gate. A side with no neighbour is always closed.
 *
 * Each port belongs to two sides, and each side ends exactly one stroke there, so every port ends
 * exactly two strokes. Both leave along the tangent to the dot's circle, in opposite directions,
 * which is why the finished figure is a set of smooth closed loops.
 */
export function strokesFor(dots: readonly GridDot[], isOpen: GateTest): readonly Stroke[] {
  const occupied = new Set(dots.map((dot) => pointKey(dotCentre(dot))));

  return dots.flatMap((dot) => {
    const centre = dotCentre(dot);
    return SIDES.flatMap((side): readonly Stroke[] => {
      const [first, second] = portsOn(centre, side);
      const hasNeighbour = occupied.has(pointKey(neighbourCentre(centre, side)));
      const gate = gateOn(centre, side);

      if (hasNeighbour && isOpen(gate)) {
        return [
          { kind: 'line', from: first, to: gate },
          { kind: 'line', from: second, to: gate },
        ];
      }
      return [{ kind: 'arc', from: first, to: second, centre }];
    });
  });
}
