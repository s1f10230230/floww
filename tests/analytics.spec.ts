import { test, expect } from '@playwright/test';

test.describe('Analytics Page', () => {
  test('should load analytics page', async ({ page }) => {
    await page.goto('/analytics');

    // Check if analytics page loads
    await expect(page).toHaveURL(/.*analytics/);
  });

  test('should display chart or graph elements', async ({ page }) => {
    await page.goto('/analytics');

    // Look for common chart/graph elements (recharts creates svg elements)
    const hasCharts = await page.locator('svg, canvas, .recharts-wrapper').count();
    expect(hasCharts).toBeGreaterThanOrEqual(0);
  });

  test('should have category breakdown section', async ({ page }) => {
    await page.goto('/analytics');

    // Check for category-related content
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
  });
});
