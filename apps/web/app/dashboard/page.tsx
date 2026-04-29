"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, MessageSquare, AlertCircle, AlertTriangle } from "lucide-react";
import useSWR from "swr";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type DashboardMetrics = {
  totalInstances: number;
  messagesSent: number;
  messagesLast7Days: number[];
  recentActivity: { id: string; action: string; createdAt: string }[];
};

function dayLabelsPt(): string[] {
  const labels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    labels.push(
      d.toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
      })
    );
  }
  return labels;
}

export default function DashboardPage() {
  const { getToken, user } = useAuth();
  const orgId = user?.sub;

  const { data: me } = useSWR<{ cpfCnpj: string | null }>(
    orgId ? ["/me", orgId] : null,
    async ([url, oid]: [string, string]) => {
      const token = await getToken();
      return api.get(url, { headers: { "x-org-id": oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then((r) => r.data);
    }
  );

  const { data: metrics, error, isLoading } = useSWR<DashboardMetrics>(
    orgId ? ["/dashboard/metrics", orgId] : null,
    async ([url, oid]: [string, string]) => {
      const token = await getToken();
      return api
        .get(url, { headers: { "x-org-id": oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
        .then((res) => res.data);
    }
  );

  const chartDays = metrics?.messagesLast7Days ?? [];
  const maxVal = Math.max(1, ...chartDays);
  const labels = dayLabelsPt();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da sua conta e atividade recente.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>Erro ao carregar métricas. Verifique sua conexão e tente novamente.</p>
        </div>
      )}

      {me && !me.cpfCnpj && (
        <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-medium">Complete seu cadastro</p>
            <p className="text-amber-800/80">
              Para assinar planos pagos, cadastre seu CPF/CNPJ em{" "}
              <Link href="/dashboard/settings" className="underline font-medium">Configurações</Link>.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Instâncias</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : metrics?.totalInstances ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensagens (hoje)</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : metrics?.messagesSent ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status do Serviço</CardTitle>
            <AlertCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Operacional</div>
            <p className="text-xs text-muted-foreground">Todos os sistemas funcionando</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Visão geral de envios</CardTitle>
            <p className="text-sm text-muted-foreground font-normal">Últimos 7 dias (mensagens contabilizadas)</p>
          </CardHeader>
          <CardContent className="pl-2">
            {isLoading ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground bg-slate-50 rounded-md">
                Carregando…
              </div>
            ) : (
              <div className="h-[200px] flex flex-col justify-end gap-2">
                <div className="flex items-end justify-between gap-1 h-[140px] border-b border-slate-200 pb-1">
                  {chartDays.map((n, i) => {
                    const barH = Math.round((n / maxVal) * 120);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0">
                        <span className="text-[10px] text-muted-foreground tabular-nums">{n}</span>
                        <div
                          className="w-full max-w-[40px] mx-auto rounded-t bg-primary/80 hover:bg-primary transition-colors min-h-[4px]"
                          style={{ height: `${Math.max(4, barH)}px` }}
                          title={`${labels[i]}: ${n}`}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between gap-1 text-[10px] text-muted-foreground text-center leading-tight">
                  {labels.map((lb, i) => (
                    <span key={i} className="flex-1 truncate">
                      {lb}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Atividade recente</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Carregando…</p>
            ) : metrics?.recentActivity && metrics.recentActivity.length > 0 ? (
              <ul className="space-y-3">
                {metrics.recentActivity.map((item) => (
                  <li key={item.id} className="text-sm border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                    <div className="font-medium text-foreground truncate">{item.action}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma atividade recente registrada.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
