import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/** Floor for everything under src. */
const OVERALL_THRESHOLD = 80;
/** Floor for the pure domain logic, where a missed branch is a wrong price or a broken pattern. */
const LOGIC_THRESHOLD = 90;

function thresholds(percent: number) {
  return { statements: percent, branches: percent, functions: percent, lines: percent };
}

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        // Astro's content collection definition: it imports the virtual module astro:content,
        // which only exists inside an Astro build. The schema it uses is unit-tested in lib/.
        'src/content.config.ts',
        // Thin adapter over astro:content, for the same reason. Exercised by every build.
        'src/data/**',
        'src/env.d.ts',
      ],
      reporter: ['text', 'json-summary', 'html'],
      thresholds: {
        ...thresholds(OVERALL_THRESHOLD),
        'src/lib/**': thresholds(LOGIC_THRESHOLD),
      },
    },
  },
});
