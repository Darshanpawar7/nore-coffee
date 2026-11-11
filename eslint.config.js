import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import astro from 'eslint-plugin-astro';
import jsxA11y from 'eslint-plugin-jsx-a11y-x';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const TYPESCRIPT = ['**/*.ts', '**/*.tsx'];
const ASTRO = ['**/*.astro'];
/** Client-side <script> blocks, which the Astro processor hands over as virtual files. */
const ASTRO_SCRIPTS = ['**/*.astro/*.ts', '**/*.astro/*.js'];
const PREACT = ['src/**/*.tsx'];
/** Code that only ever runs in the browser. */
const BROWSER_ONLY = ['src/stores/**', 'src/components/islands/**', ...ASTRO_SCRIPTS];
const NODE_SIDE = ['*.config.{js,ts}', 'config/**', 'scripts/**', 'tests/**', 'e2e/**'];

/**
 * Nothing a visitor types is ever written to the page as HTML. These selectors make every sink
 * that could do it a lint error, in islands and in plain scripts alike.
 */
const HTML_SINKS = [
  {
    selector: 'AssignmentExpression > MemberExpression.left[property.name=/^(inner|outer)HTML$/]',
    message: 'Do not assign HTML strings. Build nodes, or set textContent.',
  },
  {
    selector: 'CallExpression[callee.property.name="insertAdjacentHTML"]',
    message: 'Do not insert HTML strings. Build nodes, or set textContent.',
  },
  {
    selector: 'CallExpression[callee.object.name="document"][callee.property.name=/^write(ln)?$/]',
    message: 'Do not write HTML strings into the document.',
  },
  {
    selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
    message: 'Render children instead of raw HTML.',
  },
];

/**
 * Astro's types put Node's timer functions next to the DOM's, and in that program the bare names
 * resolve to Node's, whose handle is an object. `window.setTimeout` is the DOM's everywhere.
 */
const BARE_TIMERS = ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'].map((name) => ({
  name,
  message: `Call window.${name}, so that the timer handle is a number in every program.`,
}));

export default defineConfig(
  globalIgnores([
    'dist/',
    '.astro/',
    'coverage/',
    'playwright-report/',
    'test-results/',
    '.verify-tmp/',
  ]),
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },

  js.configs.recommended,
  {
    rules: {
      'no-console': 'error',
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      eqeqeq: 'error',
      'no-restricted-syntax': ['error', ...HTML_SINKS],
    },
  },

  {
    files: [...TYPESCRIPT, ...ASTRO],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        // First match wins: code that ships to the browser is linted against the program that
        // has no Node types, then the Astro program, then Node-side tooling.
        project: ['./tsconfig.browser.json', './tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Already part of the strict preset. Listed so that a preset change cannot drop them.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/restrict-template-expressions': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },

  // The Astro presets come after the TypeScript block so that their parser wins for .astro files.
  astro.configs.recommended,
  astro.configs['jsx-a11y-strict'],
  {
    files: ASTRO,
    rules: { 'astro/no-set-html-directive': 'error' },
  },
  {
    // A virtual file belongs to no TypeScript program, so rules that need types cannot run on it.
    files: ASTRO_SCRIPTS,
    extends: [tseslint.configs.disableTypeChecked],
  },

  {
    files: PREACT,
    extends: [jsxA11y.configs.strict],
  },
  {
    files: BROWSER_ONLY,
    languageOptions: { globals: globals.browser },
    rules: { 'no-restricted-globals': ['error', ...BARE_TIMERS] },
  },
  {
    files: NODE_SIDE,
    languageOptions: { globals: globals.node },
  },
  {
    // A command-line tool: it reports what it wrote, and its page.evaluate callbacks run in the browser.
    files: ['scripts/screenshots.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { 'no-console': 'off' },
  },
);
