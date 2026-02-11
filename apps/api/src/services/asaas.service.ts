import axios from 'axios';

const BASE_URL = process.env.ASAAS_API_URL || process.env.ASAS_APT_URL || 'https://sandbox.asaas.com/api/v3';
const API_KEY = process.env.ASAAS_API_KEY || process.env.ASAS_APT_KEY;

export class AsaasService {
  private static get headers() {
    return {
      'access_token': API_KEY,
      'Content-Type': 'application/json',
    };
  }

  static async createCustomer(user: { name: string, email: string, cpfCnpj?: string, mobilePhone?: string }) {
    try {
      // Check if customer exists (optional, Asaas might handle dups or we search first)
      const { data: { data: existing } } = await axios.get(`${BASE_URL}/customers`, {
        params: { email: user.email },
        headers: this.headers
      });

      if (existing && existing.length > 0) {
        return existing[0];
      }

      const response = await axios.post(`${BASE_URL}/customers`, {
        name: user.name,
        email: user.email,
        cpfCnpj: user.cpfCnpj,
        mobilePhone: user.mobilePhone
      }, { headers: this.headers });

      return response.data;
    } catch (error: any) {
      console.error('Error creating Asaas customer:', error.response?.data || error.message);
      throw new Error('Failed to create payment customer');
    }
  }

  static async createPayment(customerId: string, value: number, description: string, billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' = 'PIX') {
    try {
      const response = await axios.post(`${BASE_URL}/payments`, {
        customer: customerId,
        billingType,
        value,
        dueDate: new Date().toISOString().split('T')[0], // Today
        description,
      }, { headers: this.headers });

      return response.data;
    } catch (error: any) {
      console.error('Error creating Asaas payment:', error.response?.data || error.message);
      throw new Error('Failed to create payment');
    }
  }

  static async createSubscription(customerId: string, value: number, cycle: 'MONTHLY' | 'YEARLY', description: string) {
     try {
      const response = await axios.post(`${BASE_URL}/subscriptions`, {
        customer: customerId,
        billingType: 'PIX', // Default to PIX or make selectable
        value,
        nextDueDate: new Date().toISOString().split('T')[0],
        cycle,
        description,
      }, { headers: this.headers });

      return response.data;
    } catch (error: any) {
      console.error('Error creating Asaas subscription:', error.response?.data || error.message);
      throw new Error('Failed to create subscription');
    }
  }
}
