import Link from "next/link";

export const metadata = {
  title: "Termos — Funcionalidades de risco | SimplesZap",
};

export default function TermosFuncionalidadesRiscoPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container max-w-3xl mx-auto px-4 py-12 prose prose-green">
        <Link href="/dashboard/campaigns/settings" className="text-sm text-primary hover:underline not-prose">
          ← Voltar às configurações de envio
        </Link>
        <h1 className="text-3xl font-bold text-green-950 mt-6">
          Termos de uso — funcionalidades de alto risco (envio em massa e automações)
        </h1>
        <p className="text-muted-foreground text-sm not-prose">
          Última atualização: documento modelo para aceite antes de usar campanhas e integrações que podem afetar sua conta WhatsApp.
        </p>

        <h2>1. Aceitação dos termos</h2>
        <p>
          Ao ativar ou utilizar funcionalidades de envio em massa, filas de mensagens, botões interativos ou integrações
          conectadas ao WhatsApp por meio do SimplesZap, você concorda com os termos deste documento.
        </p>

        <h2>2. Descrição da funcionalidade</h2>
        <p>
          O SimplesZap permite integrar seu sistema a instâncias de mensagens (por exemplo via Evolution API),
          incluindo envio em massa, templates internos, webhooks e automações. O comportamento exato depende da sua
          configuração e do provedor de infraestrutura utilizado.
        </p>

        <h2>3. Isenção de responsabilidade</h2>
        <p>
          O SimplesZap não se responsabiliza por alterações, suspensões ou remoções de recursos do WhatsApp pela Meta
          (empresa responsável pelo WhatsApp). A Meta pode alterar ou descontinuar APIs, políticas ou limites a qualquer
          momento, com ou sem aviso prévio.
        </p>

        <h2>4. Aviso de risco</h2>
        <p>
          Quem optar por envio em massa ou automações deve estar ciente de que a Meta pode, a seu critério, limitar,
          modificar ou encerrar o uso de contas ou sessões não oficiais. O SimplesZap não será responsável por prejuízos,
          perda de dados ou interrupção de serviços decorrentes dessas ações.
        </p>

        <h2>5. Limitação de responsabilidade</h2>
        <p>
          Em nenhuma hipótese o SimplesZap será responsável por danos diretos, indiretos, incidentais ou consequentes,
          nem por perda de receita, lucro, dados ou uso, decorrentes de banimento, bloqueio ou mudanças nas políticas do
          WhatsApp ou de terceiros.
        </p>

        <h2>6. Alterações nos termos</h2>
        <p>
          Reservamo-nos o direito de modificar estes termos. O uso contínuo das funcionalidades após alterações constitui
          aceitação das novas condições. Recomendamos revisar periodicamente.
        </p>

        <h2>7. Disposições gerais</h2>
        <p>
          Estes termos constituem o acordo sobre o uso das funcionalidades de risco aqui descritas. Se alguma cláusula
          for considerada inválida, as demais permanecem válidas.
        </p>

        <h2>8. Contato</h2>
        <p>
          Dúvidas: utilize o canal de suporte indicado no painel ou o e-mail de contato do SimplesZap.
        </p>
      </div>
    </div>
  );
}
