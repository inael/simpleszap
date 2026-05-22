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

  /**
   * Constrói o nome enviado à Evolution API. A Evolution é compartilhada entre
   * produtos IT Booster — o prefixo "simpleszap_" identifica a origem, e o slug
   * + short-id preservam o nome dado pelo cliente sem perder unicidade.
   *
   * Exemplo: ("b2e1c4a8-9c3a-…", "Atendimento Vendas") →
   *          "simpleszap_atendimento-vendas_b2e1c4a8"
   */
  static buildInstanceName(dbId: string, userName: string): string {
    const slug = (userName || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')   // remove acentos
      .replace(/[^a-z0-9]+/g, '-')       // não-alfanumérico → hífen
      .replace(/^-+|-+$/g, '')           // trim hífens
      .slice(0, 30);
    const shortId = dbId.replace(/-/g, '').slice(0, 8);
    return `simpleszap_${slug || 'instance'}_${shortId}`;
  }

  static async createInstance(instanceName: string) {
    try {
      const response = await client.post(`/instance/create`, {
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
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

  /**
   * Lista todos os contatos sincronizados pela instância (Evolution v2).
   * Retorna array de { id, pushName, profilePicUrl, ... } — formato Baileys.
   */
  static async findContacts(instanceName: string) {
    try {
      const response = await client.post(
        `/chat/findContacts/${instanceName}`,
        { where: {} },
        { headers: this.headers, timeout: 30000 }
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
      console.error('Error fetching contacts:', error.response?.data || error.message);
      throw new Error('Failed to fetch contacts from WhatsApp');
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

  /**
   * Envia mensagem com botões interativos via Evolution API.
   * AVISO: entrega não é garantida pela Meta — destinatário pode receber
   * só o texto sem botões. Endpoint protegido por aceitação de termos (beta).
   * Aceita o payload já no formato Evolution v2 pra não inventar shape próprio.
   */
  static async sendButtons(instanceName: string, payload: Record<string, unknown>) {
    try {
      const response = await client.post(
        `/message/sendButtons/${instanceName}`,
        payload,
        { headers: this.headers }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error sending buttons:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to send buttons message');
    }
  }
}
