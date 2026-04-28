import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { verifyClientToken } from '../services/user-settings.service';

function clientIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) {
    return xff.split(',')[0].trim();
  }
  const rip = req.socket?.remoteAddress;
  return rip || '';
}

function ipAllowed(allowlistJson: string | null, ip: string): boolean {
  if (!allowlistJson?.trim()) return true;
  try {
    const list = JSON.parse(allowlistJson) as string[];
    if (!Array.isArray(list) || list.length === 0) return true;
    return list.some((entry) => entry.trim() === ip);
  } catch {
    return true;
  }
}

/**
 * Depois de orgAuth: aplica restrição por IP e Client-Token em chamadas com API key.
 * JWT (dashboard) não exige Client-Token para não quebrar o fluxo do browser.
 */
export async function enforceSecurity(req: Request, res: Response, next: NextFunction) {
  const orgId = req.headers['x-org-id'] as string | undefined;
  if (!orgId) {
    return next();
  }

  try {
    const settings = await prisma.userSettings.findUnique({ where: { orgId } });
    if (!settings) {
      return next();
    }

    const ip = clientIp(req);
    if (!ipAllowed(settings.ipAllowlist, ip)) {
      return res.status(403).json({ error: 'IP não autorizado para esta conta' });
    }

    const auth = req.headers.authorization;
    const rawBearer = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
    const isApiKey = rawBearer.startsWith('sk_') || !!req.headers['x-api-key'];

    if (settings.requireClientToken && isApiKey) {
      const sent =
        (req.headers['client-token'] as string | undefined) ||
        (req.headers['Client-Token'] as string | undefined);
      if (!sent || !verifyClientToken(sent, settings.clientTokenHash)) {
        return res.status(401).json({
          error: 'Client-Token obrigatório ou inválido. Configure em Segurança no painel.',
        });
      }
    }

    return next();
  } catch (e) {
    console.error('enforceSecurity:', e);
    return next();
  }
}
