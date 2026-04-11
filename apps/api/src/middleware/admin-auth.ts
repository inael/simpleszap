import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { prisma } from '../lib/prisma';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);

  if (!auth?.userId) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }

  const configured = (process.env.CLERK_ADMIN_EMAIL || process.env.SIMPLESZAP_ADMIN_EMAIL || '').trim();
  if (configured) {
    const allowed = new Set(
      configured
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    );
    Promise.resolve(
      (async () => {
        const user = await prisma.user.findUnique({ where: { clerkId: auth.userId! } });
        const email = String(user?.email || '').toLowerCase();
        const ok = !!email && allowed.has(email);
        if (!ok) {
          res.status(403).json({ error: 'Acesso restrito a administradores' });
          return;
        }
        (req as any).adminUser = { clerkId: auth.userId, role: 'admin' };
        next();
      })(),
    ).catch((e) => {
      res.status(500).json({ error: e?.message || 'Erro' });
    });
    return;
  }

  const legacyRole = (auth.sessionClaims as any)?.metadata?.role;
  const isAdmin = legacyRole === 'admin';

  if (!isAdmin) {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }

  (req as any).adminUser = { clerkId: auth.userId, role: 'admin' };
  next();
}
