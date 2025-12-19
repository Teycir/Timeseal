import { test, expect } from '@playwright/test';

test.describe('Time-Seal E2E Flow', () => {
  test('should create and unlock a timed seal', async ({ page }) => {
    await page.goto('/');
    
    // Create seal
    await page.fill('[data-testid="secret-input"]', 'Test secret message');
    await page.fill('[data-testid="unlock-time"]', '2025-12-31T23:59');
    await page.click('[data-testid="create-seal-btn"]');
    
    // Verify seal created
    await expect(page.locator('[data-testid="seal-link"]')).toBeVisible();
    const sealLink = await page.locator('[data-testid="seal-link"]').getAttribute('href');
    expect(sealLink).toContain('/v/');
    
    // Visit seal page
    await page.goto(sealLink!);
    await expect(page.locator('[data-testid="countdown"]')).toBeVisible();
  });

  test('should create Dead Man Switch seal', async ({ page }) => {
    await page.goto('/');
    
    await page.click('[data-testid="dms-toggle"]');
    await page.fill('[data-testid="secret-input"]', 'DMS secret');
    await page.fill('[data-testid="pulse-interval"]', '7');
    await page.click('[data-testid="create-seal-btn"]');
    
    await expect(page.locator('[data-testid="pulse-link"]')).toBeVisible();
    await expect(page.locator('[data-testid="vault-link"]')).toBeVisible();
  });

  test('should show locked state before unlock time', async ({ page }) => {
    const sealId = 'test-seal-locked';
    await page.goto(`/v/${sealId}`);
    
    await expect(page.locator('[data-testid="status"]')).toHaveText(/LOCKED/);
    await expect(page.locator('[data-testid="countdown"]')).toBeVisible();
  });

  test('should decrypt and show content after unlock', async ({ page }) => {
    const sealId = 'test-seal-unlocked';
    await page.goto(`/v/${sealId}#keyA=test-key`);
    
    await expect(page.locator('[data-testid="status"]')).toHaveText(/UNLOCKED/);
    await expect(page.locator('[data-testid="decrypted-content"]')).toBeVisible();
  });
});
