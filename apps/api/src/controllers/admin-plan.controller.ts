import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class AdminPlanController {
  static async list(req: Request, res: Response) {
    try {
      const plans = await prisma.subscriptionPlan.findMany({
        orderBy: { displayOrder: 'asc' }
      });
      res.json(plans);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const data = req.body;

    try {
      const plan = await prisma.subscriptionPlan.update({
        where: { id },
        data
      });
      res.json(plan);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async create(req: Request, res: Response) {
    const data = req.body;
    try {
      const plan = await prisma.subscriptionPlan.create({
        data
      });
      res.json(plan);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
