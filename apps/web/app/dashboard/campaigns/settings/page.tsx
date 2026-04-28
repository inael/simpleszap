"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import useSWR from "swr";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

type SettingsPayload = {
  campaignJitterMinMs: number;
  campaignJitterMaxMs: number;
  messageVariantA: string | null;
  messageVariantB: string | null;
  messageVariantC: string | null;
  useMessageVariants: boolean;
  bulkMessagingTermsAcceptedAt: string | null;
};

export default function CampaignSafetySettingsPage() {
  const { getToken, user } = useAuth();
  const orgId = user?.sub;

  const { data, mutate } = useSWR(
    orgId ? ["/user/settings", orgId, "campaign"] : null,
    async ([url, oid]) => {
      const token = await getToken();
      const res = await api.get(url, {
        headers: { "x-org-id": oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      return res.data as SettingsPayload;
    }
  );

  const [minMs, setMinMs] = useState("900");
  const [maxMs, setMaxMs] = useState("2200");
  const [va, setVa] = useState("");
  const [vb, setVb] = useState("");
  const [vc, setVc] = useState("");
  const [useVar, setUseVar] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setMinMs(String(data.campaignJitterMinMs));
    setMaxMs(String(data.campaignJitterMaxMs));
    setVa(data.messageVariantA || "");
    setVb(data.messageVariantB || "");
    setVc(data.messageVariantC || "");
    setUseVar(data.useMessageVariants);
  }, [data]);

  const save = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const token = await getToken();
      await api.put(
        "/user/settings",
        {
          campaignJitterMinMs: parseInt(minMs, 10),
          campaignJitterMaxMs: parseInt(maxMs, 10),
          messageVariantA: va || null,
          messageVariantB: vb || null,
          messageVariantC: vc || null,
          useMessageVariants: useVar,
        },
        { headers: { "x-org-id": orgId, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      toast.success("Configurações salvas");
      mutate();
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const acceptTerms = async () => {
    if (!orgId) return;
    try {
      const token = await getToken();
      await api.post(
        "/user/settings/accept-bulk-terms",
        {},
        { headers: { "x-org-id": orgId, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      toast.success("Termos aceitos");
      mutate();
    } catch {
      toast.error("Erro ao registrar aceite");
    }
  };

  const termsOk = !!data?.bulkMessagingTermsAcceptedAt;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Envio em massa — anti-ban</h1>
        <p className="text-muted-foreground">
          Intervalos aleatórios e mensagens A/B/C reduzem padrões repetitivos. Não eliminam risco de bloqueio do WhatsApp.{" "}
          <Link href="/dashboard/security" className="text-primary underline">
            Segurança da API
          </Link>
        </p>
      </div>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <AlertTriangle className="h-5 w-5" />
            Termo de consentimento
          </CardTitle>
          <CardDescription>
            Obrigatório para executar campanhas. Leia os{" "}
            <Link href="/legal/termos-funcionalidades-risco" className="underline font-medium">
              termos de funcionalidades de risco
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4">
          <p className="text-sm text-amber-900">
            Status:{" "}
            <strong>
              {termsOk && data?.bulkMessagingTermsAcceptedAt
                ? `Aceito em ${new Date(data.bulkMessagingTermsAcceptedAt).toLocaleString("pt-BR")}`
                : "Pendente"}
            </strong>
          </p>
          {!termsOk && (
            <Button onClick={acceptTerms} className="bg-amber-700 hover:bg-amber-800 w-fit">
              Li e aceito os termos
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Intervalo entre mensagens (aleatório)</CardTitle>
          <CardDescription>
            Entre cada envio na campanha, o sistema aguarda um tempo aleatório entre o mínimo e o máximo (milissegundos).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Mínimo (ms)</Label>
            <Input type="number" min={200} value={minMs} onChange={(e) => setMinMs(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Máximo (ms)</Label>
            <Input type="number" max={120000} value={maxMs} onChange={(e) => setMaxMs(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Variantes de mensagem (A / B / C)</CardTitle>
          <CardDescription>
            Com variantes ativas, cada envio sorteia um dos textos preenchidos (com{" "}
            <code className="text-xs">{"{{name}} {{phone}}"}</code>
            ). Se nenhuma variante estiver preenchida, usa o template da campanha.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="uv"
              className="h-4 w-4 rounded border"
              checked={useVar}
              onChange={(e) => setUseVar(e.target.checked)}
              aria-label="Usar variantes A, B e C nas mensagens"
            />
            <Label htmlFor="uv">Usar variantes A/B/C no lugar do template da campanha (quando preenchidas)</Label>
          </div>
          <div className="space-y-2">
            <Label>Variante A</Label>
            <Textarea rows={3} value={va} onChange={(e) => setVa(e.target.value)} placeholder="Olá {{name}}, …" />
          </div>
          <div className="space-y-2">
            <Label>Variante B</Label>
            <Textarea rows={3} value={vb} onChange={(e) => setVb(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Variante C</Label>
            <Textarea rows={3} value={vc} onChange={(e) => setVc(e.target.value)} />
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando…" : "Salvar configurações de campanha"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
