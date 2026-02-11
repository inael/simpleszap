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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function TemplatesPage() {
  const { organization } = useOrganization();
  const orgId = organization?.id;

  const { data: templates, mutate } = useSWR(
    orgId ? ["/templates", orgId] : null,
    ([url, oid]) => api.get(url, { headers: { "x-org-id": oid } }).then(res => res.data)
  );

  const [name, setName] = useState("");
  const [body, setBody] = useState("");

  const addTemplate = async () => {
    if (!name || !body) return toast.error("Informe nome e conteúdo");
    try {
      await api.post("/templates", { name, body }, { headers: { "x-org-id": orgId as string } });
      setName(""); setBody("");
      mutate();
      toast.success("Template criado");
    } catch {
      toast.error("Erro ao criar template");
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/templates/${id}`, { headers: { "x-org-id": orgId as string } });
      mutate();
      toast.success("Template removido");
    } catch {
      toast.error("Erro ao remover");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">Crie e gerencie templates de mensagens.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Boas-vindas" />
          </div>
          <div className="space-y-1">
            <Label>Conteúdo</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Olá {{nome}}, seja bem-vindo!" />
          </div>
          <Button onClick={addTemplate}>Adicionar</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Conteúdo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates?.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell>{t.name}</TableCell>
                  <TableCell className="max-w-[400px] truncate">{t.body}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" onClick={() => remove(t.id)}>Remover</Button>
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
