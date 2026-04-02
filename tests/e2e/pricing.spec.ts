import { test, expect } from '@playwright/test';

const apiBaseUrl = process.env.API_BASE_URL || 'https://back.simpleszap.com';

test.describe('Pricing (smoke)', () => {
  test('GET /api/pricing deve retornar planos', async ({ request }) => {
    const res = await request.get(`${apiBaseUrl}/api/pricing`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body?.plans)).toBeTruthy();
    expect(body.plans.length).toBeGreaterThan(0);
    expect(body.plans[0]).toHaveProperty('limits');
    expect(body.plans[0]).toHaveProperty('pricing');
  });
});

