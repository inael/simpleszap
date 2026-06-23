"use client";

import { useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableRow, TableCell } from "@/components/ui/table";
import { AlertCircle, Loader2, X, Globe, Pencil, Save } from "lucide-react";
import Link from "next/link";
import { AVAILABLE_EVENTS, DEFAULT_SELECTED_EVENTS, groupEventsByCategory } from "@/lib/webhook-events";

type WebhookConfig = {
  id: string;
  url: string;
  secret: string;
  events: string;
  instanceId: string | null;
};

/**
 * Expansion inline pra override de webhook por instância — substitui o modal
 * antigo (que mostrava só 4 eventos). Renderiza como TableRow extra abaixo
 * da linha da instância, ocupando o colSpan da tabela.
 *
 * Pega o WebhookConfig existente da instância (se houver) e permite editar.
 * Se não houver, cria novo override.
 */
export function InstanceWebhookOverrideExpansion({
  instanceId,
  instanceName,
  colSpan,
  onClose,
}: {
  instanceId: string;
  instanceName: string;
  colSpan: number;
  onClose: () => void;
}) {
  const { getToken, user } = useAuth();
  const orgId = user?.sub;

  const fetcher = async ([url, oid]: [string, string]) => {
    const token = await getToken();
    return api
      .get(url, { headers: { "x-org-id": oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
      .then((r) => r.data);
  };

  // Lista de overrides dessa instância (deve ter no máximo 1)
  const { data: configs, mutate } = useSWR<WebhookConfig[]>(
    orgId ? ["/webhooks/config?instanceId=" + instanceId, orgId as string, "inst-override"] : null,
    fetcher
  );
  const existing = configs?.find((c) => c.instanceId === instanceId);

  const [url, setUrl] = useState(existing?.url || "");
  const [secret, setSecret] = useState(existing?.secret || "");
  const [events, setEvents] = useState<string[]>(() => {
    if (!existing) return DEFAULT_SELECTED_EVENTS;
    try {
      return JSON.parse(existing.events) as string[];
    } catch {
      return DEFAULT_SELECTED_EVENTS;
    }
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const groups = groupEventsByCategory();

  const toggleEvent = (k: string) =>
    setEvents((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const save = async () => {
    if (!orgId || saving) return;
    if (!url.trim()) return toast.error("Informe a URL do webhook");
    if (events.length === 0) return toast.error("Selecione ao menos 1 evento");
    setSaving(true);
    try {
      const token = await getToken();
      const headers = {
        "x-org-id": orgId as string,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const body = { url: url.trim(), secret: secret.trim(), events, instanceId };
      if (existing) {
        await api.put(`/webhooks/config/${existing.id}`, body, { headers });
        toast.success("Webhook atualizado");
      } else {
        await api.post("/webhooks/config", body, { headers });
        toast.success("Override criado");
      }
      await mutate();
      onClose();
    } catch {
      toast.error(existing ? "Erro ao salvar" : "Erro ao criar override");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing || deleting) return;
    if (!confirm(`Remover override de "${instanceName}"? A instância volta a usar o webhook global.`)) return;
    setDeleting(true);
    try {
      const token = await getToken();
      await api.delete(`/webhooks/config/${existing.id}`, {
        headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      await mutate();
      toast.success("Override removido — volta a usar o global");
      onClose();
    } catch {
      toast.error("Erro ao remover");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <TableRow className="bg-muted/30 hover:bg-muted/30">
      <TableCell colSpan={colSpan} className="p-0">
        <div className="border-l-4 border-violet-500 bg-violet-50/40 px-6 py-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-violet-900">
                {existing ? <Pencil className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                {existing ? "Editar override de webhook" : "Novo override de webhook"} · {instanceName}
              </div>
              <p className="text-xs text-violet-800/80">
                Esse webhook só recebe eventos dessa instância. Sem override, usa o webhook global da org
                (configure em <Link href="/dashboard/webhooks" className="underline">/dashboard/webhooks</Link>).
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={saving} title="Fechar">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* URL + Secret */}
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://n8n.suaempresa.com/webhook/abc" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                Secret <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <div className="flex gap-1">
                <Input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="vazio = sem assinatura HMAC" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSecret(crypto.randomUUID().replace(/-/g, ""))}
                  title="Gerar secret aleatório"
                >
                  Gerar
                </Button>
              </div>
            </div>
          </div>

          {/* Eventos por categoria — 16 eventos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label className="text-xs">
                Eventos <span className="text-muted-foreground">({events.length} de {AVAILABLE_EVENTS.length})</span>
              </Label>
              <div className="flex gap-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setEvents(AVAILABLE_EVENTS.map((e) => e.key))}>
                  Selecionar todos
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setEvents([])}>
                  Limpar
                </Button>
              </div>
            </div>
            <div className="rounded-md border bg-background divide-y max-h-[420px] overflow-y-auto">
              {groups.map(({ category, events: catEvents }) => (
                <div key={category} className="p-3 space-y-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{category}</div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {catEvents.map((ev) => {
                      const checked = events.includes(ev.key);
                      return (
                        <label
                          key={ev.key}
                          className="flex items-start gap-2 text-sm cursor-pointer rounded-md p-2 hover:bg-muted/50 transition-colors"
                        >
                          <input type="checkbox" className="mt-1" checked={checked} onChange={() => toggleEvent(ev.key)} />
                          <div className="space-y-0.5">
                            <div className="font-medium leading-tight">{ev.label}</div>
                            <div className="text-xs text-muted-foreground leading-snug">{ev.description}</div>
                            <div className="text-[10px] font-mono text-muted-foreground/80">{ev.key}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {events.length === 0 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              Selecione ao menos 1 evento — sem eventos o webhook fica inerte.
            </div>
          )}

          {/* Footer ações */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-violet-200/50">
            {existing && (
              <Button variant="outline" onClick={remove} disabled={deleting || saving} className="mr-auto text-red-600 hover:text-red-700">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Remover override
              </Button>
            )}
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving || !url || events.length === 0}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              {existing ? "Salvar alterações" : "Criar override"}
            </Button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
