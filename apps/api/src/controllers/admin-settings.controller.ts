import { Request, Response } from 'express';

export class AdminSettingsController {
  static async get(req: Request, res: Response) {
    res.json({
      evolutionApiUrl: process.env.EVOLUTION_API_URL ? '***configurado***' : 'não configurado',
      maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
      defaultPlanId: process.env.DEFAULT_PLAN_ID || 'free',
    });
  }

  static async update(req: Request, res: Response) {
    // MVP: configurações são baseadas em env vars
    // Futuramente pode-se criar um model SystemSettings no Prisma
    res.json({ message: 'Configurações atualizadas' });
  }
}
