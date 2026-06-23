"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Globe, Smartphone, Info, Pencil, Trash2, Zap, Loader2, Plus, CheckCircle2, ArrowLeft } from "lucide-react";
import { TableLoadingRows } from "@/components/ui/table-loading";
import { AVAILABLE_EVENTS, DEFAULT_SELECTED_EVENTS_EVENTS, groupEventsByCategory } from "@/lib/webhook-events";

export default function WebhooksPage() {
  const { getToken, user } = useAuth();
  const orgId = user?.sub;

  const fetcher = async ([url, oid]: [string, string]) => {
    const token = await getToken();
    return api.get(url, { headers: { "x-org-id": oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then(res => res.data);
  };

  const { data: configs, error: configsError, mutate } = useSWR(orgId ? ["/webhooks/config", orgId as string] : null, fetcher);
  const { data: instances } = useSWR<Array<{ id: string; name: string; status: string }>>(
    orgId ? ["/instances", orgId as string, "webhooks"] : null,
    async ([u, oid]: [string, string, string]) => {
      const token = await getToken();
      return api.get(u, { headers: { "x-org-id": oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then(r => r.data);
    }
  );
  const instanceMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of instances || []) m.set(i.id, i.name);
    return m;
  }, [instances]);

  const [mode, setMode] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [applyTo, setApplyTo] = useState<string>("global");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(DEFAULT_SELECTED_EVENTS);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const groupedEvents = useMemo(() => groupEventsByCategory(), []);

  const toggleEvent = (key: string) =>
    setSelectedEvents((prev) => prev.includes(key) ? prev.filter((v) => v !== key) : [...prev, key]);

  const openNew = () => {
    setEditingId(null);
    setUrl(""); setSecret("");
    setApplyTo("global");
    setSelectedEvents(DEFAULT_SELECTED_EVENTS);
    setMode("form");
  };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setUrl(c.url);
    setSecret(c.secret || "");
    setApplyTo(c.instanceId || "global");
    try { setSelectedEvents(JSON.parse(c.events) as string[]); } catch { setSelectedEvents([]); }
    setMode("form");
  };

  const cancelForm = () => {
    if (submitting) return;
    setMode("list");
    setEditingId(null);
  };

  const missing = useMemo(() => {
    const m: string[] = [];
    if (!url.trim()) m.push("URL");
    if (selectedEvents.length === 0) m.push("ao menos 1 evento");
    return m;
  }, [url, secret, selectedEvents]);

  const save = async () => {
    if (submitting) return;
    if (!orgId) return toast.error("Erro de autenticação");
    if (missing.length > 0) return toast.error(`Faltando: ${missing.join(", ")}`);
    setSubmitting(true);
    try {
      const token = await getToken();
      const body = {
        url: url.trim(),
        secret: secret.trim(),
        events: selectedEvents,
        instanceId: applyTo === "global" ? null : applyTo,
      };
      const headers = { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      if (editingId) {
        await api.put(`/webhooks/config/${editingId}`, body, { headers });
        toast.success("Webhook atualizado");
      } else {
        await api.post("/webhooks/config", body, { headers });
        toast.success("Webhook criado!");
      }
      setMode("list");
      setEditingId(null);
      mutate();
    } catch {
      toast.error(editingId ? "Erro ao salvar alterações" : "Erro ao criar webhook");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!orgId || deletingId) return;
    if (!confirm("Excluir esse webhook? Para de receber eventos imediatamente.")) return;
    setDeletingId(id);
    try {
      const token = await getToken();
      await api.delete(`/webhooks/config/${id}`, { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      mutate();
      toast.success("Webhook excluído");
    } catch { toast.error("Erro ao excluir"); }
    finally { setDeletingId(null); }
  };

  const testWebhook = async (id: string) => {
    if (!orgId || testingId) return;
    setTestingId(id);
    try {
      const token = await getToken();
      const res = await api.post(`/webhooks/config/${id}/test`, {}, { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      const { success, statusCode, ms, error } = res.data;
      if (success) toast.success(`Ping OK — ${statusCode} em ${ms}ms`);
      else toast.error(`Falhou: ${error || `HTTP ${statusCode}`} (${ms}ms)`);
    } catch { toast.error("Erro ao disparar teste"); }
    finally { setTestingId(null); }
  };

  const isForm = mode === "form";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webhooks — Configurações</h1>
          <p className="text-muted-foreground">URLs externas que recebem eventos do seu WhatsApp.</p>
        </div>
        {!isForm && (
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Novo webhook
          </Button>
        )}
      </div>

      {!isForm && (
        <div className="flex items-start gap-3 rounded-md border border-sky-200 bg-sky-50 p-4">
          <Info className="h-5 w-5 flex-shrink-0 mt-0.5 text-sky-600" />
          <div className="text-sm text-sky-900 space-y-2">
            <p><strong>Como funciona o roteamento</strong></p>
            <p>
              Webhook <strong>Global</strong> recebe eventos de <strong>todas as instâncias</strong>. Você pode ter quantos quiser (todos recebem em paralelo).
              Quer comportamento diferente pra uma instância específica? Crie um webhook com "Aplicar a = instância X" — ele <strong>sobrescreve</strong> o global naquela instância (estilo Stripe).
            </p>
          </div>
        </div>
      )}

      {configsError && !isForm && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>Erro ao carregar webhooks. Verifique sua conexão e tente novamente.</p>
        </div>
      )}

      {!isForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Webhooks cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aplica a</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Eventos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs === undefined && !configsError && <TableLoadingRows colSpan={4} />}
                {configs?.map((c: any) => {
                  const isGlobal = !c.instanceId;
                  const instName = c.instanceId ? instanceMap.get(c.instanceId) ?? c.instanceId : null;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        {isGlobal ? (
                          <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                            <Globe className="h-3 w-3 mr-1" /> Global
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
                            <Smartphone className="h-3 w-3 mr-1" /> {instName}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-md truncate">{c.url}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {(() => {
                          try {
                            const arr = JSON.parse(c.events) as string[];
                            if (arr.length <= 3) return arr.join(", ");
                            return (
                              <span title={arr.join("\n")}>
                                {arr.slice(0, 3).join(", ")}{" "}
                                <span className="font-semibold text-foreground">+{arr.length - 3}</span>
                              </span>
                            );
                          } catch { return c.events; }
                        })()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => testWebhook(c.id)} disabled={testingId === c.id} title="Disparar ping de teste">
                            {testingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 text-amber-500" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => remove(c.id)} disabled={deletingId === c.id} title="Excluir">
                            {deletingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {Array.isArray(configs) && configs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhum webhook configurado. Clique em <strong>"Novo webhook"</strong> pra criar o primeiro.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle>{editingId ? "Editar webhook" : "Novo webhook"}</CardTitle>
                <CardDescription className="mt-1 max-w-3xl">
                  URL do <strong>seu sistema</strong> (n8n, backend próprio, Zapier, etc) que o SimplesZap vai chamar via <code className="text-xs">POST</code> sempre
                  que um evento do WhatsApp acontecer. Cada POST vem com <code className="text-xs">x-webhook-signature</code> HMAC SHA-256 + seu secret pra validação.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={cancelForm} disabled={submitting}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid md:grid-cols-12 gap-4">
              <div className="space-y-1 md:col-span-5">
                <Label>URL</Label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://n8n.suaempresa.com/webhook/abc" />
                <p className="text-xs text-muted-foreground">Endpoint público do seu sistema que aceita POST com JSON.</p>
              </div>
              <div className="space-y-1 md:col-span-3">
                <Label>Secret</Label>
                <Input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="string aleatória" />
                <p className="text-xs text-muted-foreground">Pra validar assinatura.</p>
              </div>
              <div className="space-y-1 md:col-span-4">
                <Label>Aplicar a</Label>
                <Select value={applyTo} onValueChange={setApplyTo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">
                      <span className="flex items-center gap-2"><Globe className="h-4 w-4 text-sky-600" /> Global (todas)</span>
                    </SelectItem>
                    {(instances ?? []).map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        <span className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-violet-600" /> Apenas {i.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  <strong>Global</strong> = todas as instâncias. Override = só a escolhida (estilo Stripe).
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Label>Eventos <span className="text-xs text-muted-foreground">({selectedEvents.length} de {AVAILABLE_EVENTS.length})</span></Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelectedEvents(AVAILABLE_EVENTS.map((e) => e.key))}>Selecionar todos</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelectedEvents([])}>Limpar</Button>
                </div>
              </div>
              <div className="rounded-md border bg-background divide-y">
                {groupedEvents.map(({ category, events }) => (
                  <div key={category} className="p-3 space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category}</div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {events.map((ev) => {
                        const checked = selectedEvents.includes(ev.key);
                        return (
                          <label key={ev.key} className="flex items-start gap-2 text-sm cursor-pointer rounded-md p-2 hover:bg-muted/50 transition-colors">
                            <input type="checkbox" className="mt-1" checked={checked} onChange={() => toggleEvent(ev.key)} />
                            <div className="space-y-0.5">
                              <div className="font-medium leading-tight">{ev.label}</div>
                              <div className="text-xs text-muted-foreground leading-snug">{ev.description}</div>
                              <div className="text-[10px] font-mono text-muted-foreground/80">{ev.key}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {missing.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>Faltando: <strong>{missing.join(", ")}</strong></div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={cancelForm} disabled={submitting}>Cancelar</Button>
              <Button onClick={save} disabled={submitting || missing.length > 0}>
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                ) : editingId ? (
                  <><CheckCircle2 className="mr-2 h-4 w-4" /> Salvar alterações</>
                ) : (
                  <><Plus className="mr-2 h-4 w-4" /> Criar webhook</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
