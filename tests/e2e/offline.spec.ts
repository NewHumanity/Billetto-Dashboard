import { test, expect } from '@playwright/test';

const MOCK_EVENTS = {
  object: 'list',
  data: [
    {
      id: '123',
      object: 'event',
      name: 'Summer Festival 2024',
      state: 'published',
      currency: 'EUR',
      starts_at: '2024-07-01T12:00:00Z',
      ends_at: '2024-07-01T23:00:00Z',
      public_url: 'https://billetto.dk/e/123',
      kind: 'regular'
    }
  ],
  total: 1,
  has_more: false,
  url: '/events'
};

const EMPTY_LIST = {
    object: 'list',
    data: [],
    total: 0,
    has_more: false,
    url: '/'
};

test.describe('Offline Capability', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept all API calls to Billetto (including via proxy)
    // The pattern matches any URL containing the endpoint path
    
    await page.route('**/*events*', async route => {
      await route.fulfill({ contentType: 'application/json', json: MOCK_EVENTS });
    });
    
    // Mock other endpoints to return empty lists to prevent errors during deep fetch
    await page.route('**/*orders*', async route => route.fulfill({ contentType: 'application/json', json: EMPTY_LIST }));
    await page.route('**/*attendees*', async route => route.fulfill({ contentType: 'application/json', json: EMPTY_LIST }));
    await page.route('**/*ledger_entries*', async route => route.fulfill({ contentType: 'application/json', json: EMPTY_LIST }));
    await page.route('**/*ticket_types*', async route => route.fulfill({ contentType: 'application/json', json: EMPTY_LIST }));
    await page.route('**/*campaigns*', async route => route.fulfill({ contentType: 'application/json', json: EMPTY_LIST }));
    await page.route('**/*target_groups*', async route => route.fulfill({ contentType: 'application/json', json: EMPTY_LIST }));
  });

  test('should load dashboard from cache when offline', async ({ page, context }) => {
    await page.goto('/');

    // 1. Initial Login
    const apiKeyInput = page.getByLabel('Billetto API Keypair');
    if (await apiKeyInput.isVisible()) {
        await apiKeyInput.fill('fake_api_key:fake_secret');
        // Uncheck proxy if needed, though route interception should catch proxy requests too if pattern is broad enough
        await page.getByRole('button', { name: 'Save & Fetch Data' }).click();
    }

    // 2. Verify Data Loaded from Network (Mocked)
    await expect(page.getByText('Summer Festival 2024')).toBeVisible();
    await expect(page.getByText('Published')).toBeVisible();

    // 3. Simulate Offline Mode
    await context.setOffline(true);

    // 4. Reload Page to trigger PWA/Cache behavior
    await page.reload();

    // 5. Verify Data Persists (served from IndexedDB/Cache)
    await expect(page.getByText('Summer Festival 2024')).toBeVisible();
    
    // Verify we are not seeing an error state
    await expect(page.getByText('No events found')).not.toBeVisible();
  });
});