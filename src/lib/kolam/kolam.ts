import { createRng, normaliseSeed } from '../prng';
import { ARRANGEMENTS, dotsFor, type Arrangement } from './arrangement';
import { drawGates } from './gates';
import { DOT_PITCH, dotCentre, type LatticePoint } from './lattice';
import { loopsOf, pathOf, segmentsOf } from './loops';
import { strokesFor, type Stroke } from './strokes';

/**
 * kolam(seed) -> a sikku kolam, the same one every time for the same seed: the dot arrangement and
 * the open gates are drawn from a generator seeded by the name. A coffee's name is its pattern.
 */

export interface KolamOptions {
  /** Force an arrangement instead of letting the seed choose. */
  readonly arrangement?: Arrangement;
  /** User units per lattice step, a quarter of the dot spacing. */
  readonly unit?: number;
}

export interface Kolam {
  readonly seed: string;
  readonly arrangement: Arrangement;
  /** One SVG path per closed loop. */
  readonly paths: readonly string[];
  /** Dot centres, in user units. */
  readonly dots: readonly LatticePoint[];
  readonly viewBox: string;
  /** The construction, for diagrams and tests. */
  readonly strokes: readonly Stroke[];
  readonly openGates: ReadonlySet<string>;
}

const DEFAULT_UNIT = 6;
/** Room around the outermost dots: the arcs reach √2 lattice steps out, and round caps a little more. */
const MARGIN = 2;

export function kolam(seed: string, options: KolamOptions = {}): Kolam {
  const unit = options.unit ?? DEFAULT_UNIT;
  const rng = createRng(normaliseSeed(seed));
  // The arrangement is always the first draw, so forcing one does not change the gates a seed gets.
  const drawn = rng.pick(ARRANGEMENTS);
  const arrangement = options.arrangement ?? drawn;
  const dots = dotsFor(arrangement);
  const gates = drawGates(dots, rng);
  const strokes = strokesFor(dots, gates.isOpen);
  const loops = loopsOf(segmentsOf(strokes));

  const centres = dots.map(dotCentre);
  const reach =
    Math.max(...centres.map((point) => Math.max(Math.abs(point.x), Math.abs(point.y)))) + MARGIN;
  const size = String(2 * reach * unit);
  const corner = String(-reach * unit);
  return {
    seed,
    arrangement,
    paths: loops.map((loop) => pathOf(loop, unit)),
    dots: centres.map((point) => ({ x: point.x * unit, y: point.y * unit })),
    viewBox: `${corner} ${corner} ${size} ${size}`,
    strokes,
    openGates: gates.open,
  };
}

/** The dot spacing in user units, for drawing the dots in proportion. */
export function dotSpacing(unit: number = DEFAULT_UNIT): number {
  return DOT_PITCH * unit;
}
