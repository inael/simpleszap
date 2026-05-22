"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, ExternalLink, ArrowLeft, AlertTriangle } from "lucide-react";

const WARMUP_GROUPS = [
  { name: "Grupo de Aquecimento Gratuito do Blü #6", url: "https://chat.whatsapp.com/KJGtvsPFkVbFj09YwSYVfO", category: "Aquecimento" },
  { name: "Esquenta Zap Blü 5", url: "https://chat.whatsapp.com/BEHxL2wxpNK2hSlTm6ZCq3", category: "Aquecimento" },
  { name: "Maturador de WhatsApp Blü 4", url: "https://chat.whatsapp.com/JBHjaX1qxDKKFwskACFZQk", category: "Aquecimento" },
  { name: "Aquecimento WhatsApp Blü 3", url: "https://chat.whatsapp.com/LpACpxIjBmXAqm6yVLoESv", category: "Aquecimento" },
  { name: "Aquecimento Gratuito Blü 2", url: "https://chat.whatsapp.com/GEfYsrzM9nb3uyDyD6PdFc", category: "Aquecimento" },
  { name: "Aquecimento Gratuito Blü 1", url: "https://chat.whatsapp.com/LnigHdUbLRYJEHzhAcwYLY", category: "Aquecimento" },
  { name: "Namoro & Amizade 💝🎀", url: "https://chat.whatsapp.com/LJm0rsDqzUMFIbqd0u9Eii", category: "Conversa" },
  { name: "Zoeira Mitológica", url: "https://chat.whatsapp.com/KnbWKag2nQM9PFbhRETi5P", category: "Conversa" },
  { name: "AMIZADES ❤️ TODOS ESTADOS", url: "https://chat.whatsapp.com/HuGg5IB90vC8Cg9piEJtFh", category: "Conversa" },
  { name: "FUTEBOL ⚽", url: "https://chat.whatsapp.com/GtJhfrrnGTK2CZwbJIhzLe", category: "Conversa" },
  { name: "Compras e Vendas 💰", url: "https://chat.whatsapp.com/KbgLKn8DzyLG6j0anTQ3n2", category: "Tráfego" },
  { name: "Divulge Aqui", url: "https://chat.whatsapp.com/LEGPcrYJkGP6FXIMs4E1V1", category: "Tráfego" },
  { name: "🔥 GRUPO DE OFERTAS 24 HORAS", url: "https://chat.whatsapp.com/GnAOWPPte66KiN23qz9tUY", category: "Tráfego" },
];

const CHECKLIST = [
  { days: "Dia 1-3", text: "Entre em 5+ grupos da lista. Receba mensagens, não envie nada ainda. Não saia dos grupos." },
  { days: "Dia 4-7", text: "Comece a responder ~5 mensagens por dia em grupos. Conversa orgânica. Sem disparos automáticos." },
  { days: "Dia 8-14", text: "Aumente gradual: 10, 20, 50 msgs/dia. Continue ativo nos grupos. Sem campanhas em massa." },
  { days: "Dia 15+", text: "Número pronto pra disparos respeitando o limite do plano. Mantenha atividade orgânica." },
];

export default function AquecimentoPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const grouped = WARMUP_GROUPS.reduce<Record<string, typeof WARMUP_GROUPS>>((acc, g) => {
    (acc[g.category] = acc[g.category] || []).push(g);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/instances" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Voltar para Instâncias
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-2 flex items-center gap-2">
          <Flame className="h-7 w-7 text-orange-500" />
          Aquecimento de Número
        </h1>
        <p className="text-muted-foreground">
          Instância: <span className="font-mono text-xs">{id}</span>
        </p>
      </div>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="pt-6 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900">Por que aquecer antes de disparar?</p>
              <p className="text-amber-800 mt-1">
                A Meta detecta padrões de "robô" rapidamente. Um número novo que <strong>só envia</strong> (sem receber, sem responder, sem grupos) é banido em horas — mesmo respeitando limite diário e jitter. Aquecimento cria <strong>tráfego bidirecional orgânico</strong>: ser mencionado, receber mensagens, conversar em grupos. Isso constrói reputação no algoritmo.
              </p>
              <p className="text-amber-800 mt-1">
                Recomendação: <strong>7-14 dias de aquecimento</strong> antes de usar o número pra disparos. Sem isso, risco de banimento é alto.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checklist diário</CardTitle>
          <CardDescription>Siga essa progressão pra esquentar o número com segurança.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {CHECKLIST.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-20 text-xs font-semibold text-orange-600 uppercase tracking-wide pt-0.5">{step.days}</span>
                <span className="text-sm text-muted-foreground">{step.text}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {Object.entries(grouped).map(([category, groups]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>Grupos — {category}</CardTitle>
            <CardDescription>
              {category === "Aquecimento" && "Grupos públicos focados em interação entre números novos. Entre em pelo menos 3-4 deles."}
              {category === "Conversa" && "Grupos sociais com tráfego orgânico real. Boas pra construir reputação de número humano."}
              {category === "Tráfego" && "Grupos de ofertas e compra/venda — mais movimento, menos engajamento direto. Use pra completar o mix."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {groups.map((g) => (
                <a
                  key={g.url}
                  href={g.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/40 transition"
                >
                  <span className="text-sm">{g.name}</span>
                  <Button variant="outline" size="sm" asChild>
                    <span className="inline-flex items-center gap-1">
                      Entrar <ExternalLink className="h-3 w-3" />
                    </span>
                  </Button>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Boas práticas extras</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
            <li>Configure foto de perfil, nome e descrição realistas (parece menos robô).</li>
            <li>Salve seu próprio número no celular como contato — algumas reputações dependem disso.</li>
            <li>Ative variantes A/B/C em Configurações de envio antes de campanhas — texto idêntico em massa é o maior gatilho de ban.</li>
            <li>Não envie no mesmo segundo várias mensagens iguais. O jitter do SimplesZap (900-2200ms) já protege, mas se você desativar, o risco aumenta muito.</li>
            <li>Evite enviar entre 22h e 7h — Meta sinaliza padrão noturno como bot.</li>
            <li>Se o número for banido, espere 48h antes de tentar reativar. Reaquecimento dura mais que o primeiro.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
