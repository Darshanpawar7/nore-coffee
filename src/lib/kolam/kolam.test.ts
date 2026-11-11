import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '../products';
import { createRng } from '../prng';
import { ARRANGEMENTS, dotsFor } from './arrangement';
import { canonicalGate, drawGates, gatesOf } from './gates';
import { kolam } from './kolam';
import { SIDES, dotCentre, gateOn, pointKey } from './lattice';
import { loopsOf, pathOf, segmentsOf } from './loops';
import { strokesFor, type Stroke } from './strokes';
import { kolamSvg } from './svg';

const SEEDS = ['Meter Kaapi', 'Baba Budan', 'nore', 'ನೊರೆ', 'a', 'Monsooned Malabar', 'by-two'];

type Mirror = (x: number, y: number) => [number, number];

function strokeKey(stroke: Stroke): string {
  const ends = [pointKey(stroke.from), pointKey(stroke.to)].sort().join('~');
  return `${stroke.kind}:${ends}`;
}

function mirrored(stroke: Stroke, map: (x: number, y: number) => [number, number]): Stroke {
  const point = (p: { x: number; y: number }) => {
    const [x, y] = map(p.x, p.y);
    return { x, y };
  };
  return stroke.kind === 'arc'
    ? { kind: 'arc', from: point(stroke.from), to: point(stroke.to), centre: point(stroke.centre) }
    : { kind: 'line', from: point(stroke.from), to: point(stroke.to) };
}

describe('kolam', () => {
  it('draws the same kolam for the same seed, and is forgiving about case and spaces', () => {
    const first = kolam('Baba Budan');
    expect(kolam('Baba Budan')).toEqual(first);
    expect(kolam('  baba   BUDAN ').paths).toEqual(first.paths);
    expect(kolamSvg(kolam('Baba Budan'), { colour: '#2E5E4A' })).toBe(
      kolamSvg(first, { colour: '#2E5E4A' }),
    );
  });

  it('gives different coffees different kolams', () => {
    const drawings = new Set(PRODUCTS.map((product) => kolam(product.name).paths.join('')));
    expect(drawings.size).toBe(PRODUCTS.length);
  });

  it.each(SEEDS)('is symmetric across both axes: %s', (seed) => {
    const { strokes } = kolam(seed);
    const all = new Set(strokes.map(strokeKey));
    const maps: Mirror[] = [(x, y) => [-x, y], (x, y) => [x, -y], (x, y) => [-x, -y]];
    for (const map of maps) {
      expect(strokes.every((stroke) => all.has(strokeKey(mirrored(stroke, map))))).toBe(true);
    }
  });

  it.each(SEEDS)('ends exactly two strokes at every port, and closes every loop: %s', (seed) => {
    const figure = kolam(seed);
    const ends = new Map<string, number>();
    for (const stroke of figure.strokes) {
      if (stroke.kind === 'line') {
        ends.set(pointKey(stroke.from), (ends.get(pointKey(stroke.from)) ?? 0) + 1);
        continue;
      }
      for (const end of [stroke.from, stroke.to])
        ends.set(pointKey(end), (ends.get(pointKey(end)) ?? 0) + 1);
    }
    expect([...ends.values()].every((count) => count === 2)).toBe(true);
    expect(figure.paths.length).toBeGreaterThan(0);
    expect(figure.paths.every((path) => path.startsWith('M') && path.endsWith('Z'))).toBe(true);
  });

  it('only ever crosses between two dots: every outer side stays a closed arc', () => {
    for (const arrangement of ARRANGEMENTS) {
      const figure = kolam('Nilgiri Mist', { arrangement });
      // Back from user units (6 per lattice step) to the lattice, where dot centres are multiples of 4.
      const occupied = new Set(figure.dots.map((dot) => pointKey({ x: dot.x / 6, y: dot.y / 6 })));
      for (const stroke of figure.strokes) {
        if (stroke.kind !== 'line') continue;
        const gate = stroke.to;
        const across = Math.abs(gate.x % 4) === 2 ? { x: 2, y: 0 } : { x: 0, y: 2 };
        expect(occupied.has(pointKey({ x: gate.x - across.x, y: gate.y - across.y }))).toBe(true);
        expect(occupied.has(pointKey({ x: gate.x + across.x, y: gate.y + across.y }))).toBe(true);
      }
    }
  });

  it('leaves no dot inside a circle of its own', () => {
    for (const seed of SEEDS) {
      const dots = dotsFor('square-5');
      const gates = drawGates(dots, createRng(seed));
      const known = new Set(gatesOf(dots).map(pointKey));
      for (const dot of dots) {
        const own = SIDES.map((side) => gateOn(dotCentre(dot), side)).filter((gate) =>
          known.has(pointKey(gate)),
        );
        expect(own.some((gate) => gates.isOpen(gate))).toBe(true);
      }
    }
  });

  it('honours a forced arrangement without changing which gates the seed opens', () => {
    for (const arrangement of ARRANGEMENTS)
      expect(kolam('Araku Dawn', { arrangement }).arrangement).toBe(arrangement);
    expect(canonicalGate({ x: -2, y: 8 })).toBe(canonicalGate({ x: 2, y: -8 }));
    expect(canonicalGate({ x: -2, y: 8 })).not.toBe(canonicalGate({ x: 8, y: 2 }));
  });

  it('fits the drawing inside its view box', () => {
    const figure = kolam('Kodagu Peaberry', { arrangement: 'square-5' });
    const [x, , size] = figure.viewBox.split(' ').map(Number) as [number, number, number];
    for (const dot of figure.dots) {
      expect(dot.x).toBeGreaterThan(x);
      expect(dot.x).toBeLessThan(x + size);
    }
  });
});

describe('loops', () => {
  it('walks a single dot as one closed circle of four arcs', () => {
    const loops = loopsOf(segmentsOf(strokesFor([{ col: 0, row: 0 }], () => false)));
    expect(loops).toHaveLength(1);
    expect(loops[0]).toHaveLength(4);
    expect(pathOf(loops[0] ?? [], 1)).toMatch(/^M-?1 -?1(A1\.414 1\.414 0 0 [01] -?1 -?1){4}Z$/);
  });

  it('joins the halves of a crossing into straight lines through the gate', () => {
    const strokes = strokesFor(
      [
        { col: 0, row: 0 },
        { col: 1, row: 0 },
      ],
      () => true,
    );
    const segments = segmentsOf(strokes);
    expect(segments.filter((segment) => segment.kind === 'line')).toHaveLength(2);
    expect(loopsOf(segments)).toHaveLength(1);
    expect(pathOf([], 1)).toBe('');
  });

  it('refuses a broken construction', () => {
    expect(() =>
      segmentsOf([{ kind: 'line', from: { x: 1, y: 1 }, to: { x: 2, y: 0 } }]),
    ).toThrow();
    expect(() =>
      loopsOf([
        { kind: 'arc', from: { x: -1, y: -1 }, to: { x: 1, y: -1 }, centre: { x: 0, y: 0 } },
      ]),
    ).toThrow(/not two/);
  });
});

describe('the kolam as a file', () => {
  it('writes a standalone SVG and ignores colours that are not colours', () => {
    const svg = kolamSvg(kolam('nore'), {
      colour: '#A8402A',
      background: '#F4EADB',
      strokeWidth: 3,
    });
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg).toContain('fill="#F4EADB"');
    expect(svg).toContain('stroke="#A8402A"');
    const unsafe = kolamSvg(kolam('nore'), { colour: '"><script>', background: 'red' });
    expect(unsafe).not.toContain('<script>');
    expect(unsafe).toContain('stroke="#1f1410"');
    expect(unsafe).not.toContain('<rect');
  });
});
