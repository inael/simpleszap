"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useSWR from "swr";
import { api } from "@/lib/api";
import axios from "axios";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";
import { TableLoadingRows } from "@/components/ui/table-loading";

export default function CampaignsPage() {
  const { getToken, user } = useAuth();
  const orgId = user?.sub;
  const { data: campaigns, error: campaignsError, mutate } = useSWR(
    orgId ? ["/campaigns", orgId] : null,
    async ([url, oid]) => {
      const token = await getToken();
      return api.get(url, { headers: { "x-org-id": oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then(res => res.data);
    }
  );
  const { data: instances, error: instancesError } = useSWR(
    orgId ? ["/instances", orgId, "campaigns"] : null,
    async ([url, oid]) => {
      const token = await getToken();
      return api.get(url, { headers: { "x-org-id": oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then(res => res.data);
    }
  );
  const { data: templates, error: templatesError } = useSWR(
    orgId ? ["/templates", orgId, "campaigns"] : null,
    async ([url, oid]) => {
      const token = await getToken();
      return api.get(url, { headers: { "x-org-id": oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then(res => res.data);
    }
  );

  const [name, setName] = useState("");
  const [instanceId, setInstanceId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [segmentTags, setSegmentTags] = useState("");
  const [validationError, setValidationError] = useState("");
  const [creating, setCreating] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  const create = async () => {
    setValidationError("");
    if (!name) { setValidationError("Informe o nome da campanha"); return; }
    if (!instanceId) { setValidationError("Selecione uma instância para criar a campanha"); return; }
    if (creating) return;
    setCreating(true);
    try {
      const token = await getToken();
      await api.post("/campaigns", { name, instanceId, templateId: templateId || undefined, segmentTags: segmentTags ? segmentTags.split(",") : undefined }, { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      setName(""); setInstanceId(""); setTemplateId(""); setSegmentTags("");
      mutate();
      toast.success("Campanha criada");
    } catch {
      toast.error("Erro ao criar campanha");
    } finally {
      setCreating(false);
    }
  };

  const run = async (id: string) => {
    if (runningId) return;
    setRunningId(id);
    try {
      const token = await getToken();
      await api.post(`/campaigns/${id}/run`, {}, { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      mutate();
      toast.success("Campanha executada");
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 403 && e.response?.data?.error === "terms_required") {
        toast.error("Aceite os termos em Envio em massa (config) antes de executar.");
        return;
      }
      toast.error("Erro na execução");
    } finally {
      setRunningId(null);
    }
  };

  const loadError = campaignsError || instancesError || templatesError;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campanhas</h1>
          <p className="text-muted-foreground">Crie e execute envios em massa.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/campaigns/settings">Envio em massa (anti-ban) e termos</Link>
        </Button>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>Erro ao carregar dados. Verifique sua conexão e tente novamente.</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Nova Campanha</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-2">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Instância</Label>
            <Select value={instanceId} onValueChange={setInstanceId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {instances?.map((i: any) => {
                  const ready = i.status === 'connected' || i.status === 'open';
                  return (
                    <SelectItem key={i.id} value={i.id} disabled={!ready}>
                      <span className="flex items-center gap-2">
                        <span>{i.name}</span>
                        <span className={`text-[10px] uppercase tracking-wide ${ready ? 'text-green-600' : 'text-amber-600'}`}>
                          {ready ? '✓ conectado' : `· ${i.status || 'aguardando'}`}
                        </span>
                      </span>
                    </SelectItem>
                  );
                })}
                {!instances?.length && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma instância. Crie uma em Instâncias.</div>
                )}
              </SelectContent>
            </Select>
            {instances && instances.length > 0 && !instances.some((i: any) => i.status === 'connected' || i.status === 'open') && (
              <p className="text-xs text-amber-600">⚠ Conecte uma instância em <a href="/dashboard/instances" className="underline">Instâncias</a> antes de criar campanha.</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Template (obrigatório)</Label>
            {Array.isArray(templates) && templates.length === 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 space-y-2">
                <p>Você ainda não tem nenhum template. Toda campanha precisa de um template com 3 variantes (anti-banimento WhatsApp).</p>
                <Link href="/dashboard/templates" className="inline-flex items-center gap-1 font-semibold underline">
                  Criar template agora →
                </Link>
              </div>
            ) : (
              <>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((t: any) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Cada mensagem da campanha sorteia entre as 3 variantes do template — protege contra detecção de spam.{" "}
                  <Link href="/dashboard/templates" className="underline">Gerenciar templates</Link>
                </p>
              </>
            )}
          </div>
          <div className="space-y-1">
            <Label>Tags do Segmento</Label>
            <Input value={segmentTags} onChange={(e) => setSegmentTags(e.target.value)} placeholder="vip,leads" />
          </div>
          <div className="md:col-span-4 flex flex-col gap-2">
            {validationError && <p className="text-sm text-red-600">{validationError}</p>}
            <Button
              onClick={create}
              disabled={
                creating ||
                !templateId ||
                !instances?.some((i: any) => i.id === instanceId && (i.status === 'connected' || i.status === 'open'))
              }
              title={
                !templateId ? "Selecione um template (obrigatório)" :
                !instances?.some((i: any) => i.id === instanceId && (i.status === 'connected' || i.status === 'open')) ? "Conecte uma instância antes" :
                "Criar campanha"
              }
            >
              {creating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...</>
              ) : (
                "Criar"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Campanhas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns === undefined && !campaignsError && (
                <TableLoadingRows colSpan={3} />
              )}
              {campaigns?.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.status}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" onClick={() => run(c.id)} disabled={runningId === c.id}>
                      {runningId === c.id ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Executando...</>
                      ) : (
                        "Executar"
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {Array.isArray(campaigns) && campaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">Nenhuma campanha</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
