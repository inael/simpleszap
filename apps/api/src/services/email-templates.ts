// Templates de email transacional. Cada um recebe um payload tipado e
// retorna { subject, html, text }. Tom: PT-BR direto, sem firula.

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://simpleszap.com';

function shell(title: string, bodyHtml: string, ctaUrl?: string, ctaLabel?: string): string {
  const cta = ctaUrl && ctaLabel
    ? `<p style="margin: 32px 0;"><a href="${ctaUrl}" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">${ctaLabel}</a></p>`
    : '';
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f6f7f9;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;color:#0f172a;line-height:1.55;">
    <div style="margin-bottom:24px;font-weight:700;font-size:20px;color:#10b981;">SimplesZap</div>
    ${bodyHtml}
    ${cta}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px;" />
    <p style="font-size:12px;color:#64748b;margin:0;">
      SimplesZap — API de WhatsApp em português, sem complicação.<br/>
      <a href="${APP_URL}" style="color:#10b981;">${APP_URL.replace('https://','')}</a> · Dúvidas? Responda este email.
    </p>
  </div>
</body></html>`;
}

function htmlToText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export type TemplatePayload = Record<string, any>;
export type RenderedTemplate = { subject: string; html: string; text: string };

export const TEMPLATES = {
  // ─── Onboarding ─────────────────────────────────────────
  onboarding_d0: (p: { name?: string }) => {
    const name = p.name?.split(' ')[0] || 'beleza';
    const html = shell('Bem-vindo ao SimplesZap',
      `<h1 style="margin:0 0 16px;font-size:24px;">Bem-vindo, ${name}!</h1>
      <p>Sua conta foi criada com <strong>7 dias de trial Pro grátis</strong>. Você pode conectar até 3 instâncias do WhatsApp e enviar mensagens sem limite durante esse período.</p>
      <p><strong>Próximo passo:</strong> conecte sua primeira instância. Leva menos de 1 minuto — basta escanear um QR Code.</p>`,
      `${APP_URL}/dashboard/instances`,
      'Conectar primeira instância'
    );
    return { subject: 'Bem-vindo ao SimplesZap — comece em 1 minuto', html, text: htmlToText(html) };
  },

  onboarding_d1: (p: { name?: string }) => {
    const html = shell('Como conectar o WhatsApp',
      `<h1 style="margin:0 0 16px;font-size:24px;">Conectou? Aqui vai o passo a passo</h1>
      <p>Se ainda não conectou seu WhatsApp, é o seguinte:</p>
      <ol>
        <li>Acesse <a href="${APP_URL}/dashboard/instances">Instâncias</a> no painel</li>
        <li>Clique em "Nova instância" → dá um nome (ex: "Vendas")</li>
        <li>Abra o WhatsApp no celular → Aparelhos conectados → Conectar um aparelho</li>
        <li>Escaneie o QR Code que aparece na tela</li>
      </ol>
      <p>Em segundos a instância fica online. Daí é só usar a API ou os webhooks pra automatizar o que quiser.</p>`,
      `${APP_URL}/dashboard/instances`,
      'Ir pra Instâncias'
    );
    return { subject: 'Conectando seu WhatsApp ao SimplesZap', html, text: htmlToText(html) };
  },

  onboarding_d3: (p: { name?: string }) => {
    const html = shell('5 ideias pro seu WhatsApp Business',
      `<h1 style="margin:0 0 16px;font-size:24px;">O que você pode fazer com a API</h1>
      <p>Já vi gente usando o SimplesZap pra coisas bem diferentes. Pega umas ideias:</p>
      <ul>
        <li><strong>Confirmação de pedido</strong> — webhook do e-commerce dispara mensagem com status do pedido</li>
        <li><strong>Lembrete de boleto</strong> — script roda 1×/dia avisando quem está perto do vencimento</li>
        <li><strong>NPS pós-venda</strong> — 7 dias depois da compra, manda "Como foi sua experiência?"</li>
        <li><strong>Atendimento ao cliente</strong> — recebe mensagens em webhook, responde via API</li>
        <li><strong>Disparo em massa</strong> — campanhas com lista de contatos e variações de texto</li>
      </ul>
      <p>Se quiser ajuda pra desenhar um caso pro seu negócio, é só responder este email.</p>`,
      `${APP_URL}/dashboard/templates`,
      'Ver templates de mensagem'
    );
    return { subject: '5 ideias pro WhatsApp do seu negócio', html, text: htmlToText(html) };
  },

  trial_ending_d5: (p: { name?: string; daysLeft?: number }) => {
    const days = p.daysLeft ?? 2;
    const html = shell('Seu trial Pro acaba em breve',
      `<h1 style="margin:0 0 16px;font-size:24px;">Faltam ${days} dias do seu trial Pro</h1>
      <p>Seu trial gratuito do plano <strong>Pro</strong> termina em ${days} dias. Sem assinatura, sua conta cai pro plano gratuito (1 instância, 50 mensagens/dia).</p>
      <p>Se o SimplesZap virou parte do seu fluxo, vale assinar agora pra não interromper. Plano <strong>Pro custa R$ 39/mês</strong> com 3 instâncias e mensagens ilimitadas.</p>`,
      `${APP_URL}/dashboard/subscription`,
      'Assinar Pro agora'
    );
    return { subject: `Seu trial Pro acaba em ${days} dias`, html, text: htmlToText(html) };
  },

  trial_ended_d7: (p: { name?: string }) => {
    const html = shell('Trial expirou — 20% off por 30 dias',
      `<h1 style="margin:0 0 16px;font-size:24px;">Sentimos sua falta no Pro</h1>
      <p>Seu trial Pro acabou e sua conta voltou pro plano gratuito. Se quiser continuar com mais instâncias e mensagens ilimitadas, separamos um <strong>cupom de 20% off</strong> que vale agora:</p>
      <p style="background:#f0fdf4;border:1px solid #86efac;padding:16px;border-radius:8px;font-size:18px;font-family:monospace;text-align:center;">BEMVINDO20</p>
      <p>Aplique no checkout — vale pros planos Pro e Scale, mensal ou anual. Cupom expira em 30 dias.</p>`,
      `${APP_URL}/dashboard/subscription`,
      'Assinar com 20% off'
    );
    return { subject: 'Cupom de 20% off pra voltar pro Pro (BEMVINDO20)', html, text: htmlToText(html) };
  },

  // ─── Win-back após cancelamento ────────────────────────
  winback_accepted: (p: { couponCode: string; planName: string }) => {
    const html = shell('Desconto aplicado',
      `<h1 style="margin:0 0 16px;font-size:24px;">Tá certo, 50% off no próximo mês</h1>
      <p>Sua próxima cobrança do plano <strong>${p.planName}</strong> vai sair com 50% de desconto. Não precisa fazer nada — o cupom <strong>${p.couponCode}</strong> já foi aplicado na sua próxima fatura.</p>
      <p>Se em algum momento quiser cancelar de verdade, é só voltar em Assinatura.</p>`,
      `${APP_URL}/dashboard/subscription`,
      'Ver minha assinatura'
    );
    return { subject: 'Desconto de 50% aplicado na próxima fatura', html, text: htmlToText(html) };
  },

  winback_d3: (p: { name?: string }) => {
    const html = shell('Sentimos sua falta',
      `<h1 style="margin:0 0 16px;font-size:24px;">A gente quer você de volta</h1>
      <p>Faz uns dias que você cancelou e a gente queria saber: foi algo que poderíamos ter resolvido? Responde este email contando o motivo, leio pessoalmente.</p>
      <p>Se a questão foi preço, separamos uma oferta especial: <strong>30% off por 3 meses</strong> com o cupom abaixo:</p>
      <p style="background:#fef3c7;border:1px solid #fcd34d;padding:16px;border-radius:8px;font-size:18px;font-family:monospace;text-align:center;">VOLTA30</p>
      <p>Vale pra qualquer plano pago. Expira em 7 dias.</p>`,
      `${APP_URL}/dashboard/subscription`,
      'Voltar com 30% off'
    );
    return { subject: 'Sentimos sua falta — 30% off por 3 meses', html, text: htmlToText(html) };
  },

  winback_d14: (p: { name?: string }) => {
    const html = shell('Última chance',
      `<h1 style="margin:0 0 16px;font-size:24px;">Última oferta pra você voltar</h1>
      <p>Sabe que a gente é teimoso 😅. Esta é a última oferta que vou mandar — depois disso paramos de te incomodar.</p>
      <p><strong>50% off no primeiro mês</strong>, em qualquer plano pago. Cupom expira em 7 dias:</p>
      <p style="background:#dbeafe;border:1px solid #93c5fd;padding:16px;border-radius:8px;font-size:18px;font-family:monospace;text-align:center;">VOLTA50</p>
      <p>Se mesmo assim não fizer sentido pra você agora, tudo bem — boa sorte com o que vier pela frente.</p>`,
      `${APP_URL}/dashboard/subscription`,
      'Voltar com 50% off'
    );
    return { subject: 'Última oferta — 50% off no 1º mês', html, text: htmlToText(html) };
  },
} as const;

export type TemplateKey = keyof typeof TEMPLATES;

export function renderTemplate(key: string, payload: TemplatePayload): RenderedTemplate | null {
  const fn = (TEMPLATES as any)[key];
  if (!fn) return null;
  return fn(payload || {});
}
