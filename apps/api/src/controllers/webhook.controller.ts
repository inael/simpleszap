import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class WebhookController {
  /**
   * Handle Logto webhook events (user.created, user.updated, user.deleted, etc.)
   * Logto webhooks send JSON with { event, createdAt, data: { ... } }
   */
  static async handleLogto(req: Request, res: Response) {
    const WEBHOOK_SECRET = process.env.LOGTO_WEBHOOK_SECRET;

    // Optional: verify signing secret via custom header
    if (WEBHOOK_SECRET) {
      const signature = req.headers['logto-signature-sha-256'] as string | undefined;
      if (!signature) {
        return res.status(400).json({ error: 'Missing webhook signature' });
      }
      const crypto = await import('crypto');
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
      if (signature !== expected) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    const { event, data } = req.body;
    console.log(`Logto webhook received: ${event}`);

    try {
      if (event === 'User.Created') {
        const { id, primaryEmail, name, username } = data;
        await prisma.user.upsert({
          where: { logtoId: id },
          create: {
            logtoId: id,
            email: primaryEmail || `${id}@logto.user`,
            name: name || username || primaryEmail?.split('@')[0] || id,
          },
          update: {
            email: primaryEmail || undefined,
            name: name || username || undefined,
          },
        });
        console.log(`Logto user ${id} upserted in DB`);
      } else if (event === 'User.Data.Updated') {
        const { id, primaryEmail, name, username } = data;
        try {
          await prisma.user.update({
            where: { logtoId: id },
            data: {
              email: primaryEmail || undefined,
              name: name || username || undefined,
            },
          });
          console.log(`Logto user ${id} updated in DB`);
        } catch (err) {
          console.error(`User ${id} not found for update, skipping`);
        }
      } else if (event === 'User.Deleted') {
        const { id } = data;
        try {
          await prisma.user.delete({ where: { logtoId: id } });
          console.log(`Logto user ${id} deleted from DB`);
        } catch (err) {
          console.error(`User ${id} not found for deletion, skipping`);
        }
      }
    } catch (error) {
      console.error('Error processing Logto webhook:', error);
      // Don't fail the webhook response
    }

    return res.status(200).json({ success: true });
  }
}
