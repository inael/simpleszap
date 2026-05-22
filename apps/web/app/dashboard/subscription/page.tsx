"use client";

import useSWR from "swr";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Plus, Trash2, Crown, Sparkles, ExternalLink, Loader2, CheckCircle2 } from "lucide-react";

type BillingSummary = {
  instances: Array<{
    id: string;
    name: string;
    status: string;
    subscriptionStatus: string | null;
    pricePerMonthCents: number;
    messagesIncluded: number;
    usedToday: number;
    paidUntil: string | null;
  }>;
  addons: Array<{
    id: string;
    status: string;
    messagesPerDay: number;
    pricePerMonthCents: number;
    paidUntil: string | null;
  }>;
  pool: { limit: number; usage: number; remaining: number };
  totalMonthlyCents: number;
  vipUntil: string | null;
  defaults: {
    instancePriceCents: number;
    instanceMessagesIncluded: number;
    addonPriceCents: number;
    addonMessagesPerDay: number;
  };
};

const cents = (c: number) => `R$ ${(c / 100).toFixed(2).replace(".", ",")}`;

export default function SubscriptionPage() {
  const { getToken, user } = useAuth();
  const orgId = user?.sub;
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetcher = async ([url, oid]: [string, string]) => {
    const token = await getToken();
    return api.get(url, { headers: { "x-org-id": oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then(r => r.data);
  };

  const { data, mutate } = useSWR<BillingSummary>(
    orgId ? ["/me/billing", orgId as string] : null, fetcher, { refreshInterval: 8000 }
  );

  const subscribeInstance = async (instanceId: string) => {
    if (!orgId) return;
    setBusyId(instanceId);
    try {
      const token = await getToken();
      const res = await api.post(`/instance/${instanceId}/subscribe`, {}, { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      mutate();
      if (res.data?.invoiceUrl) {
        window.open(res.data.invoiceUrl, "_blank");
        toast.success("Pagamento aberto em nova aba.");
      } else {
        toast.success("Assinatura criada — aguardando pagamento.");
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Erro ao assinar.";
      toast.error(typeof msg === "string" ? msg : "Erro ao assinar.");
    } finally {
      setBusyId(null);
    }
  };

  const cancelInstance = async (instanceId: string) => {
    if (!orgId || !confirm("Cancelar assinatura desta instância? Você perde o cap de mensagens dela.")) return;
    setBusyId(instanceId);
    try {
      const token = await getToken();
      await api.delete(`/instance/${instanceId}/subscribe`, { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      mutate();
      toast.success("Assinatura cancelada.");
    } catch { toast.error("Erro ao cancelar."); }
    finally { setBusyId(null); }
  };

  const createAddon = async () => {
    if (!orgId) return;
    setBusyId("__addon__");
    try {
      const token = await getToken();
      const res = await api.post(`/messages/addon`, {}, { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      mutate();
      if (res.data?.invoiceUrl) {
        window.open(res.data.invoiceUrl, "_blank");
        toast.success("Pagamento aberto em nova aba.");
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Erro ao adicionar lote.";
      toast.error(typeof msg === "string" ? msg : "Erro ao adicionar lote.");
    } finally { setBusyId(null); }
  };

  const cancelAddon = async (id: string) => {
    if (!orgId || !confirm("Cancelar este lote de mensagens?")) return;
    setBusyId(id);
    try {
      const token = await getToken();
      await api.delete(`/messages/addon/${id}`, { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      mutate();
      toast.success("Lote cancelado.");
    } catch { toast.error("Erro ao cancelar."); }
    finally { setBusyId(null); }
  };

  const vipActive = !!(data?.vipUntil && new Date(data.vipUntil) > new Date());
  const defaults = data?.defaults;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assinatura</h1>
        <p className="text-muted-foreground">
          Gerencie suas instâncias pagas e o pool extra de mensagens.
        </p>
      </div>

      {vipActive && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="pt-6 flex items-center gap-3">
            <Crown className="h-6 w-6 text-purple-600" />
            <div>
              <p className="font-semibold text-purple-900">Cortesia VIP IT Booster ativa</p>
              <p className="text-sm text-purple-800">
                Sua conta tem acesso ilimitado até {new Date(data!.vipUntil!).toLocaleDateString("pt-BR")}. Nenhuma cobrança.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Total mensal</p>
            <p className="text-3xl font-bold">{cents(data?.totalMonthlyCents || 0)}</p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <p className="text-muted-foreground">Instâncias pagas</p>
              <p className="font-semibold text-lg">
                {data?.instances.filter(i => i.subscriptionStatus === "active").length || 0}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Pool extra</p>
              <p className="font-semibold text-lg">+{data?.pool.limit || 0}/dia</p>
            </div>
            <div>
              <p className="text-muted-foreground">Disponível hoje</p>
              <p className="font-semibold text-lg text-green-600">{data?.pool.remaining ?? 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instâncias</CardTitle>
          <CardDescription>
            Free: 1 instância grátis com 100 msgs/dia. A partir da 2ª, ou pra ter cap maior, assine: {cents(defaults?.instancePriceCents || 5900)}/mês por instância (inclui {defaults?.instanceMessagesIncluded || 300} msgs/dia cada).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data?.instances.map((inst) => {
            const isActive = inst.subscriptionStatus === "active";
            const isPending = inst.subscriptionStatus === "pending";
            return (
              <div key={inst.id} className="flex items-center justify-between p-3 rounded-md border">
                <div className="flex items-center gap-3">
                  <Smartphone className={`h-5 w-5 ${isActive ? "text-green-600" : "text-zinc-400"}`} />
                  <div>
                    <p className="font-medium">{inst.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-green-700">
                          <CheckCircle2 className="h-3 w-3" /> Assinatura ativa · {inst.usedToday}/{inst.messagesIncluded} hoje
                          {inst.paidUntil && <span className="text-muted-foreground"> · próx. cobrança {new Date(inst.paidUntil).toLocaleDateString("pt-BR")}</span>}
                        </span>
                      ) : isPending ? (
                        <span className="text-amber-600">Aguardando pagamento</span>
                      ) : (
                        <span className="text-muted-foreground">Grátis · {inst.usedToday}/100 hoje</span>
                      )}
                    </p>
                  </div>
                </div>
                <div>
                  {isActive ? (
                    <Button variant="outline" size="sm" onClick={() => cancelInstance(inst.id)} disabled={busyId === inst.id}>
                      {busyId === inst.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                      Cancelar
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => subscribeInstance(inst.id)} disabled={busyId === inst.id || vipActive}>
                      {busyId === inst.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ExternalLink className="h-4 w-4 mr-1" />}
                      Assinar {cents(defaults?.instancePriceCents || 5900)}/mês
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {!data?.instances.length && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma instância ainda. <Link href="/dashboard/instances" className="text-primary underline">Criar uma</Link>.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Mensagens extras
              </CardTitle>
              <CardDescription>
                Cada lote dá +{defaults?.addonMessagesPerDay || 100} msgs/dia compartilhadas entre todas as instâncias.
                Quando uma instância estoura o cap próprio, consome desse pool. {cents(defaults?.addonPriceCents || 1500)}/mês por lote.
              </CardDescription>
            </div>
            <Button onClick={createAddon} disabled={busyId === "__addon__" || vipActive}>
              {busyId === "__addon__" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Adicionar lote
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {data?.addons.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">Nenhum lote ativo.</p>
          )}
          {data?.addons.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-3 rounded-md border">
              <div>
                <p className="font-medium">+{a.messagesPerDay} msgs/dia</p>
                <p className="text-xs text-muted-foreground">
                  {cents(a.pricePerMonthCents)}/mês
                  {a.paidUntil && <> · próx. cobrança {new Date(a.paidUntil).toLocaleDateString("pt-BR")}</>}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => cancelAddon(a.id)} disabled={busyId === a.id}>
                {busyId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                Cancelar
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Pagamentos via Asaas. Você pode cancelar a qualquer momento — a cobrança para no próximo ciclo.
      </p>
    </div>
  );
}
