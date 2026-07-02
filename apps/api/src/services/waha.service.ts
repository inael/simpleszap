// WahaService — adapter do provider WAHA (https://waha.devlike.pro/).
// Engine WEBJS (Chromium real) recebe midia grande que a Evolution/Baileys dropa.
// Espelha o EvolutionService: as chamadas HTTP mudam, mas o SimplesZap normaliza
// tudo pros mesmos eventos canonicos (ver waha-webhook.controller), entao o
// n8n/SDR nao muda. Uma instancia WAHA no SimplesZap = uma "session" no WAHA.

const WAHA_BASE = (process.env.WAHA_BASE_URL || '').replace(/\/$/, '');
const WAHA_KEY = process.env.WAHA_API_KEY || '';

function headers() {
  return { 'X-Api-Key': WAHA_KEY, 'Content-Type': 'application/json' };
}

// numero E.164 BR (sem +) -> chatId do WAHA
function toChatId(number: string): string {
  const digits = String(number || '').replace(/\D/g, '');
  return `${digits}@c.us`;
}

async function req(method: string, path: string, body?: any): Promise<any> {
  const res = await fetch(`${WAHA_BASE}${path}`, {
    method,
    headers: headers(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  if (!res.ok) {
    const msg = json?.message || json?.error || text || `HTTP ${res.status}`;
    throw new Error(`WAHA ${method} ${path} -> ${res.status}: ${String(msg).slice(0, 200)}`);
  }
  return json;
}

export class WahaService {
  static configured(): boolean {
    return !!WAHA_BASE && !!WAHA_KEY;
  }

  // Cria (e inicia) a sessao ja apontando o webhook pro SimplesZap.
  static async createSession(sessionName: string, webhookUrl: string) {
    return req('POST', '/api/sessions', {
      name: sessionName,
      start: true,
      config: {
        webhooks: [
          {
            url: webhookUrl,
            // eventos que o adapter (waha-webhook.controller) sabe traduzir
            events: ['message', 'session.status'],
          },
        ],
      },
    });
  }

  // Atualiza o webhook de uma sessao existente (idempotente).
  static async setWebhook(sessionName: string, webhookUrl: string) {
    return req('PUT', `/api/sessions/${encodeURIComponent(sessionName)}`, {
      config: {
        webhooks: [{ url: webhookUrl, events: ['message', 'session.status'] }],
      },
    });
  }

  static async getStatus(sessionName: string) {
    return req('GET', `/api/sessions/${encodeURIComponent(sessionName)}`);
  }

  // QR pra parear. Retorna { base64 } (data URL) pro front exibir, no mesmo
  // espirito do connectInstance da Evolution.
  static async getQr(sessionName: string): Promise<{ base64: string }> {
    const res = await fetch(
      `${WAHA_BASE}/api/${encodeURIComponent(sessionName)}/auth/qr?format=image`,
      { headers: { 'X-Api-Key': WAHA_KEY } }
    );
    if (!res.ok) throw new Error(`WAHA getQr ${sessionName} -> ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return { base64: `data:image/png;base64,${buf.toString('base64')}` };
  }

  // Reinicia a sessão (recria a página do Chromium). Usado pra recuperar de
  // FAILED — o WEBJS às vezes crasha a página (TargetCloseError) em VPS apertada.
  static async restartSession(sessionName: string) {
    return req('POST', `/api/sessions/${encodeURIComponent(sessionName)}/restart`, {});
  }

  static async deleteSession(sessionName: string) {
    try {
      await req('POST', `/api/sessions/${encodeURIComponent(sessionName)}/stop`, {});
    } catch { /* pode ja estar parada */ }
    return req('DELETE', `/api/sessions/${encodeURIComponent(sessionName)}`);
  }

  static async sendText(sessionName: string, number: string, text: string) {
    return req('POST', '/api/sendText', {
      session: sessionName,
      chatId: toChatId(number),
      text,
    });
  }

  // media: { url? , data? (base64 sem prefixo), mimetype?, filename?, mediatype?, ptt? }
  static async sendMedia(
    sessionName: string,
    number: string,
    media: { url?: string; data?: string; mimetype?: string; filename?: string; mediatype?: string; ptt?: boolean; caption?: string }
  ) {
    const chatId = toChatId(number);
    const file: any = {};
    if (media.url) file.url = media.url;
    if (media.data) file.data = media.data;
    if (media.mimetype) file.mimetype = media.mimetype;
    if (media.filename) file.filename = media.filename;

    const kind = (media.mediatype || '').toLowerCase();
    let endpoint = '/api/sendFile';
    if (kind === 'audio' || media.ptt) endpoint = '/api/sendVoice';
    else if (kind === 'image') endpoint = '/api/sendImage';
    else if (kind === 'video') endpoint = '/api/sendVideo';

    const body: any = { session: sessionName, chatId, file };
    if (media.caption && endpoint !== '/api/sendVoice') body.caption = media.caption;
    return req('POST', endpoint, body);
  }

  static async sendPresence(sessionName: string, number: string, presence: string) {
    const chatId = toChatId(number);
    const active = presence === 'composing' || presence === 'recording';
    return req('POST', active ? '/api/startTyping' : '/api/stopTyping', {
      session: sessionName,
      chatId,
    });
  }
}
