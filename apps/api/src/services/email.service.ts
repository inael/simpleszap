// Wrapper para SimplesMail (api.simplesmail.itbooster.com.br) — drop-in Resend.
// Em dev sem SIMPLESMAIL_API_KEY, loga no console em vez de enviar.

const API_BASE = process.env.SIMPLESMAIL_API_BASE || 'https://api.simplesmail.itbooster.com.br';
const API_KEY = process.env.SIMPLESMAIL_API_KEY || process.env.SIMPLESMAIL_SIMPLESZAP_API_KEY || '';
// SimplesMail aceita email puro em "from" + "fromName" separado (não suporta "Name <email>").
const FROM = process.env.SIMPLESMAIL_FROM || 'noreply@simplesmail.itbooster.com.br';
const FROM_NAME = process.env.SIMPLESMAIL_FROM_NAME || 'SimplesZap';
const REPLY_TO = process.env.SIMPLESMAIL_REPLY_TO || 'inael@itbooster.com.br';

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  tags?: { name: string; value: string }[];
};

export type SendEmailResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
};

export class EmailService {
  static isConfigured(): boolean {
    return !!API_KEY;
  }

  static async send(input: SendEmailInput): Promise<SendEmailResult> {
    if (!API_KEY) {
      console.log(`[EMAIL DRY-RUN] to=${input.to} subject=${input.subject} (sem SIMPLESMAIL_API_KEY)`);
      return { ok: true, messageId: 'dry-run' };
    }

    try {
      const res = await fetch(`${API_BASE}/v1/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM,
          fromName: FROM_NAME,
          to: input.to,
          subject: input.subject,
          html: input.html,
          text: input.text,
          replyTo: REPLY_TO,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
      }

      const data: any = await res.json().catch(() => ({}));
      return { ok: true, messageId: data?.id };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'send failed' };
    }
  }
}
