import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { verifyLogtoToken, fetchLogtoUser } from '../lib/logto';
import { EmailQueueService } from '../services/email-queue.service';

export async function orgAuth(req: Request, res: Response, next: NextFunction) {
  // Try Logto JWT from Authorization header
  const authorization = req.headers['authorization'] as string | undefined;
  const bearer = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;

  if (bearer && !/^(sk_|sz_)/.test(bearer)) {
    try {
      const auth = await verifyLogtoToken(bearer);
      if (auth?.sub) {
        req.headers['x-user-id'] = auth.sub;
        // No organizations in Logto for now — use user sub as org ID
        req.headers['x-org-id'] = auth.sub;

        // Lazy user creation: ensure user exists in DB. New users get a 7-day Pro trial.
        try {
          const existing = await prisma.user.findUnique({ where: { logtoId: auth.sub } });
          if (!existing) {
            // Access token usually doesn't carry email/name. Pull profile from Logto Management API.
            const profile = !auth.email ? await fetchLogtoUser(auth.sub) : null;
            const email = auth.email || profile?.primaryEmail || `${auth.sub}@logto.user`;
            const name = profile?.name || auth.email?.split('@')[0] || auth.sub;
            const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const created = await prisma.user.create({
              data: {
                logtoId: auth.sub,
                email,
                name,
                subscriptionPlanId: 'pro',
                trialEndsAt,
              },
            });
            console.log(`Lazy-created user ${email} (Pro trial until ${trialEndsAt.toISOString()})`);

            // Dispara sequência de onboarding (5 emails). Skipa email fake (`<sub>@logto.user`).
            if (!email.endsWith('@logto.user')) {
              EmailQueueService.enqueueOnboardingSequence({
                userId: created.id,
                userEmail: email,
                userName: name,
                trialEndsAt,
              }).catch((e) => console.error('enqueueOnboardingSequence failed:', e));
            }
          } else if (existing.email.endsWith('@logto.user')) {
            // Backfill: user criado anteriormente sem email real (Management API estava offline
            // ou JWT sem claim email). Tenta atualizar agora — barato e cura silenciosamente.
            const profile = !auth.email ? await fetchLogtoUser(auth.sub) : null;
            const realEmail = auth.email || profile?.primaryEmail;
            if (realEmail && realEmail !== existing.email) {
              const realName = profile?.name || existing.name || realEmail.split('@')[0];
              await prisma.user.update({
                where: { logtoId: auth.sub },
                data: { email: realEmail, name: realName },
              });
              console.log(`Backfilled email for user ${auth.sub}: ${existing.email} → ${realEmail}`);
            }
          }
        } catch (err: any) {
          // Unique constraint race — another request may have created it
          if (!err?.message?.includes('Unique constraint')) {
            console.error('orgAuth: lazy user creation failed:', err);
          }
        }
      }
    } catch {
      // Token verification failed — fall through to API key auth
    }
  }

  let orgId = req.headers['x-org-id'] as string;
  const xApiKey = req.headers['x-api-key'] as string | undefined;
  const rawBearer = authorization?.startsWith('Bearer ') ? authorization.slice(7) : authorization;
  const apiKey = xApiKey || (rawBearer && /^(sk_|sz_)/.test(rawBearer) ? rawBearer : undefined);

  if (!orgId && apiKey) {
    try {
      const keyValue = apiKey.startsWith('Bearer ') ? apiKey.slice(7) : apiKey;
      const key = await prisma.apiKey.findUnique({ where: { key: keyValue } });
      if (key?.orgId) {
        orgId = key.orgId;
        req.headers['x-org-id'] = orgId;
      }
    } catch (err) {
      console.error('orgAuth: API key lookup failed:', err);
    }
  }

  next();
}
