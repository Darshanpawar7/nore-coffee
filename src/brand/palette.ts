import type { Accent } from '../lib/catalog';

/** The palette as data, for swatches, contrast notes and generated SVG. Mirrors styles/tokens.css. */

export const CORE = [
  { name: 'Decoction', token: 'decoction', hex: '#1f1410', role: 'Text and the deep sections' },
  { name: 'Froth', token: 'froth', hex: '#f4eadb', role: 'The page' },
  { name: 'Milk', token: 'milk', hex: '#fbf6ee', role: 'Raised surfaces' },
  {
    name: 'Brass',
    token: 'brass',
    hex: '#b5862b',
    role: 'Rules, small marks and focus. Never text.',
  },
  { name: 'Earth red', token: 'earth', hex: '#a8402a', role: 'Primary buttons' },
  { name: 'Steel', token: 'steel', hex: '#c9ccd1', role: 'Quiet interface lines' },
] as const;

export const ACCENT_COLOURS: Readonly<
  Record<Accent, { readonly name: string; readonly hex: string; readonly from: string }>
> = {
  'red-earth': {
    name: 'Red earth',
    hex: '#a8402a',
    from: 'The laterite soil of the Western Ghats',
  },
  monsoon: { name: 'Monsoon green', hex: '#2e5e4a', from: 'Chikkamagaluru in July' },
  nilgiri: { name: 'Nilgiri blue', hex: '#3d6c9e', from: 'The blue hills, in their mist' },
  jacaranda: { name: 'Jacaranda', hex: '#6e4fa0', from: "Bengaluru's avenues in March" },
  turmeric: { name: 'Turmeric', hex: '#d99a1c', from: 'The sun on the Eastern Ghats' },
  hibiscus: {
    name: 'Hibiscus',
    hex: '#b8324f',
    from: 'A dooryard flower, and the berry in the cup',
  },
  pepper: { name: 'Pepper', hex: '#33302b', from: 'The Malabar coast, where pepper grows' },
  areca: { name: 'Areca', hex: '#7a5a2b', from: 'The palms between the coffee in Kodagu' },
};
