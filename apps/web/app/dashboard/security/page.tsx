"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Globe, Key, Smartphone, RefreshCw } from "lucide-react";
import useSWR from "swr";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";

export default function SecurityPage() {
  const { getToken, user } = useAuth();
  const orgId = user?.sub;
  const [ipLines, setIpLines] = useState("");
  const [savingIp, setSavingIp] = useState(false);

  const { data, mutate } = useSWR(
    orgId ? ["/user/settings", orgId, "security"] : null,
    async ([url, oid]) => {
      const token = await getToken();
      const res = await api.get(url, {
        headers: { "x-org-id": oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      return res.data as {
        ipAllowlist: string[];
        requireClientToken: boolean;
        hasClientToken: boolean;
      };
    }
  );

  useEffect(() => {
    if (data?.ipAllowlist?.length) {
      setIpLines(data.ipAllowlist.join("\n"));
    }
  }, [data?.ipAllowlist]);

  const logtoEndpoint = process.env.NEXT_PUBLIC_LOGTO_ENDPOINT || "https://auth.toolpad.cloud";

  const saveIpList = async () => {
    if (!orgId) return;
    setSavingIp(true);
    try {
      const token = await getToken();
      const list = ipLines
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      await api.put(
        "/user/settings",
        { ipAllowlist: list },
        { headers: { "x-org-id": orgId, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      toast.success("Lista de IPs atualizada");
      mutate();
    } catch {
      toast.error("Erro ao salvar IPs");
    } finally {
      setSavingIp(false);
    }
  };

  const regenerateToken = async () => {
    if (!orgId) return;
    try {
      const token = await getToken();
      const res = await api.post(
        "/user/settings/client-token/regenerate",
        {},
        { headers: { "x-org-id": orgId, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      const plain = res.data?.token as string | undefined;
      if (plain) {
        localStorage.setItem("simpleszap_client_token", plain);
        toast.success("Token gerado. Armazenado neste navegador para chamadas ao painel.");
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(plain);
          toast.message("Token copiado para a área de transferência");
        }
      }
      mutate();
    } catch {
      toast.error("Erro ao gerar token");
    }
  };

  const disableToken = async () => {
    if (!orgId) return;
    try {
      const token = await getToken();
      await api.post(
        "/user/settings/client-token/disable",
        {},
        { headers: { "x-org-id": orgId, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      localStorage.removeItem("simpleszap_client_token");
      toast.success("Token extra desativado");
      mutate();
    } catch {
      toast.error("Erro ao desativar");
    }
  };

  const ipActive = data?.ipAllowlist && data.ipAllowlist.length > 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Segurança</h1>
        <p className="text-muted-foreground">
          Proteja chamadas à API e reduza superfície de abuso.{" "}
          <Link href="/legal/termos-funcionalidades-risco" className="text-primary underline">
            Termos de funcionalidades de risco
          </Link>
        </p>
      </div>

      <Card className="border-pink-100">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex gap-3">
            <Globe className="h-8 w-8 text-pink-500 shrink-0" />
            <div>
              <CardTitle>Restrição de chamadas por IP</CardTitle>
              <CardDescription>Quando configurada, apenas estes IPs podem chamar a API com sua chave.</CardDescription>
            </div>
          </div>
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full ${ipActive ? "bg-green-100 text-green-800" : "bg-pink-100 text-pink-800"}`}
          >
            {ipActive ? "Ativo" : "Inativo"}
          </span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-pink-50 border border-pink-100 px-3 py-2 text-sm text-pink-900">
            {ipActive
              ? `${data?.ipAllowlist?.length} IP(s) na lista. Requisições de outros endereços recebem 403.`
              : "Não há restrições de IP configuradas."}
          </div>
          <div className="space-y-2">
            <Label>Um IP por linha (IPv4 exato)</Label>
            <Textarea
              rows={4}
              placeholder={"203.0.113.10\n198.51.100.0"}
              value={ipLines}
              onChange={(e) => setIpLines(e.target.value)}
            />
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={saveIpList} disabled={savingIp}>
            {savingIp ? "Salvando…" : "Salvar lista de IPs"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-pink-100">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex gap-3">
            <Smartphone className="h-8 w-8 text-pink-500 shrink-0" />
            <div>
              <CardTitle>Autenticação de dois fatores</CardTitle>
              <CardDescription>Conta protegida pelo provedor de identidade (Logto).</CardDescription>
            </div>
          </div>
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-zinc-100 text-zinc-700">Ver no Logto</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-pink-50 border border-pink-100 px-3 py-2 text-sm text-pink-900">
            Configure MFA e senha no painel do Logto (conta centralizada).
          </div>
          <Button variant="outline" asChild>
            <a href={`${logtoEndpoint}/`} target="_blank" rel="noopener noreferrer">
              Abrir conta / segurança no Logto
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-emerald-100">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex gap-3">
            <Key className="h-8 w-8 text-emerald-600 shrink-0" />
            <div>
              <CardTitle>Token de segurança da conta (Client-Token)</CardTitle>
              <CardDescription>
                Quando ativo, chamadas que usam API key (<code className="text-xs">sk_…</code>) devem enviar o header{" "}
                <code className="text-xs">Client-Token</code>.
              </CardDescription>
            </div>
          </div>
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full ${data?.requireClientToken ? "bg-green-100 text-green-800" : "bg-pink-100 text-pink-800"}`}
          >
            {data?.requireClientToken ? "Ativo" : "Inativo"}
          </span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-emerald-50 border border-emerald-100 px-3 py-2 text-sm text-emerald-900">
            {data?.requireClientToken
              ? "O token extra está habilitado. Guarde-o em segredo. O painel pode armazenar uma cópia neste navegador."
              : "Gere um token para exigir o header em integrações com API key."}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Input readOnly value={data?.hasClientToken ? "sz_ct•••••••• (oculto)" : "—"} className="max-w-xs font-mono text-sm" />
            <Button type="button" variant="outline" size="icon" onClick={regenerateToken} title="Gerar novo token">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Insira o token no header <strong>Client-Token</strong> em toda chamada com API key. No navegador, o token pode
            ser salvo em <code>localStorage</code> após gerar.
          </p>
          <div className="flex gap-2">
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={regenerateToken}>
              Gerar / renovar token
            </Button>
            {data?.requireClientToken && (
              <Button variant="destructive" onClick={disableToken}>
                Desativar token extra
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
