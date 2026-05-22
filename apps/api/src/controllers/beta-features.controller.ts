import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { BETA_FEATURES, getBetaFeature } from '../lib/beta-features';

export class BetaFeaturesController {
  /** GET /me/beta-features — lista features + status de aceitação do user */
  static async list(req: Request, res: Response) {
    const userId = req.headers['x-user-id'] as string | undefined;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({ where: { logtoId: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const acceptances = await prisma.betaFeatureAcceptance.findMany({
      where: { userId: user.id, revokedAt: null },
    });
    const accMap = new Map(acceptances.map((a) => [a.featureKey, a]));

    const features = Object.values(BETA_FEATURES).map((f) => {
      const acc = accMap.get(f.key);
      // Aceitação só vale se for da versão atual dos termos.
      const accepted = !!acc && acc.termsVersion === f.termsVersion;
      return {
        key: f.key,
        label: f.label,
        description: f.description,
        available: f.available,
        termsVersion: f.termsVersion,
        termsMarkdown: f.termsMarkdown,
        accepted,
        acceptedAt: accepted ? acc!.acceptedAt : null,
      };
    });

    res.json({ features });
  }

  /** POST /me/beta-features — body { featureKey, termsVersion } */
  static async accept(req: Request, res: Response) {
    const userId = req.headers['x-user-id'] as string | undefined;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { featureKey, termsVersion } = req.body || {};
    if (!featureKey || !termsVersion) {
      return res.status(400).json({ error: 'featureKey and termsVersion are required' });
    }
    const feature = getBetaFeature(featureKey);
    if (!feature) return res.status(404).json({ error: 'Feature not found' });
    if (!feature.available) return res.status(400).json({ error: 'Feature not available yet' });
    if (feature.termsVersion !== termsVersion) {
      return res.status(409).json({
        error: 'Terms version mismatch — please refresh and accept the current version',
        currentVersion: feature.termsVersion,
      });
    }

    const user = await prisma.user.findUnique({ where: { logtoId: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const acc = await prisma.betaFeatureAcceptance.upsert({
      where: { userId_featureKey: { userId: user.id, featureKey } },
      update: { termsVersion, acceptedAt: new Date(), revokedAt: null },
      create: { userId: user.id, featureKey, termsVersion },
    });
    res.json({ accepted: true, acceptedAt: acc.acceptedAt });
  }

  /** DELETE /me/beta-features/:featureKey — revoga (não apaga, marca revokedAt) */
  static async revoke(req: Request, res: Response) {
    const userId = req.headers['x-user-id'] as string | undefined;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { featureKey } = req.params;
    const user = await prisma.user.findUnique({ where: { logtoId: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await prisma.betaFeatureAcceptance.updateMany({
      where: { userId: user.id, featureKey, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    res.json({ revoked: true });
  }

  /**
   * Helper pra outros controllers: lança erro 403 se user não aceitou
   * a feature. Retorna true se OK pra prosseguir.
   */
  static async requireAccepted(orgId: string, featureKey: string, res: Response): Promise<boolean> {
    const feature = getBetaFeature(featureKey);
    if (!feature || !feature.available) {
      res.status(404).json({ error: { code: 'BETA_FEATURE_NOT_AVAILABLE', message: 'Feature beta indisponível.' } });
      return false;
    }
    const user = await prisma.user.findUnique({ where: { logtoId: orgId } });
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return false;
    }
    const acc = await prisma.betaFeatureAcceptance.findUnique({
      where: { userId_featureKey: { userId: user.id, featureKey } },
    });
    const ok = !!acc && !acc.revokedAt && acc.termsVersion === feature.termsVersion;
    if (!ok) {
      res.status(403).json({
        error: {
          code: 'BETA_FEATURE_NOT_ACCEPTED',
          message: `Aceite os termos de "${feature.label}" em Configurações → Beta antes de usar este recurso.`,
          featureKey,
          termsVersion: feature.termsVersion,
        },
      });
      return false;
    }
    return true;
  }
}
