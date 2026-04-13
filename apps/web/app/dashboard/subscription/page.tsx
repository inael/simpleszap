"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import useSWR from "swr";
import { api, fetcher } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { useState } from "react";

export default function SubscriptionPage() {
  const { getToken } = useAuth();
  const { data: pricingData } = useSWR('/pricing', fetcher);
  const [loading, setLoading] = useState<string | null>(null);
  const [cycle, setCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [cpfCnpj, setCpfCnpj] = useState('');

  const plans = pricingData?.plans || [];

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
                        <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-500" /> {plan.limits.instancesLimit} Instância(s)</li>
                        <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-500" /> {plan.limits.messagesPerDay} msgs/dia</li>
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
