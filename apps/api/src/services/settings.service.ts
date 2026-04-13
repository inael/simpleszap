import { prisma } from '../lib/prisma';

// Known setting keys
export const SETTING_KEYS = {
  ASAAS_API_KEY: 'asaas_api_key',
  ASAAS_API_URL: 'asaas_api_url',
  ASAAS_ENVIRONMENT: 'asaas_environment',
  ASAAS_WEBHOOK_TOKEN: 'asaas_webhook_token',
  ASAAS_WEBHOOK_URL: 'asaas_webhook_url',
} as const;

// Mapping from DB key to env var fallback
const ENV_FALLBACKS: Record<string, string[]> = {
  [SETTING_KEYS.ASAAS_API_KEY]: ['ASAAS_API_KEY', 'ASAS_APT_KEY'],
  [SETTING_KEYS.ASAAS_API_URL]: ['ASAAS_API_URL', 'ASAS_APT_URL'],
  [SETTING_KEYS.ASAAS_ENVIRONMENT]: ['ASAAS_ENVIRONMENT'],
  [SETTING_KEYS.ASAAS_WEBHOOK_TOKEN]: ['ASAAS_WEBHOOK_TOKEN', 'ASAAS_WEBHOOK_ACCESS_TOKEN'],
  [SETTING_KEYS.ASAAS_WEBHOOK_URL]: [],
};

// In-memory cache to avoid DB hits on every request
let cache: Record<string, string> = {};
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

export class SettingsService {
  /**
   * Get a single setting value. Tries DB first, then env var fallback.
   */
  static async get(key: string): Promise<string | null> {
    // Try cache first
    if (Date.now() - cacheTimestamp < CACHE_TTL_MS && key in cache) {
      return cache[key] || null;
    }

    try {
      const row = await prisma.systemSetting.findUnique({ where: { key } });
      if (row?.value) {
        cache[key] = row.value;
        return row.value;
      }
    } catch {
      // DB might not have the table yet (migration pending) — fall through to env
    }

    // Fallback to env vars
    const envKeys = ENV_FALLBACKS[key] || [];
    for (const envKey of envKeys) {
      if (process.env[envKey]) {
        return process.env[envKey]!;
      }
    }

    return null;
  }

  /**
   * Get multiple settings at once (batch).
   */
  static async getMany(keys: string[]): Promise<Record<string, string | null>> {
    const result: Record<string, string | null> = {};

    try {
      const rows = await prisma.systemSetting.findMany({
        where: { key: { in: keys } }
      });
      for (const row of rows) {
        result[row.key] = row.value;
        cache[row.key] = row.value;
      }
      cacheTimestamp = Date.now();
    } catch {
      // DB not available — use env fallbacks
    }

    // Fill missing with env fallbacks
    for (const key of keys) {
      if (!result[key]) {
        const envKeys = ENV_FALLBACKS[key] || [];
        for (const envKey of envKeys) {
          if (process.env[envKey]) {
            result[key] = process.env[envKey]!;
            break;
          }
        }
        if (!result[key]) result[key] = null;
      }
    }

    return result;
  }

  /**
   * Set a single setting value (upsert).
   */
  static async set(key: string, value: string): Promise<void> {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    cache[key] = value;
    cacheTimestamp = Date.now();
  }

  /**
   * Set multiple settings at once.
   */
  static async setMany(settings: Record<string, string>): Promise<void> {
    const ops = Object.entries(settings).map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    );
    await prisma.$transaction(ops);
    Object.assign(cache, settings);
    cacheTimestamp = Date.now();
  }

  /**
   * Delete a setting.
   */
  static async delete(key: string): Promise<void> {
    await prisma.systemSetting.delete({ where: { key } }).catch(() => {});
    delete cache[key];
  }

  /**
   * Get all Asaas-related settings (for admin UI).
   */
  static async getAsaasConfig() {
    const keys = Object.values(SETTING_KEYS);
    const values = await this.getMany(keys);

    return {
      apiKey: values[SETTING_KEYS.ASAAS_API_KEY] || null,
      apiUrl: values[SETTING_KEYS.ASAAS_API_URL] || null,
      environment: values[SETTING_KEYS.ASAAS_ENVIRONMENT] || null,
      webhookToken: values[SETTING_KEYS.ASAAS_WEBHOOK_TOKEN] || null,
      webhookUrl: values[SETTING_KEYS.ASAAS_WEBHOOK_URL] || null,
    };
  }

  /** Clear in-memory cache */
  static clearCache() {
    cache = {};
    cacheTimestamp = 0;
  }
}
