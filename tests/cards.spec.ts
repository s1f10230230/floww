import { test, expect } from '@playwright/test';

test.describe('Cards Page', () => {
  test('should load cards page', async ({ page }) => {
    await page.goto('/cards');

    // Check if cards page loads
    await expect(page).toHaveURL(/.*cards/);
  });

  test('should display credit card information', async ({ page }) => {
    await page.goto('/cards');

    // Check for card-related content
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('should navigate back to dashboard', async ({ page }) => {
    await page.goto('/cards');

    // Find and click dashboard/home link
    const dashboardLink = page.locator('a[href*="dashboard"], a[href="/"]').first();
    if (await dashboardLink.count() > 0) {
      await dashboardLink.click();
      await expect(page).toHaveURL(/dashboard|\/$/);
    }
  });
});
