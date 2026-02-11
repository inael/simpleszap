import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
// import { redis } from '../lib/redis';

export const rateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({ error: 'API Key required' });
  }

  try {
    // 1. Validate API Key
    const keyData = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: {
        user: {
          include: { subscriptionPlan: true }
        }
      }
    });

    if (!keyData) {
      return res.status(401).json({ error: 'Invalid API Key' });
    }

    const user = keyData.user;
    const plan = user.subscriptionPlan;

    if (!plan) {
       // Default fallback if no plan assigned
       return next();
    }

    const limit = plan.messagesPerDay;
    if (limit === -1) return next(); // Unlimited

    // 2. Check Usage (DB based)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    
    // Find or create usage record for today
    // Note: Concurrency might be an issue here for high volume, but for "SimpleZap" it's likely acceptable.
    // For stricter locking, we'd need raw SQL or interactive transactions, but let's keep it simple first.
    let usage = await prisma.dailyUsage.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: today
        }
      }
    });

    if (!usage) {
      // If it doesn't exist, create it (might fail if race condition, so we can try/catch or upsert)
       try {
        usage = await prisma.dailyUsage.create({
          data: {
            userId: user.id,
            date: today,
            count: 1 // Count the current request tentatively? Or just 0 and increment later?
            // Usually we check limit first. Let's start at 0 if we assume increment happens after success,
            // OR we implement "token bucket" style where we increment NOW.
            // Let's increment NOW to be safe against spam.
          }
        });
       } catch (e) {
         // Race condition: created by another request in parallel
         usage = await prisma.dailyUsage.findUnique({
            where: { userId_date: { userId: user.id, date: today } }
         });
         
         // If still null (weird), default to dummy
         if (!usage) {
            // Should not happen unless DB error
            return next(); 
         }
         
         // Since we failed to create (already existed), we need to increment the existing one
         usage = await prisma.dailyUsage.update({
           where: { id: usage.id },
           data: { count: { increment: 1 } }
         });
       }
    } else {
      // Usage exists, increment it
      usage = await prisma.dailyUsage.update({
        where: { id: usage.id },
        data: { count: { increment: 1 } }
      });
    }

    const currentUsage = usage.count;

    if (currentUsage > limit) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        limit,
        usage: currentUsage
      });
    }

    // Attach user to request for downstream controllers
    (req as any).user = user;
    
    next();
  } catch (error) {
    console.error('Rate limit error:', error);
    next(); // Fail open or closed? Using open for now to avoid blocking on redis error
  }
};
