import { test, expect } from '@playwright/test';

test.describe('Relation Map - Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('loads the application successfully', async ({ page }) => {
    // Check title
    await expect(page.locator('h1')).toContainText('Relation Map');
    
    // Check main buttons are visible
    await expect(page.getByText('+ ノード')).toBeVisible();
    await expect(page.getByText('+ リレーション')).toBeVisible();
    await expect(page.getByText('リセット')).toBeVisible();
  });

  test('displays the graph canvas', async ({ page }) => {
    // Check that the graph container exists
    const graphContainer = page.locator('#graph-container, [class*="graph"], canvas').first();
    await expect(graphContainer).toBeVisible();
  });
});
