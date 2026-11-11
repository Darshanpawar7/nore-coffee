import { describe, expect, it } from 'vitest';
import type { GridDot } from './arrangement';
import { pointKey, type LatticePoint } from './lattice';
import { strokesFor, type Stroke } from './strokes';

const ONE_DOT: readonly GridDot[] = [{ col: 0, row: 0 }];
const TWO_DOTS: readonly GridDot[] = [
  { col: 0, row: 0 },
  { col: 1, row: 0 },
];
const GATE_BETWEEN: LatticePoint = { x: 2, y: 0 };

const allClosed = () => false;
const allOpen = () => true;

function count(strokes: readonly Stroke[], kind: Stroke['kind']): number {
  return strokes.filter((stroke) => stroke.kind === kind).length;
}

describe('strokes around a single dot', () => {
  it('closes all four sides with quarter arcs, whatever the gates say', () => {
    const strokes = strokesFor(ONE_DOT, allOpen);

    expect(strokes).toHaveLength(4);
    expect(count(strokes, 'arc')).toBe(4);
  });

  it('centres every arc on the dot and joins the two ports of one side', () => {
    const strokes = strokesFor(ONE_DOT, allClosed);

    for (const stroke of strokes) {
      expect(stroke.kind).toBe('arc');
      if (stroke.kind !== 'arc') continue;
      expect(stroke.centre).toEqual({ x: 0, y: 0 });
      expect(Math.abs(stroke.from.x)).toBe(1);
      expect(Math.abs(stroke.from.y)).toBe(1);
      expect(Math.abs(stroke.to.x)).toBe(1);
      expect(Math.abs(stroke.to.y)).toBe(1);
      const sharesAnEdge = stroke.from.x === stroke.to.x || stroke.from.y === stroke.to.y;
      expect(sharesAnEdge).toBe(true);
    }
  });
});

describe('strokes between two dots', () => {
  it('draws eight arcs when the gate between them is closed', () => {
    const strokes = strokesFor(TWO_DOTS, allClosed);

    expect(count(strokes, 'arc')).toBe(8);
    expect(count(strokes, 'line')).toBe(0);
  });

  it('replaces the two facing arcs with four straight segments when the gate is open', () => {
    const strokes = strokesFor(TWO_DOTS, allOpen);

    expect(count(strokes, 'arc')).toBe(6);
    expect(count(strokes, 'line')).toBe(4);
  });

  it('runs every straight segment from a port to the gate point', () => {
    const lines = strokesFor(TWO_DOTS, allOpen).filter((stroke) => stroke.kind === 'line');

    for (const line of lines) {
      expect(line.to).toEqual(GATE_BETWEEN);
      expect(Math.abs(line.from.x - GATE_BETWEEN.x)).toBe(1);
      expect(Math.abs(line.from.y - GATE_BETWEEN.y)).toBe(1);
    }
  });

  it('starts the four segments at four different ports', () => {
    const lines = strokesFor(TWO_DOTS, allOpen).filter((stroke) => stroke.kind === 'line');

    const starts = new Set(lines.map((line) => pointKey(line.from)));

    expect(starts.size).toBe(4);
  });

  it('asks about a gate only where two dots face each other', () => {
    const asked: string[] = [];

    strokesFor(TWO_DOTS, (gate) => {
      asked.push(pointKey(gate));
      return false;
    });

    expect(new Set(asked)).toEqual(new Set([pointKey(GATE_BETWEEN)]));
  });
});
