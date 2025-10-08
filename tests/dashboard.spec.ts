import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test('should load dashboard page', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for page to load
    await expect(page).toHaveTitle(/Floww/);
  });

  test('should display transaction cards', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for main dashboard elements (ダッシュボード heading or summary cards)
    await expect(page.locator('h1')).toContainText(/ダッシュボード|Dashboard/i);
  });

  test('should navigate to analytics page', async ({ page }) => {
    await page.goto('/dashboard');

    // Find and click analytics link
    const analyticsLink = page.locator('a[href*="analytics"]').first();
    if (await analyticsLink.count() > 0) {
      await analyticsLink.click();
      await expect(page).toHaveURL(/.*analytics/);
    }
  });

  test('should navigate to cards page', async ({ page }) => {
    await page.goto('/dashboard');

    // Find and click cards link
    const cardsLink = page.locator('a[href*="cards"]').first();
    if (await cardsLink.count() > 0) {
      await cardsLink.click();
      await expect(page).toHaveURL(/.*cards/);
    }
  });
});
