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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function CampaignsPage() {
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const { data: campaigns, mutate } = useSWR(
    orgId ? ["/campaigns", orgId] : null,
    ([url, oid]) => api.get(url, { headers: { "x-org-id": oid } }).then(res => res.data)
  );
  const { data: instances } = useSWR(
    orgId ? ["/instances", orgId] : null,
    ([url, oid]) => api.get(url, { headers: { "x-org-id": oid } }).then(res => res.data)
  );
  const { data: templates } = useSWR(
    orgId ? ["/templates", orgId] : null,
    ([url, oid]) => api.get(url, { headers: { "x-org-id": oid } }).then(res => res.data)
  );

  const [name, setName] = useState("");
  const [instanceId, setInstanceId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [segmentTags, setSegmentTags] = useState("");

  const create = async () => {
    if (!name || !instanceId) return toast.error("Informe nome e instância");
    try {
      await api.post("/campaigns", { name, instanceId, templateId: templateId || undefined, segmentTags: segmentTags ? segmentTags.split(",") : undefined }, { headers: { "x-org-id": orgId as string } });
      setName(""); setInstanceId(""); setTemplateId(""); setSegmentTags("");
      mutate();
      toast.success("Campanha criada");
    } catch {
      toast.error("Erro ao criar campanha");
    }
  };

  const run = async (id: string) => {
    try {
      await api.post(`/campaigns/${id}/run`, {}, { headers: { "x-org-id": orgId as string } });
      mutate();
      toast.success("Campanha executada");
    } catch {
      toast.error("Erro na execução");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campanhas</h1>
          <p className="text-muted-foreground">Crie e execute envios em massa.</p>
        </div>
      </div>

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
                {instances?.map((i: any) => (<SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((t: any) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Tags do Segmento</Label>
            <Input value={segmentTags} onChange={(e) => setSegmentTags(e.target.value)} placeholder="vip,leads" />
          </div>
          <Button onClick={create}>Criar</Button>
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
              {campaigns?.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.status}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" onClick={() => run(c.id)}>Executar</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
