import axios from 'axios';

const BASE_URL = process.env.EVOLUTION_API_URL || process.env.EVOLUTION_APT_URL || 'https://whatsapp.toolpad.cloud';
const API_KEY = process.env.EVOLUTION_API_KEY || process.env.EVOLUTION_APT_KEY;
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 7000,
});

export class EvolutionService {
  private static get headers() {
    return {
      'apikey': API_KEY,
      'Content-Type': 'application/json',
    };
  }

  static async createInstance(instanceName: string) {
    try {
      const response = await client.post(`/instance/create`, {
        instanceName,
        token: "", // Optional, can be auto-generated
        qrcode: true, // Return QR immediately if possible? Usually not for create
      }, { headers: this.headers });
      return response.data;
    } catch (error: any) {
      console.error('Error creating instance:', error.response?.data || error.message);
      throw new Error('Failed to create instance on Evolution API');
    }
  }

  static async connectInstance(instanceName: string) {
    try {
      const response = await client.get(`/instance/connect/${instanceName}`, {
        headers: this.headers,
      });
      return response.data; // Should contain base64 or code
    } catch (error: any) {
      console.error('Error connecting instance:', error.response?.data || error.message);
      throw new Error('Failed to connect instance');
    }
  }
  
  static async fetchInstances() {
      try {
          const response = await client.get(`/instance/fetchInstances`, {
              headers: this.headers
          });
          return response.data;
      } catch (error: any) {
           console.error('Error fetching instances:', error.response?.data || error.message);
           return [];
      }
  }

  static async deleteInstance(instanceName: string) {
    try {
      const response = await client.delete(`/instance/delete/${instanceName}`, {
        headers: this.headers,
      });
      return response.data;
    } catch (error: any) {
       console.error('Error deleting instance:', error.response?.data || error.message);
       throw new Error('Failed to delete instance');
    }
  }

  static async sendText(instanceName: string, number: string, text: string) {
    try {
      const response = await client.post(`/message/sendText/${instanceName}`, {
        number,
        options: {
          delay: 1200,
          presence: "composing",
        },
        textMessage: {
          text,
        },
      }, { headers: this.headers });
      return response.data;
    } catch (error: any) {
      console.error('Error sending message:', error.response?.data || error.message);
      throw new Error('Failed to send message');
    }
  }
}
