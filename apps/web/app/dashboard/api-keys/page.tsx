"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Copy, Trash } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import useSWR from "swr";
import { useState } from "react";
import { toast } from "sonner";

export default function ApiKeysPage() {
  const { getToken, user } = useAuth();
  const orgId = user?.sub;

  const { data: keys, mutate } = useSWR(
    orgId ? ["/api-keys", orgId] : null,
    async ([url, oid]) => {
      const token = await getToken();
      return api.get(url, { headers: { "x-org-id": oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then((r) => r.data);
    }
  );

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const createKey = async () => {
    if (!orgId) return toast.error("Erro de autenticação.");
    try {
      const token = await getToken();
      const res = await api.post(
        "/api-keys",
        { name: name || undefined },
        { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      const created = res.data;
      await mutate();
      setOpen(false);
      setName("");
      if (created?.key) {
        await navigator.clipboard.writeText(created.key).catch(() => {});
        toast.success("Chave criada e copiada.");
      } else {
        toast.success("Chave criada.");
      }
    } catch {
      toast.error("Erro ao criar chave.");
    }
  };

  const revoke = async (id: string) => {
    if (!orgId) return;
    try {
      const token = await getToken();
      await api.delete(`/api-keys/${id}`, { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      await mutate();
      toast.success("Chave revogada.");
    } catch {
      toast.error("Erro ao revogar chave.");
    }
  };

  const copy = async (key: string) => {
    await navigator.clipboard.writeText(key).catch(() => {});
    toast.success("Chave copiada.");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chaves de API</h1>
          <p className="text-muted-foreground">
            Gerencie as chaves de acesso para integração via API.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={!orgId}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Chave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova chave de API</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Integração Zapier" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={createKey}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suas Chaves</CardTitle>
          <CardDescription>
            Use estas chaves para autenticar suas requisições na nossa API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Chave (Prefixo)</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys?.map((k: any) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.name || "Chave"}</TableCell>
                  <TableCell className="font-mono text-xs">{String(k.key || "").slice(0, 10)}...</TableCell>
                  <TableCell>{k.createdAt ? new Date(k.createdAt).toLocaleDateString() : "-"}</TableCell>
                  <TableCell className="text-right flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => copy(k.key)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => revoke(k.id)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!keys?.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                    Nenhuma chave encontrada.
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
