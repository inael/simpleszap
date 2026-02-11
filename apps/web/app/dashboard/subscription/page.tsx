"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import useSWR from "swr";
import { api, fetcher } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { useState } from "react";

export default function SubscriptionPage() {
  const { userId } = useAuth();
  const { data: pricingData } = useSWR('/pricing', fetcher);
  const [loading, setLoading] = useState<string | null>(null);

  const plans = pricingData?.plans || [];

  const handleSubscribe = async (planId: string) => {
    setLoading(planId);
    try {
        const res = await api.post('/subscription/checkout', {
            planId,
            cycle: 'MONTHLY'
        }, { headers: { "x-user-id": userId } });

        if (res.data.paymentLink) {
            window.location.href = res.data.paymentLink;
        } else {
            toast.success("Solicitação processada! Verifique seu email.");
        }
    } catch (e) {
        toast.error("Erro ao iniciar assinatura.");
    } finally {
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
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.pricing.monthly)}
                        <span className="text-sm font-normal text-muted-foreground">/mês</span>
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
                        variant={plan.pricing.monthly === 0 ? "outline" : "default"}
                        disabled={plan.pricing.monthly === 0 || loading === plan.id}
                        onClick={() => handleSubscribe(plan.id)}
                    >
                        {loading === plan.id ? "Processando..." : (plan.pricing.monthly === 0 ? "Plano Gratuito" : "Assinar")}
                    </Button>
                </CardFooter>
            </Card>
        ))}
        {!plans.length && <div className="col-span-3 text-center">Carregando planos...</div>}
      </div>
    </div>
  );
}
