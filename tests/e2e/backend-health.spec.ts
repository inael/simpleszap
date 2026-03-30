import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL;

test.skip(!API_BASE_URL, 'API_BASE_URL env var required');

test.describe('Backend (smoke)', () => {
  test('deve responder /health com status ok', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL!}/health`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body?.status).toBe('ok');
  });
});

