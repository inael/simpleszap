import { Request, Response } from 'express';
import { EvolutionService } from '../services/evolution.service';
import { prisma } from '../lib/prisma';
import { messageQueue } from '../lib/queue';

export class InstanceController {
  static async list(req: Request, res: Response) {
    // TODO: Get userId from auth context
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
       // For testing purposes if no auth yet, return all or error
       // return res.status(401).json({ error: 'Unauthorized' });
    }

    const instances = await prisma.instance.findMany({
      where: userId ? { userId } : {},
    });

    // Optionally sync status with Evolution?
    // const evoInstances = await EvolutionService.fetchInstances();
    
    res.json(instances);
  }

  static async create(req: Request, res: Response) {
    const { name, userId } = req.body; // Expect userId for now

    if (!name || !userId) {
      return res.status(400).json({ error: 'Name and userId are required' });
    }

    try {
      // 1. Create in DB first (pending)
      const instance = await prisma.instance.create({
        data: {
          name,
          userId,
          status: 'created'
        }
      });

      // 2. Create in Evolution API
      // Use DB ID or Name as instance name in Evolution to ensure uniqueness? 
      // Plan says "ID, status...". Using ID is safer.
      const evoName = instance.id; 
      
      const evoResult = await EvolutionService.createInstance(evoName);
      
      // 3. Update DB
      await prisma.instance.update({
        where: { id: instance.id },
        data: {
          token: evoResult.hash?.apikey || evoResult.token, // Adjust based on actual Evolution response
          status: 'disconnected'
        }
      });

      res.json({ instance, evolution: evoResult });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getQr(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const result = await EvolutionService.connectInstance(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
  
  static async delete(req: Request, res: Response) {
      const { id } = req.params;
      
      try {
          await EvolutionService.deleteInstance(id);
          await prisma.instance.delete({ where: { id } });
          res.json({ success: true });
      } catch (error: any) {
          res.status(500).json({ error: error.message });
      }
  }

  static async sendText(req: Request, res: Response) {
    const { instanceId } = req.params;
    const { number, text } = req.body;

    try {
      const result = await EvolutionService.sendText(instanceId, number, text);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
