import type { Rng } from '../prng';
import type { GridDot } from './arrangement';
import { SIDES, dotCentre, gateOn, neighbourCentre, pointKey, type LatticePoint } from './lattice';

/**
 * Which gates are open. A gate is named by its point, halfway between two dots, and its state is
 * stored under a canonical key that is the same for all four of its mirror images, across both axes.
 * One draw therefore decides a whole orbit, and the symmetry of the finished kolam is a property of
 * the data, not something patched in afterwards. (Mirroring across the diagonals too was tried: it
 * leaves only about sixty kolams per arrangement, too few for every coffee to have its own.)
 */

/** The share of gate orbits that open. A little over half weaves well without turning to lattice. */
const OPEN_CHANCE = 0.55;

export function canonicalGate(point: LatticePoint): string {
  return `${String(Math.abs(point.x))},${String(Math.abs(point.y))}`;
}

/** Every gate between two dots of the arrangement, each listed once, in a stable order. */
export function gatesOf(dots: readonly GridDot[]): readonly LatticePoint[] {
  const occupied = new Set(dots.map((dot) => pointKey(dotCentre(dot))));
  const seen = new Set<string>();
  const gates: LatticePoint[] = [];
  for (const dot of dots) {
    const centre = dotCentre(dot);
    for (const side of SIDES) {
      if (!occupied.has(pointKey(neighbourCentre(centre, side)))) continue;
      const gate = gateOn(centre, side);
      const key = pointKey(gate);
      if (seen.has(key)) continue;
      seen.add(key);
      gates.push(gate);
    }
  }
  return gates;
}

export interface GateState {
  /** Canonical keys of the open orbits. */
  readonly open: ReadonlySet<string>;
  readonly isOpen: (gate: LatticePoint) => boolean;
}

/**
 * Draws the gates. Afterwards, any dot whose gates all came up closed has one opened (with its whole
 * orbit), so no dot is left inside a lonely circle of its own.
 */
export function drawGates(dots: readonly GridDot[], rng: Rng): GateState {
  const gates = gatesOf(dots);
  const orbits = [...new Set(gates.map(canonicalGate))].sort();
  const open = new Set(orbits.filter(() => rng.chance(OPEN_CHANCE)));

  for (const dot of dots) {
    const centre = dotCentre(dot);
    const own = SIDES.map((side) => gateOn(centre, side)).filter((gate) =>
      gates.some((known) => known.x === gate.x && known.y === gate.y),
    );
    if (own.length > 0 && !own.some((gate) => open.has(canonicalGate(gate)))) {
      open.add(canonicalGate(rng.pick(own)));
    }
  }

  return { open, isOpen: (gate) => open.has(canonicalGate(gate)) };
}
