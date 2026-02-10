import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';

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

    // 2. Check Redis
    const today = new Date().toISOString().split('T')[0];
    const key = `usage:${user.id}:${today}`;

    const currentUsage = await redis.incr(key);
    
    // Set expiry if new key (24h)
    if (currentUsage === 1) {
      await redis.expire(key, 86400);
    }

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
