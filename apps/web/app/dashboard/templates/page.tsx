"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

const TEMPLATE_VARIABLES = [
  { label: "Nome do contato", value: "{{name}}" },
  { label: "Telefone do contato", value: "{{phone}}" },
] as const;

export default function TemplatesPage() {
  const { getToken, user } = useAuth();
  const orgId = user?.sub;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { data: templates, error: templatesError, mutate } = useSWR(
    orgId ? ["/templates", orgId] : null,
    async ([url, oid]) => {
      const token = await getToken();
      return api.get(url, { headers: { "x-org-id": oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then(res => res.data);
    }
  );

  const [name, setName] = useState("");
  const [body, setBody] = useState("");

  const insertVariable = (variable: string) => {
    const el = textareaRef.current;
    if (!el) {
      setBody((prev) => prev + variable);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + variable + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + variable.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const addTemplate = async () => {
    if (!orgId) return toast.error("Erro de autenticação.");
    if (!name || !body) return toast.error("Informe nome e conteúdo");
    try {
      const token = await getToken();
      await api.post("/templates", { name, body }, { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      setName(""); setBody("");
      mutate();
      toast.success("Template criado");
    } catch {
      toast.error("Erro ao criar template");
    }
  };

  const remove = async (id: string) => {
    try {
      const token = await getToken();
      await api.delete(`/templates/${id}`, { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
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

      {templatesError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>Erro ao carregar templates. Verifique sua conexão e tente novamente.</p>
        </div>
      )}

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
            <Textarea ref={textareaRef} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Olá {{name}}, seja bem-vindo!" />
          </div>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_VARIABLES.map((v) => (
              <Button key={v.value} type="button" variant="outline" size="sm" onClick={() => insertVariable(v.value)}>
                {v.label}
              </Button>
            ))}
          </div>
          <Button onClick={addTemplate} disabled={!orgId}>Adicionar</Button>
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
