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

export default function ContactsPage() {
  const { organization } = useOrganization();
  const orgId = organization?.id;

  const { data: contacts, mutate } = useSWR(
    orgId ? ["/contacts", orgId] : null,
    ([url, oid]) => api.get(url, { headers: { "x-org-id": oid } }).then(res => res.data)
  );

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const addContact = async () => {
    if (!phone) return toast.error("Informe o telefone");
    try {
      await api.post("/contacts", { name, phone }, { headers: { "x-org-id": orgId as string } });
      setName(""); setPhone("");
      mutate();
      toast.success("Contato criado");
    } catch {
      toast.error("Erro ao criar contato");
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/contacts/${id}`, { headers: { "x-org-id": orgId as string } });
      mutate();
      toast.success("Contato removido");
    } catch {
      toast.error("Erro ao remover");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contatos</h1>
          <p className="text-muted-foreground">Gerencie sua base de contatos.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo Contato</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="space-y-1">
            <Label>Telefone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5511999999999" />
          </div>
          <Button onClick={addContact}>Adicionar</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Contatos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts?.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name || "-"}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" onClick={() => remove(c.id)}>Remover</Button>
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
