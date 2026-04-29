"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sparkles, AlertTriangle, ShieldCheck, Receipt } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { api, fetcher } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { useState } from "react";

type MeSubscription = {
  plan: { id: string; name: string; priceMonthly: number; priceAnnual: number; instancesLimit: number; messagesPerDay: number } | null;
  trialEndsAt: string | null;
  trialActive: boolean;
  status: 'trial' | 'paid' | 'free' | 'free_after_trial';
  limits: { instancesLimit: number; messagesPerDay: number };
  hasPaid: boolean;
  cpfCnpj: string | null;
};

function formatCpfCnpj(d: string | null) {
  const digits = (d || '').replace(/\D/g, '');
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return digits;
}

function fmtBR(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function SubscriptionPage() {
  const { getToken, user } = useAuth();
  const orgId = user?.sub;
  const { data: pricingData } = useSWR('/pricing', fetcher);
  const { data: me } = useSWR<MeSubscription>(
    orgId ? ['/me/subscription', orgId] : null,
    async ([url, oid]: [string, string]) => {
      const token = await getToken();
      return api.get(url, { headers: { 'x-org-id': oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then((r) => r.data);
    }
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [cycle, setCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [couponInput, setCouponInput] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    planId: string;
    cycle: 'MONTHLY' | 'YEARLY';
    originalValue: number;
    discountValue: number;
    finalValue: number;
    percentOff: number | null;
    amountOff: number | null;
  } | null>(null);

  const plans = pricingData?.plans || [];

  const trialEndsAtDate = me?.trialEndsAt ? new Date(me.trialEndsAt) : null;
  const daysLeft = trialEndsAtDate
    ? Math.max(0, Math.ceil((trialEndsAtDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleApplyCoupon = async (planId: string) => {
    if (!couponInput.trim()) return;
    setValidatingCoupon(true);
    try {
      const token = await getToken();
      const res = await api.post('/coupons/validate', {
        code: couponInput.trim().toUpperCase(),
        planId,
        cycle,
      }, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      if (res.data?.valid) {
        setAppliedCoupon({
          code: res.data.code,
          planId,
          cycle,
          originalValue: res.data.originalValue,
          discountValue: res.data.discountValue,
          finalValue: res.data.finalValue,
          percentOff: res.data.percentOff,
          amountOff: res.data.amountOff,
        });
        toast.success(`Cupom ${res.data.code} aplicado!`);
      }
    } catch (e: any) {
      const reason = e?.response?.data?.reason || 'Cupom inválido';
      toast.error(reason);
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
  };

  const handleSubscribe = async (planId: string) => {
    if (!me?.cpfCnpj) {
      toast.error("Cadastre seu CPF/CNPJ em Configurações antes de assinar.");
      return;
    }
    // Cupom só vale para o plano/ciclo em que foi aplicado
    const useCoupon = appliedCoupon && appliedCoupon.planId === planId && appliedCoupon.cycle === cycle
      ? appliedCoupon.code
      : undefined;
    setLoading(planId);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
        const token = await getToken();
        const res = await api.post('/subscription/checkout', {
            planId,
            cycle,
            couponCode: useCoupon,
        }, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: controller.signal,
        });

        if (res.data.paymentLink) {
            window.open(res.data.paymentLink, '_blank', 'noopener,noreferrer');
        } else {
            toast.success("Solicitação processada! Verifique seu email.");
        }
    } catch (e: any) {
        if (e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED') {
            toast.error("A requisição excedeu o tempo limite. Tente novamente.");
        } else {
            const code = e?.response?.data?.error;
            const reason = e?.response?.data?.reason;
            if (code === 'CPF_CNPJ_REQUIRED') {
                toast.error("Informe CPF/CNPJ em Configurações antes de assinar.");
            } else if (code === 'VALUE_BELOW_ASAAS_MINIMUM' || code === 'COUPON_INVALID') {
                toast.error(reason || code);
            } else {
                toast.error(reason || code || "Erro ao iniciar assinatura.");
            }
        }
    } finally {
        clearTimeout(timeout);
        setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Assinatura</h1>
        <p className="text-muted-foreground">
          Gerencie seu plano e cobranças.
        </p>
      </div>

      {me?.status === 'trial' && me.plan && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">
              Você está no trial do plano <strong>{me.plan.name}</strong>
              {trialEndsAtDate ? <> — expira em <strong>{fmtBR(trialEndsAtDate)}</strong> ({daysLeft} {daysLeft === 1 ? 'dia' : 'dias'} restantes)</> : null}.
            </p>
            <p className="text-emerald-800/80">
              Assine antes do fim do trial para continuar com {me.plan.name}. Sem assinatura, sua conta cai automaticamente para o plano gratuito.
            </p>
          </div>
        </div>
      )}

      {me?.status === 'paid' && me.plan && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-900">
          <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">
              Plano ativo: <strong>{me.plan.name}</strong>
            </p>
            <p className="text-blue-800/80">
              Pagamento confirmado. Você tem acesso a todos os recursos do {me.plan.name}.
            </p>
          </div>
        </div>
      )}

      {me?.status === 'free_after_trial' && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">Seu trial expirou — você está no plano gratuito.</p>
            <p className="text-amber-800/80">
              Limites: {me.limits.instancesLimit} instância(s), {me.limits.messagesPerDay} msgs/dia. Assine um plano abaixo para liberar mais capacidade.
            </p>
          </div>
        </div>
      )}

      {me?.status === 'free' && (
        <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-4 text-sm">
          <p>
            Você está no plano gratuito ({me.limits.instancesLimit} instância(s), {me.limits.messagesPerDay} msgs/dia). Assine um plano abaixo para escalar.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button variant={cycle === 'MONTHLY' ? 'default' : 'outline'} onClick={() => setCycle('MONTHLY')}>Mensal</Button>
        <Button variant={cycle === 'YEARLY' ? 'default' : 'outline'} onClick={() => setCycle('YEARLY')}>Anual</Button>
      </div>

      {me && !me.cpfCnpj && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="font-medium">Cadastre seu CPF ou CNPJ antes de assinar.</p>
            <p className="text-amber-800/80">
              É exigência da Receita Federal e do Asaas para emitir a cobrança.{' '}
              <Link href="/dashboard/settings" className="underline font-medium">Cadastrar agora</Link>.
            </p>
          </div>
        </div>
      )}

      {me?.cpfCnpj && (
        <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
          <Receipt className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
          <div className="flex-1 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <span className="text-muted-foreground">A cobrança será emitida para </span>
              <span className="font-mono font-medium">{formatCpfCnpj(me.cpfCnpj)}</span>
            </div>
            <Link href="/dashboard/settings" className="text-xs text-primary underline">alterar</Link>
          </div>
        </div>
      )}

      <div className="max-w-md">
        <div className="space-y-2">
          <div className="text-sm font-medium">Cupom de desconto (opcional)</div>
          {appliedCoupon ? (
            <div className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              <span className="font-mono font-semibold">{appliedCoupon.code}</span>
              <span className="text-emerald-700">
                {appliedCoupon.percentOff != null
                  ? `(-${appliedCoupon.percentOff}%)`
                  : `(-R$ ${appliedCoupon.amountOff?.toFixed(2)})`}
              </span>
              <button
                type="button"
                onClick={removeCoupon}
                className="ml-auto text-xs text-emerald-700 underline hover:text-emerald-900"
              >
                remover
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="Ex: TESTE99"
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm font-mono uppercase"
                disabled={validatingCoupon}
              />
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            {appliedCoupon
              ? `Desconto será aplicado ao plano ${appliedCoupon.planId.toUpperCase()} (${appliedCoupon.cycle === 'MONTHLY' ? 'mensal' : 'anual'}).`
              : "Digite o código e clique em 'Aplicar cupom' no plano desejado."}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan: any) => {
          const basePrice = cycle === 'MONTHLY' ? plan.pricing.monthly : plan.pricing.annual;
          const couponMatches = appliedCoupon?.planId === plan.id && appliedCoupon?.cycle === cycle;
          const finalPrice = couponMatches ? appliedCoupon!.finalValue : basePrice;
          const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
          const canApplyCoupon = couponInput.trim().length > 0 && !appliedCoupon;

          // Upgrade/downgrade/plano atual: comparação por priceMonthly como ranking estável
          const userHasPaidPlan = me?.status === 'paid' && me.plan;
          const isCurrentPlan = !!(userHasPaidPlan && me.plan!.id === plan.id);
          let actionLabel: string;
          if (basePrice === 0) actionLabel = "Plano Gratuito";
          else if (isCurrentPlan) actionLabel = "Plano atual";
          else if (userHasPaidPlan && plan.pricing.monthly > me.plan!.priceMonthly) actionLabel = "Fazer upgrade";
          else if (userHasPaidPlan && plan.pricing.monthly < me.plan!.priceMonthly) actionLabel = "Fazer downgrade";
          else actionLabel = "Assinar";

          const isHighlighted = isCurrentPlan || (!userHasPaidPlan && plan.name.includes('Pro'));

          return (
            <Card key={plan.id} className={`flex flex-col ${isHighlighted ? 'border-primary shadow-md relative' : ''}`}>
                {isCurrentPlan ? (
                    <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">Plano atual</div>
                ) : (!userHasPaidPlan && plan.name.includes('Pro')) ? (
                    <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">Popular</div>
                ) : null}
                <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                    <div className="mb-4">
                      {couponMatches ? (
                        <>
                          <div className="text-sm text-muted-foreground line-through">{fmtBRL(basePrice)}</div>
                          <div className="text-3xl font-bold text-emerald-600">
                            {fmtBRL(finalPrice)}
                            <span className="text-sm font-normal text-muted-foreground">{cycle === 'MONTHLY' ? '/mês' : '/ano'}</span>
                          </div>
                          <div className="text-xs text-emerald-700 font-medium mt-1">Cupom {appliedCoupon!.code}</div>
                        </>
                      ) : (
                        <div className="text-3xl font-bold">
                          {fmtBRL(basePrice)}
                          <span className="text-sm font-normal text-muted-foreground">{cycle === 'MONTHLY' ? '/mês' : '/ano'}</span>
                        </div>
                      )}
                    </div>
                    <ul className="space-y-2 text-sm">
                        <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-500" /> {plan.limits.instancesLimit < 0 ? 'Instâncias ilimitadas' : `${plan.limits.instancesLimit} Instância(s)`}</li>
                        <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-500" /> {plan.limits.messagesPerDay < 0 ? 'Mensagens ilimitadas' : `${plan.limits.messagesPerDay} msgs/dia`}</li>
                        {plan.features.hasWebhooks && <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-500" /> Webhooks</li>}
                        {plan.features.hasTemplates && <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-500" /> Templates</li>}
                    </ul>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                    {canApplyCoupon && (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={validatingCoupon}
                        onClick={() => handleApplyCoupon(plan.id)}
                      >
                        {validatingCoupon ? 'Validando...' : `Aplicar cupom ${couponInput} a este plano`}
                      </Button>
                    )}
                    <Button
                        className="w-full"
                        variant={isCurrentPlan ? "secondary" : (basePrice === 0 ? "outline" : "default")}
                        disabled={isCurrentPlan || basePrice === 0 || loading === plan.id || !me?.cpfCnpj}
                        onClick={() => handleSubscribe(plan.id)}
                    >
                        {loading === plan.id ? "Processando..." : (!me?.cpfCnpj && !isCurrentPlan && basePrice > 0 ? "Cadastre o CPF/CNPJ" : actionLabel)}
                    </Button>
                </CardFooter>
            </Card>
          );
        })}
        {!plans.length && <div className="col-span-3 text-center">Carregando planos...</div>}
      </div>
    </div>
  );
}
