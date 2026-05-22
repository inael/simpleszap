"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Clock, CheckCircle2, XCircle, Ban, Loader2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import useSWR from "swr";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSearchParams } from "next/navigation";

type QueueItem = {
  id: string;
  instanceId: string;
  type: string;
  number: string;
  body: string | null;
  scheduledAt: string;
  status: string;
  sentAt: string | null;
  lastError: string | null;
  attempts: number;
  createdAt: string;
};

type Stats = {
  pending: number;
  sentToday: number;
  failedToday: number;
  dailyUsage: number;
  dailyLimit: number; // -1 = ilimitado
  perInstance: { instanceId: string; pending: number }[];
};

const STATUS_LABEL: Record<string, { text: string; cls: string; Icon: any }> = {
  pending:       { text: "Pendente",       cls: "text-amber-600",  Icon: Clock },
  processing:    { text: "Processando",    cls: "text-blue-600",   Icon: Loader2 },
  sent:          { text: "Enviada",        cls: "text-green-600",  Icon: CheckCircle2 },
  failed:        { text: "Falhou",         cls: "text-red-600",    Icon: XCircle },
  cancelled:     { text: "Cancelada",      cls: "text-zinc-500",   Icon: Ban },
  skipped_limit: { text: "Limite atingido", cls: "text-amber-700", Icon: Ban },
};

function relativeTime(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return diff >= 0 ? `daqui ${Math.round(abs)}s` : `há ${Math.round(abs)}s`;
  if (abs < 3600) return diff >= 0 ? `daqui ${Math.round(abs/60)}min` : `há ${Math.round(abs/60)}min`;
  if (abs < 86400) return diff >= 0 ? `daqui ${Math.round(abs/3600)}h` : `há ${Math.round(abs/3600)}h`;
  return new Date(iso).toLocaleString("pt-BR");
}

export default function MessagesPage() {
  const { getToken, user } = useAuth();
  const orgId = user?.sub;
  const params = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [instanceFilter, setInstanceFilter] = useState<string>(params?.get("instance") || "all");

  const fetcher = async ([url, oid]: [string, string]) => {
    const token = await getToken();
    return api.get(url, { headers: { "x-org-id": oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then(r => r.data);
  };

  const { data: instances } = useSWR(orgId ? ["/instances", orgId as string] : null, fetcher);
  const { data: stats, mutate: mutateStats } = useSWR<Stats>(orgId ? ["/messages/queue/stats", orgId as string] : null, fetcher, { refreshInterval: 5000 });

  const queueUrl = useMemo(() => {
    const u = new URLSearchParams();
    if (statusFilter !== "all") u.set("status", statusFilter);
    if (instanceFilter !== "all") u.set("instanceId", instanceFilter);
    u.set("limit", "100");
    return `/messages/queue?${u.toString()}`;
  }, [statusFilter, instanceFilter]);

  const { data: queue, mutate: mutateQueue } = useSWR<{ items: QueueItem[] }>(
    orgId ? [queueUrl, orgId as string] : null, fetcher, { refreshInterval: 5000 }
  );
  const { data: history } = useSWR(orgId ? ["/messages", orgId as string] : null, fetcher, { refreshInterval: 15000 });

  const instanceName = (id: string) =>
    Array.isArray(instances) ? instances.find((i: any) => i.id === id)?.name || id.slice(0, 8) : id.slice(0, 8);

  const cancelOne = async (id: string) => {
    if (!orgId) return;
    try {
      const token = await getToken();
      await api.delete(`/messages/queue/${id}`, { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      toast.success("Mensagem cancelada.");
      mutateQueue(); mutateStats();
    } catch { toast.error("Erro ao cancelar."); }
  };

  const cancelInstance = async () => {
    if (!orgId || instanceFilter === "all") return;
    if (!confirm("Cancelar todas as mensagens pendentes desta instância?")) return;
    try {
      const token = await getToken();
      const r = await api.post(`/messages/queue/${instanceFilter}/cancel-pending`, {}, { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      toast.success(`${r.data.cancelled} mensagens canceladas.`);
      mutateQueue(); mutateStats();
    } catch { toast.error("Erro ao cancelar."); }
  };

  const isUnlimited = stats?.dailyLimit === -1;
  const usagePct = stats && stats.dailyLimit > 0 ? Math.min(100, (stats.dailyUsage / stats.dailyLimit) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Mensagens</h1>
        <p className="text-muted-foreground">
          Acompanhe a fila de saída, mensagens enviadas e falhas.
        </p>
      </div>

      {/* Card de limite diário */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Uso hoje</p>
              <p className="text-2xl font-bold">
                {stats?.dailyUsage ?? 0}
                <span className="text-base font-normal text-muted-foreground">
                  {" / "}{isUnlimited ? "∞ ilimitado" : stats?.dailyLimit ?? "—"}
                </span>
              </p>
            </div>
            <div className="flex gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Na fila</p>
                <p className="text-xl font-semibold text-amber-600">{stats?.pending ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Enviadas hoje</p>
                <p className="text-xl font-semibold text-green-600">{stats?.sentToday ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Falhas hoje</p>
                <p className="text-xl font-semibold text-red-600">{stats?.failedToday ?? 0}</p>
              </div>
            </div>
          </div>
          {!isUnlimited && stats && stats.dailyLimit > 0 && (
            <div className="mt-3 w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all ${usagePct >= 90 ? "bg-red-500" : usagePct >= 70 ? "bg-amber-500" : "bg-green-500"}`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue">Fila</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <CardTitle>Fila de envio</CardTitle>
                  <CardDescription>
                    Mensagens enfileiradas são processadas em ordem (FIFO por instância), com pausa aleatória entre envios pra reduzir risco de banimento. Sem retry — se falhar, não tenta de novo.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos status</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                      <SelectItem value="sent">Enviadas</SelectItem>
                      <SelectItem value="failed">Falhas</SelectItem>
                      <SelectItem value="cancelled">Canceladas</SelectItem>
                      <SelectItem value="skipped_limit">Bloqueadas por limite</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={instanceFilter} onValueChange={setInstanceFilter}>
                    <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas instâncias</SelectItem>
                      {Array.isArray(instances) && instances.map((i: any) => (
                        <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {instanceFilter !== "all" && (
                    <Button variant="outline" size="sm" onClick={cancelInstance} title="Cancelar pendentes desta instância">
                      <Ban className="h-4 w-4 mr-1" /> Cancelar pendentes
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Instância</TableHead>
                    <TableHead>Envio</TableHead>
                    <TableHead>Conteúdo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue?.items?.map((m) => {
                    const meta = STATUS_LABEL[m.status] || { text: m.status, cls: "text-zinc-500", Icon: Clock };
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 text-sm ${meta.cls}`} title={m.lastError || undefined}>
                            <meta.Icon className={`h-4 w-4 ${m.status === "processing" ? "animate-spin" : ""}`} />
                            {meta.text}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{m.number}</TableCell>
                        <TableCell>{instanceName(m.instanceId)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.status === "sent" && m.sentAt ? relativeTime(m.sentAt) : relativeTime(m.scheduledAt)}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate text-sm">{m.body || m.type}</TableCell>
                        <TableCell className="text-right">
                          {m.status === "pending" && (
                            <Button variant="ghost" size="icon" onClick={() => cancelOne(m.id)} title="Cancelar">
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!queue?.items?.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                        Nenhuma mensagem nesse filtro.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de envios</CardTitle>
              <CardDescription>Registro de mensagens já processadas (enviadas e falhas).</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Para</TableHead>
                    <TableHead>Instância</TableHead>
                    <TableHead>Conteúdo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(history) && history.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell>{new Date(m.createdAt).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="font-mono text-xs">{m.to}</TableCell>
                      <TableCell>{instanceName(m.instanceId)}</TableCell>
                      <TableCell className="max-w-[300px] truncate text-sm">{m.body}</TableCell>
                      <TableCell>
                        <span className={m.status === "sent" ? "text-green-600" : m.status === "failed" ? "text-red-600" : "text-zinc-500"}>
                          {m.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!Array.isArray(history) || history.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                        Nenhuma mensagem no histórico ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
