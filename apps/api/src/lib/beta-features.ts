// Catálogo de features beta. Cada uma exige aceitação explícita dos termos
// antes de ser usável. termsVersion muda quando o conteúdo legal muda —
// aceitações antigas ficam inválidas e o user precisa re-aceitar.

export type BetaFeatureKey = 'buttons' | 'instance_mobile';

export type BetaFeature = {
  key: BetaFeatureKey;
  label: string;
  description: string;
  /** false = "Em breve" (UI mostra mas não permite ativar) */
  available: boolean;
  termsVersion: string;
  /** Markdown completo dos termos. Retornado pelo GET /me/beta-features. */
  termsMarkdown: string;
};

const BUTTONS_TERMS = `## Termos de Uso — Mensagens de Botões no WhatsApp

### 1. Aceitação dos Termos
Ao ativar a funcionalidade de Mensagens de Botões no SimplesZap, você concorda com os termos descritos abaixo.

### 2. Descrição da Funcionalidade
Permite enviar mensagens com botões interativos via Evolution API conectada à sua instância de WhatsApp. Os botões podem direcionar a URLs ou capturar respostas rápidas do usuário final.

### 3. Risco de Bloqueio pela Meta
A Meta (empresa responsável pelo WhatsApp) **restringiu** o uso de botões em mensagens enviadas por contas não-oficiais (modo WhatsApp Web). A entrega depende da versão do WhatsApp do destinatário, do device usado e de critérios internos da Meta que podem mudar a qualquer momento sem aviso.

Isso significa que:
- Alguns destinatários podem **não receber** os botões (recebem só o texto).
- A Meta pode **descontinuar** a funcionalidade a qualquer momento.
- O número de WhatsApp do remetente pode receber **restrições ou banimento** se a Meta considerar uso abusivo.

### 4. Isenção de Responsabilidade
O SimplesZap não se responsabiliza por:
- Mensagens com botões não entregues, entregues parcialmente ou exibidas incorretamente.
- Bloqueios, restrições ou banimentos aplicados pela Meta ao seu número.
- Alterações ou descontinuação da funcionalidade pela Meta.
- Prejuízos comerciais decorrentes do uso ou indisponibilidade dos botões.

### 5. Limitação de Responsabilidade
Em nenhuma circunstância o SimplesZap será responsável por danos diretos, indiretos, incidentais, especiais ou consequentes, ou por perda de receita, lucro ou dados decorrentes do uso desta funcionalidade.

### 6. Alterações nos Termos
O SimplesZap pode modificar estes termos a qualquer momento. Quando a versão mudar, sua aceitação anterior fica inválida e será solicitada nova aceitação na próxima utilização.

### 7. Contato
Dúvidas: suporte@itbooster.com.br ou WhatsApp listado no painel.
`;

const INSTANCE_MOBILE_TERMS = `## Termos de Uso — Instâncias Mobile (Em breve)

Funcionalidade ainda não disponível. Termos serão publicados no lançamento.
`;

export const BETA_FEATURES: Record<BetaFeatureKey, BetaFeature> = {
  buttons: {
    key: 'buttons',
    label: 'Mensagens de Botões',
    description: 'Envie mensagens com botões interativos. Ao ativar você concorda com os termos de uso (entrega não é garantida pela Meta).',
    available: true,
    termsVersion: '2026-05-22.1',
    termsMarkdown: BUTTONS_TERMS,
  },
  instance_mobile: {
    key: 'instance_mobile',
    label: 'Instâncias Mobile',
    description: 'Conecte um WhatsApp sem precisar de celular. Em breve.',
    available: false,
    termsVersion: '0',
    termsMarkdown: INSTANCE_MOBILE_TERMS,
  },
};

export function getBetaFeature(key: string): BetaFeature | null {
  if (key in BETA_FEATURES) return BETA_FEATURES[key as BetaFeatureKey];
  return null;
}
