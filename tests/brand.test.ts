import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { KANNADA } from '../src/brand/kannada';
import { ACCENT_COLOURS, CORE } from '../src/brand/palette';
import { bestInk } from '../src/lib/contrast';
import { PRODUCTS } from '../src/lib/products';

const tokens = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');

/** The declarations of one accent class, as written in tokens.css. */
function accentRule(accent: string): string {
  const start = tokens.indexOf(`.accent-${accent} {`);
  return start === -1 ? '' : tokens.slice(start, tokens.indexOf('}', start));
}

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(astro|tsx?|css|md|json)$/.test(name) ? [path] : [];
  });
}

describe('the identity in code', () => {
  it('keeps the palette in tokens.css and palette.ts identical', () => {
    for (const colour of CORE) expect(tokens).toContain(`--${colour.token}: ${colour.hex};`);
    for (const [accent, { hex }] of Object.entries(ACCENT_COLOURS)) {
      expect(accentRule(accent)).toContain(`--accent: ${hex};`);
    }
  });

  it('chooses each accent ink for contrast, as tokens.css does', () => {
    for (const [accent, { hex }] of Object.entries(ACCENT_COLOURS)) {
      expect(accentRule(accent)).toContain(`--accent-ink: ${bestInk(hex, '#fbf6ee', '#1f1410')};`);
    }
  });

  it('gives every bag its own view-transition name', () => {
    const css = readFileSync(new URL('../src/styles/transitions.css', import.meta.url), 'utf8');
    for (const product of PRODUCTS) {
      const start = css.indexOf(`[data-transition='${product.id}']`);
      expect(start, product.id).toBeGreaterThan(-1);
      expect(css.slice(start, css.indexOf('}', start))).toContain(
        `view-transition-name: pouch-${product.id};`,
      );
    }
  });

  it('uses no Kannada beyond its three words', () => {
    const allowed = new Set<string>(Object.values(KANNADA).map((word) => word.text));
    const kannada = /[ಀ-೿]+/g;
    const root = fileURLToPath(new URL('../src', import.meta.url));
    for (const file of sources(root)) {
      for (const word of readFileSync(file, 'utf8').match(kannada) ?? []) {
        expect(allowed.has(word), `${word} in ${file}`).toBe(true);
      }
    }
  });
});
