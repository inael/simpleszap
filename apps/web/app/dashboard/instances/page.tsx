"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, RefreshCw, Trash, QrCode } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useOrganization } from "@clerk/nextjs";
import { toast } from "sonner";

export default function InstancesPage() {
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const { data: instances, error, mutate } = useSWR(
    orgId ? ["/instances", orgId] : null,
    ([url, oid]) => api.get(url, { headers: { "x-org-id": oid } }).then(res => res.data)
  );

  const handleCreate = async () => {
    if (!newInstanceName) return;
    setIsCreating(true);
    try {
      await api.post("/instance/create", { name: newInstanceName, orgId }, { headers: { "x-org-id": orgId as string } });
      toast.success("Instância criada com sucesso!");
      setIsCreateOpen(false);
      setNewInstanceName("");
      mutate();
    } catch (e) {
      toast.error("Erro ao criar instância.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta instância?")) return;
    try {
      await api.delete(`/instance/${id}`, { headers: { "x-org-id": orgId as string } });
      toast.success("Instância removida.");
      mutate();
    } catch (e) {
      toast.error("Erro ao remover instância.");
    }
  };

  const handleConnect = async (instanceName: string) => {
      try {
          const res = await api.get(`/instance/qr/${instanceName}`, { headers: { "x-org-id": orgId as string } });
          // Evolution API v2 returns base64 in `qrcode.base64` or similar?
          // Checking service: return response.data directly.
          // Usually response.data.qrcode.base64 or just response.data.base64
          // Let's assume it returns { qrcode: { base64: "..." }, pairingCode: "..." } or similar
          // If the service just returns what axios gets.
          
          if (res.data?.base64) {
             setQrCode(res.data.base64);
          } else if (res.data?.qrcode?.base64) {
             setQrCode(res.data.qrcode.base64);
          } else {
             toast.info("Tente conectar novamente ou verifique se já está conectado.");
          }
      } catch (e) {
          toast.error("Erro ao gerar QR Code.");
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Instâncias</h1>
          <p className="text-muted-foreground">
            Gerencie suas conexões do WhatsApp.
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Instância
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Instância</DialogTitle>
              <DialogDescription>Dê um nome para sua nova conexão.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={newInstanceName} onChange={(e) => setNewInstanceName(e.target.value)} placeholder="Ex: Atendimento" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? "Criando..." : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suas Instâncias</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>ID</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instances?.map((inst: any) => (
                <TableRow key={inst.id}>
                  <TableCell className="font-medium">{inst.name}</TableCell>
                  <TableCell>
                    <Badge variant={inst.status === 'open' || inst.status === 'connected' ? "default" : "outline"} 
                           className={inst.status === 'open' || inst.status === 'connected' ? "bg-green-500 hover:bg-green-600" : "bg-yellow-50 text-yellow-700 border-yellow-200"}>
                      {inst.status === 'open' || inst.status === 'connected' ? 'Conectado' : inst.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{inst.id}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleConnect(inst.id)}>
                        <QrCode className="h-4 w-4 mr-1" /> Conectar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(inst.id)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!instances?.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                    Nenhuma instância encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {qrCode && (
          <Dialog open={!!qrCode} onOpenChange={(o) => !o && setQrCode(null)}>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>Escaneie o QR Code</DialogTitle>
                  </DialogHeader>
                  <div className="flex justify-center p-4">
                      <img src={qrCode} alt="QR Code" className="max-w-[250px]" />
                  </div>
              </DialogContent>
          </Dialog>
      )}
    </div>
  );
}
