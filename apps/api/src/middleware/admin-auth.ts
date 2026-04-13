import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { verifyLogtoToken } from '../lib/logto';

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authorization = req.headers['authorization'] as string | undefined;
  const bearer = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;

  if (!bearer) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }

  const auth = await verifyLogtoToken(bearer);
  if (!auth?.sub) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }

  // Check 1: roles claim in token contains "admin"
  if (auth.roles && auth.roles.includes('admin')) {
    (req as any).adminUser = { logtoId: auth.sub, role: 'admin' };
    return next();
  }

  // Check 2: fallback — SIMPLESZAP_ADMIN_EMAIL against DB email
  const configured = (process.env.SIMPLESZAP_ADMIN_EMAIL || '').trim();
  if (configured) {
    const allowed = new Set(
      configured
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    );
    try {
      const user = await prisma.user.findUnique({ where: { logtoId: auth.sub } });
      const email = String(user?.email || '').toLowerCase();
      const ok = !!email && allowed.has(email);
      if (ok) {
        (req as any).adminUser = { logtoId: auth.sub, role: 'admin' };
        return next();
      }
    } catch (e: any) {
      console.error('requireAdmin: DB lookup failed:', e);
      return res.status(500).json({ error: e?.message || 'Erro interno de autenticação' });
    }
  }

  return res.status(403).json({ error: 'Acesso restrito a administradores' });
}
