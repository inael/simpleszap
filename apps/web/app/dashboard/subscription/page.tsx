"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sparkles, AlertTriangle, ShieldCheck } from "lucide-react";
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
};

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
  const [cpfCnpj, setCpfCnpj] = useState('');

  const plans = pricingData?.plans || [];

  const trialEndsAtDate = me?.trialEndsAt ? new Date(me.trialEndsAt) : null;
  const daysLeft = trialEndsAtDate
    ? Math.max(0, Math.ceil((trialEndsAtDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleSubscribe = async (planId: string) => {
    if (!cpfCnpj.trim()) {
      toast.error("Informe CPF/CNPJ para prosseguir com o pagamento.");
      return;
    }
    setLoading(planId);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
        const token = await getToken();
        const res = await api.post('/subscription/checkout', {
            planId,
            cycle,
            cpfCnpj: cpfCnpj || undefined,
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
            if (code === 'CPF_CNPJ_REQUIRED') {
                toast.error("Informe CPF/CNPJ para prosseguir com o pagamento.");
            } else {
                toast.error(e?.response?.data?.error || "Erro ao iniciar assinatura.");
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

      <div className="max-w-sm space-y-2">
        <div className="text-sm font-medium">CPF/CNPJ</div>
        <input
          value={cpfCnpj}
          onChange={(e) => setCpfCnpj(e.target.value)}
          placeholder="Somente números"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          inputMode="numeric"
        />
        <div className="text-xs text-muted-foreground">
          Necessário para emissão da cobrança no Asaas.
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan: any) => (
            <Card key={plan.id} className={`flex flex-col ${plan.name.includes('Pro') ? 'border-primary shadow-md relative' : ''}`}>
                {plan.name.includes('Pro') && (
                    <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">Popular</div>
                )}
                <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                    <div className="text-3xl font-bold mb-4">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cycle === 'MONTHLY' ? plan.pricing.monthly : plan.pricing.annual)}
                        <span className="text-sm font-normal text-muted-foreground">{cycle === 'MONTHLY' ? '/mês' : '/ano'}</span>
                    </div>
                    <ul className="space-y-2 text-sm">
                        <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-500" /> {plan.limits.instancesLimit < 0 ? 'Instâncias ilimitadas' : `${plan.limits.instancesLimit} Instância(s)`}</li>
                        <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-500" /> {plan.limits.messagesPerDay < 0 ? 'Mensagens ilimitadas' : `${plan.limits.messagesPerDay} msgs/dia`}</li>
                        {plan.features.hasWebhooks && <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-500" /> Webhooks</li>}
                        {plan.features.hasTemplates && <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-500" /> Templates</li>}
                    </ul>
                </CardContent>
                <CardFooter>
                    <Button
                        className="w-full"
                        variant={(cycle === 'MONTHLY' ? plan.pricing.monthly : plan.pricing.annual) === 0 ? "outline" : "default"}
                        disabled={(cycle === 'MONTHLY' ? plan.pricing.monthly : plan.pricing.annual) === 0 || loading === plan.id}
                        onClick={() => handleSubscribe(plan.id)}
                    >
                        {loading === plan.id ? "Processando..." : ((cycle === 'MONTHLY' ? plan.pricing.monthly : plan.pricing.annual) === 0 ? "Plano Gratuito" : "Assinar")}
                    </Button>
                </CardFooter>
            </Card>
        ))}
        {!plans.length && <div className="col-span-3 text-center">Carregando planos...</div>}
      </div>
    </div>
  );
}
