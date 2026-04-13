import axios from 'axios';
import { SettingsService, SETTING_KEYS } from './settings.service';

const DEFAULT_SANDBOX_URL = 'https://sandbox.asaas.com/api/v3';
const DEFAULT_PRODUCTION_URL = 'https://api.asaas.com/api/v3';

export class AsaasService {
  /**
   * Resolve base URL and API key dynamically (DB first, then env fallback).
   */
  private static async getConfig() {
    const [apiKey, apiUrl, environment] = await Promise.all([
      SettingsService.get(SETTING_KEYS.ASAAS_API_KEY),
      SettingsService.get(SETTING_KEYS.ASAAS_API_URL),
      SettingsService.get(SETTING_KEYS.ASAAS_ENVIRONMENT),
    ]);

    const defaultUrl = environment === 'production' ? DEFAULT_PRODUCTION_URL : DEFAULT_SANDBOX_URL;

    return {
      baseUrl: apiUrl || defaultUrl,
      headers: {
        'access_token': apiKey || '',
        'Content-Type': 'application/json',
      },
    };
  }

  static async createCustomer(user: { name: string, email: string, cpfCnpj?: string, mobilePhone?: string }) {
    const { baseUrl, headers } = await this.getConfig();
    try {
      const { data: { data: existing } } = await axios.get(`${baseUrl}/customers`, {
        params: { email: user.email },
        headers
      });

      if (existing && existing.length > 0) {
        return existing[0];
      }

      const response = await axios.post(`${baseUrl}/customers`, {
        name: user.name,
        email: user.email,
        cpfCnpj: user.cpfCnpj,
        mobilePhone: user.mobilePhone
      }, { headers });

      return response.data;
    } catch (error: any) {
      const description =
        error?.response?.data?.errors?.[0]?.description ||
        error?.response?.data?.errors?.[0]?.message ||
        error?.message;
      console.error('Error creating Asaas customer:', error.response?.data || error.message);
      throw new Error(description || 'Failed to create payment customer');
    }
  }

  static async updateCustomer(customerId: string, data: { name?: string; email?: string; cpfCnpj?: string; mobilePhone?: string }) {
    const { baseUrl, headers } = await this.getConfig();
    try {
      const response = await axios.put(`${baseUrl}/customers/${customerId}`, data, { headers });
      return response.data;
    } catch (error: any) {
      const description =
        error?.response?.data?.errors?.[0]?.description ||
        error?.response?.data?.errors?.[0]?.message ||
        error?.message;
      console.error('Error updating Asaas customer:', error.response?.data || error.message);
      throw new Error(description || 'Failed to update payment customer');
    }
  }

  static async createPayment(customerId: string, value: number, description: string, billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' = 'PIX') {
    const { baseUrl, headers } = await this.getConfig();
    try {
      const response = await axios.post(`${baseUrl}/payments`, {
        customer: customerId,
        billingType,
        value,
        dueDate: new Date().toISOString().split('T')[0],
        description,
      }, { headers });

      return response.data;
    } catch (error: any) {
      const description =
        error?.response?.data?.errors?.[0]?.description ||
        error?.response?.data?.errors?.[0]?.message ||
        error?.message;
      console.error('Error creating Asaas payment:', error.response?.data || error.message);
      throw new Error(description || 'Failed to create payment');
    }
  }

  static async createSubscription(
    customerId: string,
    value: number,
    cycle: 'MONTHLY' | 'YEARLY',
    description: string,
    billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' = 'PIX'
  ) {
    const { baseUrl, headers } = await this.getConfig();
    try {
      const response = await axios.post(`${baseUrl}/subscriptions`, {
        customer: customerId,
        billingType,
        value,
        nextDueDate: new Date().toISOString().split('T')[0],
        cycle,
        description,
      }, { headers });

      return response.data;
    } catch (error: any) {
      const description =
        error?.response?.data?.errors?.[0]?.description ||
        error?.response?.data?.errors?.[0]?.message ||
        error?.message;
      console.error('Error creating Asaas subscription:', error.response?.data || error.message);
      throw new Error(description || 'Failed to create subscription');
    }
  }

  static async listSubscriptionPayments(subscriptionId: string) {
    const { baseUrl, headers } = await this.getConfig();
    try {
      const response = await axios.get(`${baseUrl}/subscriptions/${subscriptionId}/payments`, {
        headers,
      });

      const payments = response?.data?.data;
      return Array.isArray(payments) ? payments : [];
    } catch (error: any) {
      console.error('Error listing Asaas subscription payments:', error.response?.data || error.message);
      throw new Error('Failed to list subscription payments');
    }
  }

  // ─── Plan/Product Management ───────────────────────────────────────

  static async createPlan(plan: {
    name: string;
    description?: string;
    value: number;
    cycle: 'MONTHLY' | 'YEARLY';
  }) {
    const { baseUrl, headers } = await this.getConfig();
    try {
      const response = await axios.post(`${baseUrl}/subscriptions/plans`, {
        name: plan.name,
        description: plan.description || plan.name,
        value: plan.value,
        billingCycle: plan.cycle,
      }, { headers });

      return response.data;
    } catch (error: any) {
      const desc =
        error?.response?.data?.errors?.[0]?.description ||
        error?.response?.data?.errors?.[0]?.message ||
        error?.message;
      console.error('Error creating Asaas plan:', error.response?.data || error.message);
      throw new Error(desc || 'Failed to create plan on Asaas');
    }
  }

  static async updatePlan(asaasId: string, plan: {
    name?: string;
    description?: string;
    value?: number;
    cycle?: 'MONTHLY' | 'YEARLY';
  }) {
    const { baseUrl, headers } = await this.getConfig();
    try {
      const body: Record<string, any> = {};
      if (plan.name) body.name = plan.name;
      if (plan.description) body.description = plan.description;
      if (plan.value !== undefined) body.value = plan.value;
      if (plan.cycle) body.billingCycle = plan.cycle;

      const response = await axios.put(`${baseUrl}/subscriptions/plans/${asaasId}`, body, {
        headers,
      });

      return response.data;
    } catch (error: any) {
      const desc =
        error?.response?.data?.errors?.[0]?.description ||
        error?.response?.data?.errors?.[0]?.message ||
        error?.message;
      console.error('Error updating Asaas plan:', error.response?.data || error.message);
      throw new Error(desc || 'Failed to update plan on Asaas');
    }
  }

  static async deletePlan(asaasId: string) {
    const { baseUrl, headers } = await this.getConfig();
    try {
      const response = await axios.delete(`${baseUrl}/subscriptions/plans/${asaasId}`, {
        headers,
      });
      return response.data;
    } catch (error: any) {
      const desc =
        error?.response?.data?.errors?.[0]?.description ||
        error?.response?.data?.errors?.[0]?.message ||
        error?.message;
      console.error('Error deleting Asaas plan:', error.response?.data || error.message);
      throw new Error(desc || 'Failed to delete plan on Asaas');
    }
  }

  static async getPlan(asaasId: string) {
    const { baseUrl, headers } = await this.getConfig();
    try {
      const response = await axios.get(`${baseUrl}/subscriptions/plans/${asaasId}`, {
        headers,
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching Asaas plan:', error.response?.data || error.message);
      return null;
    }
  }

  static async listPlans() {
    const { baseUrl, headers } = await this.getConfig();
    try {
      const response = await axios.get(`${baseUrl}/subscriptions/plans`, {
        headers,
      });
      return response?.data?.data || [];
    } catch (error: any) {
      console.error('Error listing Asaas plans:', error.response?.data || error.message);
      throw new Error('Failed to list plans on Asaas');
    }
  }

  // ─── Webhook Registration ──────────────────────────────────────────

  static async registerWebhook(webhookUrl: string, accessToken: string) {
    const { baseUrl, headers } = await this.getConfig();
    try {
      const response = await axios.post(`${baseUrl}/webhook`, {
        url: webhookUrl,
        email: '',
        apiVersion: 3,
        enabled: true,
        interrupted: false,
        authToken: accessToken,
        sendType: 'SEQUENTIALLY',
      }, { headers });

      return response.data;
    } catch (error: any) {
      const desc =
        error?.response?.data?.errors?.[0]?.description ||
        error?.response?.data?.errors?.[0]?.message ||
        error?.message;
      console.error('Error registering Asaas webhook:', error.response?.data || error.message);
      throw new Error(desc || 'Failed to register webhook on Asaas');
    }
  }

  static async getWebhookConfig() {
    const { baseUrl, headers } = await this.getConfig();
    try {
      const response = await axios.get(`${baseUrl}/webhook`, { headers });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching Asaas webhook config:', error.response?.data || error.message);
      return null;
    }
  }

  // ─── Connection Test ───────────────────────────────────────────────

  static async testConnection() {
    const { baseUrl, headers } = await this.getConfig();
    try {
      const response = await axios.get(`${baseUrl}/finance/balance`, { headers });
      return { ok: true, balance: response.data?.balance };
    } catch (error: any) {
      return { ok: false, error: error?.response?.data?.errors?.[0]?.description || error?.message };
    }
  }
}
