# Reavaliação de arquitetura + redução de custos VPS — IT Booster

**Data:** 2026-06-19
**Contexto:** Pós-incidente Prisma. User pediu visão geral pra reduzir custos VPS após reestruturação recente (apps migrados pra Vercel, builds movidos pra GH Actions).

---

## 1. Inventário (o que ainda roda na VPS)

Aplicações Docker conhecidas na VPS IT Booster (`supabase.toolpad.cloud`):

| Serviço | Função | Compartilhado? | Pode mover? |
|---|---|---|---|
| **Postgres (Supabase)** | DB de TODOS os SaaS IT Booster (DBs dedicados: simpleszap, usetokia, etc.) | Sim | **Não viável** — mover pra Supabase Cloud/Neon explode custo (US$ 25/mês por DB × 8 produtos = $200/mês) |
| **Supabase Studio + Kong** | UI + REST API auto-gerado | Compartilhado | **Não mover** — preso ao Postgres |
| **Logto** | Auth OIDC compartilhado (`auth.itbooster.com.br`) | Sim | **Não mover** — Logto Cloud é US$ 16/mês mínimo |
| **Evolution API** (WhatsApp baileys) | Gateway WhatsApp pra SimplesZap | Sim | **Manter** — única opção self-hosted realista; alternativas SaaS cobram US$ 5-15 por instância/mês |
| **Traefik** | Reverse proxy | Sim | Manter (necessário pra todos os serviços VPS) |
| **n8n** | Automações dos clientes (Sorian SDR-IA, etc.) | Sim | **Possível**: n8n Cloud US$ 24/mês — não vale se >1 cliente roda fluxos |
| **LiteLLM** | Hub de IA (proxy pra Anthropic/Google/DeepSeek/OpenRouter) | Sim | **Possível**: cada produto chama provider direto. Mas perde abstração + cache + tracking de custo |
| **Chatwoot** | Atendimento interno | Compartilhado | **Possível**: Chatwoot Cloud US$ 19/mês por agente |
| **Paperclip** | Storage | Compartilhado | **Possível**: Cloudflare R2 (~US$ 0.015/GB) |
| **Outline** | Wiki interno | Compartilhado | **Possível**: Outline Cloud US$ 10/mês ou Notion free |
| **Discord bot / N8N webhooks** | Notificações internas | Compartilhado | Possível mover pra GH Actions cron |

## 2. Já migrado pra Vercel (decisão correta)

- ✅ **simpleszap-back** (Express API) — Vercel Functions
- ✅ **simpleszap-front** (Next.js dashboard) — Vercel
- ✅ **assina-agora, darkemail, freelancego, usetokia** — Vercel
- ✅ Landing pages, blogs MDX

Esses **não devem voltar pra VPS** — Vercel cobra pelo uso real (free tier cobre 99% do tráfego atual) e cuida de SSL/CDN/scaling de graça.

## 3. Custos hoje vs. alternativas — análise honesta

### O que manter na VPS (sem alternativa viável)
- **Postgres** — mover pra cloud explode custo (8 DBs × US$ 25 mínimo = US$ 200/mês). VPS atual provavelmente custa US$ 20-50/mês comportando todos.
- **Logto** — auth self-hosted é praticamente grátis. Cloud cobra por MAU.
- **Evolution API** — alternativa SaaS triplica custo + perde controle anti-banimento.

### Onde economizar SEM mover
1. **Auditar containers órfãos** — apps que descontinuou mas docker-compose ainda sobe (RAM/disco). Roda `docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"` e remove o que não usa.
2. **Limitar RAM por container** — `mem_limit: 512m` em cada serviço. Evita 1 app travado matar a VPS.
3. **Volumes antigos** — `docker volume ls` + `docker system df`. Volume de DB de produto descontinuado consome disco caro.
4. **Reduzir log retention** — Postgres + n8n + Chatwoot acumulam logs/DB grandes. Schedule de vacuum semanal + log rotation.

### Onde economizar MOVENDO
| Serviço | Hoje (VPS) | Alternativa | Economia/risco |
|---|---|---|---|
| Outline (wiki) | RAM + DB | Notion free ou GitHub wiki | Economiza ~200MB RAM. Zero risco. |
| Chatwoot | RAM + DB + storage | Crisp grátis OU Chatwoot Cloud | Se atendimento é leve, Crisp resolve. Economiza ~1GB RAM. |
| Discord bot | Container leve | GH Actions cron | Economiza container, melhora reliability. |
| Paperclip → R2 | Disco caro | Cloudflare R2 | Disco VPS é o gasto invisível; R2 cobra só por GB usado (US$ 0.015) |

## 4. Recomendação priorizada

### Sprint 1 (esta semana) — Estabilidade pós-incidente
1. **Aplicar fix de `binaryTargets` em TODOS os projetos Prisma IT Booster** (lista no postmortem)
2. **Adicionar health endpoint `/api/health/db`** em cada API + monitor UptimeRobot
3. **Documentar runbook de deploy multi-dev** em `ItBooster/docs/runbooks/` (qual CI pode usar `--prebuilt`, quais não)

### Sprint 2 (próximas 2 semanas) — Limpeza VPS
4. **Inventário Docker** via SSH — listar todos containers ativos + ociosos + uso de RAM/disco
5. **Limites de RAM** em cada container do docker-compose
6. **Remoção de containers órfãos** e volumes antigos
7. **Migração Discord bot → GH Actions cron** (uma sexta à noite, baixo risco)

### Sprint 3 (mês) — Mudanças de arquitetura
8. **Avaliar mover Outline e Chatwoot** (decisão depende de uso real — vou pedir métricas antes)
9. **Paperclip → R2** se uso > 5GB
10. **Centralizar observability** — Logtail/Axiom no lugar de logs disperos

### NÃO recomendado (gasto>economia)
- ❌ Mover Postgres pra cloud
- ❌ Mover Evolution API pra SaaS
- ❌ Mover Logto pra cloud

## 5. Próxima ação concreta

Pra eu te dar números reais (não palpite), preciso de **30min de SSH na VPS** com:
- `docker ps -a` + `docker stats --no-stream`
- `df -h` + `du -sh /var/lib/docker`
- Plano atual VPS (Hostinger? Contabo? IBM Cloud?) — qual tier e custo mensal

Com isso fecho **um plano de economia em R$ concretos** + ordem de execução.
