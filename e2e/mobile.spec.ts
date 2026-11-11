import { addToCart, expect, expectAccessible, openCart, test } from './fixtures';

test.describe('on a phone', () => {
  for (const path of [
    './',
    './shop/',
    './coffee/araku-dawn/',
    './brew/',
    './subscribe/',
    './brand/',
    './case-study/',
  ]) {
    test(`${path} fits the screen without sideways scrolling`, async ({ page }) => {
      await page.goto(path);
      await page.locator('main h1').first().waitFor();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('buys a coffee, with the drawer filling the screen', async ({ page }) => {
    await addToCart(page, 'araku-dawn');
    await openCart(page);
    const drawer = page.getByRole('dialog', { name: 'Your cart' });
    const box = await drawer.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(380);
    await expectAccessible(page);
    await drawer.getByRole('link', { name: 'Go to checkout' }).tap();
    await expect(page).toHaveURL(/checkout\/$/);
  });

  test('keeps every section of the site one swipe away in the header', async ({ page }) => {
    await page.goto('./');
    const nav = page.getByRole('navigation', { name: 'Main' });
    for (const label of ['Shop', 'Subscribe', 'Brew guide', 'Brand', 'Case study']) {
      await expect(nav.getByRole('link', { name: label })).toBeAttached();
    }
  });
});
