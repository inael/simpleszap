"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useOrganization } from "@clerk/nextjs";
import { useState } from "react";
import { toast } from "sonner";

export default function WebhooksPage() {
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const { data: configs, mutate } = useSWR(
    orgId ? ["/webhooks/config", orgId] : null,
    ([url, oid]) => api.get(url, { headers: { "x-org-id": oid } }).then(res => res.data)
  );
  const { data: logs } = useSWR(
    orgId ? ["/webhooks/logs", orgId] : null,
    ([url, oid]) => api.get(url, { headers: { "x-org-id": oid } }).then(res => res.data)
  );

  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [events, setEvents] = useState("message.sent,message.failed");

  const add = async () => {
    if (!url || !secret) return toast.error("Informe URL e secret");
    try {
      await api.post("/webhooks/config", { url, secret, events: events.split(",") }, { headers: { "x-org-id": orgId as string } });
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
            <Input value={events} onChange={(e) => setEvents(e.target.value)} placeholder="message.sent,message.failed" />
          </div>
          <Button onClick={add}>Adicionar</Button>
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
