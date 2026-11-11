import type { Page } from '@playwright/test';
import { addToCart, expect, test } from './fixtures';

async function fillAddress(page: Page): Promise<void> {
  await page.getByLabel('Full name').fill('Asha Rao');
  await page.getByLabel('Email').fill('asha@example.com');
  await page.getByLabel('Mobile number').fill('98450 12345');
  await page.getByLabel('House and street').fill('12, 4th Cross, Malleswaram');
  await page.getByLabel('Town or city').fill('Bengaluru');
  await page.getByLabel('State').selectOption('Karnataka');
  await page.getByLabel('PIN code').fill('560003');
  await page.getByRole('radio', { name: 'Cash on delivery' }).check({ force: true });
}

test.describe('checkout', () => {
  test('lists every problem in a summary that takes focus, then places a demo order', async ({
    page,
  }) => {
    await addToCart(page, 'baba-budan');
    await page.goto('./checkout/');
    await expect(page.getByText('no payment is taken and no order is placed')).toBeVisible();
    await page.getByRole('button', { name: 'Place the order (a demo)' }).click();
    const summary = page.getByRole('alert').filter({ hasText: 'There are 8 problems to fix' });
    await expect(summary).toBeFocused();
    await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true');
    await summary
      .getByRole('link', { name: 'Enter an email address like name@example.com.' })
      .click();
    await expect(page).toHaveURL(/#field-email$/);

    await fillAddress(page);
    await expect(page.getByText('Arrives in 1 to 3 days from Bengaluru.')).toBeVisible();
    await expect(page.getByText('no card details are asked for')).toBeVisible();
    await page.getByRole('button', { name: 'Place the order (a demo)' }).click();

    await expect(page).toHaveURL(/checkout\/done\/$/);
    await expect(page.getByText(/^Order NR-\d{6}-\d{4}$/)).toBeVisible();
    await expect(page.getByText('Thank you, Asha.')).toBeVisible();
    await expect(page.getByText('Payment: Cash on delivery.')).toBeVisible();
    await expect(page.getByText(/This was a demo/)).toBeVisible();
    // The cart was emptied by the order.
    await expect(page.getByRole('link', { name: 'Cart', exact: true })).toBeVisible();
    await page.goto('./cart/');
    await expect(page.getByText('Your cart is empty.')).toBeVisible();
  });

  test('has nothing to check out from an empty cart', async ({ page }) => {
    await page.goto('./checkout/');
    await expect(page.getByText('There is nothing in your cart to check out yet.')).toBeVisible();
  });
});

test.describe('subscriptions', () => {
  test('build one in three steps and check it out', async ({ page }) => {
    await page.goto('./subscribe/');
    await page.getByRole('radio', { name: /Pour-over/ }).check({ force: true });
    await page.getByRole('button', { name: 'Next: Which coffee' }).click();
    await expect(page.getByRole('heading', { name: '2. Which coffee' })).toBeFocused();
    await page.getByRole('radio', { name: /Baba Budan/ }).check({ force: true });
    await page.getByRole('button', { name: 'Next: How much, how often' }).click();
    await page.getByRole('radio', { name: '500 g' }).check({ force: true });
    await page.getByRole('radio', { name: 'Every four weeks' }).check({ force: true });
    const summary = page.getByRole('complementary', { name: 'Your subscription' });
    await expect(summary).toContainText('2 × Baba Budan, 500 g');
    await expect(summary).toContainText('₹1,915.20');
    await page.getByRole('button', { name: 'Continue to checkout' }).click();

    await expect(page).toHaveURL(/checkout\/\?for=subscription$/);
    await expect(page.getByRole('complementary', { name: 'Your subscription' })).toContainText(
      '2 × 500 g, every four weeks, ground for pour-over',
    );
    await fillAddress(page);
    await page.getByRole('button', { name: 'Place the order (a demo)' }).click();
    await expect(page).toHaveURL(/checkout\/done\/$/);
    await expect(page.getByText('Subscription: Baba Budan')).toBeVisible();
  });
});
