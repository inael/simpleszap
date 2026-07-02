# SimplesZap vs AgentCRM — análise de sobreposição

Data: 2026-05-14

## Stack (idêntica)
Next.js + Supabase self-hosted + Logto + Evolution API + Tailwind/shadcn + Vercel/Coolify + Resend. AgentCRM acrescenta LiteLLM (gateway IA) + pgvector + Assina Agora; SimplesZap acrescenta Asaas (billing já em produção) + Prisma.

## Posicionamento real (hoje)

| Eixo | SimplesZap | AgentCRM |
|---|---|---|
| Maturidade | **Produção** — billing Asaas, trial 7d, cupons, planos cortesia, email onboarding/cancel/win-back, landing+blog+legal | **MVP em construção** — monorepo + API + Logto recém-fechados; CRUD contatos pendente |
| Job-to-be-done | Disparo/instâncias WhatsApp em escala (planos por msgs/dia, múltiplas instâncias) | CRM inteligente: inbox + Kanban + agentes IA + RAG p/ vendas/atendimento/suporte |
| Persona | PME/infoprodutor/marketing que precisa enviar volume | Time comercial/SAC que precisa gerir conversas e pipeline |
| Profundidade no funil | Topo (aquisição, broadcast outbound) | Meio/fundo (conversão, gestão, retenção) |
| Ticket esperado | Baixo, volumétrico (R$/msgs/dia) | Médio/alto, por seat/tenant + IA |
| Diferencial técnico | Conector Evolution robusto, QR/instâncias, billing maduro | Agentes plugáveis multi-modelo + RAG + Kanban |

## Sobreposição genuína
- Conector Evolution API (envio/recebimento, webhooks)
- Auth Logto + multi-tenant (RLS)
- Cadastro de contatos
- Inbox de conversas (planejado nos dois)
- Infra de billing/email/landing (SimplesZap já tem, AgentCRM precisará)

A sobreposição é de **plataforma**, não de **produto**. As dores resolvidas são diferentes.

## Recomendação: manter separados, com plataforma compartilhada

Juntar agora seria oneroso e arriscado:
1. SimplesZap está vendendo. Refator de "produto único" pausa o que gera receita.
2. As personas pagam preços diferentes. Empacotar tudo num plano único canibaliza a entrada barata ou afasta a ponta cara.
3. AgentCRM ainda não validou demanda — fundir um MVP a um produto pago é injetar risco no que funciona.

**Caminho sugerido:**
- **Dois SKUs, uma suite "IT Booster Atendimento":**
  - SimplesZap = entrada (disparo + instâncias), R$/volume
  - AgentCRM = upgrade (CRM + IA + Kanban + RAG), R$/seat ou /tenant
- **Cross-sell embutido no SimplesZap:** banner/upsell "Conecte ao AgentCRM" quando cliente bate teto de msgs ou pede "responder automaticamente"
- **Plataforma compartilhada (`packages/` no monorepo IT Booster):**
  - `@itb/evolution-client` — conector único Evolution
  - `@itb/logto-auth` — wrapper de auth
  - `@itb/billing-asaas` — billing (já maduro no SimplesZap)
  - `@itb/email-onboarding` — sequências (já maduras no SimplesZap)
  - `@itb/tenant-rls` — helpers multi-tenant
- **SSO entre os dois:** mesma conta Logto entra nos dois SaaS; AgentCRM importa contatos/conversas do SimplesZap via API.

## Gatilho para reconsiderar (fusão futura)
Se 6 meses após o lançamento do AgentCRM **>70% dos clientes pagantes do AgentCRM também forem do SimplesZap** e o churn do SimplesZap-only crescer, aí faz sentido fundir num SaaS único com módulos (Disparo / CRM / IA) e cobrança por add-on. Antes disso, é prematuro.

## Próximos passos imediatos
1. Extrair `evolution-client` do SimplesZap para `packages/` compartilhado antes do AgentCRM duplicar
2. AgentCRM reusar o billing Asaas + email infra do SimplesZap (não reescrever)
3. Definir hand-off de dados: API pública no SimplesZap para AgentCRM puxar contatos/conversas
4. Atualizar `.itbooster-meta.yaml` dos dois com `relacionados:` cruzados (catálogo central reflete o vínculo)

---

## Casos práticos de uso

### SimplesZap — "preciso falar com muita gente ao mesmo tempo"
Volume, broadcast outbound, automação simples. Fluxo é **um-para-muitos**.

1. **Infoprodutor / lançamento de curso** — disparo de aquecimento p/ lista de 5k leads (vídeo aula 1 → 2 → 3 → CTA carrinho)
2. **E-commerce — recuperação de carrinho** — automação "abandonou checkout há 1h → manda cupom"
3. **E-commerce — pós-venda** — confirmação de pedido, código de rastreio, NPS
4. **Clínica/consultório — lembrete de consulta** — broadcast 24h antes ("confirma sua consulta de amanhã 14h?")
5. **Imobiliária — portfolio semanal** — envia 10 imóveis novos pra base de interessados
6. **Cobrança / financeira** — notificação de boleto/PIX vencido em lote
7. **Restaurante / delivery — promo do dia** — disparo diário pra base de clientes
8. **Agência marketing — alerta de campanha** — avisa cliente que campanha foi ao ar
9. **Igreja / comunidade — comunicado oficial** — aviso de culto, evento, escala
10. **Confirmação de presença em evento** — webinar, live, workshop

Padrão comum: **lista grande + mensagem padronizada + métrica simples (entregue/lido)**. O cliente não quer "conversar", quer "avisar/notificar/recuperar".

### AgentCRM — "preciso converter e atender bem cada conversa"
Inbound qualificado, agentes IA, pipeline. Fluxo é **muitos-para-um (ou time → cliente)**.

1. **SaaS B2B — pipeline de vendas consultivas** — Kanban: lead novo → reunião agendada → proposta → fechado; SDR usa templates por etapa
2. **Concessionária — test-drive → venda** — agente IA pré-qualifica (modelo? entrada? troca?) e passa lead quente pro vendedor
3. **Imobiliária — qualificação de comprador** — agente IA pergunta orçamento/bairro/quartos antes de o corretor entrar
4. **Clínica premium — agendamento inteligente** — agente IA agenda na agenda do médico via integração; humano confirma; lembra D-1
5. **SAC e-commerce — atendimento com IA + RAG** — "cadê meu pedido?", "qual frete pra 01310?" — IA responde via base de conhecimento, escala humano se sentimento negativo
6. **Suporte técnico SaaS** — FAQ resolvida por agente RAG; tickets reais viram conversa atribuída a analista
7. **Escola / curso — onboarding aluno** — agente IA tira dúvida de matrícula, plataforma, boletos; humano só em casos complexos
8. **Agência — onboarding cliente novo** — pipeline "contrato assinado → kickoff → coleta de assets → primeira entrega" (integra Assina Agora)
9. **Prospecção outbound qualificada** — cold WhatsApp + agente filtra "tem interesse?" antes de queimar tempo do closer
10. **Imobiliária / consórcio — pós-venda longo** — relacionamento de meses até cliente fechar; CRM acompanha touchpoints

Padrão comum: **conversa única importa + contexto histórico + IA reduz custo humano + métrica complexa (conversão, ticket, CSAT)**.

---

## Quando o upsell SimplesZap → AgentCRM faz sentido

Gatilhos observáveis na conta do cliente SimplesZap (alguns viram alertas no dashboard, outros viram ação do time comercial):

| Sinal no SimplesZap | Dor real | Pitch AgentCRM |
|---|---|---|
| Taxa de resposta inbound > 30% do volume enviado | Está virando conversa, não broadcast | "Centralize as respostas num inbox com IA" |
| Cliente bate teto de msgs/dia 3 meses seguidos | Volume não é o gargalo — eficiência é | "Responda mais vendendo melhor, não enviando mais" |
| Múltiplas instâncias com vendedores diferentes | Time precisa de fila/atribuição | "Distribua leads pelo time com Kanban" |
| Reclamações de "perdi o lead porque demorei pra responder" | SLA de resposta | "Agente IA responde em segundos 24/7" |
| Cliente pede "como respondo automaticamente?" | Quer automação inbound | "Agentes plugáveis com sua base de conhecimento" |
| Disparo cresceu mas conversão caiu | Falta CRM no fundo do funil | "Pipeline Kanban + histórico por contato" |
| Pede integração com Assina Agora / contratos | Vende ticket alto, precisa de processo | "Fluxo proposta → contrato → onboarding" |
| Cliente pede "como sei se o lead virou venda?" | Sem atribuição/funil | "Métrica fim-a-fim, da campanha ao deal fechado" |

**Pitch curto:** *"SimplesZap leva você até o lead. AgentCRM transforma o lead em cliente."*

Anti-upsell (quando NÃO empurrar): cliente faz só comunicação transacional (lembrete, NPS, boleto) sem fluxo de venda — AgentCRM é overkill, mantém só no SimplesZap.

---

## Integração entre os dois — sim, e arquitetura sugerida

Os dois **devem** ser integrados desde o lançamento do AgentCRM. Sem integração, o cross-sell vira fricção.

### Pontos de integração

1. **SSO Logto único** — mesma conta entra nos dois. Token Logto carrega `tenants_simpleszap` e `tenants_agentcrm`.
2. **API pública SimplesZap → AgentCRM**
   - `GET /api/v1/contacts` — exporta contatos
   - `GET /api/v1/conversations?since=...` — exporta histórico de conversas
   - Webhook `message.received` — AgentCRM assina, decide se vira lead no Kanban
3. **Webhook de opt-out bidirecional** — cliente respondeu "PARE" no SimplesZap → AgentCRM marca contato como `do_not_contact`. Cliente marcado como "lost" no AgentCRM → SimplesZap não inclui em próxima campanha.
4. **Conector Evolution compartilhado** — `@itb/evolution-client` no monorepo IT Booster, **uma instância Evolution por tenant** consumida pelos dois SaaS (não duplicar instância).
5. **Billing Asaas unificado**
   - Mesmo `asaasCustomerId` para o tenant
   - Duas assinaturas separadas (uma por SaaS) — Asaas suporta múltiplas subs por customer
   - Cancelamento de uma não afeta a outra
   - Cupom cross-product ("assine os dois e ganhe 20%")
6. **Email lifecycle compartilhado** — `@itb/email-onboarding` envia welcome separado por produto, mas com header "IT Booster Atendimento" unificado
7. **UI cross-link**
   - No contato do SimplesZap: botão "Abrir no AgentCRM →" (se tenant tem AgentCRM ativo)
   - No deal do AgentCRM: botão "Disparar campanha no SimplesZap →"
8. **Dashboard unificado (futuro)** — `app.itbooster.com.br` mostra cards dos dois SaaS lado a lado, com métricas resumo

### O que **não** integrar (mantém isolado)
- Schema do banco: cada produto tem seu DB Supabase (já é assim: SimplesZap roda no DB `simpleszap`). Integração via **API pública**, não via SQL cross-DB.
- Permissões/roles: roles do SimplesZap não significam nada no AgentCRM e vice-versa.
- Deploy: pipelines Vercel/Coolify independentes — derrubar um não derruba o outro.

### Ordem prática
1. **Fase 1 (hoje):** documentar contrato de API pública do SimplesZap (`/api/v1/contacts`, `/api/v1/conversations`, webhooks)
2. **Fase 2 (AgentCRM MVP):** AgentCRM consome a API do SimplesZap em modo read-only (importação inicial)
3. **Fase 3:** SSO Logto cross-product + Asaas customer compartilhado
4. **Fase 4:** UI cross-links + dashboard unificado
5. **Fase 5 (após validação):** extrair packages compartilhados (`@itb/evolution-client`, `@itb/billing-asaas`, etc.) para o monorepo IT Booster

