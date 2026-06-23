import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuditService } from '../services/audit.service';

/**
 * Valida payload de template com 3 variantes obrigatórias.
 * Regra anti-banimento: WhatsApp/Meta detecta padrão quando muitos contatos
 * recebem texto idêntico. As 3 variantes garantem variabilidade — sistema
 * sorteia entre A/B/C por mensagem na hora do envio.
 *
 * Comparação: trim() case-sensitive (Olá ≠ OLÁ ≠ "Olá ").
 */
function validateVariants(payload: any): { ok: true; data: { variantA: string; variantB: string; variantC: string } } | { ok: false; error: string } {
  const a = String(payload?.variantA || '').trim();
  const b = String(payload?.variantB || '').trim();
  const c = String(payload?.variantC || '').trim();
  if (!a || !b || !c) {
    return { ok: false, error: 'As 3 variantes (A, B e C) são obrigatórias.' };
  }
  if (a === b || b === c || a === c) {
    return { ok: false, error: 'As 3 variantes devem ser DIFERENTES entre si (anti-banimento). Mude o texto pra que A, B e C tenham conteúdos distintos.' };
  }
  return { ok: true, data: { variantA: a, variantB: b, variantC: c } };
}

/**
 * Aceita body.instanceIds em 3 formatos: array de strings, JSON string, ou
 * null/undefined/[] (= disponivel pra todas as instancias). Valida que cada
 * id pertence a uma Instance da MESMA org (sem isso, user poderia atrelar
 * template a inst de outro tenant via id injetado).
 *
 * Retorna { value: string | null } pra gravar no DB (JSON string ou null)
 * ou { error: msg } pra responder 400.
 */
async function parseAndValidateInstanceIds(
  orgId: string,
  raw: unknown,
): Promise<{ value: string | null } | { error: string }> {
  if (raw == null) return { value: null };
  let arr: unknown = raw;
  if (typeof raw === 'string') {
    if (raw.trim() === '') return { value: null };
    try {
      arr = JSON.parse(raw);
    } catch {
      return { error: 'instanceIds deve ser array de UUIDs ou JSON string de array.' };
    }
  }
  if (!Array.isArray(arr)) return { error: 'instanceIds deve ser array.' };
  if (arr.length === 0) return { value: null };
  const ids = arr.map((x) => String(x));
  const owned = await prisma.instance.findMany({
    where: { id: { in: ids }, orgId },
    select: { id: true },
  });
  if (owned.length !== ids.length) {
    return { error: 'Uma ou mais instâncias informadas não pertencem à sua conta.' };
  }
  return { value: JSON.stringify(ids) };
}

export class TemplatesController {
  static async list(req: Request, res: Response) {
    try {
      const orgId = req.headers['x-org-id'] as string;
      if (!orgId) return res.status(400).json({ error: 'orgId required' });
      const templates = await prisma.template.findMany({ where: { orgId }, orderBy: { createdAt: 'desc' } });
      res.json(templates);
    } catch (error: any) {
      console.error('templates.list error:', error);
      res.status(500).json({ error: error.message || 'Failed to list templates' });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const orgId = req.headers['x-org-id'] as string;
      const { name, variables } = req.body;
      if (!orgId || !name) return res.status(400).json({ error: 'orgId e name obrigatórios' });
      const v = validateVariants(req.body);
      if (!v.ok) return res.status(400).json({ error: v.error });
      const instanceIds = await parseAndValidateInstanceIds(orgId, req.body?.instanceIds);
      if ('error' in instanceIds) return res.status(400).json({ error: instanceIds.error });
      const template = await prisma.template.create({
        data: {
          orgId,
          name: String(name).trim(),
          body: v.data.variantA, // body mantido pra leitura legacy = variantA
          variantA: v.data.variantA,
          variantB: v.data.variantB,
          variantC: v.data.variantC,
          variables,
          instanceIds: instanceIds.value,
        },
      });
      await AuditService.log(orgId, 'template.create', undefined, { id: template.id, name });
      res.json(template);
    } catch (error: any) {
      console.error('templates.create error:', error);
      res.status(500).json({ error: error.message || 'Failed to create template' });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const orgId = req.headers['x-org-id'] as string;
      const { name, variables } = req.body;
      const v = validateVariants(req.body);
      if (!v.ok) return res.status(400).json({ error: v.error });
      const instanceIds = await parseAndValidateInstanceIds(orgId, req.body?.instanceIds);
      if ('error' in instanceIds) return res.status(400).json({ error: instanceIds.error });
      const template = await prisma.template.update({
        where: { id },
        data: {
          name: name ? String(name).trim() : undefined,
          body: v.data.variantA,
          variantA: v.data.variantA,
          variantB: v.data.variantB,
          variantC: v.data.variantC,
          variables,
          instanceIds: instanceIds.value,
        },
      });
      res.json(template);
    } catch (error: any) {
      console.error('templates.update error:', error);
      res.status(500).json({ error: error.message || 'Failed to update template' });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.template.delete({ where: { id } });
      res.json({ success: true });
    } catch (error: any) {
      console.error('templates.remove error:', error);
      res.status(500).json({ error: error.message || 'Failed to remove template' });
    }
  }
}
