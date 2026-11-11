/**
 * The shape of a product, and the labels that go with it. Plain types and constants only, so the
 * islands can import them without the validation library; the schema that checks the catalogue
 * lives in `catalog-schema.ts`.
 */

export const ROASTS = ['light', 'light-medium', 'medium', 'medium-dark', 'dark'] as const;
export type Roast = (typeof ROASTS)[number];

export const PROCESSES = ['washed', 'natural', 'honey', 'monsooned', 'blend'] as const;
export type Process = (typeof PROCESSES)[number];

/** How a bag can be ground. South Indian filter is the default: it is what most people here brew. */
export const GRINDS = [
  'south-indian-filter',
  'whole-bean',
  'moka-pot',
  'pour-over',
  'french-press',
  'espresso',
] as const;
export type Grind = (typeof GRINDS)[number];

export const METHODS = [
  'south-indian-filter',
  'moka-pot',
  'pour-over',
  'french-press',
  'espresso',
  'cold-brew',
] as const;
export type Method = (typeof METHODS)[number];

/** Each coffee owns one accent, taken from where it grows. */
export const ACCENTS = [
  'red-earth',
  'monsoon',
  'nilgiri',
  'jacaranda',
  'turmeric',
  'hibiscus',
  'pepper',
  'areca',
] as const;
export type Accent = (typeof ACCENTS)[number];

/** Taste on a scale of 1 to 5. */
export interface TasteProfile {
  readonly acidity: number;
  readonly body: number;
  readonly sweetness: number;
  readonly bitterness: number;
  readonly aroma: number;
}

export interface Origin {
  readonly region: string;
  readonly state: string;
  readonly altitude?: string;
}

interface ProductBase {
  readonly id: string;
  readonly name: string;
  readonly accent: Accent;
  /** Three tasting notes. */
  readonly notes: readonly [string, string, string];
  /** Two sentences in the brand voice. */
  readonly story: string;
  /** In whole rupees, taxes included: 250 g for beans, the bottle for decoction. */
  readonly price: number;
  readonly roast: Roast;
  readonly greatFor: readonly Method[];
  readonly profile: TasteProfile;
  readonly origin: Origin;
  readonly process: Process;
  readonly variety: string;
}

/** A bag of coffee, sold in three sizes and six grinds. */
export interface Beans extends ProductBase {
  readonly kind: 'beans';
  /** Chicory in the blend, as a whole percentage. */
  readonly chicory: number;
}

/** The bottled decoction: one size, no grind. */
export interface Decoction extends ProductBase {
  readonly kind: 'decoction';
  readonly volumeMl: number;
}

export type Product = Beans | Decoction;

export const ROAST_LABEL: Readonly<Record<Roast, string>> = {
  light: 'Light',
  'light-medium': 'Light-medium',
  medium: 'Medium',
  'medium-dark': 'Medium-dark',
  dark: 'Dark',
};

export const PROCESS_LABEL: Readonly<Record<Process, string>> = {
  washed: 'Washed',
  natural: 'Natural',
  honey: 'Honey',
  monsooned: 'Monsooned',
  blend: 'Blend',
};

export const GRIND_LABEL: Readonly<Record<Grind, string>> = {
  'south-indian-filter': 'South Indian filter',
  'whole-bean': 'Whole bean',
  'moka-pot': 'Moka pot',
  'pour-over': 'Pour-over',
  'french-press': 'French press',
  espresso: 'Espresso',
};

export const METHOD_LABEL: Readonly<Record<Method, string>> = {
  'south-indian-filter': 'South Indian filter',
  'moka-pot': 'Moka pot',
  'pour-over': 'Pour-over',
  'french-press': 'French press',
  espresso: 'Espresso',
  'cold-brew': 'Cold brew',
};

/** A label inside a sentence: "pour-over", but "South Indian filter" and "French press" keep their capitals. */
export function inSentence(label: string): string {
  return /^(South Indian|French)/.test(label)
    ? label
    : label.charAt(0).toLowerCase() + label.slice(1);
}

/** Roasts in order from lightest to darkest, for sorting. */
export function roastRank(roast: Roast): number {
  return ROASTS.indexOf(roast);
}
