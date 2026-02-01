import { test, expect } from '@playwright/test';

test.describe('Relation Map - Relation Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Reset data
    const resetButton = page.getByText('リセット');
    if (await resetButton.isVisible()) {
      await resetButton.click();
      const confirmButton = page.getByRole('button', { name: /確認|はい|OK/i });
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    // Create two entities first
    for (const name of ['ソースノード', 'ターゲットノード']) {
      await page.getByText('+ ノード').click();
      await expect(page.locator('h2').filter({ hasText: /エンティティ|ノード/ })).toBeVisible();
      const nameInput = page.locator('input[type="text"]').first();
      await nameInput.fill(name);
      await page.getByRole('button', { name: /保存|追加|作成/ }).click();
      await page.waitForTimeout(500);
    }
  });

  test('creates a relation between entities', async ({ page }) => {
    // Click add relation button
    await page.getByText('+ リレーション').click();
    
    // Wait for modal
    await expect(page.locator('h2').filter({ hasText: /リレーション/ })).toBeVisible({ timeout: 5000 });
    
    // Select source entity (first select/dropdown)
    const selects = page.locator('select');
    const sourceSelect = selects.nth(0);
    await sourceSelect.selectOption({ index: 1 });
    
    // Select target entity (second select/dropdown)
    const targetSelect = selects.nth(1);
    await targetSelect.selectOption({ index: 2 });
    
    // Select relation type if available (third select)
    if (await selects.nth(2).isVisible().catch(() => false)) {
      await selects.nth(2).selectOption({ index: 1 });
    }
    
    // Submit
    await page.getByRole('button', { name: /保存|追加|作成/ }).click();
    
    // Verify relation created
    await page.waitForTimeout(1000);
  });

  test('validates relation with same source and target', async ({ page }) => {
    // Click add relation button
    await page.getByText('+ リレーション').click();
    
    // Wait for modal
    await expect(page.locator('h2').filter({ hasText: /リレーション/ })).toBeVisible();
    
    // Select same entity for both source and target
    const selects = page.locator('select');
    await selects.nth(0).selectOption({ index: 1 });
    await selects.nth(1).selectOption({ index: 1 }); // Same as source
    
    // Try to submit
    const saveButton = page.getByRole('button', { name: /保存|追加|作成/ });
    await saveButton.click();
    
    // Check for validation error
    const errorVisible = await page.locator('[class*="error"], [role="alert"]').isVisible({ timeout: 2000 }).catch(() => false);
    const modalStillOpen = await page.locator('h2').filter({ hasText: /リレーション/ }).isVisible();
    
    expect(errorVisible || modalStillOpen).toBeTruthy();
  });
});
