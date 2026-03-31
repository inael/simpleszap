import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL;

test.skip(!API_BASE_URL, 'API_BASE_URL env var required');

test.describe('Asaas Webhook', () => {
  test('deve responder 200 quando token não é exigido (ou token correto)', async ({ request }) => {
    const headers: Record<string, string> = {};
    if (process.env.ASAAS_WEBHOOK_TOKEN) {
      headers['asaas-access-token'] = process.env.ASAAS_WEBHOOK_TOKEN;
    }

    const response = await request.post(`${API_BASE_URL!}/api/webhooks/asaas`, {
      headers,
      data: {
        event: 'PAYMENT_RECEIVED',
        payment: {
          id: 'pay_test',
          status: 'RECEIVED',
        },
      },
    });

    expect(response.status()).toBe(200);
    const bodyText = await response.text();
    expect(bodyText).toContain('ok');
  });
});
