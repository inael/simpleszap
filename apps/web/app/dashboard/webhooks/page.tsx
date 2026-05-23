"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AlertCircle, Globe, Smartphone, Info, CheckCircle2, FileText } from "lucide-react";

type EventDef = {
  key: string;
  category: string;
  label: string;
  description: string;
};

const AVAILABLE_EVENTS: EventDef[] = [
  { key: "message.sent",                category: "Saída",       label: "Mensagem enviada",          description: "Sua API/dashboard enviou uma mensagem com sucesso." },
  { key: "message.failed",              category: "Saída",       label: "Falha de envio",            description: "Tentativa de envio falhou (erro Evolution, sem internet, etc)." },
  { key: "message.received",            category: "Entrada",     label: "Mensagem recebida (texto)", description: "Lead/contato te mandou uma mensagem de texto." },
  { key: "message.audio.received",      category: "Entrada",     label: "Áudio recebido",            description: "Lead te mandou um áudio. mediaUrl no payload." },
  { key: "message.image.received",      category: "Entrada",     label: "Imagem recebida",           description: "Lead te mandou uma imagem." },
  { key: "message.video.received",      category: "Entrada",     label: "Vídeo recebido",            description: "Lead te mandou um vídeo." },
  { key: "message.document.received",   category: "Entrada",     label: "Documento recebido",        description: "Lead te mandou um PDF/arquivo." },
  { key: "message.location.received",   category: "Entrada",     label: "Localização recebida",      description: "Lead compartilhou localização." },
  { key: "message.reaction",            category: "Interação",   label: "Reação a mensagem",         description: "Alguém reagiu a uma mensagem (emoji)." },
  { key: "message.delivered",           category: "Status",      label: "Mensagem entregue",         description: "WhatsApp confirmou entrega no dispositivo do destinatário." },
  { key: "message.read",                category: "Status",      label: "Mensagem lida",             description: "Destinatário abriu a conversa e leu sua mensagem." },
  { key: "instance.connected",          category: "Instância",   label: "Instância conectada",       description: "Pareamento concluído — número online." },
  { key: "instance.disconnected",       category: "Instância",   label: "Instância desconectada",    description: "Conexão caiu (celular offline, deslogou, etc)." },
  { key: "instance.qrcode.generated",   category: "Instância",   label: "QR code gerado",            description: "Novo QR disponível pra escanear." },
  { key: "contact.added",               category: "Contatos",    label: "Contato sincronizado",      description: "Contato apareceu no WhatsApp do número." },
  { key: "chat.presence",               category: "Interação",   label: "Presença (typing/áudio)",   description: "Mostra quando o contato está digitando ou gravando áudio." },
];

const CATEGORY_ORDER = ["Saída", "Entrada", "Status", "Instância", "Interação", "Contatos"] as const;

const DEFAULT_SELECTED = ["message.sent", "message.failed"];

export default function WebhooksPage() {
  const { getToken, user } = useAuth();
  const orgId = user?.sub;
  const { data: configs, error: configsError, mutate } = useSWR(
    orgId ? ["/webhooks/config", orgId] : null,
    async ([url, oid]) => {
      const token = await getToken();
      return api.get(url, { headers: { "x-org-id": oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then(res => res.data);
    }
  );
  const { data: logs } = useSWR(
    orgId ? ["/webhooks/logs", orgId] : null,
    async ([url, oid]) => {
      const token = await getToken();
      return api.get(url, { headers: { "x-org-id": oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then(res => res.data);
    }
  );
  const { data: instances } = useSWR<Array<{ id: string; name: string; status: string }>>(
    orgId ? ["/instances", orgId, "webhooks"] : null,
    async ([u, oid]: [string, string]) => {
      const token = await getToken();
      return api.get(u, { headers: { "x-org-id": oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then(res => res.data);
    }
  );

  const instanceMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of instances || []) m.set(i.id, i.name);
    return m;
  }, [instances]);

  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [applyTo, setApplyTo] = useState<string>("global"); // "global" ou instanceId
  const [selectedEvents, setSelectedEvents] = useState<string[]>(DEFAULT_SELECTED);
  const [lastCreated, setLastCreated] = useState<{ url: string; events: number; scope: string } | null>(null);

  const groupedEvents = useMemo(() => {
    const groups: Record<string, EventDef[]> = {};
    for (const ev of AVAILABLE_EVENTS) {
      if (!groups[ev.category]) groups[ev.category] = [];
      groups[ev.category].push(ev);
    }
    return CATEGORY_ORDER
      .filter((cat) => groups[cat] && groups[cat].length > 0)
      .map((cat) => ({ category: cat, events: groups[cat] }));
  }, []);

  const toggleEvent = (key: string) => {
    setSelectedEvents((prev) =>
      prev.includes(key) ? prev.filter((v) => v !== key) : [...prev, key]
    );
  };

  const selectAll = () => setSelectedEvents(AVAILABLE_EVENTS.map((e) => e.key));
  const clearAll = () => setSelectedEvents([]);

  const add = async () => {
    if (!orgId) return toast.error("Erro de autenticação.");
    if (!url || !secret) return toast.error("Informe URL e secret");
    if (selectedEvents.length === 0) return toast.error("Selecione ao menos um evento");
    try {
      const token = await getToken();
      await api.post(
        "/webhooks/config",
        {
          url,
          secret,
          events: selectedEvents,
          instanceId: applyTo === "global" ? null : applyTo,
        },
        { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      const scopeLabel = applyTo === "global"
        ? "todas as instâncias"
        : `instância "${instanceMap.get(applyTo) || applyTo}"`;
      setLastCreated({ url, events: selectedEvents.length, scope: scopeLabel });
      setUrl(""); setSecret("");
      setApplyTo("global");
      setSelectedEvents(DEFAULT_SELECTED);
      mutate();
      toast.success("Webhook configurado");
      // Auto-esconde o banner após 8s
      setTimeout(() => setLastCreated(null), 8000);
    } catch {
      toast.error("Erro ao configurar webhook");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground">Configure endpoints para receber eventos.</p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-md border border-sky-200 bg-sky-50 p-4">
        <Info className="h-5 w-5 flex-shrink-0 mt-0.5 text-sky-600" />
        <div className="text-sm text-sky-900 space-y-2">
          <p>
            <strong>Como funciona o roteamento</strong>
          </p>
          <p>
            Por padrão, cada webhook que você adicionar aqui é <strong>Global</strong> — recebe os eventos de <strong>todas as instâncias</strong> dessa conta.
            Isso cobre 99% dos casos: 1 endpoint do seu sistema (n8n, backend, etc) acumulando tudo num só lugar.
          </p>
          <p>
            Quer comportamento diferente pra uma instância específica? (ex: instância de testes mandando pra outro endpoint,
            ou um cliente que deve mandar só pra um sistema dele) Você pode criar webhooks com <strong>"Aplicar a" = instância X</strong>.
            Quando uma instância tem override próprio, o global <strong>deixa de receber</strong> eventos daquela instância — só o override recebe (estilo Stripe).
          </p>
        </div>
      </div>

      {configsError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>Erro ao carregar webhooks. Verifique sua conexão e tente novamente.</p>
        </div>
      )}

      {lastCreated && (
        <div className="flex items-start gap-3 rounded-md border border-green-200 bg-green-50 p-4 text-green-900">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5 text-green-600" />
          <div>
            <p className="font-semibold">Webhook adicionado!</p>
            <p className="text-sm">
              <code className="text-xs">{lastCreated.url}</code> agora vai receber{" "}
              <strong>{lastCreated.events}</strong> {lastCreated.events === 1 ? "evento" : "eventos"} de{" "}
              <strong>{lastCreated.scope}</strong>. Veja abaixo em "Configurações" e teste mandando uma mensagem.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Novo Webhook</CardTitle>
          <p className="text-sm text-muted-foreground">
            Um webhook é uma URL do <strong>seu sistema</strong> (n8n, backend próprio, Zapier, etc) que o SimplesZap vai chamar
            via <code className="text-xs">POST</code> sempre que algo acontecer no WhatsApp dessa conta — mensagem chegou, foi lida,
            instância desconectou, etc. Cada POST vem com header <code className="text-xs">x-webhook-signature</code> assinado
            com HMAC SHA-256 + seu secret pra você validar que veio de nós.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://n8n.suaempresa.com/webhook/abc" />
              <p className="text-xs text-muted-foreground">Endpoint público do seu sistema que aceita POST com JSON.</p>
            </div>
            <div className="space-y-1">
              <Label>Secret</Label>
              <Input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="qualquer string aleatória" />
              <p className="text-xs text-muted-foreground">Usado pra assinar cada POST (header x-webhook-signature). Guarde no seu sistema.</p>
            </div>
            <div className="space-y-1">
              <Label>Aplicar a</Label>
              <Select value={applyTo} onValueChange={setApplyTo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">
                    <span className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-sky-600" />
                      Global (todas as instâncias)
                    </span>
                  </SelectItem>
                  {(instances ?? []).map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      <span className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-violet-600" />
                        Apenas {i.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                <strong>Global</strong> = recebe de <strong>todas</strong> as instâncias. Escolha uma instância só se quiser
                comportamento diferente pra ela (override sobrescreve o global naquela instância).
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <Label>Eventos</Label>
                <p className="text-xs text-muted-foreground">
                  {selectedEvents.length} de {AVAILABLE_EVENTS.length} eventos selecionados
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                  Selecionar todos
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={clearAll}>
                  Limpar todos
                </Button>
              </div>
            </div>

            <div className="rounded-md border bg-background divide-y">
              {groupedEvents.map(({ category, events }) => (
                <div key={category} className="p-3 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {category}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {events.map((ev) => {
                      const checked = selectedEvents.includes(ev.key);
                      return (
                        <label
                          key={ev.key}
                          className="flex items-start gap-2 text-sm cursor-pointer rounded-md p-2 hover:bg-muted/50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={checked}
                            onChange={() => toggleEvent(ev.key)}
                          />
                          <div className="space-y-0.5">
                            <div className="font-medium leading-tight">{ev.label}</div>
                            <div className="text-xs text-muted-foreground leading-snug">
                              {ev.description}
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground/80">
                              {ev.key}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(() => {
            const missing: string[] = [];
            if (!url.trim()) missing.push("URL");
            if (!secret.trim()) missing.push("Secret");
            if (selectedEvents.length === 0) missing.push("ao menos 1 evento");
            const ready = missing.length === 0;
            return (
              <div className="space-y-2">
                {!ready && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div>
                      Faltando: <strong>{missing.join(", ")}</strong>.
                      {!url.trim() && (
                        <> Role para o topo do form e preencha a <strong>URL</strong> do seu sistema externo (ex: <code className="text-xs">https://n8n.suaempresa.com/webhook/abc</code>).</>
                      )}
                    </div>
                  </div>
                )}
                <Button
                  onClick={add}
                  disabled={!orgId || !ready}
                  title={ready ? "Salvar webhook" : `Preencha: ${missing.join(", ")}`}
                >
                  Adicionar
                </Button>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
          <p className="text-sm text-muted-foreground">
            Webhooks cadastrados nessa conta. <strong>Global</strong> = recebe eventos de todas as instâncias.
            Quando vinculado a uma instância específica, sobrescreve o global naquela instância (estilo Stripe).
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aplica a</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Eventos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
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
                    <TableCell className="font-mono text-xs">{c.url}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(() => {
                        try {
                          const arr = JSON.parse(c.events) as string[];
                          if (arr.length <= 3) return arr.join(", ");
                          return (
                            <span title={arr.join("\n")}>
                              {arr.slice(0, 3).join(", ")} <span className="font-semibold text-foreground">+{arr.length - 3}</span>
                            </span>
                          );
                        } catch {
                          return c.events;
                        }
                      })()}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!configs?.length && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                    Nenhum webhook configurado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logs de entrega</CardTitle>
          <p className="text-sm text-muted-foreground">
            Histórico das últimas tentativas de entrega pros seus webhooks. <strong>OK</strong> = seu sistema respondeu HTTP 2xx.
            <strong> Falha</strong> = seu endpoint retornou erro ou estava fora do ar.
          </p>
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
              {logs?.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell>{new Date(l.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-xs">{l.event}</TableCell>
                  <TableCell>
                    {l.success ? (
                      <span className="inline-flex items-center gap-1 text-green-700 text-sm">
                        <CheckCircle2 className="h-3 w-3" /> OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-700 text-sm" title={l.error || ''}>
                        <AlertCircle className="h-3 w-3" /> Falha
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!logs?.length && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                    <FileText className="h-6 w-6 mx-auto mb-2 opacity-40" />
                    Nenhum log ainda. Os logs aparecem aqui quando algum evento dispara — receba uma mensagem no WhatsApp pra testar.
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
