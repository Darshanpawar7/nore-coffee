import { describe, expect, it } from 'vitest';
import { ARRANGEMENTS, dotsFor, dotsFromRows } from './arrangement';

describe('dot arrangements', () => {
  it('lays out the 5x5 square as twenty-five dots', () => {
    expect(dotsFor('square-5')).toHaveLength(25);
  });

  it('lays out the 1-3-5-3-1 diamond as thirteen dots', () => {
    expect(dotsFor('diamond-5')).toHaveLength(13);
  });

  it('lays out the 1-3-5-7-5-3-1 diamond as twenty-five dots', () => {
    expect(dotsFor('diamond-7')).toHaveLength(25);
  });

  it('centres every arrangement on the origin', () => {
    for (const arrangement of ARRANGEMENTS) {
      const dots = dotsFor(arrangement);

      const sumCol = dots.reduce((sum, dot) => sum + dot.col, 0);
      const sumRow = dots.reduce((sum, dot) => sum + dot.row, 0);

      expect(sumCol).toBe(0);
      expect(sumRow).toBe(0);
      expect(dots).toContainEqual({ col: 0, row: 0 });
    }
  });

  it('keeps every arrangement symmetric about both axes', () => {
    for (const arrangement of ARRANGEMENTS) {
      const dots = dotsFor(arrangement);
      const has = (col: number, row: number) =>
        dots.some((dot) => dot.col === col && dot.row === row);

      for (const dot of dots) {
        expect(has(-dot.col, dot.row)).toBe(true);
        expect(has(dot.col, -dot.row)).toBe(true);
      }
    }
  });

  it('orders dots row by row, left to right', () => {
    expect(dotsFromRows([1, 3, 1])).toEqual([
      { col: 0, row: -1 },
      { col: -1, row: 0 },
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 0, row: 1 },
    ]);
  });

  it('refuses rows that cannot be centred on a dot', () => {
    expect(() => dotsFromRows([2, 4, 2])).toThrow(RangeError);
    expect(() => dotsFromRows([1, 3])).toThrow(RangeError);
    expect(() => dotsFromRows([])).toThrow(RangeError);
  });

  it('refuses rows that are not mirrored top to bottom', () => {
    expect(() => dotsFromRows([1, 3, 5])).toThrow(RangeError);
  });
});
