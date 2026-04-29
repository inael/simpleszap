"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Plan { id: string; name: string }
interface Coupon {
  id: string;
  code: string;
  description: string | null;
  percentOff: number | null;
  amountOff: number | null;
  validFrom: string;
  validUntil: string | null;
  maxUses: number | null;
  timesUsed: number;
  appliesToPlans: string[];
  appliesToCycles: string[];
  isActive: boolean;
  createdAt: string;
}

const CYCLES = ['MONTHLY', 'YEARLY'] as const;

export default function CouponsAdminPage() {
  const { getToken } = useAuth();
  const fetcher = async (url: string) => {
    const token = await getToken();
    return api.get(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined }).then((r) => r.data);
  };
  const { data: coupons, error, mutate, isLoading } = useSWR<Coupon[]>('/admin/coupons', fetcher);
  const { data: pricingData } = useSWR('/pricing', fetcher);
  const plans: Plan[] = (pricingData?.plans || []).map((p: any) => ({ id: p.id, name: p.name }));

  const [dialogOpen, setDialogOpen] = useState(false);
  const emptyForm = {
    code: '',
    description: '',
    discountType: 'percent' as 'percent' | 'amount',
    percentOff: 99,
    amountOff: 0,
    validUntil: '',
    maxUses: '' as number | '',
    appliesToPlans: [] as string[],
    appliesToCycles: [] as string[],
    isActive: true,
  };
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const togglePlan = (id: string) => {
    setForm((f) => ({
      ...f,
      appliesToPlans: f.appliesToPlans.includes(id)
        ? f.appliesToPlans.filter((p) => p !== id)
        : [...f.appliesToPlans, id],
    }));
  };
  const toggleCycle = (c: string) => {
    setForm((f) => ({
      ...f,
      appliesToCycles: f.appliesToCycles.includes(c)
        ? f.appliesToCycles.filter((x) => x !== c)
        : [...f.appliesToCycles, c],
    }));
  };

  const handleSubmit = async () => {
    if (!form.code.trim()) {
      toast.error('Código obrigatório');
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      await api.post('/admin/coupons', {
        code: form.code.trim().toUpperCase(),
        description: form.description || null,
        percentOff: form.discountType === 'percent' ? form.percentOff : null,
        amountOff: form.discountType === 'amount' ? form.amountOff : null,
        validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : null,
        maxUses: form.maxUses === '' ? null : Number(form.maxUses),
        appliesToPlans: form.appliesToPlans,
        appliesToCycles: form.appliesToCycles,
        isActive: form.isActive,
      }, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      toast.success('Cupom criado');
      setForm(emptyForm);
      setDialogOpen(false);
      mutate();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Falha ao criar cupom');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (c: Coupon) => {
    try {
      const token = await getToken();
      await api.put(`/admin/coupons/${c.id}`, { isActive: !c.isActive }, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      mutate();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Erro ao atualizar');
    }
  };

  const remove = async (c: Coupon) => {
    if (!confirm(`Remover cupom ${c.code}? ${c.timesUsed > 0 ? '(Ele já foi usado, será desativado em vez de apagado.)' : ''}`)) return;
    try {
      const token = await getToken();
      await api.delete(`/admin/coupons/${c.id}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      toast.success('Cupom removido');
      mutate();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Erro ao remover');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cupons</h1>
          <p className="text-muted-foreground">Gerencie cupons de desconto para campanhas e parceiros.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setForm(emptyForm)}>
              <Plus className="mr-2 h-4 w-4" /> Novo Cupom
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Cupom</DialogTitle>
              <DialogDescription>Cria um cupom de desconto aplicável no checkout.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Código</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="Ex: TESTE99" className="font-mono" />
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Lançamento de marketing X" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={form.discountType === 'percent'} onChange={() => setForm({ ...form, discountType: 'percent' })} />
                  Percentual (%)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={form.discountType === 'amount'} onChange={() => setForm({ ...form, discountType: 'amount' })} />
                  Valor fixo (R$)
                </label>
              </div>
              {form.discountType === 'percent' ? (
                <div>
                  <Label>% de desconto (1-100)</Label>
                  <Input type="number" min={1} max={100} value={form.percentOff} onChange={(e) => setForm({ ...form, percentOff: Number(e.target.value) })} />
                </div>
              ) : (
                <div>
                  <Label>R$ de desconto</Label>
                  <Input type="number" min={0.01} step={0.01} value={form.amountOff} onChange={(e) => setForm({ ...form, amountOff: Number(e.target.value) })} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Expira em (opcional)</Label>
                  <Input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
                </div>
                <div>
                  <Label>Máximo de usos (opcional)</Label>
                  <Input type="number" min={1} value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Sem limite" />
                </div>
              </div>
              <div>
                <Label>Aplicável aos planos</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {plans.map((p) => (
                    <label key={p.id} className="flex items-center gap-1 text-sm border rounded-md px-2 py-1 cursor-pointer">
                      <input type="checkbox" checked={form.appliesToPlans.includes(p.id)} onChange={() => togglePlan(p.id)} />
                      {p.name}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Vazio = todos os planos.</p>
              </div>
              <div>
                <Label>Aplicável aos ciclos</Label>
                <div className="flex gap-2 mt-1">
                  {CYCLES.map((c) => (
                    <label key={c} className="flex items-center gap-1 text-sm border rounded-md px-2 py-1 cursor-pointer">
                      <input type="checkbox" checked={form.appliesToCycles.includes(c)} onChange={() => toggleCycle(c)} />
                      {c === 'MONTHLY' ? 'Mensal' : 'Anual'}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Vazio = ambos.</p>
              </div>
              <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                {submitting ? 'Criando...' : 'Criar Cupom'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>Erro ao carregar cupons.</p>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground py-8">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Desconto</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Expira</TableHead>
                  <TableHead>Planos</TableHead>
                  <TableHead>Ciclos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                    <TableCell>{c.percentOff != null ? `${c.percentOff}%` : `R$ ${(c.amountOff ?? 0).toFixed(2)}`}</TableCell>
                    <TableCell>{c.timesUsed}{c.maxUses ? ` / ${c.maxUses}` : ''}</TableCell>
                    <TableCell>{c.validUntil ? new Date(c.validUntil).toLocaleDateString('pt-BR') : '—'}</TableCell>
                    <TableCell className="text-xs">{c.appliesToPlans.length ? c.appliesToPlans.join(', ') : 'todos'}</TableCell>
                    <TableCell className="text-xs">{c.appliesToCycles.length ? c.appliesToCycles.join(', ') : 'ambos'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={c.isActive ? 'default' : 'secondary'}
                        className={c.isActive ? 'bg-emerald-500 cursor-pointer' : 'cursor-pointer'}
                        onClick={() => toggleActive(c)}
                      >
                        {c.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => remove(c)} className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!coupons?.length && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Nenhum cupom criado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
