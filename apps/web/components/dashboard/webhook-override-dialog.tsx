"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Globe, Smartphone, Trash2 } from "lucide-react";
import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceId: string;
  instanceName: string;
};

const QUICK_EVENTS = ["message.sent", "message.failed", "message.received", "instance.connected"];

export function WebhookOverrideDialog({ open, onOpenChange, instanceId, instanceName }: Props) {
  const { getToken, user } = useAuth();
  const orgId = user?.sub;

  const { data: overrides, mutate } = useSWR(
    orgId && open ? ["/webhooks/config", orgId, instanceId, "override"] : null,
    async () => {
      const token = await getToken();
      return api
        .get(`/webhooks/config?instanceId=${instanceId}`, {
          headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        })
        .then((r) => r.data);
    }
  );

  const { data: globals } = useSWR(
    orgId && open ? ["/webhooks/config", orgId, "global"] : null,
    async () => {
      const token = await getToken();
      return api
        .get(`/webhooks/config?global=true`, {
          headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        })
        .then((r) => r.data);
    }
  );

  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [events, setEvents] = useState<string[]>(["message.sent", "message.failed"]);
  const [saving, setSaving] = useState(false);

  const toggleEvent = (k: string) =>
    setEvents((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const create = async () => {
    if (!orgId) return;
    if (!url) return toast.error("Informe a URL do webhook");
    if (events.length === 0) return toast.error("Selecione ao menos um evento");
    setSaving(true);
    try {
      const token = await getToken();
      await api.post(
        "/webhooks/config",
        { url, secret, events, instanceId },
        { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      setUrl("");
      setSecret("");
      setEvents(["message.sent", "message.failed"]);
      mutate();
      toast.success("Override criado");
    } catch {
      toast.error("Erro ao criar override");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este override? A instância voltará a usar o webhook global.")) return;
    try {
      const token = await getToken();
      await api.delete(`/webhooks/config/${id}`, {
        headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      mutate();
      toast.success("Override removido");
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const hasOverride = (overrides ?? []).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Webhooks · {instanceName}</DialogTitle>
          <DialogDescription>
            Por padrão esta instância usa o webhook global da org. Crie um override aqui pra mandar eventos
            dela pra uma URL específica (estilo Stripe).
          </DialogDescription>
        </DialogHeader>

        {/* Status atual */}
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          {hasOverride ? (
            <div className="flex items-center gap-2">
              <Badge className="bg-violet-50 text-violet-700 border-violet-200" variant="outline">
                <Smartphone className="h-3 w-3 mr-1" /> Override ativo
              </Badge>
              <span className="text-muted-foreground">Eventos vão direto pros URLs abaixo.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Badge className="bg-sky-50 text-sky-700 border-sky-200" variant="outline">
                <Globe className="h-3 w-3 mr-1" /> Usando global
              </Badge>
              <span className="text-muted-foreground">
                {(globals ?? []).length > 0
                  ? `Eventos vão pros ${(globals ?? []).length} webhook(s) globais da org.`
                  : "Nenhum webhook global. Crie em /dashboard/webhooks ou faça override aqui."}
              </span>
            </div>
          )}
        </div>

        {/* Overrides existentes */}
        {hasOverride && (
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Overrides ativos</Label>
            <ul className="divide-y rounded-md border">
              {(overrides ?? []).map((o: any) => (
                <li key={o.id} className="flex items-center justify-between p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs truncate">{o.url}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {(() => {
                        try {
                          const arr = JSON.parse(o.events) as string[];
                          return arr.join(", ");
                        } catch {
                          return o.events;
                        }
                      })()}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => remove(o.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Form rápido */}
        <div className="space-y-3 pt-2 border-t">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Adicionar override</Label>
          <div className="grid sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Secret <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <div className="flex gap-1">
                <Input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="vazio = sem assinatura HMAC" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSecret(crypto.randomUUID().replace(/-/g, ""))}
                  title="Gerar secret aleatório (32 chars)"
                >
                  Gerar
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Sem secret, o webhook chega sem header <code className="font-mono">x-webhook-signature</code> e seu sistema não consegue validar autenticidade.
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Eventos (rápido)</Label>
            <div className="flex flex-wrap gap-2">
              {QUICK_EVENTS.map((k) => {
                const active = events.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggleEvent(k)}
                    className={`text-xs px-2.5 py-1 rounded-md font-mono transition ${
                      active ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Pra configurar todos os 16 eventos, use a tela{" "}
              <Link href="/dashboard/webhooks" className="underline">
                /dashboard/webhooks
              </Link>
              .
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={create} disabled={saving || !url}>
            {saving ? "Criando..." : "Criar override"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
