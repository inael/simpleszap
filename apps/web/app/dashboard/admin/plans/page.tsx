"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
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
}

export default function AdminPlansPage() {
  const { adminFetcher, adminPost, adminPut } = useAdminApi();
  const { data: plans, isLoading, mutate } = useSWR<Plan[]>("/admin/plans", adminFetcher);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);

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
  });

  const resetForm = () => {
    setForm({
      id: "", name: "", description: "", priceMonthly: "0", priceAnnual: "0",
      messagesPerDay: 100, instancesLimit: 1, hasWebhooks: false, hasTemplates: false,
      isActive: true, displayOrder: 0,
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
    } catch {
      toast.error("Erro ao salvar plano");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar Planos</h1>
          <p className="text-muted-foreground">Crie e edite planos de assinatura.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Novo Plano</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
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
                <Label>Descrição</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Preço Mensal (R$)</Label>
                  <Input type="number" value={form.priceMonthly} onChange={(e) => setForm({ ...form, priceMonthly: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Preço Anual (R$)</Label>
                  <Input type="number" value={form.priceAnnual} onChange={(e) => setForm({ ...form, priceAnnual: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Msgs/Dia</Label>
                  <Input type="number" value={form.messagesPerDay} onChange={(e) => setForm({ ...form, messagesPerDay: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="grid gap-2">
                  <Label>Limite de Instâncias</Label>
                  <Input type="number" value={form.instancesLimit} onChange={(e) => setForm({ ...form, instancesLimit: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Ordem de Exibição</Label>
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
            </div>
            <Button onClick={handleSubmit} className="w-full">
              {editing ? "Salvar Alterações" : "Criar Plano"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

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
                  <TableHead>Instâncias</TableHead>
                  <TableHead>Msgs/Dia</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
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
                      <Button variant="ghost" size="sm" onClick={() => openEdit(plan)}>
                        Editar
                      </Button>
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
