/**
 * A small seeded random number generator. The same seed always replays the same sequence, on the
 * build server and in every browser, which is what lets a coffee's name stand in for its kolam.
 *
 * The generator keeps one integer of private state inside its closure and advances it on every
 * draw. Nothing passed in is ever mutated.
 */
export interface Rng {
  /** A float in the half-open interval [0, 1). */
  next(): number;
  /** A whole number in [0, bound). */
  int(bound: number): number;
  /** True with the given probability. */
  chance(probability: number): boolean;
  /** One item from a non-empty list. */
  pick<T>(items: readonly T[]): T;
}

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const MURMUR_MIX_1 = 0x85ebca6b;
const MURMUR_MIX_2 = 0xc2b2ae35;
const MULBERRY_INCREMENT = 0x6d2b79f5;
const UINT32_RANGE = 0x100000000;

/**
 * Makes seeds forgiving: "Baba Budan", "baba budan" and " BABA  BUDAN " are one seed.
 * NFKC also folds full-width and other compatibility forms onto their plain equivalents.
 */
export function normaliseSeed(seed: string): string {
  return seed.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** FNV-1a over the code points, followed by the MurmurHash3 finaliser. Returns a uint32. */
export function hashSeed(seed: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (const character of seed) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, FNV_PRIME);
  }
  return avalanche(hash);
}

/** Spreads every input bit across the whole word, so near-identical seeds land far apart. */
function avalanche(value: number): number {
  let mixed = value;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, MURMUR_MIX_1);
  mixed ^= mixed >>> 13;
  mixed = Math.imul(mixed, MURMUR_MIX_2);
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

/** Creates a mulberry32 generator from a string (hashed first) or a number (used as given). */
export function createRng(seed: string | number): Rng {
  let state = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed);

  const next = (): number => {
    state = (state + MULBERRY_INCREMENT) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32_RANGE;
  };

  const int = (bound: number): number => {
    if (!Number.isSafeInteger(bound) || bound <= 0) {
      throw new RangeError(`The bound must be a positive whole number, received ${bound}.`);
    }
    return Math.floor(next() * bound);
  };

  return {
    next,
    int,
    chance: (probability) => next() < probability,
    pick: <T>(items: readonly T[]): T => {
      const item = items[int(Math.max(items.length, 0))];
      if (item === undefined) throw new RangeError('Cannot pick from an empty list.');
      return item;
    },
  };
}
