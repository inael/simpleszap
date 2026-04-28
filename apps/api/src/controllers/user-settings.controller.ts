import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { getOrCreateSettings, hashClientToken } from '../services/user-settings.service';

export class UserSettingsController {
  static async get(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string | undefined;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const orgId = req.headers['x-org-id'] as string;
      if (!orgId) return res.status(400).json({ error: 'orgId required' });

      const s = await getOrCreateSettings(orgId);
      res.json({
        campaignJitterMinMs: s.campaignJitterMinMs,
        campaignJitterMaxMs: s.campaignJitterMaxMs,
        messageVariantA: s.messageVariantA,
        messageVariantB: s.messageVariantB,
        messageVariantC: s.messageVariantC,
        useMessageVariants: s.useMessageVariants,
        ipAllowlist: s.ipAllowlist ? JSON.parse(s.ipAllowlist) : [],
        requireClientToken: s.requireClientToken,
        hasClientToken: !!s.clientTokenHash,
        bulkMessagingTermsAcceptedAt: s.bulkMessagingTermsAcceptedAt,
      });
    } catch (e: any) {
      console.error('user-settings.get', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  }

  static async put(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string | undefined;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const orgId = req.headers['x-org-id'] as string;
      if (!orgId) return res.status(400).json({ error: 'orgId required' });

      const {
        campaignJitterMinMs,
        campaignJitterMaxMs,
        messageVariantA,
        messageVariantB,
        messageVariantC,
        useMessageVariants,
        ipAllowlist,
      } = req.body;

      await getOrCreateSettings(orgId);

      const min = Number(campaignJitterMinMs);
      const max = Number(campaignJitterMaxMs);
      if (Number.isFinite(min) && Number.isFinite(max) && (min < 200 || max > 120000 || min > max)) {
        return res.status(400).json({ error: 'Intervalo inválido: use 200ms–120000ms e min ≤ max' });
      }

      let ipField: string | null | undefined;
      if (Array.isArray(ipAllowlist)) {
        const cleaned = ipAllowlist.map((x: string) => String(x).trim()).filter(Boolean);
        ipField = cleaned.length ? JSON.stringify(cleaned) : null;
      }

      const updated = await prisma.userSettings.update({
        where: { orgId },
        data: {
          ...(Number.isFinite(min) ? { campaignJitterMinMs: Math.floor(min) } : {}),
          ...(Number.isFinite(max) ? { campaignJitterMaxMs: Math.floor(max) } : {}),
          ...(messageVariantA !== undefined ? { messageVariantA: messageVariantA || null } : {}),
          ...(messageVariantB !== undefined ? { messageVariantB: messageVariantB || null } : {}),
          ...(messageVariantC !== undefined ? { messageVariantC: messageVariantC || null } : {}),
          ...(typeof useMessageVariants === 'boolean' ? { useMessageVariants } : {}),
          ...(ipField !== undefined ? { ipAllowlist: ipField } : {}),
        },
      });

      res.json({
        campaignJitterMinMs: updated.campaignJitterMinMs,
        campaignJitterMaxMs: updated.campaignJitterMaxMs,
        messageVariantA: updated.messageVariantA,
        messageVariantB: updated.messageVariantB,
        messageVariantC: updated.messageVariantC,
        useMessageVariants: updated.useMessageVariants,
        ipAllowlist: updated.ipAllowlist ? JSON.parse(updated.ipAllowlist) : [],
        requireClientToken: updated.requireClientToken,
        hasClientToken: !!updated.clientTokenHash,
        bulkMessagingTermsAcceptedAt: updated.bulkMessagingTermsAcceptedAt,
      });
    } catch (e: any) {
      console.error('user-settings.put', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  }

  static async acceptTerms(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string | undefined;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const orgId = req.headers['x-org-id'] as string;
      if (!orgId) return res.status(400).json({ error: 'orgId required' });

      await getOrCreateSettings(orgId);
      const updated = await prisma.userSettings.update({
        where: { orgId },
        data: { bulkMessagingTermsAcceptedAt: new Date() },
      });
      res.json({ bulkMessagingTermsAcceptedAt: updated.bulkMessagingTermsAcceptedAt });
    } catch (e: any) {
      console.error('user-settings.acceptTerms', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  }

  static async regenerateClientToken(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string | undefined;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const orgId = req.headers['x-org-id'] as string;
      if (!orgId) return res.status(400).json({ error: 'orgId required' });

      await getOrCreateSettings(orgId);
      const plain = `sz_ct_${crypto.randomBytes(24).toString('hex')}`;
      const hash = hashClientToken(plain);
      await prisma.userSettings.update({
        where: { orgId },
        data: { clientTokenHash: hash, requireClientToken: true },
      });
      res.json({ token: plain, message: 'Guarde este token em local seguro. Ele não será exibido novamente.' });
    } catch (e: any) {
      console.error('user-settings.regenerateClientToken', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  }

  static async disableClientToken(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string | undefined;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const orgId = req.headers['x-org-id'] as string;
      if (!orgId) return res.status(400).json({ error: 'orgId required' });

      await getOrCreateSettings(orgId);
      await prisma.userSettings.update({
        where: { orgId },
        data: { clientTokenHash: null, requireClientToken: false },
      });
      res.json({ success: true });
    } catch (e: any) {
      console.error('user-settings.disableClientToken', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  }
}
