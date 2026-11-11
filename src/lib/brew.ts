/**
 * South Indian filter coffee, by the numbers. These are a starting point, not a rule: every
 * household's davara has its own opinion.
 */

export const STRENGTHS = {
  mild: { label: 'Mild', milkParts: 4 },
  classic: { label: 'Classic', milkParts: 3 },
  strong: { label: 'Strong', milkParts: 2 },
} as const;

export type Strength = keyof typeof STRENGTHS;

export const MIN_CUPS = 1;
export const MAX_CUPS = 6;
/** Ground coffee per cup, in grams. */
export const POWDER_PER_CUP = 10;
/** Water just off the boil per cup, in millilitres. */
export const WATER_PER_CUP = 60;
/** Wet grounds hold about twice their weight in water, which never drips through. */
const HELD_PER_GRAM = 2;
/** The decoction drips through in twelve to fifteen minutes. */
export const DRIP_MINUTES = { shortest: 12, longest: 15 } as const;

export interface FilterRecipe {
  readonly cups: number;
  readonly powder: number;
  readonly water: number;
  readonly decoction: number;
  readonly milk: number;
  /** Decoction to milk, as 1 : milkParts. */
  readonly milkParts: number;
}

export function filterRecipe(cups: number, strength: Strength): FilterRecipe {
  const count = Math.min(MAX_CUPS, Math.max(MIN_CUPS, Math.round(cups)));
  const powder = count * POWDER_PER_CUP;
  const water = count * WATER_PER_CUP;
  const decoction = water - powder * HELD_PER_GRAM;
  const { milkParts } = STRENGTHS[strength];
  return { cups: count, powder, water, decoction, milk: decoction * milkParts, milkParts };
}

/** Ratio cards for other ways to brew: coffee to water by weight. */
export const RATIOS = [
  {
    id: 'moka-pot',
    method: 'Moka pot',
    ratio: 8,
    grind: 'Fine',
    time: 'About 5 minutes on a low flame',
  },
  {
    id: 'pour-over',
    method: 'Pour-over',
    ratio: 16,
    grind: 'Medium-fine',
    time: 'About 3 minutes',
  },
  {
    id: 'french-press',
    method: 'French press',
    ratio: 15,
    grind: 'Coarse',
    time: '4 minutes, then press',
  },
  {
    id: 'cold-brew',
    method: 'Cold brew concentrate',
    ratio: 8,
    grind: 'Coarse',
    time: '16 hours in the fridge',
  },
] as const;

/** Grams of coffee for a given amount of water at a ratio, rounded to the gram. */
export function coffeeFor(waterGrams: number, ratio: number): number {
  return Math.round(waterGrams / ratio);
}
