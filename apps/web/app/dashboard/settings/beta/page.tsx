"use client";

import { useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ListLoadingSkeleton } from "@/components/ui/list-loading";
import { AlertTriangle, Loader2 } from "lucide-react";

type BetaFeature = {
  key: string;
  label: string;
  description: string;
  available: boolean;
  termsVersion: string;
  termsMarkdown: string;
  accepted: boolean;
  acceptedAt: string | null;
};

export default function BetaSettingsPage() {
  const { getToken, user } = useAuth();
  const orgId = user?.sub;
  const [pendingFeature, setPendingFeature] = useState<BetaFeature | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data, mutate } = useSWR<{ features: BetaFeature[] }>(
    orgId ? ["/me/beta-features", orgId] : null,
    async ([url, oid]) => {
      const token = await getToken();
      return api
        .get(url as string, { headers: { "x-org-id": oid as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
        .then((r) => r.data);
    }
  );

  const onToggle = (feature: BetaFeature, on: boolean) => {
    if (!feature.available) return;
    if (on && !feature.accepted) {
      setPendingFeature(feature);
    } else if (!on && feature.accepted) {
      void revoke(feature);
    }
  };

  const accept = async () => {
    if (!pendingFeature || !orgId || submitting) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      await api.post(
        "/me/beta-features",
        { featureKey: pendingFeature.key, termsVersion: pendingFeature.termsVersion },
        { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      await mutate();
      setPendingFeature(null);
      toast.success(`${pendingFeature.label} ativado.`);
    } catch {
      toast.error("Erro ao aceitar os termos.");
    } finally {
      setSubmitting(false);
    }
  };

  const revoke = async (feature: BetaFeature) => {
    if (!orgId) return;
    try {
      const token = await getToken();
      await api.delete(`/me/beta-features/${feature.key}`, {
        headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      await mutate();
      toast.success(`${feature.label} desativado.`);
    } catch {
      toast.error("Erro ao desativar.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações Beta</h1>
        <p className="text-muted-foreground">
          Recursos experimentais. Ative apenas se concordar com os termos de cada um.
        </p>
      </div>

      <div className="grid gap-4">
        {data === undefined ? (
          <ListLoadingSkeleton rows={3} lines={2} />
        ) : data.features.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum recurso beta disponível no momento.
          </p>
        ) : data.features.map((f) => (
          <Card key={f.key} className={!f.available ? "opacity-60" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    {f.label}
                    {!f.available && (
                      <span className="text-xs font-normal px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
                        Em breve
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>{f.description}</CardDescription>
                </div>
                <Switch
                  checked={f.accepted}
                  disabled={!f.available}
                  onCheckedChange={(on) => onToggle(f, on)}
                />
              </div>
            </CardHeader>
            {f.accepted && f.acceptedAt && (
              <CardContent className="text-xs text-muted-foreground">
                Ativado em {new Date(f.acceptedAt).toLocaleString("pt-BR")} · termos v{f.termsVersion}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <Dialog open={!!pendingFeature} onOpenChange={(o) => { if (!o && !submitting) setPendingFeature(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Ativar {pendingFeature?.label}
            </DialogTitle>
            <DialogDescription>
              Leia os termos com atenção. Ao ativar você concorda com todos eles.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto border rounded-md p-4 text-sm whitespace-pre-wrap font-mono">
            {pendingFeature?.termsMarkdown}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingFeature(null)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={accept} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ativando...
                </>
              ) : (
                "Li e concordo — ativar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
