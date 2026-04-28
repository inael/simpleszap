/**
 * Dados da tabela comparativa — revisar periodicamente com base em informações públicas dos sites.
 * Não inclui logos; apenas nomes em texto.
 */

export interface CompetitorColumn {
  id: string;
  /** Nome exibido (texto) */
  name: string;
  /** Coluna do SimplesZap */
  isUs?: boolean;
}

export interface ComparisonRow {
  id: string;
  label: string;
  /** Texto curto por coluna (id do competidor) */
  cells: Record<string, string>;
}

export const comparisonUpdatedLabel = "Abril de 2026";

export const competitors: CompetitorColumn[] = [
  { id: "simpleszap", name: "SimplesZap", isUs: true },
  { id: "uazapi", name: "UAZAPI" },
  { id: "wasender", name: "Wasender API" },
  { id: "evolution", name: "Evolution API (self-hosted)" },
];

export const comparisonRows: ComparisonRow[] = [
  {
    id: "focus",
    label: "Foco principal",
    cells: {
      simpleszap: "Brasil: API REST, painel e suporte em português",
      uazapi: "Brasil: API WhatsApp e ecossistema de integrações",
      wasender: "Global: API WhatsApp com ênfase em devs",
      evolution: "Global: API open source; hospedagem é sua responsabilidade",
    },
  },
  {
    id: "billing",
    label: "Modelo de cobrança (visão geral)",
    cells: {
      simpleszap: "Assinatura por plano (instâncias/mensagens conforme plano)",
      uazapi: "Planos por instância/serviços; conferir site para valores atuais",
      wasender: "Créditos ou planos por dispositivo; conferir site",
      evolution: "Sem custo de licença do software; custos de VPS, fila e operação",
    },
  },
  {
    id: "webhooks",
    label: "Webhooks / eventos",
    cells: {
      simpleszap: "Webhooks para mensagens e eventos principais",
      uazapi: "Webhooks e integrações citadas na documentação pública",
      wasender: "Webhooks conforme documentação do produto",
      evolution: "Webhooks via stack que você configurar (Redis, etc.)",
    },
  },
  {
    id: "docs",
    label: "Documentação",
    cells: {
      simpleszap: "Documentação e exemplos focados na nossa API",
      uazapi: "Docs públicas e comunidade ativa",
      wasender: "Docs em inglês no site do produto",
      evolution: "Docs da comunidade; complexidade maior (deploy próprio)",
    },
  },
  {
    id: "trial",
    label: "Trial / teste",
    cells: {
      simpleszap: "Período de teste conforme página de planos",
      uazapi: "Políticas de teste no site oficial",
      wasender: "Créditos ou trial conforme página atual",
      evolution: "Sem “trial” comercial: você sobe e testa na sua infra",
    },
  },
  {
    id: "integrations",
    label: "Integrações citadas (exemplos)",
    cells: {
      simpleszap: "Compatível com automações (ex.: n8n) via HTTP; MCP onde aplicável ao seu fluxo",
      uazapi: "Cita integrações e parceiros nas páginas públicas",
      wasender: "Foco em API; integrações via HTTP/SDK conforme docs",
      evolution: "Integra com o que você conectar na sua instalação",
    },
  },
  {
    id: "limitations",
    label: "Limitações / ressalvas (honestidade)",
    cells: {
      simpleszap:
        "Solução não oficial: sujeita às regras do WhatsApp; não há garantia contra bloqueios por mau uso",
      uazapi: "Mesma classe de risco inerente a APIs não oficiais; dependência do fornecedor",
      wasender: "Mesma classe de risco; ver termos e uso aceitável no site",
      evolution: "Operação e segurança dependem da sua equipe e da infra escolhida",
    },
  },
];
