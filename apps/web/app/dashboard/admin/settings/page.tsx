"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle, Cloud, Key, Globe, Shield, Webhook } from "lucide-react";
import useSWR from "swr";
import { useAdminApi } from "@/lib/use-admin-api";
import { toast } from "sonner";

interface AsaasConfig {
  apiKey: string | null;
  apiUrl: string | null;
  environment: string | null;
  webhookToken: string | null;
  webhookUrl: string | null;
  isConfigured: boolean;
}

interface SettingsData {
  evolutionApiUrl: string;
  maintenanceMode: boolean;
  defaultPlanId: string;
  asaas: AsaasConfig;
}

export default function AdminSettingsPage() {
  const { adminFetcher, adminPut, adminPost } = useAdminApi();
  const { data, isLoading, mutate } = useSWR<SettingsData>("/admin/settings", adminFetcher);

  // Asaas config form
  const [asaasForm, setAsaasForm] = useState({
    apiKey: "",
    environment: "sandbox" as string,
    webhookUrl: "",
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message?: string; error?: string } | null>(null);
  const [registeringWebhook, setRegisteringWebhook] = useState(false);

  const handleSaveAsaas = async () => {
    if (!asaasForm.apiKey) {
      toast.error("API Key do Asaas é obrigatória");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, string> = {
        apiKey: asaasForm.apiKey,
        environment: asaasForm.environment,
      };

      // Set API URL based on environment
      if (asaasForm.environment === "production") {
        payload.apiUrl = "https://api.asaas.com/api/v3";
      } else {
        payload.apiUrl = "https://sandbox.asaas.com/api/v3";
      }

      await adminPut("/admin/settings/asaas", payload);
      toast.success("Configurações do Asaas salvas!");
      setAsaasForm({ ...asaasForm, apiKey: "" });
      mutate();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await adminPost("/admin/settings/asaas/test", {});
      setTestResult(res.data);
    } catch (err: any) {
      setTestResult({ ok: false, error: err?.response?.data?.error || "Erro na conexão" });
    } finally {
      setTesting(false);
    }
  };

  const handleRegisterWebhook = async () => {
    if (!asaasForm.webhookUrl) {
      toast.error("Informe a URL do webhook");
      return;
    }

    setRegisteringWebhook(true);
    try {
      const res = await adminPost("/admin/settings/asaas/webhook", {
        webhookUrl: asaasForm.webhookUrl,
      });
      toast.success(res.data.message || "Webhook registrado!");
      setAsaasForm({ ...asaasForm, webhookUrl: "" });
      mutate();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Erro ao registrar webhook");
    } finally {
      setRegisteringWebhook(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Configurações do Sistema</h1>
        <p className="text-muted-foreground">
          Configurações globais da plataforma e integrações.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="grid gap-6">
          {/* ─── Asaas Integration ─────────────────────────────── */}
          <Card className="border-blue-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-blue-500" />
                  <CardTitle>Integração Asaas</CardTitle>
                </div>
                {data?.asaas?.isConfigured ? (
                  <Badge className="bg-green-100 text-green-700 border-green-300">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Configurado
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" /> Não configurado
                  </Badge>
                )}
              </div>
              <CardDescription>
                Configure a API do Asaas para cobranças automáticas. Os planos criados no painel serão sincronizados diretamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Status */}
              {data?.asaas?.isConfigured && (
                <div className="rounded-md bg-muted/50 p-4 space-y-2 text-sm">
                  <p><span className="font-medium">API Key:</span> <code className="bg-muted px-1 rounded">{data.asaas.apiKey}</code></p>
                  <p><span className="font-medium">Ambiente:</span> <Badge variant="outline">{data.asaas.environment || "sandbox"}</Badge></p>
                  <p><span className="font-medium">URL da API:</span> <code className="bg-muted px-1 rounded">{data.asaas.apiUrl || "auto"}</code></p>
                  <p>
                    <span className="font-medium">Webhook Token:</span>{" "}
                    {data.asaas.webhookToken
                      ? <code className="bg-muted px-1 rounded">{data.asaas.webhookToken}</code>
                      : <span className="text-orange-600">Não configurado</span>}
                  </p>
                  <p>
                    <span className="font-medium">Webhook URL:</span>{" "}
                    {data.asaas.webhookUrl
                      ? <code className="bg-muted px-1 rounded">{data.asaas.webhookUrl}</code>
                      : <span className="text-orange-600">Não registrado</span>}
                  </p>
                </div>
              )}

              {/* API Key & Environment */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Key className="h-4 w-4" /> Credenciais
                </h3>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>API Key do Asaas</Label>
                    <Input
                      type="password"
                      value={asaasForm.apiKey}
                      onChange={(e) => setAsaasForm({ ...asaasForm, apiKey: e.target.value })}
                      placeholder={data?.asaas?.isConfigured ? "Deixe vazio para manter a atual" : "Cole sua API Key aqui"}
                    />
                    <p className="text-xs text-muted-foreground">
                      Encontre em: Asaas &gt; Minha Conta &gt; Integrações &gt; API Key
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label>Ambiente</Label>
                    <select
                      aria-label="Ambiente Asaas"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={asaasForm.environment}
                      onChange={(e) => setAsaasForm({ ...asaasForm, environment: e.target.value })}
                    >
                      <option value="sandbox">Sandbox (Testes)</option>
                      <option value="production">Produção</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveAsaas} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Salvar Credenciais
                  </Button>
                  {data?.asaas?.isConfigured && (
                    <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
                      {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
                      Testar Conexão
                    </Button>
                  )}
                </div>
                {testResult && (
                  <div className={`rounded-md p-3 text-sm ${testResult.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    {testResult.ok ? (
                      <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {testResult.message}</span>
                    ) : (
                      <span className="flex items-center gap-2"><XCircle className="h-4 w-4" /> {testResult.error}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Webhook Configuration */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Webhook className="h-4 w-4" /> Webhook Automático
                </h3>
                <p className="text-xs text-muted-foreground">
                  Registre o webhook para que o Asaas notifique automaticamente sobre pagamentos confirmados,
                  cancelamentos e atualizações de assinatura. O token de segurança é gerado automaticamente.
                </p>
                <div className="grid gap-2">
                  <Label>URL do Webhook</Label>
                  <Input
                    value={asaasForm.webhookUrl}
                    onChange={(e) => setAsaasForm({ ...asaasForm, webhookUrl: e.target.value })}
                    placeholder={data?.asaas?.webhookUrl || "https://seudominio.com/api/webhooks/asaas"}
                  />
                  <p className="text-xs text-muted-foreground">
                    Deve ser a URL pública da sua API + <code>/webhooks/asaas</code>
                  </p>
                </div>
                <Button onClick={handleRegisterWebhook} disabled={registeringWebhook || !data?.asaas?.isConfigured} variant="outline">
                  {registeringWebhook ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
                  Registrar Webhook no Asaas
                </Button>
                {!data?.asaas?.isConfigured && (
                  <p className="text-xs text-orange-600">Salve as credenciais primeiro para registrar o webhook.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ─── Evolution API ─────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Evolution API</CardTitle>
              <CardDescription>Configuração da integração com WhatsApp.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={data?.evolutionApiUrl === "não configurado" ? "destructive" : "default"}>
                  {data?.evolutionApiUrl}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* ─── Default Plan ──────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Plano Padrão</CardTitle>
              <CardDescription>Plano atribuído automaticamente a novos usuários.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                ID do plano: <code className="bg-muted px-2 py-1 rounded">{data?.defaultPlanId}</code>
              </p>
            </CardContent>
          </Card>

          {/* ─── Maintenance Mode ──────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Modo Manutenção</CardTitle>
              <CardDescription>Quando ativo, usuários não conseguem acessar o sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant={data?.maintenanceMode ? "destructive" : "secondary"}>
                {data?.maintenanceMode ? "Ativo" : "Desativado"}
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
