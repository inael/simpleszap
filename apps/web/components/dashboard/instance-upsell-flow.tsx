"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Crown, Sparkles, Gift, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

/**
 * Fluxo de upsell quando o user tenta criar instância no Free e bate
 * o limite. 3 telas em sequência:
 *
 *   1. Upgrade: explica preço e oferece assinar
 *   2. Motivo (win-back): se recusar, pergunta o porquê — dado de churn
 *   3. Cupom: oferece 20% off (WELCOME20) como última tentativa
 *
 * Aberto via prop `open`; fecha sozinho ao concluir/cancelar.
 */
export function InstanceUpsellFlow({
  open,
  onOpenChange,
  limit,
  current,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  limit: number;
  current: number;
}) {
  const router = useRouter();
  const { getToken, user } = useAuth();
  const orgId = user?.sub;
  const [step, setStep] = useState<"upgrade" | "reason" | "coupon">("upgrade");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep("upgrade");
    setReason("");
  };

  const close = () => {
    if (submitting) return;
    onOpenChange(false);
    setTimeout(reset, 200);
  };

  const goToSubscription = (couponCode?: string) => {
    const qs = couponCode ? `?coupon=${encodeURIComponent(couponCode)}` : "";
    router.push(`/dashboard/subscription${qs}`);
    close();
  };

  const submitReason = async () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      await api.post(
        "/me/feedback",
        { kind: "upsell_decline", context: "instance_create_limit", reason },
        { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      ).catch(() => null); // best-effort — não bloqueia o flow se endpoint não existe ainda
    } finally {
      setSubmitting(false);
      setStep("coupon");
    }
  };

  const REASONS = [
    { value: "too_expensive", label: "Achei caro — R$ 59/mês ainda é muito pro meu volume" },
    { value: "not_ready", label: "Ainda estou testando — não preciso de 2ª instância agora" },
    { value: "evaluating", label: "Vou avaliar concorrentes antes de assinar" },
    { value: "other", label: "Outro motivo" },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-w-md">
        {step === "upgrade" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Limite do plano Free
              </DialogTitle>
              <DialogDescription className="pt-2">
                Você já tem {current} instância(s) — o plano Free permite até {limit}.
                Pra adicionar mais, assine uma instância paga.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="rounded-md border bg-amber-50 border-amber-200 p-3 text-sm space-y-1">
                <p className="font-semibold text-amber-900">Instância paga — R$ 59/mês</p>
                <ul className="text-amber-800 space-y-0.5 list-disc list-inside text-xs">
                  <li>300 mensagens por dia (vs 100 do Free)</li>
                  <li>Anti-banimento: jitter automático + variantes A/B/C</li>
                  <li>Webhook próprio + logs detalhados</li>
                  <li>Cancele quando quiser, sem multa</li>
                </ul>
              </div>
            </div>

            <DialogFooter className="flex flex-row gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setStep("reason")} className="flex-1">
                Agora não
              </Button>
              <Button onClick={() => goToSubscription()} className="flex-1">
                Assinar agora <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "reason" && (
          <>
            <DialogHeader>
              <DialogTitle>Antes de sair, conta pra gente</DialogTitle>
              <DialogDescription>
                O que tá te impedindo de assinar agora? Vai ajudar a gente a melhorar.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-start gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors ${reason === r.value ? "border-primary bg-primary/5" : ""}`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-0.5"
                  />
                  <span className="text-sm">{r.label}</span>
                </label>
              ))}
            </div>

            <DialogFooter className="flex flex-row gap-2 sm:gap-2">
              <Button variant="outline" onClick={close} disabled={submitting}>
                Fechar
              </Button>
              <Button onClick={submitReason} disabled={!reason || submitting}>
                Continuar <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "coupon" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-pink-500" />
                Espera — temos uma oferta pra você
              </DialogTitle>
              <DialogDescription className="pt-2">
                {reason === "too_expensive"
                  ? "Entendi sobre o preço. Que tal um desconto no 1º mês pra você testar sem compromisso?"
                  : "Que tal um desconto exclusivo pra você começar agora?"}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-md border-2 border-dashed border-pink-300 bg-gradient-to-br from-pink-50 to-amber-50 p-4 my-2 text-center space-y-2">
              <Sparkles className="h-8 w-8 text-pink-500 mx-auto" />
              <p className="text-2xl font-bold text-pink-700">20% OFF enquanto durar</p>
              <p className="text-sm text-pink-900">
                R$ 59 → <span className="font-bold">R$ 47,20</span>/mês na assinatura
              </p>
              <div className="font-mono text-xs bg-white border rounded px-2 py-1 inline-block mt-1">
                cupom: <strong>WELCOME20</strong>
              </div>
            </div>

            <DialogFooter className="flex flex-row gap-2 sm:gap-2">
              <Button variant="outline" onClick={close} className="flex-1">
                Talvez depois
              </Button>
              <Button onClick={() => goToSubscription("WELCOME20")} className="flex-1 bg-pink-600 hover:bg-pink-700">
                Aplicar cupom <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
