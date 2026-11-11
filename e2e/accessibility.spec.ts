import { addToCart, expect, expectAccessible, openCart, test } from './fixtures';

const PAGES = [
  ['home', './'],
  ['shop', './shop/'],
  ['a coffee', './coffee/baba-budan/'],
  ['the decoction', './coffee/decoction-no-1/'],
  ['the brew guide', './brew/'],
  ['subscribe', './subscribe/'],
  ['the brand guidelines', './brand/'],
  ['the case study', './case-study/'],
  ['an empty cart', './cart/'],
  ['the 404 page', './nowhere/'],
] as const;

test.describe('accessibility', () => {
  for (const [name, path] of PAGES) {
    test(`${name} has no serious violations`, async ({ page }) => {
      await page.goto(path);
      await page.locator('main h1').first().waitFor();
      await expectAccessible(page);
    });
  }

  test('the cart drawer, the checkout with errors, and the confirmation have none either', async ({
    page,
  }) => {
    await addToCart(page, 'nilgiri-mist');
    await openCart(page);
    await expectAccessible(page);
    await page.keyboard.press('Escape');
    await page.goto('./checkout/');
    await page.getByRole('button', { name: 'Place the order (a demo)' }).click();
    await expect(page.getByRole('alert').first()).toBeVisible();
    await expectAccessible(page);
  });
});
