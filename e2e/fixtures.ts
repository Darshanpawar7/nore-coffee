import AxeBuilder from '@axe-core/playwright';
import { expect, test as base, type Page } from '@playwright/test';

/** Fails a test on any uncaught error or console error, so a broken page can never pass quietly. */
export const test = base.extend<{ problems: string[] }>({
  problems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
      page.on('console', (message) => {
        // The 404 page is served with a 404 status, which the browser reports; that one is expected.
        if (message.type() === 'error' && !message.text().includes('404')) {
          problems.push(`console: ${message.text()}`);
        }
      });
      await use(problems);
      expect(problems, 'the page logged errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Opens a coffee's page, picks a size, and adds it to the cart. */
export async function addToCart(page: Page, id: string, size = '250 g'): Promise<void> {
  await page.goto(`./coffee/${id}/`);
  const sizes = page.getByRole('group', { name: 'Size' });
  if ((await sizes.count()) > 0)
    await sizes.getByRole('radio', { name: new RegExp(`^${size}`) }).check({ force: true });
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Added to your cart' })).toBeVisible();
}

/** Waits until the island holding `selector` has hydrated: Astro removes its ssr attribute then. */
export async function hydrated(page: Page, selector: string): Promise<void> {
  const island = page.locator(`astro-island:has(${selector})`).first();
  await island.scrollIntoViewIfNeeded();
  await expect(island).not.toHaveAttribute('ssr', '');
}

export async function openCart(page: Page): Promise<void> {
  await page.getByRole('link', { name: /^Cart/ }).click();
  await expect(page.getByRole('dialog', { name: 'Your cart' })).toBeVisible();
}

/** No serious or critical accessibility violations on what is on screen now. */
export async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(
    serious.map(
      (violation) =>
        `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
    ),
  ).toEqual([]);
}
