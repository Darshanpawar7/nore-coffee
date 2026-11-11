import { addToCart, expect, openCart, test } from './fixtures';

test.describe('the cart', () => {
  test('edits quantities in the drawer, removes with undo, and persists across a reload', async ({
    page,
  }) => {
    await addToCart(page, 'baba-budan');
    await openCart(page);
    const drawer = page.getByRole('dialog', { name: 'Your cart' });
    await drawer.getByRole('button', { name: /One more: Baba Budan/ }).click();
    await expect(drawer.locator('.line__count')).toHaveText('2');
    await expect(drawer.getByText('₹1,120').first()).toBeVisible();
    await drawer.getByRole('button', { name: /Remove/ }).click();
    await expect(drawer.getByText('Your cart is empty.')).toBeVisible();
    await drawer.getByRole('button', { name: 'Undo' }).click();
    await expect(drawer.locator('.line__count')).toHaveText('2');
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await page.reload();
    await expect(page.getByRole('link', { name: 'Cart 2 items' })).toBeVisible();
  });

  test('turns BYTWO down for one bag with a reason, and takes 10% off two', async ({ page }) => {
    await addToCart(page, 'baba-budan');
    await openCart(page);
    const drawer = page.getByRole('dialog', { name: 'Your cart' });
    await drawer.getByLabel('Coupon code').fill('bytwo');
    await drawer.getByRole('button', { name: 'Apply' }).click();
    await expect(drawer.getByRole('alert')).toHaveText(
      /BYTWO needs two or more bags of coffee in the cart, and there is one\./,
    );
    await drawer.getByRole('button', { name: 'Close the cart' }).click();
    await addToCart(page, 'araku-dawn');
    await openCart(page);
    await expect(drawer.getByText('BYTWO: 10% off for two or more bags.')).toBeVisible();
    await expect(drawer.locator('.cart__sums')).toContainText('−₹118');
    await expect(drawer.locator('.cart__total')).toContainText('₹1,062');
  });

  test('estimates delivery from a PIN code and refuses what it cannot reach', async ({ page }) => {
    await addToCart(page, 'nilgiri-mist');
    await openCart(page);
    const drawer = page.getByRole('dialog', { name: 'Your cart' });
    const pin = drawer.getByPlaceholder('PIN code');
    const check = drawer.getByRole('button', { name: 'Check' });
    await pin.fill('560003');
    await check.click();
    await expect(drawer.getByText('To 560003: 1 to 3 days from Bengaluru.')).toBeVisible();
    await pin.fill('110001');
    await check.click();
    await expect(drawer.getByText('To 110001: 4 to 7 days from Bengaluru.')).toBeVisible();
    await pin.fill('900001');
    await check.click();
    await expect(drawer.getByText(/Army Postal Service/)).toBeVisible();
    await pin.fill('5600');
    await check.click();
    await expect(drawer.getByText('A PIN code is six digits.')).toBeVisible();
  });

  test('shows free shipping progress and charges Rs 60 below Rs 999', async ({ page }) => {
    await addToCart(page, 'meter-kaapi');
    await openCart(page);
    const drawer = page.getByRole('dialog', { name: 'Your cart' });
    await expect(drawer.getByText('₹579 more and shipping is free.')).toBeVisible();
    await expect(drawer.locator('.cart__sums')).toContainText('₹60');
  });

  test('has a full page too, for direct links', async ({ page }) => {
    await addToCart(page, 'kodagu-peaberry');
    await page.goto('./cart/');
    await expect(page.getByRole('heading', { name: 'Your cart', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Kodagu Peaberry' })).toBeVisible();
  });
});
