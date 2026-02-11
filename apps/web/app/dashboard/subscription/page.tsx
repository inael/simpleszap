import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

export default function SubscriptionPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Assinatura</h1>
        <p className="text-muted-foreground">
          Gerencie seu plano e cobranças.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Free Plan */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Plano Gratuito</CardTitle>
            <CardDescription>Para começar a testar.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-3xl font-bold mb-4">R$ 0<span className="text-sm font-normal text-muted-foreground">/mês</span></div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-500" /> 1 Instância</li>
              <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-500" /> 100 mensagens/dia</li>
              <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-500" /> Webhooks básicos</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full" variant="outline" disabled>Plano Atual</Button>
          </CardFooter>
        </Card>

        {/* Pro Plan */}
        <Card className="flex flex-col border-primary shadow-md relative">
          <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">Popular</div>
          <CardHeader>
            <CardTitle>Plano Pro</CardTitle>
            <CardDescription>Para negócios em crescimento.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-3xl font-bold mb-4">R$ 97<span className="text-sm font-normal text-muted-foreground">/mês</span></div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-500" /> 3 Instâncias</li>
              <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-500" /> Mensagens ilimitadas</li>
              <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-500" /> Webhooks avançados</li>
              <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-500" /> Suporte prioritário</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Fazer Upgrade</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
