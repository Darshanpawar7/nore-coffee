import { expect, test } from './fixtures';

test.describe('without JavaScript', () => {
  test('the home page, the shop and a product page still read and browse', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { name: /Nore/, level: 1 })).toBeVisible();
    await page.getByRole('link', { name: 'Shop the coffee' }).click();
    await expect(page.locator('#shop-grid [data-product-card]')).toHaveCount(8);
    // The filters need JavaScript, so they stay out of the way.
    await expect(page.getByRole('group', { name: 'Roast' })).toBeHidden();
    await page.getByRole('link', { name: /Monsooned Malabar/ }).click();
    await expect(page.getByRole('heading', { name: 'Monsooned Malabar', level: 1 })).toBeVisible();
    await expect(page.getByRole('img', { name: 'A bag of Monsooned Malabar' })).toBeVisible();
  });

  test('the cart link reaches the cart page, which explains itself', async ({ page }) => {
    await page.goto('./shop/');
    await page.getByRole('link', { name: /^Cart/ }).click();
    await expect(page).toHaveURL(/cart\/$/);
    await expect(
      page.getByText('Your cart is kept in this browser and needs JavaScript to open.'),
    ).toBeVisible();
  });
});
