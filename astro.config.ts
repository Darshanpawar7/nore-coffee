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
  // Stylesheets go inline: a few kilobytes each, and one fewer round trip before the first paint.
  // The CSP covers them with hashes, so style-src still allows nothing but this site's own styles.
  build: { inlineStylesheets: 'always' },
  integrations: [preact(), sitemap()],
  // A strict Content-Security-Policy in a <meta> on every page. Astro adds the hashes of its own
  // scripts and styles to script-src and style-src; nothing else may run or load from elsewhere.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data: blob:",
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
    },
  },
  server: { port: DEV_PORT },
  vite: {
    // Astro has no --strictPort flag; these make dev and preview fail instead of drifting to
    // another port when the assigned one is taken.
    server: { strictPort: true },
    preview: { strictPort: true },
    // Nothing is inlined as a data: URL, so the strict font-src and img-src rules hold.
    build: { assetsInlineLimit: 0 },
  },
});
