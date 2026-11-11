import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

/** Presses Tab until the target has focus, as a keyboard user would. */
async function tabTo(page: Page, target: Locator, limit = 60): Promise<void> {
  for (let presses = 0; presses < limit; presses++) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('Tab never reached the target.');
}

test('a whole purchase works from the keyboard alone', async ({ page }) => {
  await page.goto('./coffee/kodagu-peaberry/');

  // Size: arrow keys move through the radio group.
  await tabTo(page, page.getByRole('radio', { name: /^250 g/ }));
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: /^500 g/ })).toBeChecked();
  await tabTo(page, page.getByRole('button', { name: 'Add to cart' }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: 'Added to your cart' })).toBeVisible();

  // The cart opens as a dialog; focus moves inside it.
  await tabTo(page, page.getByRole('link', { name: /^Cart/ }));
  await page.keyboard.press('Enter');
  const drawer = page.getByRole('dialog', { name: 'Your cart' });
  await expect(drawer).toBeVisible();
  await tabTo(page, drawer.getByRole('link', { name: 'Go to checkout' }));
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/checkout\/$/);

  const fields: [string, string][] = [
    ['Full name', 'Ravi Kumar'],
    ['Email', 'ravi@example.com'],
    ['Mobile number', '9876543210'],
    ['House and street', '8, 2nd Main, Jayanagar'],
    ['Town or city', 'Bengaluru'],
  ];
  for (const [label, value] of fields) {
    await tabTo(page, page.getByLabel(label));
    await page.keyboard.type(value);
  }
  await tabTo(page, page.getByLabel('State'));
  await page.keyboard.type('Karnataka');
  await expect(page.getByLabel('State')).toHaveValue('Karnataka');
  await tabTo(page, page.getByLabel('PIN code'));
  await page.keyboard.type('560011');
  await tabTo(page, page.getByRole('radio', { name: 'UPI' }));
  await page.keyboard.press('Space');
  await expect(page.getByRole('radio', { name: 'UPI' })).toBeChecked();
  await tabTo(page, page.getByRole('button', { name: 'Place the order (a demo)' }));
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/checkout\/done\/$/);
  await expect(page.getByText('Thank you, Ravi.')).toBeVisible();
});
