import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

const SITE = 'https://darshanpawar7.github.io';
const DEFAULT_BASE_PATH = '/nore-coffee/';
const DEV_PORT = 4104;

/**
 * GitHub Pages serves a project site from a sub-path, so the base is never assumed to be "/".
 * BASE_PATH overrides the default; whatever is given is normalised to "/segment/".
 */
function resolveBasePath(raw: string | undefined): string {
  const trimmed = (raw ?? DEFAULT_BASE_PATH).trim().replace(/^\/+|\/+$/g, '');
  return trimmed === '' ? '/' : `/${trimmed}/`;
}

export default defineConfig({
  site: SITE,
  base: resolveBasePath(process.env.BASE_PATH),
  trailingSlash: 'always',
  output: 'static',
  integrations: [preact(), sitemap()],
  server: { port: DEV_PORT },
  vite: {
    // Astro has no --strictPort flag; these make dev and preview fail instead of drifting to
    // another port when the assigned one is taken.
    server: { strictPort: true },
    preview: { strictPort: true },
  },
});
