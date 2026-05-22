"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

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

  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(DEFAULT_SELECTED);

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
        { url, secret, events: selectedEvents },
        { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      setUrl(""); setSecret("");
      setSelectedEvents(DEFAULT_SELECTED);
      mutate();
      toast.success("Webhook configurado");
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

      {configsError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>Erro ao carregar webhooks. Verifique sua conexão e tente novamente.</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Novo Webhook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <Label>Secret</Label>
              <Input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="secret" />
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

          <div>
            <Button onClick={add} disabled={!orgId}>Adicionar</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Eventos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs?.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{c.url}</TableCell>
                  <TableCell>{c.events}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logs</CardTitle>
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
                  <TableCell>{l.event}</TableCell>
                  <TableCell>{l.success ? 'OK' : 'Falha'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
