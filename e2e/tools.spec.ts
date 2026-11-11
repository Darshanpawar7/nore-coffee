import { expect, hydrated, test } from './fixtures';

test.describe('the brew guide', () => {
  test('works out the quantities for the cups and strength chosen', async ({ page }) => {
    await page.goto('./brew/');
    await hydrated(page, '.brew');
    const numbers = page.locator('.brew__numbers');
    await expect(numbers).toContainText('20 g');
    await page.getByRole('button', { name: 'One cup more' }).click();
    await page.getByRole('radio', { name: /Strong/ }).check({ force: true });
    await expect(numbers).toContainText('30 g');
    await expect(numbers).toContainText('180 ml');
    await expect(numbers).toContainText('about 120 ml');
    await expect(numbers).toContainText('240 ml');
    await expect(page.getByRole('heading', { name: 'Other ways to brew' })).toBeVisible();
    await expect(page.getByText('16 g of coffee to 250 ml of water')).toBeVisible();
  });

  test('runs a drip timer that starts, pauses and finishes, on a controlled clock', async ({
    page,
  }) => {
    await page.clock.install({ time: 0 });
    await page.goto('./brew/');
    await page.clock.pauseAt(10_000);
    await hydrated(page, '.brew');
    await page.getByRole('button', { name: 'Start the drip timer' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Timer running' })).toBeVisible();
    // The ring ticks every quarter second; a little past 65 s guarantees the 65 s tick has run.
    await page.clock.runFor(65_400);
    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Paused at 1:05.' })).toBeVisible();
    await page.getByRole('button', { name: 'Resume' }).click();
    await page.clock.runFor(14 * 60_000);
    await expect(
      page.getByRole('status').filter({ hasText: 'Fifteen minutes. The decoction is ready' }),
    ).toBeVisible();
    await expect(page.locator('.timer')).toHaveClass(/is-done/);
  });
});

test.describe('the kolam generator', () => {
  test('draws a kolam for any word and downloads it as SVG', async ({ page }) => {
    await page.goto('./brand/');
    await hydrated(page, '.generator');
    const input = page.getByLabel('Any word');
    await input.fill('Darshan');
    const figure = page.getByRole('img', { name: 'The kolam for “Darshan”' });
    await expect(figure).toBeVisible();
    expect(await figure.locator('path').count()).toBeGreaterThan(0);
    await page.getByRole('radio', { name: 'Nilgiri blue' }).check({ force: true });
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download the SVG' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('kolam-darshan.svg');
  });
});
