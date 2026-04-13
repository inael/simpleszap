import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AsaasService } from '../services/asaas.service';

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
    const { syncToAsaas, ...data } = req.body;

    try {
      // If sync requested and plan has price > 0, sync with Asaas
      const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      let asaasId = existing.asaasId;

      if (syncToAsaas) {
        const value = Number(data.priceMonthly ?? existing.priceMonthly);
        if (value > 0) {
          try {
            if (asaasId) {
              // Update existing Asaas plan
              await AsaasService.updatePlan(asaasId, {
                name: data.name ?? existing.name,
                description: data.description ?? existing.description ?? undefined,
                value,
              });
            } else {
              // Create new Asaas plan
              const asaasPlan = await AsaasService.createPlan({
                name: data.name ?? existing.name,
                description: data.description ?? existing.description ?? undefined,
                value,
                cycle: 'MONTHLY',
              });
              asaasId = asaasPlan.id;
              data.asaasId = asaasId;
            }
          } catch (asaasError: any) {
            return res.status(400).json({
              error: `Plano salvo localmente, mas falhou no Asaas: ${asaasError.message}`,
              asaasError: true,
            });
          }
        }
      }

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
    const { syncToAsaas, ...data } = req.body;
    try {
      // If sync requested and plan has price > 0, create on Asaas first
      if (syncToAsaas && Number(data.priceMonthly) > 0) {
        try {
          const asaasPlan = await AsaasService.createPlan({
            name: data.name,
            description: data.description || undefined,
            value: Number(data.priceMonthly),
            cycle: 'MONTHLY',
          });
          data.asaasId = asaasPlan.id;
        } catch (asaasError: any) {
          return res.status(400).json({
            error: `Falha ao criar plano no Asaas: ${asaasError.message}`,
            asaasError: true,
          });
        }
      }

      const plan = await prisma.subscriptionPlan.create({
        data
      });
      res.json(plan);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Sync a single plan to Asaas
  static async syncToAsaas(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      const value = Number(plan.priceMonthly);
      if (value <= 0) {
        return res.status(400).json({ error: 'Planos gratuitos não precisam ser sincronizados com o Asaas' });
      }

      let asaasId = plan.asaasId;

      if (asaasId) {
        // Update existing
        await AsaasService.updatePlan(asaasId, {
          name: plan.name,
          description: plan.description || undefined,
          value,
        });
      } else {
        // Create new
        const asaasPlan = await AsaasService.createPlan({
          name: plan.name,
          description: plan.description || undefined,
          value,
          cycle: 'MONTHLY',
        });
        asaasId = asaasPlan.id;
      }

      const updated = await prisma.subscriptionPlan.update({
        where: { id },
        data: { asaasId }
      });

      res.json({ ...updated, asaasSynced: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // List plans from Asaas (for comparison/debugging)
  static async listAsaasPlans(_req: Request, res: Response) {
    try {
      const plans = await AsaasService.listPlans();
      res.json(plans);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Delete plan from Asaas and remove asaasId
  static async unsyncFromAsaas(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      if (plan.asaasId) {
        try {
          await AsaasService.deletePlan(plan.asaasId);
        } catch (err: any) {
          console.warn('Could not delete Asaas plan (may not exist):', err.message);
        }
      }

      const updated = await prisma.subscriptionPlan.update({
        where: { id },
        data: { asaasId: null }
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
