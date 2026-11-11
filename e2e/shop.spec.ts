import type { Page } from '@playwright/test';
import { addToCart, expect, hydrated, test } from './fixtures';

const cardNames = (page: Page) =>
  page.locator('#shop-grid [data-product-card]:not([hidden]) h2').allInnerTexts();

test.describe('the shop', () => {
  test('filters by roast and process, keeps them in the address, and survives a reload', async ({
    page,
  }) => {
    await page.goto('./shop/');
    await hydrated(page, '.filters');
    await expect(page.getByRole('status').filter({ hasText: '8 coffees' })).toBeVisible();
    await page.getByRole('group', { name: 'Roast' }).getByText('Medium', { exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: '2 of 8 coffees' })).toBeVisible();
    await expect.poll(() => cardNames(page)).toEqual(['Baba Budan', 'Biligiri Natural']);
    await expect(page).toHaveURL(/\?roast=medium$/);
    await page
      .getByRole('group', { name: 'Process' })
      .getByText('Natural', { exact: true })
      .click();
    await expect.poll(() => cardNames(page)).toEqual(['Biligiri Natural']);
    await page.reload();
    await expect(page.getByRole('status').filter({ hasText: '1 of 8 coffees' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByRole('status').filter({ hasText: '8 coffees' })).toBeVisible();
  });

  test('filters by brew method and sorts by price, moving the cards themselves', async ({
    page,
  }) => {
    await page.goto('./shop/?sort=price-asc');
    await hydrated(page, '.filters');
    await expect(page.getByRole('status').filter({ hasText: '8 coffees' })).toBeVisible();
    await expect.poll(async () => (await cardNames(page))[0]).toBe('Decoction No. 1');
    await page.getByLabel('Brew method').selectOption('cold-brew');
    await expect
      .poll(() => cardNames(page))
      .toEqual(['Nilgiri Mist', 'Araku Dawn', 'Biligiri Natural']);
    await page.getByLabel('Sort').selectOption('dark');
    await expect.poll(async () => (await cardNames(page))[0]).toBe('Biligiri Natural');
  });

  test('says so when nothing matches', async ({ page }) => {
    await page.goto('./shop/?roast=light&process=monsooned');
    await expect(page.getByText('Nothing matches all of that.')).toBeVisible();
  });
});

test.describe('a product page', () => {
  test('changes price with size and quantity, defaults the grind to filter, and adds to the cart', async ({
    page,
  }) => {
    await page.goto('./coffee/baba-budan/');
    await expect(page.getByRole('heading', { name: 'Baba Budan', level: 1 })).toBeVisible();
    await expect(page.getByLabel('Grind')).toHaveValue('south-indian-filter');
    await expect(page.getByText('About ₹22.40 a cup')).toBeVisible();
    await page.getByRole('radio', { name: /^500 g/ }).check({ force: true });
    await page.getByLabel('Grind').selectOption('moka-pot');
    await page.getByRole('button', { name: 'One more' }).click();
    await expect(page.locator('.options__price .price')).toHaveText('₹2,128');
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: 'Added to your cart: 2 × Baba Budan, 500 g, Moka pot.' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Cart 2 items' })).toBeVisible();
    await expect(page).toHaveURL(/coffee\/baba-budan\/$/);
  });

  test('sells the decoction by the bottle, with no grind', async ({ page }) => {
    await addToCart(page, 'decoction-no-1');
    await expect(page.getByLabel('Grind')).toHaveCount(0);
    await expect(page.getByText('Keep it in the fridge.')).toBeVisible();
  });

  test('suggests two coffees that brew the same way', async ({ page }) => {
    await page.goto('./coffee/nilgiri-mist/');
    const pairs = page.getByRole('region', { name: 'Pairs with' }).getByRole('listitem');
    await expect(pairs).toHaveCount(2);
  });
});
