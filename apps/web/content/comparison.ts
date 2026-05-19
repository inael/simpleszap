/**
 * Dados da tabela comparativa — revisar periodicamente com base em informações públicas dos sites.
 * Não inclui logos; apenas nomes em texto.
 *
 * Fontes públicas consultadas (revisar antes de alterar):
 * - wasenderapi.com, kapso.ai, z-api.io, w-api.app,
 *   wppmarketing.com/developer, uazapi.dev, zavu.dev
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

export const comparisonUpdatedLabel = "Maio de 2026";

export const competitors: CompetitorColumn[] = [
  { id: "simpleszap", name: "SimplesZap", isUs: true },
  { id: "uazapi", name: "UAZAPI" },
  { id: "wasender", name: "Wasender API" },
  { id: "zapi", name: "Z-API" },
  { id: "wapi", name: "W-API" },
  { id: "kapso", name: "Kapso" },
  { id: "wppmarketing", name: "WppMarketing" },
  { id: "zavu", name: "Zavu" },
];

export const comparisonRows: ComparisonRow[] = [
  {
    id: "focus",
    label: "Foco principal",
    cells: {
      simpleszap: "Brasil: API REST, painel e suporte em português",
      uazapi: "Brasil: API WhatsApp e ecossistema de integrações",
      wasender: "Global: API WhatsApp com ênfase em devs",
      zapi: "Brasil: API consolidada com foco em empresas e integrações",
      wapi: "Brasil: API WhatsApp simples para devs e automações",
      kapso: "Global: plataforma com viés de IA/agentes sobre WhatsApp",
      wppmarketing: "Brasil: API voltada a marketing e disparos integrados",
      zavu: "Global: API WhatsApp para desenvolvedores",
    },
  },
  {
    id: "billing",
    label: "Modelo de cobrança (visão geral)",
    cells: {
      simpleszap: "Assinatura por plano (instâncias/mensagens conforme plano)",
      uazapi: "Planos por instância/serviços; conferir site para valores atuais",
      wasender: "Créditos ou planos por dispositivo; conferir site",
      zapi: "Planos por instância; ver site para valores e limites",
      wapi: "Planos por instância/uso; ver site para condições atuais",
      kapso: "Planos com componentes de IA/uso; ver site para detalhes",
      wppmarketing: "Planos por volume/instância; ver site para valores",
      zavu: "Planos por instância/API; ver site para valores atuais",
    },
  },
  {
    id: "webhooks",
    label: "Webhooks / eventos",
    cells: {
      simpleszap: "Webhooks para mensagens e eventos principais",
      uazapi: "Webhooks e integrações citadas na documentação pública",
      wasender: "Webhooks conforme documentação do produto",
      zapi: "Webhooks de mensagens, status e eventos diversos",
      wapi: "Webhooks de mensagens e eventos conforme docs",
      kapso: "Webhooks e gatilhos voltados a fluxos de agente/IA",
      wppmarketing: "Webhooks para eventos de envio e resposta",
      zavu: "Webhooks de mensagens e eventos conforme docs",
    },
  },
  {
    id: "docs",
    label: "Documentação",
    cells: {
      simpleszap: "Documentação e exemplos focados na nossa API",
      uazapi: "Docs públicas e comunidade ativa",
      wasender: "Docs em inglês no site do produto",
      zapi: "Docs em português com exemplos de integração",
      wapi: "Docs públicas com referência de endpoints",
      kapso: "Docs em inglês com foco em casos de IA/automação",
      wppmarketing: "Docs do produto em português voltadas a marketing",
      zavu: "Docs em inglês com referência da API",
    },
  },
  {
    id: "trial",
    label: "Trial / teste",
    cells: {
      simpleszap: "Período de teste conforme página de planos",
      uazapi: "Políticas de teste no site oficial",
      wasender: "Créditos ou trial conforme página atual",
      zapi: "Trial/sandbox conforme política vigente; ver site",
      wapi: "Período de teste ou plano inicial; ver site",
      kapso: "Trial conforme política do site; conferir página de planos",
      wppmarketing: "Trial/teste conforme oferta atual no site",
      zavu: "Trial conforme página de planos vigente",
    },
  },
  {
    id: "integrations",
    label: "Integrações citadas (exemplos)",
    cells: {
      simpleszap: "Compatível com automações (ex.: n8n) via HTTP; MCP onde aplicável ao seu fluxo",
      uazapi: "Cita integrações e parceiros nas páginas públicas",
      wasender: "Foco em API; integrações via HTTP/SDK conforme docs",
      zapi: "Integra com n8n, Make, Zapier e CRMs via HTTP",
      wapi: "Integrações via HTTP/SDK com automações comuns",
      kapso: "Conectores para fluxos de agente e ferramentas de IA",
      wppmarketing: "Integra com ferramentas de disparo e CRMs citadas no site",
      zavu: "Integrações via HTTP/SDK conforme documentação",
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
      zapi: "API não oficial: sujeita às regras do WhatsApp; ver termos",
      wapi: "API não oficial: risco de bloqueio por mau uso; ver termos",
      kapso: "API não oficial; verificar termos sobre uso de IA/automações",
      wppmarketing: "API não oficial voltada a marketing: risco maior em disparos em massa",
      zavu: "API não oficial: sujeita às regras do WhatsApp; ver termos",
    },
  },
];
