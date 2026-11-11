/**
 * Every internal link goes through here, so the site works under any base path: `/nore-coffee/` on
 * GitHub Pages, `/` anywhere else. Paths keep the trailing slash the router expects.
 */

/** Vite puts the base on `import.meta.env`; the browser-only program has no Vite types, so say what is used. */
interface WithBase {
  readonly env: { readonly BASE_URL: string };
}

export const BASE = (import.meta as unknown as WithBase).env.BASE_URL;

export function href(path: string, base: string = BASE): string {
  const root = base.endsWith('/') ? base : `${base}/`;
  return `${root}${path.replace(/^\/+/, '')}`;
}
