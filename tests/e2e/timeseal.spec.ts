import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('TimeSeal E2E Tests', () => {

  test('should load homepage and display main elements', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('h1', { hasText: 'TIME-SEAL' })).toBeVisible();
    await expect(page.locator('text=QUICK START TEMPLATES')).toBeVisible();
  });





  test('should apply template and populate form', async ({ page }) => {
    await page.goto(BASE_URL);

    await page.getByRole('button', { name: 'Crypto Inheritance' }).click();

    const messageValue = await page.inputValue('textarea#message-input');
    expect(messageValue).toContain('Seed phrase');

    await expect(page.getByRole('button', { name: 'DEADMAN' })).toHaveClass(/seal-type-button-active/);

    const pulseDays = await page.inputValue('input#pulse-value');
    expect(pulseDays).toBe('30');
  });

  test('should handle file upload', async ({ page }) => {
    await page.goto(BASE_URL);

    // Create a test file
    const fileContent = 'This is a test file content';
    const buffer = Buffer.from(fileContent);

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: buffer,
    });

    await expect(page.getByText('test.txt', { exact: true })).toBeVisible();

    // File takes priority: typing into the message box is rejected client-side.
    await page.fill('textarea#message-input', 'should not stick');
    await expect(page.locator('textarea#message-input')).toHaveValue('');
  });

  test('should navigate to info pages', async ({ page }) => {
    // Test How It Works page
    await page.goto(`${BASE_URL}/how-it-works`);
    await expect(page.locator('h1', { hasText: 'HOW IT WORKS' })).toBeVisible();
    await expect(page.locator('text=Layer 1: The Vault')).toBeVisible();

    // Test Security page
    await page.goto(`${BASE_URL}/security`);
    await expect(page.locator('h1', { hasText: 'SECURITY' })).toBeVisible();
    await expect(page.getByText('AES-GCM-256').first()).toBeVisible();

    // Test FAQ page
    await page.goto(`${BASE_URL}/faq`);
    await expect(page.locator('h1', { hasText: 'FAQ' })).toBeVisible();
    await expect(page.locator('text=What is the maximum file size?')).toBeVisible();
  });

  test('should validate form inputs', async ({ page }) => {
    await page.goto(BASE_URL);

    await page.getByRole('button', { name: 'TIMED', exact: true }).click();

    const createButton = page.getByRole('button', { name: 'CREATE TIME-SEAL' });
    await expect(createButton).toBeDisabled();

    await page.fill('textarea#message-input', 'Test');
    await expect(createButton).toBeDisabled();

    await page.getByRole('button', { name: '+1 HOUR' }).click();

    // Still gated on the Turnstile token: no automated bypass exists in the app.
    await expect(createButton).toBeDisabled();
  });

  test('should display footer with links', async ({ page }) => {
    await page.goto(BASE_URL);

    // Check footer exists
    await expect(page.locator('footer')).toBeVisible();

    // Check footer links
    await expect(page.locator('footer a:has-text("How It Works")')).toBeVisible();
    await expect(page.locator('footer a:has-text("Security")')).toBeVisible();
    await expect(page.locator('footer a:has-text("FAQ")')).toBeVisible();

    await expect(page.locator('footer a[aria-label="Share on X/Twitter"]')).toBeVisible();
  });


});

test.describe('API Health Checks', () => {
  test('should have healthy API endpoints', async ({ request }) => {
    const healthResponse = await request.get(`${BASE_URL}/api/health`);
    expect(healthResponse.ok()).toBeTruthy();

    const metricsResponse = await request.get(`${BASE_URL}/api/metrics`);
    // Metrics are auth-gated by design: 200 with a secret, 401 wrong bearer, 404 when disabled.
    expect([200, 401, 404]).toContain(metricsResponse.status());
  });
});
