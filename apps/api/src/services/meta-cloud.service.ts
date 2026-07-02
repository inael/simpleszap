// MetaCloudService — provider "meta_cloud" (WhatsApp Cloud API oficial da Meta).
// Diferente de Evolution/WAHA: não há sessão nem QR — o número já está
// provisionado na Meta (Business verificado + WABA + phone_number_id + token).
// A config por instância vive em Instance.providerConfig:
//   { phoneNumberId, wabaId?, accessToken, verifyToken? }
// O token é um System User token (permanente) com escopo whatsapp_business_messaging.

const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || 'v21.0'}`;

export interface MetaConfig {
  phoneNumberId?: string;
  wabaId?: string;
  accessToken?: string;
  verifyToken?: string;
}

function cfgOf(providerConfig: any): MetaConfig {
  const c = (providerConfig || {}) as MetaConfig;
  return c;
}

async function graph(cfg: MetaConfig, path: string, body: any): Promise<any> {
  const res = await fetch(`${GRAPH}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  if (!res.ok) {
    const msg = json?.error?.message || text || `HTTP ${res.status}`;
    throw new Error(`Meta ${path} -> ${res.status}: ${String(msg).slice(0, 200)}`);
  }
  return json;
}

export class MetaCloudService {
  static configured(providerConfig: any): boolean {
    const c = cfgOf(providerConfig);
    return !!c.accessToken && !!c.phoneNumberId;
  }

  static async sendText(providerConfig: any, number: string, text: string) {
    const c = cfgOf(providerConfig);
    if (!MetaCloudService.configured(c)) throw new Error('Instância Meta sem accessToken/phoneNumberId.');
    return graph(c, `/${c.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      to: number,
      type: 'text',
      text: { body: text, preview_url: true },
    });
  }

  // media aceita URL pública (link) — Cloud API baixa e entrega. Base64 não é
  // suportado direto (exigiria upload prévio via /media); por ora só link.
  static async sendMedia(
    providerConfig: any,
    params: { number: string; mediatype: 'image' | 'video' | 'audio' | 'document'; media: string; caption?: string; fileName?: string },
  ) {
    const c = cfgOf(providerConfig);
    if (!MetaCloudService.configured(c)) throw new Error('Instância Meta sem accessToken/phoneNumberId.');
    const { number, mediatype, media, caption, fileName } = params;
    const obj: any = { link: media };
    if (caption && (mediatype === 'image' || mediatype === 'video' || mediatype === 'document')) obj.caption = caption;
    if (fileName && mediatype === 'document') obj.filename = fileName;
    return graph(c, `/${c.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      to: number,
      type: mediatype,
      [mediatype]: obj,
    });
  }

  // Marca a mensagem recebida como lida (opcional, melhora a UX do cliente).
  static async markRead(providerConfig: any, messageId: string) {
    const c = cfgOf(providerConfig);
    if (!MetaCloudService.configured(c)) return null;
    return graph(c, `/${c.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }).catch(() => null);
  }
}
