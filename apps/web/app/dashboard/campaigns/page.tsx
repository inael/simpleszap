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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

export default function CampaignsPage() {
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const orgId = organization?.id;
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

  const create = async () => {
    setValidationError("");
    if (!name) { setValidationError("Informe o nome da campanha"); return; }
    if (!instanceId) { setValidationError("Selecione uma instância para criar a campanha"); return; }
    try {
      const token = await getToken();
      await api.post("/campaigns", { name, instanceId, templateId: templateId || undefined, segmentTags: segmentTags ? segmentTags.split(",") : undefined }, { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      setName(""); setInstanceId(""); setTemplateId(""); setSegmentTags("");
      mutate();
      toast.success("Campanha criada");
    } catch {
      toast.error("Erro ao criar campanha");
    }
  };

  const run = async (id: string) => {
    try {
      const token = await getToken();
      await api.post(`/campaigns/${id}/run`, {}, { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      mutate();
      toast.success("Campanha executada");
    } catch {
      toast.error("Erro na execução");
    }
  };

  const loadError = campaignsError || instancesError || templatesError;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campanhas</h1>
          <p className="text-muted-foreground">Crie e execute envios em massa.</p>
        </div>
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
          <div className="md:col-span-4 flex flex-col gap-2">
            {validationError && <p className="text-sm text-red-600">{validationError}</p>}
            <Button onClick={create}>Criar</Button>
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
