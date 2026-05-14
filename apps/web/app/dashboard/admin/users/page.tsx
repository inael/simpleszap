"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Search, ChevronLeft, ChevronRight, AlertCircle, Gift, Loader2 } from "lucide-react";
import useSWR from "swr";
import { useAdminApi } from "@/lib/use-admin-api";
import { fetcher } from "@/lib/api";
import { toast } from "sonner";

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  manualSubscriptionUntil: string | null;
  manualPlanReason: string | null;
  subscriptionPlan: { id: string; name: string } | null;
  _count?: { instances: number };
};

function fmtBR(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function AdminUsersPage() {
  const { adminFetcher, adminPost, adminDelete } = useAdminApi();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, error, isLoading, mutate } = useSWR(
    `/admin/users?page=${page}&limit=20&search=${search}`,
    adminFetcher
  );
  const { data: pricingData } = useSWR("/pricing", fetcher);
  const plans: { id: string; name: string }[] = (pricingData?.plans || [])
    .map((p: any) => ({ id: p.id, name: p.name }));

  const [grantOpen, setGrantOpen] = useState(false);
  const [grantUser, setGrantUser] = useState<UserRow | null>(null);
  const [grantPlanId, setGrantPlanId] = useState<string>("");
  const [grantMonths, setGrantMonths] = useState<string>("1");
  const [grantReason, setGrantReason] = useState<string>("");
  const [grantBusy, setGrantBusy] = useState(false);

  const openGrantDialog = (u: UserRow) => {
    setGrantUser(u);
    setGrantPlanId(u.subscriptionPlan?.id || plans[0]?.id || "");
    setGrantMonths("1");
    setGrantReason("");
    setGrantOpen(true);
  };

  const handleGrant = async () => {
    if (!grantUser) return;
    if (!grantPlanId) return toast.error("Selecione um plano");
    const m = Number(grantMonths);
    if (!Number.isFinite(m) || m <= 0 || m > 60) return toast.error("Meses deve ser entre 1 e 60");
    if (!grantReason.trim() || grantReason.trim().length < 3) return toast.error("Descreva o motivo (mínimo 3 caracteres)");

    setGrantBusy(true);
    try {
      await adminPost(`/admin/users/${grantUser.id}/grant-plan`, {
        planId: grantPlanId, months: m, reason: grantReason.trim(),
      });
      toast.success(`Cortesia concedida a ${grantUser.email}`);
      setGrantOpen(false);
      mutate();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Erro ao conceder cortesia");
    } finally {
      setGrantBusy(false);
    }
  };

  const handleRevoke = async (u: UserRow) => {
    if (!confirm(`Revogar cortesia de ${u.email}?`)) return;
    try {
      await adminDelete(`/admin/users/${u.id}/grant-plan`);
      toast.success("Cortesia revogada");
      mutate();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Erro ao revogar cortesia");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
        <p className="text-muted-foreground">
          Todos os usuários registrados no sistema. Conceda planos cortesia (VIP) a amigos/influenciadores sem passar pelo Asaas.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            className="pl-10"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>Erro ao carregar usuários. Verifique sua conexão e tente novamente.</p>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Cortesia</TableHead>
                    <TableHead>Instâncias</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.users?.map((user: UserRow) => {
                    const courtesyActive = !!(user.manualSubscriptionUntil && new Date(user.manualSubscriptionUntil) > new Date());
                    return (
                      <TableRow key={user.id}>
                        <TableCell>{user.name || "—"}</TableCell>
                        <TableCell className="text-sm">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.subscriptionPlan?.name || "Sem plano"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {courtesyActive ? (
                            <Badge className="bg-purple-100 text-purple-900 border-purple-200">
                              até {fmtBR(user.manualSubscriptionUntil!)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{user._count?.instances ?? 0}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {fmtBR(user.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {courtesyActive ? (
                            <Button variant="outline" size="sm" onClick={() => handleRevoke(user)}>
                              Revogar cortesia
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => openGrantDialog(user)}>
                              <Gift className="mr-1 h-3.5 w-3.5" />
                              Conceder cortesia
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {data?.users?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum usuário encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {data?.pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Página {data.page} de {data.pages} ({data.total} usuários)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= data.pages}
                      onClick={() => setPage(page + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conceder plano cortesia</DialogTitle>
            <DialogDescription>
              {grantUser?.email}. Cortesia bypassa a cobrança do Asaas e dá acesso pleno ao plano selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={grantPlanId} onValueChange={setGrantPlanId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duração (meses)</Label>
              <Input type="number" min={1} max={60} value={grantMonths} onChange={(e) => setGrantMonths(e.target.value)} />
              <p className="text-xs text-muted-foreground">Se já houver cortesia ativa, esta duração é somada à existente.</p>
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea
                placeholder="Ex: Influenciador parceiro de marketing, amigo testando o produto, etc."
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantOpen(false)} disabled={grantBusy}>Cancelar</Button>
            <Button onClick={handleGrant} disabled={grantBusy}>
              {grantBusy ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Concedendo</> : "Conceder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
