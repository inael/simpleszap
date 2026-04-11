"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useAuth, useOrganization } from "@clerk/nextjs";
import { useState } from "react";
import { toast } from "sonner";

const WEBHOOK_EVENTS = [
  { label: "Mensagem enviada", value: "message.sent" },
  { label: "Falha ao enviar mensagem", value: "message.failed" },
] as const;

export default function WebhooksPage() {
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const { data: configs, mutate } = useSWR(
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
  const [selectedEvents, setSelectedEvents] = useState<string[]>(WEBHOOK_EVENTS.map(e => e.value));

  const add = async () => {
    if (!orgId) return toast.error("Crie/seleciona uma organização primeiro.");
    if (!url || !secret) return toast.error("Informe URL e secret");
    try {
      const token = await getToken();
      await api.post(
        "/webhooks/config",
        { url, secret, events: selectedEvents },
        { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      setUrl(""); setSecret("");
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

      <Card>
        <CardHeader>
          <CardTitle>Novo Webhook</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-2">
          <div className="space-y-1">
            <Label>URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-1">
            <Label>Secret</Label>
            <Input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="secret" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Eventos</Label>
            <div className="flex flex-wrap gap-2 rounded-md border bg-background p-3">
              {WEBHOOK_EVENTS.map((e) => {
                const checked = selectedEvents.includes(e.value);
                return (
                  <label key={e.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setSelectedEvents((prev) => checked ? prev.filter((v) => v !== e.value) : [...prev, e.value])}
                    />
                    {e.label}
                  </label>
                );
              })}
            </div>
          </div>
          <Button onClick={add} disabled={!orgId}>Adicionar</Button>
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
