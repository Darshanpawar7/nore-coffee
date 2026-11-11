// Captures the README screenshots, the README banner and the social preview image from a running build.
//
//   npm run build && npm run preview      (in one terminal)
//   npm run screenshots                   (in another; then build again, so dist carries the new og.png)
//
// Options: NORE_URL (default http://localhost:4204/nore-coffee/), SHOTS_DIR (default docs/screenshots).
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const URL = process.env.NORE_URL ?? 'http://localhost:4204/nore-coffee/';
const OUT = process.env.SHOTS_DIR ?? 'docs/screenshots';
const problems = [];

async function session(browser, viewport, scale) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: scale, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
  return { context, page };
}

async function shot(page, name, options = {}) {
  await page.waitForTimeout(400);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, ...options });
  console.log('wrote', file);
}

/** Waits until the island holding `selector` has hydrated. */
async function hydrated(page, selector) {
  // Some islands load only once they are on screen, so bring each one into view first.
  await page.locator(`astro-island:has(${selector})`).first().scrollIntoViewIfNeeded();
  await page.locator(`astro-island:has(${selector}):not([ssr])`).first().waitFor();
}

async function addToCart(page, id, size) {
  await page.goto(`${URL}coffee/${id}/`, { waitUntil: 'networkidle' });
  await hydrated(page, '.options');
  if (size) await page.getByRole('radio', { name: new RegExp(`^${size}`) }).check({ force: true });
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.getByRole('status').filter({ hasText: 'Added to your cart' }).waitFor();
}

async function openCart(page) {
  await hydrated(page, '.cart-button');
  await page.getByRole('link', { name: /^Cart/ }).click();
  await page.getByRole('dialog', { name: 'Your cart' }).waitFor();
}

const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' });
await mkdir(OUT, { recursive: true });

// ---- the banner and the social preview: the real home page, above the fold
for (const [file, viewport] of [
  ['docs/banner.png', { width: 1280, height: 640 }],
  ['public/og.png', { width: 1200, height: 630 }],
]) {
  const { context, page } = await session(browser, viewport, 1);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.screenshot({ path: file });
  console.log('wrote', file);
  await context.close();
}

// ---- desktop
{
  const { context, page } = await session(browser, { width: 1440, height: 900 }, 1);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await shot(page, 'home');
  await page.locator('.range').evaluate((section) => {
    section.scrollIntoView();
  });
  await page.evaluate(() => window.scrollBy(0, 40));
  await shot(page, 'range');
  await page.goto(`${URL}shop/?roast=medium,medium-dark`, { waitUntil: 'networkidle' });
  await hydrated(page, '.filters');
  await shot(page, 'shop');
  await addToCart(page, 'baba-budan', '500 g');
  await shot(page, 'product');
  await addToCart(page, 'nilgiri-mist');
  await openCart(page);
  const drawer = page.getByRole('dialog', { name: 'Your cart' });
  await drawer.getByLabel('Coupon code').fill('BYTWO');
  await drawer.getByRole('button', { name: 'Apply' }).click();
  await drawer.getByPlaceholder('PIN code').fill('560003');
  await drawer.getByRole('button', { name: 'Check' }).click();
  await shot(page, 'cart');
  await page.goto(`${URL}checkout/`, { waitUntil: 'networkidle' });
  await hydrated(page, '.checkout');
  await page.getByRole('button', { name: 'Place the order (a demo)' }).click();
  await shot(page, 'checkout');
  await page.goto(`${URL}brew/`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'South Indian filter coffee' }).waitFor();
  await shot(page, 'brew');
  await page.goto(`${URL}brand/`, { waitUntil: 'networkidle' });
  await hydrated(page, '.generator');
  await page.getByLabel('Any word').fill('Bengaluru');
  await page.getByRole('radio', { name: 'Jacaranda' }).check({ force: true });
  await page.locator('.generator').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -120));
  await shot(page, 'kolam-generator');
  await page.goto(`${URL}case-study/`, { waitUntil: 'networkidle' });
  await shot(page, 'case-study');
  await context.close();
}

// ---- phone
{
  const { context, page } = await session(browser, { width: 390, height: 844 }, 2);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await shot(page, 'mobile-home');
  await addToCart(page, 'araku-dawn');
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, 'mobile-product');
  await openCart(page);
  await shot(page, 'mobile-cart');
  await page.goto(`${URL}brew/`, { waitUntil: 'networkidle' });
  await page.locator('.brew').scrollIntoViewIfNeeded();
  await shot(page, 'mobile-brew');
  await context.close();
}

await browser.close();
if (problems.length > 0) {
  console.error(`\n${problems.length} console problem(s):\n${[...new Set(problems)].join('\n')}`);
  process.exitCode = 1;
}
