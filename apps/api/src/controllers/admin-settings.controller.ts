import { Request, Response } from 'express';
import { SettingsService, SETTING_KEYS } from '../services/settings.service';
import { AsaasService } from '../services/asaas.service';
import crypto from 'crypto';

export class AdminSettingsController {
  static async get(req: Request, res: Response) {
    const asaas = await SettingsService.getAsaasConfig();

    res.json({
      evolutionApiUrl: process.env.EVOLUTION_API_URL ? '***configurado***' : 'não configurado',
      maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
      defaultPlanId: process.env.DEFAULT_PLAN_ID || 'free',
      asaas: {
        apiKey: asaas.apiKey ? '***' + asaas.apiKey.slice(-8) : null,
        apiUrl: asaas.apiUrl,
        environment: asaas.environment,
        webhookToken: asaas.webhookToken ? '***' + asaas.webhookToken.slice(-8) : null,
        webhookUrl: asaas.webhookUrl,
        isConfigured: !!asaas.apiKey,
      },
    });
  }

  static async update(req: Request, res: Response) {
    // MVP: configurações são baseadas em env vars
    // Futuramente pode-se criar um model SystemSettings no Prisma
    res.json({ message: 'Configurações atualizadas' });
  }

  // ─── Asaas Settings ────────────────────────────────────────────────

  static async getAsaasConfig(_req: Request, res: Response) {
    try {
      const config = await SettingsService.getAsaasConfig();
      res.json({
        apiKey: config.apiKey ? '***' + config.apiKey.slice(-8) : null,
        apiUrl: config.apiUrl,
        environment: config.environment,
        webhookToken: config.webhookToken ? '***' + config.webhookToken.slice(-8) : null,
        webhookUrl: config.webhookUrl,
        isConfigured: !!config.apiKey,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async saveAsaasConfig(req: Request, res: Response) {
    const { apiKey, apiUrl, environment, webhookToken, webhookUrl } = req.body;

    try {
      const settings: Record<string, string> = {};

      if (apiKey && apiKey !== '') settings[SETTING_KEYS.ASAAS_API_KEY] = apiKey;
      if (apiUrl && apiUrl !== '') settings[SETTING_KEYS.ASAAS_API_URL] = apiUrl;
      if (environment) settings[SETTING_KEYS.ASAAS_ENVIRONMENT] = environment;
      if (webhookToken && webhookToken !== '') settings[SETTING_KEYS.ASAAS_WEBHOOK_TOKEN] = webhookToken;
      if (webhookUrl && webhookUrl !== '') settings[SETTING_KEYS.ASAAS_WEBHOOK_URL] = webhookUrl;

      if (Object.keys(settings).length === 0) {
        return res.status(400).json({ error: 'Nenhuma configuração fornecida' });
      }

      await SettingsService.setMany(settings);
      SettingsService.clearCache();

      res.json({ message: 'Configurações do Asaas salvas com sucesso' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async testAsaasConnection(_req: Request, res: Response) {
    try {
      const result = await AsaasService.testConnection();
      if (result.ok) {
        res.json({ ok: true, message: `Conexão OK. Saldo: R$ ${result.balance}` });
      } else {
        res.status(400).json({ ok: false, error: result.error });
      }
    } catch (error: any) {
      res.status(500).json({ ok: false, error: error.message });
    }
  }

  static async registerAsaasWebhook(req: Request, res: Response) {
    const { webhookUrl } = req.body;

    try {
      if (!webhookUrl) {
        return res.status(400).json({ error: 'URL do webhook é obrigatória' });
      }

      // Generate a secure token if not already set
      let token = await SettingsService.get(SETTING_KEYS.ASAAS_WEBHOOK_TOKEN);
      if (!token) {
        token = crypto.randomBytes(32).toString('hex');
        await SettingsService.set(SETTING_KEYS.ASAAS_WEBHOOK_TOKEN, token);
      }

      // Save the webhook URL
      await SettingsService.set(SETTING_KEYS.ASAAS_WEBHOOK_URL, webhookUrl);

      // Register on Asaas
      const result = await AsaasService.registerWebhook(webhookUrl, token);

      SettingsService.clearCache();

      res.json({
        message: 'Webhook registrado no Asaas com sucesso',
        webhookUrl,
        tokenPreview: '***' + token.slice(-8),
        asaasResponse: result,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getAsaasWebhookStatus(_req: Request, res: Response) {
    try {
      const config = await AsaasService.getWebhookConfig();
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async generateWebhookToken(_req: Request, res: Response) {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      await SettingsService.set(SETTING_KEYS.ASAAS_WEBHOOK_TOKEN, token);
      SettingsService.clearCache();
      res.json({ token, message: 'Token gerado. Registre o webhook novamente para aplicar.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
