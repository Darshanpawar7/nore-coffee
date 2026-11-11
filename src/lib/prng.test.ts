import { describe, expect, it } from 'vitest';
import { createRng, hashSeed, normaliseSeed } from './prng';

const UINT32_MAX = 0xffffffff;

describe('normalising a seed', () => {
  it('ignores case, surrounding space and repeated inner space', () => {
    expect(normaliseSeed('  Baba   Budan ')).toBe('baba budan');
  });

  it('folds compatibility forms so that look-alike input gives one seed', () => {
    expect(normaliseSeed('ｎｏｒｅ')).toBe('nore');
  });

  it('keeps an empty seed empty', () => {
    expect(normaliseSeed('   ')).toBe('');
  });
});

describe('hashing a seed', () => {
  it('returns the same unsigned 32-bit integer for the same text', () => {
    const first = hashSeed('Meter Kaapi');
    const second = hashSeed('Meter Kaapi');

    expect(first).toBe(second);
    expect(Number.isInteger(first)).toBe(true);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThanOrEqual(UINT32_MAX);
  });

  it('separates seeds that differ by one character', () => {
    expect(hashSeed('nore')).not.toBe(hashSeed('nora'));
    expect(hashSeed('ab')).not.toBe(hashSeed('ba'));
  });

  it('is pinned, because every kolam in the catalogue depends on it', () => {
    expect(hashSeed('nore')).toBe(1316676362);
    expect(hashSeed('')).toBe(2872998923);
  });
});

describe('the seeded generator', () => {
  it('replays the same sequence for the same seed', () => {
    const first = createRng('Baba Budan');
    const second = createRng('Baba Budan');

    const drawsFirst = Array.from({ length: 8 }, () => first.next());
    const drawsSecond = Array.from({ length: 8 }, () => second.next());

    expect(drawsFirst).toEqual(drawsSecond);
  });

  it('gives different sequences for different seeds', () => {
    const first = createRng('Baba Budan');
    const second = createRng('Nilgiri Mist');

    expect(first.next()).not.toBe(second.next());
  });

  it('accepts a numeric seed', () => {
    expect(createRng(42).next()).toBe(createRng(42).next());
  });

  it('is pinned to the published mulberry32 sequence', () => {
    const rng = createRng(1);

    expect([rng.next(), rng.next(), rng.next()]).toEqual([
      0.6270739405881613, 0.002735721180215478, 0.5274470399599522,
    ]);
  });

  it('draws floats in the half-open interval from zero to one', () => {
    const rng = createRng('range');

    for (let draw = 0; draw < 2000; draw += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('draws every integer below the bound, and none outside it', () => {
    const rng = createRng('integers');
    const seen = new Set<number>();

    for (let draw = 0; draw < 500; draw += 1) seen.add(rng.int(3));

    expect([...seen].sort()).toEqual([0, 1, 2]);
  });

  it('rejects a bound that is not a positive whole number', () => {
    const rng = createRng('bounds');

    expect(() => rng.int(0)).toThrow(RangeError);
    expect(() => rng.int(2.5)).toThrow(RangeError);
  });

  it('never returns true at probability zero and always at probability one', () => {
    const rng = createRng('coins');

    const never = Array.from({ length: 200 }, () => rng.chance(0));
    const always = Array.from({ length: 200 }, () => rng.chance(1));

    expect(never.every((flip) => !flip)).toBe(true);
    expect(always.every((flip) => flip)).toBe(true);
  });

  it('lands near the requested probability over many draws', () => {
    const rng = createRng('fair enough');
    const DRAWS = 4000;

    const hits = Array.from({ length: DRAWS }, () => rng.chance(0.7)).filter(Boolean).length;

    expect(hits / DRAWS).toBeGreaterThan(0.66);
    expect(hits / DRAWS).toBeLessThan(0.74);
  });

  it('picks an item from a list and refuses an empty list', () => {
    const rng = createRng('choices');
    const options = ['square', 'diamond'] as const;

    expect(options).toContain(rng.pick(options));
    expect(() => rng.pick([])).toThrow(RangeError);
  });
});
