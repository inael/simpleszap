"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Download } from "lucide-react";
import { TableLoadingRows } from "@/components/ui/table-loading";

export default function ContactsPage() {
  const { getToken, user } = useAuth();
  const orgId = user?.sub;

  const { data: contacts, error: contactsError, mutate } = useSWR(
    orgId ? ["/contacts", orgId] : null,
    async ([url, oid]) => {
      const token = await getToken();
      return api.get(url, { headers: { "x-org-id": oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then(res => res.data);
    }
  );

  const { data: instances } = useSWR<Array<{ id: string; name: string; status: string }>>(
    orgId ? ["/instances", orgId, "contacts-import"] : null,
    async ([url, oid]: [string, string]) => {
      const token = await getToken();
      return api.get(url, { headers: { "x-org-id": oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then(res => res.data);
    }
  );

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importInstanceId, setImportInstanceId] = useState("");
  const [importing, setImporting] = useState(false);
  const readyInstances = instances?.filter((i) => i.status === "connected" || i.status === "open") ?? [];

  const importContacts = async () => {
    if (!orgId || !importInstanceId) return;
    setImporting(true);
    try {
      const token = await getToken();
      const res = await api.post(
        `/contacts/import/${importInstanceId}`,
        {},
        { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      const { imported, skipped, total } = res.data ?? {};
      toast.success(`${imported} contato(s) importado(s) · ${skipped} já existiam · ${total} encontrados`);
      setImportOpen(false);
      setImportInstanceId("");
      mutate();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Erro ao importar contatos");
    } finally {
      setImporting(false);
    }
  };

  const addContact = async () => {
    if (!orgId) return toast.error("Erro de autenticação.");
    if (!phone) return toast.error("Informe o telefone");
    try {
      const token = await getToken();
      await api.post("/contacts", { name, phone }, { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      setName(""); setPhone("");
      mutate();
      toast.success("Contato criado");
    } catch {
      toast.error("Erro ao criar contato");
    }
  };

  const remove = async (id: string) => {
    try {
      const token = await getToken();
      await api.delete(`/contacts/${id}`, { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
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
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" disabled={readyInstances.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Importar do WhatsApp
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Importar contatos do WhatsApp</DialogTitle>
              <DialogDescription>
                Lista todos os contatos sincronizados pela Evolution na instância escolhida. Telefones duplicados são ignorados.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label>Instância</Label>
              <Select value={importInstanceId} onValueChange={setImportInstanceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma instância conectada" />
                </SelectTrigger>
                <SelectContent>
                  {readyInstances.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                  {readyInstances.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma instância conectada</div>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                A importação pode demorar alguns segundos dependendo do tamanho da agenda.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importing}>Cancelar</Button>
              <Button onClick={importContacts} disabled={!importInstanceId || importing}>
                {importing ? "Importando..." : "Importar agora"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {contactsError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>Erro ao carregar contatos. Verifique sua conexão e tente novamente.</p>
        </div>
      )}

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
          <Button onClick={addContact} disabled={!orgId}>Adicionar</Button>
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
              {contacts === undefined && !contactsError && (
                <TableLoadingRows colSpan={3} />
              )}
              {contacts?.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name || "-"}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" onClick={() => remove(c.id)}>Remover</Button>
                  </TableCell>
                </TableRow>
              ))}
              {Array.isArray(contacts) && contacts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">Nenhum contato</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
