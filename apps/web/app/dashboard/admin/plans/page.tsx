"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertCircle, CloudOff, Cloud, RefreshCw, Loader2 } from "lucide-react";
import useSWR from "swr";
import { useAdminApi } from "@/lib/use-admin-api";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  description?: string;
  priceMonthly: string;
  priceAnnual: string;
  messagesPerDay: number;
  instancesLimit: number;
  hasWebhooks: boolean;
  hasTemplates: boolean;
  isActive: boolean;
  displayOrder: number;
  asaasId?: string | null;
}

export default function AdminPlansPage() {
  const { adminFetcher, adminPost, adminPut, adminDelete } = useAdminApi();
  const { data: plans, error: plansError, isLoading, mutate } = useSWR<Plan[]>("/admin/plans", adminFetcher);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [syncingPlan, setSyncingPlan] = useState<string | null>(null);

  const [form, setForm] = useState({
    id: "",
    name: "",
    description: "",
    priceMonthly: "0",
    priceAnnual: "0",
    messagesPerDay: 100,
    instancesLimit: 1,
    hasWebhooks: false,
    hasTemplates: false,
    isActive: true,
    displayOrder: 0,
    syncToAsaas: false,
  });

  const resetForm = () => {
    setForm({
      id: "", name: "", description: "", priceMonthly: "0", priceAnnual: "0",
      messagesPerDay: 100, instancesLimit: 1, hasWebhooks: false, hasTemplates: false,
      isActive: true, displayOrder: 0, syncToAsaas: false,
    });
    setEditing(null);
  };

  const openEdit = (plan: Plan) => {
    setEditing(plan);
    setForm({
      id: plan.id,
      name: plan.name,
      description: plan.description || "",
      priceMonthly: plan.priceMonthly,
      priceAnnual: plan.priceAnnual,
      messagesPerDay: plan.messagesPerDay,
      instancesLimit: plan.instancesLimit,
      hasWebhooks: plan.hasWebhooks,
      hasTemplates: plan.hasTemplates,
      isActive: plan.isActive,
      displayOrder: plan.displayOrder,
      syncToAsaas: false,
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        const { id, ...data } = form;
        await adminPut(`/admin/plans/${editing.id}`, data);
        toast.success("Plano atualizado com sucesso");
      } else {
        await adminPost("/admin/plans", form);
        toast.success("Plano criado com sucesso");
      }
      mutate();
      setOpen(false);
      resetForm();
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Erro ao salvar plano";
      toast.error(msg);
    }
  };

  const handleSyncToAsaas = async (planId: string) => {
    setSyncingPlan(planId);
    try {
      await adminPost(`/admin/plans/${planId}/sync-asaas`, {});
      toast.success("Plano sincronizado com o Asaas!");
      mutate();
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Erro ao sincronizar com Asaas";
      toast.error(msg);
    } finally {
      setSyncingPlan(null);
    }
  };

  const handleUnsyncFromAsaas = async (planId: string) => {
    setSyncingPlan(planId);
    try {
      await adminDelete(`/admin/plans/${planId}/sync-asaas`);
      toast.success("Plano desvinculado do Asaas");
      mutate();
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Erro ao desvincular do Asaas";
      toast.error(msg);
    } finally {
      setSyncingPlan(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar Planos</h1>
          <p className="text-muted-foreground">Crie e edite planos de assinatura. Sincronize com o Asaas para cobrar automaticamente.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Novo Plano</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Plano" : "Novo Plano"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {!editing && (
                <div className="grid gap-2">
                  <Label>ID (slug)</Label>
                  <Input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="ex: pro" />
                </div>
              )}
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Profissional" />
              </div>
              <div className="grid gap-2">
                <Label>Descri\u00e7\u00e3o</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Pre\u00e7o Mensal (R$)</Label>
                  <Input type="number" value={form.priceMonthly} onChange={(e) => setForm({ ...form, priceMonthly: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Pre\u00e7o Anual (R$)</Label>
                  <Input type="number" value={form.priceAnnual} onChange={(e) => setForm({ ...form, priceAnnual: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Msgs/Dia</Label>
                  <Input type="number" value={form.messagesPerDay} onChange={(e) => setForm({ ...form, messagesPerDay: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="grid gap-2">
                  <Label>Limite de Inst\u00e2ncias</Label>
                  <Input type="number" value={form.instancesLimit} onChange={(e) => setForm({ ...form, instancesLimit: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Ordem de Exibi\u00e7\u00e3o</Label>
                <Input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.hasWebhooks} onChange={(e) => setForm({ ...form, hasWebhooks: e.target.checked })} />
                  Webhooks
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.hasTemplates} onChange={(e) => setForm({ ...form, hasTemplates: e.target.checked })} />
                  Templates
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                  Ativo
                </label>
              </div>

              {/* Asaas Sync Option */}
              <div className="rounded-md border p-4 space-y-2 bg-muted/50">
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Integra\u00e7\u00e3o Asaas</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {editing?.asaasId
                    ? `Plano j\u00e1 vinculado ao Asaas (ID: ${editing.asaasId}). Marque para atualizar os dados no Asaas.`
                    : "Marque para criar este plano automaticamente no Asaas ao salvar. Planos gratuitos (R$ 0) n\u00e3o s\u00e3o sincronizados."}
                </p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.syncToAsaas}
                    onChange={(e) => setForm({ ...form, syncToAsaas: e.target.checked })}
                  />
                  {editing?.asaasId ? "Atualizar no Asaas ao salvar" : "Criar no Asaas ao salvar"}
                </label>
              </div>
            </div>
            <Button onClick={handleSubmit} className="w-full">
              {editing ? "Salvar Altera\u00e7\u00f5es" : "Criar Plano"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {plansError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>Erro ao carregar planos. Verifique sua conex\u00e3o e tente novamente.</p>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Mensal</TableHead>
                  <TableHead>Inst\u00e2ncias</TableHead>
                  <TableHead>Msgs/Dia</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Asaas</TableHead>
                  <TableHead>A\u00e7\u00f5es</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans?.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-mono text-sm">{plan.id}</TableCell>
                    <TableCell>{plan.name}</TableCell>
                    <TableCell>R$ {plan.priceMonthly}</TableCell>
                    <TableCell>{plan.instancesLimit}</TableCell>
                    <TableCell>{plan.messagesPerDay}</TableCell>
                    <TableCell>
                      <Badge variant={plan.isActive ? "default" : "secondary"}>
                        {plan.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {plan.asaasId ? (
                        <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                          <Cloud className="h-3 w-3 mr-1" />
                          Sincronizado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-400">
                          <CloudOff className="h-3 w-3 mr-1" />
                          Local
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(plan)}>
                          Editar
                        </Button>
                        {plan.asaasId ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-orange-600 hover:text-orange-700"
                            disabled={syncingPlan === plan.id}
                            onClick={() => handleUnsyncFromAsaas(plan.id)}
                            title="Desvincular do Asaas"
                          >
                            {syncingPlan === plan.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CloudOff className="h-4 w-4" />
                            )}
                          </Button>
                        ) : Number(plan.priceMonthly) > 0 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700"
                            disabled={syncingPlan === plan.id}
                            onClick={() => handleSyncToAsaas(plan.id)}
                            title="Sincronizar com Asaas"
                          >
                            {syncingPlan === plan.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
