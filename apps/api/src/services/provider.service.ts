// ProviderService — dispatcher multi-backend do SimplesZap.
// Uma instância tem um `provider` (evolution | waha | meta_cloud). Este módulo
// é o ÚNICO ponto que decide, na hora de agir (criar sessão, QR, enviar), qual
// backend chamar. Assim os controllers (instance/message-queue/campaigns) não
// espalham `if provider === ...`. O nome da sessão/instância no backend vive
// sempre em `evolutionInstanceName` (herdado do modelo antigo, serve pros 3).

import { EvolutionService } from './evolution.service';
import { WahaService } from './waha.service';
import { MetaCloudService } from './meta-cloud.service';

export type ProviderName = 'evolution' | 'waha' | 'meta_cloud';

export interface ProviderInstance {
  id: string;
  provider?: string | null;
  evolutionInstanceName?: string | null;
  providerConfig?: any;
}

// Base do webhook do WAHA no SimplesZap (adapter waha-webhook.controller).
const WAHA_WEBHOOK_BASE =
  process.env.SIMPLESZAP_WAHA_WEBHOOK_BASE_URL ||
  'https://back.simpleszap.com/api/webhooks/waha';

export function providerOf(i: ProviderInstance | { provider?: string | null }): ProviderName {
  const p = String((i as any)?.provider || 'evolution').toLowerCase();
  if (p === 'waha' || p === 'meta_cloud') return p;
  return 'evolution';
}

// Nome da sessão/instância no backend. Fallback pro id puro cobre instâncias
// criadas antes da coluna evolutionInstanceName existir.
export function backendNameOf(i: ProviderInstance): string {
  return i.evolutionInstanceName || i.id;
}

function ensureConfigured(provider: ProviderName) {
  if (provider === 'waha' && !WahaService.configured()) {
    throw new Error('WAHA não configurado (defina WAHA_BASE_URL e WAHA_API_KEY).');
  }
}

type SendMediaParams = {
  number: string;
  mediatype: 'image' | 'video' | 'document' | 'audio';
  media: string;
  caption?: string;
  fileName?: string;
  ptt?: boolean;
};

export class ProviderService {
  static supported(provider: string): boolean {
    return provider === 'evolution' || provider === 'waha' || provider === 'meta_cloud';
  }

  /**
   * Provisiona a instância/sessão no backend escolhido. Recebe o nome já
   * construído (buildInstanceName) e, no WAHA, já aponta o webhook pro SimplesZap.
   * Retorna { token? } pra persistir (Evolution devolve apikey da instância).
   */
  static async createBackend(
    provider: ProviderName,
    backendName: string,
  ): Promise<{ token?: string; raw?: any }> {
    ensureConfigured(provider);
    if (provider === 'waha') {
      const raw = await WahaService.createSession(backendName, `${WAHA_WEBHOOK_BASE}/${backendName}`);
      return { raw };
    }
    if (provider === 'meta_cloud') {
      // Meta Cloud não tem "sessão" — o número já está provisionado na Meta.
      // Nada a criar no backend; a config vem em providerConfig (Stage 3).
      return { raw: null };
    }
    const raw = await EvolutionService.createInstance(backendName);
    return { token: raw?.hash?.apikey || raw?.token, raw };
  }

  /**
   * QR + estado, normalizado pro shape que a Evolution já devolvia
   * ({ base64, qrcode:{base64}, instance:{state} }) — o front não muda.
   */
  static async getQr(instance: ProviderInstance): Promise<any> {
    const provider = providerOf(instance);
    const name = backendNameOf(instance);
    ensureConfigured(provider);
    if (provider === 'waha') {
      let st = '';
      try {
        const s = await WahaService.getStatus(name);
        st = String(s?.status || '').toUpperCase();
      } catch { /* sessão pode ainda não existir */ }
      if (st === 'WORKING') return { base64: null, qrcode: { base64: null }, instance: { state: 'open' } };
      // WEBJS (Chromium) às vezes crasha e a sessão vai pra FAILED — o QR fica
      // indisponível (500). Auto-recupera: reinicia e espera voltar pro QR.
      if (st === 'FAILED' || st === 'STOPPED' || st === '') {
        await WahaService.restartSession(name).catch(() => null);
        for (let i = 0; i < 6; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          try {
            const s = await WahaService.getStatus(name);
            const cur = String(s?.status || '').toUpperCase();
            if (cur === 'SCAN_QR_CODE' || cur === 'WORKING') { st = cur; break; }
          } catch { /* ainda subindo */ }
        }
        if (st === 'WORKING') return { base64: null, qrcode: { base64: null }, instance: { state: 'open' } };
      }
      const qr = await WahaService.getQr(name);
      return { base64: qr.base64, qrcode: { base64: qr.base64 }, instance: { state: 'connecting' } };
    }
    if (provider === 'meta_cloud') {
      // Número oficial não parea por QR — já conectado.
      return { base64: null, qrcode: { base64: null }, instance: { state: 'open' } };
    }
    return EvolutionService.connectInstance(name);
  }

  static async deleteBackend(instance: ProviderInstance): Promise<void> {
    const provider = providerOf(instance);
    const name = backendNameOf(instance);
    if (provider === 'waha') {
      await WahaService.deleteSession(name).catch((e: any) =>
        console.warn('WAHA delete failed (continuing):', e?.message),
      );
      return;
    }
    if (provider === 'meta_cloud') return; // nada a deletar no backend
    await EvolutionService.deleteInstance(name).catch((e: any) =>
      console.warn('Evolution delete failed (continuing):', e?.message),
    );
  }

  static async sendText(instance: ProviderInstance, number: string, text: string): Promise<any> {
    const provider = providerOf(instance);
    const name = backendNameOf(instance);
    ensureConfigured(provider);
    if (provider === 'waha') return WahaService.sendText(name, number, text);
    if (provider === 'meta_cloud') return MetaCloudService.sendText(instance.providerConfig, number, text);
    return EvolutionService.sendText(name, number, text);
  }

  static async sendMedia(instance: ProviderInstance, params: SendMediaParams): Promise<any> {
    const provider = providerOf(instance);
    const name = backendNameOf(instance);
    ensureConfigured(provider);
    if (provider === 'waha') {
      return WahaService.sendMedia(name, params.number, {
        url: params.media?.startsWith('http') ? params.media : undefined,
        data: params.media?.startsWith('http') ? undefined : params.media.replace(/^data:[^,]+,/, ''),
        mimetype: undefined,
        filename: params.fileName,
        mediatype: params.mediatype,
        ptt: params.ptt,
        caption: params.caption,
      });
    }
    if (provider === 'meta_cloud') {
      // Cloud API entrega mídia por URL pública (link). Base64 exigiria upload prévio.
      return MetaCloudService.sendMedia(instance.providerConfig, {
        number: params.number,
        mediatype: params.mediatype,
        media: params.media,
        caption: params.caption,
        fileName: params.fileName,
      });
    }
    return EvolutionService.sendMedia(name, params);
  }

  static async sendButtons(instance: ProviderInstance, payload: Record<string, unknown>): Promise<any> {
    const provider = providerOf(instance);
    const name = backendNameOf(instance);
    if (provider === 'waha') {
      // WAHA/WhatsApp não entrega botões de forma confiável; degrada pra texto.
      const text = (payload as any)?.text || (payload as any)?.title || (payload as any)?.description;
      const number = (payload as any)?.number;
      if (text && number) return WahaService.sendText(name, String(number), String(text));
      throw new Error('Botões não são suportados no provider WAHA.');
    }
    if (provider === 'meta_cloud') {
      // Cloud API tem interactive/buttons com shape próprio; degrada pra texto por ora.
      const text = (payload as any)?.text || (payload as any)?.title || (payload as any)?.description;
      const number = (payload as any)?.number;
      if (text && number) return MetaCloudService.sendText(instance.providerConfig, String(number), String(text));
      throw new Error('Botões interativos ainda não implementados no provider Meta oficial.');
    }
    return EvolutionService.sendButtons(name, payload);
  }

  static async sendPresence(
    instance: ProviderInstance,
    number: string,
    presence: 'composing' | 'recording' | 'paused' | 'available' | 'unavailable',
    delayMs?: number,
  ): Promise<any> {
    const provider = providerOf(instance);
    const name = backendNameOf(instance);
    ensureConfigured(provider);
    if (provider === 'waha') return WahaService.sendPresence(name, number, presence);
    if (provider === 'meta_cloud') return { ok: true, skipped: 'meta_cloud não tem presença' };
    return EvolutionService.sendPresence(name, number, presence, delayMs);
  }
}
