/**
 * Astro's compiler and its Markdown processor ship as native add-ons. On a machine whose policy
 * refuses to load unsigned native code (Windows Smart App Control, WDAC on a managed laptop) every
 * Astro command, the Astro ESLint parser and the Astro Prettier plugin stop with
 * "Cannot find native binding".
 *
 * Both packages also publish a WebAssembly build and fall back to it by themselves when the native
 * one cannot load. npm skips those builds on an ordinary machine, so this script installs them
 * beside the native ones, at the versions already resolved in node_modules, without touching
 * package.json or the lockfile.
 *
 * Run it once after every `npm ci` on an affected machine: `npm run wasm-fallback`.
 * It does nothing where the native add-ons load.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Packages whose loader falls back to a `-wasm32-wasi` sibling when the native add-on fails. */
const HOSTS = ['@astrojs/compiler-binding', 'satteri'] as const;
const WASM_SUFFIX = '-wasm32-wasi';
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const PACKAGE_NAME = /^(?:@[a-z0-9-]+\/)?[a-z0-9-]+$/;
/** npm sets npm_execpath to its own entry file for every script it runs. */
const NPM_CLI = /[/\\]npm-cli\.js$/;
const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));
const SUCCESS = 0;
const FAILURE = 1;

function say(line: string): void {
  process.stdout.write(`${line}\n`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Reads the WebAssembly build a host package declares, as an exact `name@version` spec. */
function wasmSpecFor(host: string): string {
  const manifestUrl = new URL(`../node_modules/${host}/package.json`, import.meta.url);
  const manifest: unknown = JSON.parse(readFileSync(manifestUrl, 'utf8'));
  const optional = isRecord(manifest) ? manifest.optionalDependencies : undefined;
  const entries = isRecord(optional) ? Object.entries(optional) : [];
  const match = entries.find(([name]) => name.endsWith(WASM_SUFFIX));

  if (match === undefined) {
    throw new Error(`${host} does not declare a WebAssembly build. Has its packaging changed?`);
  }
  const [name, version] = match;
  if (!PACKAGE_NAME.test(name) || typeof version !== 'string' || !EXACT_VERSION.test(version)) {
    throw new Error(
      `${host} declares an unexpected WebAssembly build: ${name}@${String(version)}.`,
    );
  }
  return `${name}@${version}`;
}

/** Loads every host in a fresh process, because a failed import stays failed in this one. */
function hostsLoad(): boolean {
  const program = HOSTS.map((host) => `await import(${JSON.stringify(host)});`).join(' ');
  const probe = spawnSync(process.execPath, ['--input-type=module', '--eval', program], {
    cwd: PROJECT_ROOT,
    stdio: 'ignore',
  });
  return probe.status === SUCCESS;
}

function install(specs: readonly string[]): boolean {
  const npmCli = process.env.npm_execpath;
  if (npmCli === undefined || !NPM_CLI.test(npmCli)) {
    say('Run this through npm so that it can find the npm CLI: npm run wasm-fallback');
    return false;
  }
  // --force lets npm place a package built for another CPU (wasm32); --no-save leaves
  // package.json and the lockfile exactly as they are.
  const args = ['install', '--no-save', '--force', '--no-audit', '--no-fund', '--ignore-scripts'];
  const result = spawnSync(process.execPath, [npmCli, ...args, ...specs], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
  });
  return result.status === SUCCESS;
}

function main(): number {
  if (hostsLoad()) {
    say('The Astro compiler loads on this machine. Nothing to install.');
    return SUCCESS;
  }
  const specs = HOSTS.map(wasmSpecFor);
  say(`A native add-on is blocked here. Installing ${specs.join(' and ')}.`);

  if (!install(specs)) return FAILURE;
  if (!hostsLoad()) {
    say('The WebAssembly builds are installed, but the Astro compiler still does not load.');
    return FAILURE;
  }
  say('Done. Astro, ESLint and Prettier now use the WebAssembly builds on this machine.');
  return SUCCESS;
}

process.exitCode = main();
