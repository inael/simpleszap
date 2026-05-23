"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { TableLoadingRows } from "@/components/ui/table-loading";

type WebhookLog = {
  id: string;
  webhookId: string;
  event: string;
  success: boolean;
  statusCode: number | null;
  error: string | null;
  createdAt: string;
};

export default function WebhookLogsPage() {
  const { getToken, user } = useAuth();
  const orgId = user?.sub;
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "ok" | "fail">("all");

  const { data: logs, error: logsError } = useSWR<WebhookLog[]>(
    orgId ? ["/webhooks/logs", orgId] : null,
    async ([url, oid]: [string, string]) => {
      const token = await getToken();
      return api.get(url, { headers: { "x-org-id": oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then((r) => r.data);
    },
    { refreshInterval: 10000 }
  );

  const events = useMemo(() => {
    const s = new Set<string>();
    for (const l of logs || []) s.add(l.event);
    return Array.from(s).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    return (logs || []).filter((l) => {
      if (eventFilter !== "all" && l.event !== eventFilter) return false;
      if (statusFilter === "ok" && !l.success) return false;
      if (statusFilter === "fail" && l.success) return false;
      return true;
    });
  }, [logs, eventFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Logs de entrega</h1>
        <p className="text-muted-foreground">
          Histórico das tentativas de entrega dos seus webhooks. <strong>OK</strong> = seu sistema respondeu HTTP 2xx.
          <strong> Falha</strong> = endpoint retornou erro ou estava fora do ar.
        </p>
      </div>

      {logsError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>Erro ao carregar logs. Verifique sua conexão e tente novamente.</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle>Últimas tentativas</CardTitle>
              <CardDescription>Atualiza a cada 10s.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os eventos</SelectItem>
                  {events.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="ok">OK</SelectItem>
                  <SelectItem value="fail">Falha</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs === undefined && !logsError && <TableLoadingRows colSpan={3} />}
              {filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs text-muted-foreground">{new Date(l.createdAt).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="font-mono text-xs">{l.event}</TableCell>
                  <TableCell>
                    {l.success ? (
                      <span className="inline-flex items-center gap-1 text-green-700 text-sm">
                        <CheckCircle2 className="h-3 w-3" /> OK
                        {l.statusCode && <span className="text-muted-foreground text-xs ml-1">({l.statusCode})</span>}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-700 text-sm" title={l.error || ""}>
                        <AlertCircle className="h-3 w-3" /> Falha
                        {l.statusCode && <span className="text-muted-foreground text-xs ml-1">({l.statusCode})</span>}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {Array.isArray(logs) && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                    <FileText className="h-6 w-6 mx-auto mb-2 opacity-40" />
                    {logs.length === 0
                      ? "Nenhum log ainda. Os logs aparecem aqui quando algum evento dispara — receba uma mensagem no WhatsApp pra testar."
                      : "Nenhum log bate com esse filtro."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
