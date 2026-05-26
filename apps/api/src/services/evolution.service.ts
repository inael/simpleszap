import axios from 'axios';

const BASE_URL = process.env.EVOLUTION_API_URL || process.env.EVOLUTION_APT_URL || 'https://whatsapp.toolpad.cloud';
const API_KEY = process.env.EVOLUTION_API_KEY || process.env.EVOLUTION_APT_KEY;
const WEBHOOK_BASE_URL = process.env.SIMPLESZAP_WEBHOOK_BASE_URL || 'https://back.simpleszap.com/api/webhooks/evolution';
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 7000,
});

/**
 * Eventos da Evolution v2 que o SimplesZap consome. webhookByEvents=false envia
 * tudo pra mesma URL. MESSAGES_REACTION NÃO existe como evento próprio — reactions
 * vêm dentro de MESSAGES_UPSERT (raw.message.reactionMessage).
 */
const WEBHOOK_EVENTS = [
  'MESSAGES_UPSERT',
  'MESSAGES_UPDATE',
  'MESSAGES_DELETE',
  'CONNECTION_UPDATE',
  'QRCODE_UPDATED',
  'CONTACTS_UPDATE',
  'PRESENCE_UPDATE',
  'SEND_MESSAGE',
];

function buildWebhookConfig(instanceName: string) {
  // Evolution v2.3.7 espera "base64" no body do POST (não "webhookBase64").
  // A API armazena como webhookBase64 no schema mas só lê do payload com chave base64.
  // Com base64=true a Evolution entrega mídia (áudio/imagem/vídeo) já decodificada
  // no payload do webhook, evitando download separado + descriptografia com mediaKey.
  return {
    enabled: true,
    url: `${WEBHOOK_BASE_URL}/${instanceName}`,
    webhookByEvents: false,
    base64: true,
    events: WEBHOOK_EVENTS,
  };
}

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
        webhook: buildWebhookConfig(instanceName),
      }, { headers: this.headers });
      return response.data;
    } catch (error: any) {
      console.error('Error creating instance:', error.response?.data || error.message);
      throw new Error('Failed to create instance on Evolution API');
    }
  }

  /**
   * (Re)configura o webhook de uma instância existente. Usado pelo endpoint
   * admin /admin/instances/sync-webhooks pra subir instâncias antigas pro novo
   * modelo de webhook centralizado. Retorna true em sucesso, false em erro
   * (não lança — o caller itera várias instâncias).
   */
  static async setInstanceWebhook(instanceName: string): Promise<boolean> {
    try {
      await client.post(
        `/webhook/set/${instanceName}`,
        { webhook: buildWebhookConfig(instanceName) },
        { headers: this.headers }
      );
      return true;
    } catch (error: any) {
      console.error(
        `Error setting webhook for ${instanceName}:`,
        error.response?.data || error.message
      );
      return false;
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
      // Evolution API v2.3+: shape flat (sem textMessage/options wrappers).
      // delay/presence ficam no nível raiz como campos opcionais.
      const response = await client.post(`/message/sendText/${instanceName}`, {
        number,
        text,
        delay: 1200,
      }, { headers: this.headers });
      return response.data;
    } catch (error: any) {
      const detail = error.response?.data;
      console.error('Error sending message:', detail || error.message);
      const msg = detail?.message || detail?.response?.message || error.message || 'Failed to send message';
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
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

  /**
   * Envia mídia (imagem, vídeo, documento) ou áudio via Evolution API v2.
   * Para áudio PTT (push-to-talk / voice message), usa o endpoint dedicado
   * /message/sendWhatsAppAudio. Para imagem/vídeo/documento, usa /message/sendMedia.
   *
   * `media` aceita URL pública OU base64 (data URI). Evolution baixa e envia.
   */
  static async sendMedia(
    instanceName: string,
    params: {
      number: string;
      mediatype: 'image' | 'video' | 'document' | 'audio';
      media: string;
      caption?: string;
      fileName?: string;
      ptt?: boolean;
    },
  ) {
    const { number, mediatype, media, caption, fileName, ptt } = params;
    try {
      // Áudio (especialmente PTT) usa endpoint dedicado — sendMedia genérico
      // não suporta a flag ptt na Evolution v2.
      if (mediatype === 'audio') {
        const response = await client.post(
          `/message/sendWhatsAppAudio/${instanceName}`,
          { number, audio: media, delay: 1200, encoding: !!ptt },
          { headers: this.headers },
        );
        return response.data;
      }

      const response = await client.post(
        `/message/sendMedia/${instanceName}`,
        {
          number,
          mediatype,
          media,
          caption,
          fileName: fileName || (mediatype === 'document' ? 'file' : undefined),
          delay: 1200,
        },
        { headers: this.headers },
      );
      return response.data;
    } catch (error: any) {
      const detail = error.response?.data;
      console.error('Error sending media:', detail || error.message);
      const msg = detail?.message || detail?.response?.message || error.message || 'Failed to send media';
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  }

  /**
   * Dispara indicador de presença ("composing"/"recording"/"available") no chat.
   * Não enfileirado: presence é leve e tem que aparecer rápido pro lead ver
   * "digitando..." enquanto o LLM/agente processa a resposta real.
   *
   * Evolution v2 aceita: composing, recording, paused, available, unavailable.
   * O `delay` (ms) controla quanto tempo o estado dura antes de cair sozinho.
   */
  static async sendPresence(
    instanceName: string,
    number: string,
    presence: 'composing' | 'recording' | 'paused' | 'available' | 'unavailable',
    delayMs?: number,
  ) {
    try {
      const response = await client.post(
        `/chat/sendPresence/${instanceName}`,
        { number, presence, delay: delayMs ?? 3000 },
        { headers: this.headers },
      );
      return response.data;
    } catch (error: any) {
      const detail = error.response?.data;
      console.error('Error sending presence:', detail || error.message);
      throw new Error(detail?.message || error.message || 'Failed to send presence');
    }
  }
}
