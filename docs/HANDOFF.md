# SimplesZap — Handoff para próximo dev

Data: 2026-05-19
Status do produto: **em produção, vendendo**

---

## 1. O que é o SimplesZap

API REST + painel para uso da Evolution API (WhatsApp não oficial) com billing
recorrente, em português, focada no mercado brasileiro.

- **Persona:** PME / infoprodutor / marketing que precisa enviar volume.
- **Job-to-be-done:** disparo/broadcast e múltiplas instâncias WhatsApp em
  escala — ver casos práticos em [docs/analise/agentcrm-vs-simpleszap.md](analise/agentcrm-vs-simpleszap.md).
- **Não é CRM:** se a dor é gerir conversas/pipeline, é AgentCRM (outro repo).

---

## 2. Arquitetura

Monorepo Next.js + Express (npm workspaces).

```
apps/
  web/       Next 16 + React 19 + Tailwind + shadcn (landing, painel, blog, /comparativo)
  api/       Express + Prisma 5 + Logto (JWT) + axios (cliente Evolution + Asaas)
prisma/      schema.prisma único, compartilhado por web e api
mcp/         MCP server "simpleszap-mcp" (integração com Claude Desktop)
tools/       scripts utilitários
tests/       Playwright E2E
```

**Auth:** Logto (não Clerk, embora exista `CLERK_EMAIL_TEMPLATES.md` legado em
`apps/web/` — pode ser arquivado).

**DB:** Postgres dedicado `simpleszap` no Supabase self-hosted
`supabase.toolpad.cloud:5432`. **Não** é o DB compartilhado `postgres`
(cross-schema FKs quebram `prisma db push`). Connection string completa em
`~/.claude/credentials/services.env`.

**Deploy:**
- `apps/web` → Vercel projeto `simpleszap` (team IT Booster `inaels-projects-f2dcb9b7`)
- `apps/api` → Vercel projeto `simpleszap-back` (`prj_8MJi3k6YG5lV6ra5k2VxqlePUjFN`)
- Branch `main` → produção (auto-deploy)

**Integrações externas:**
- **Asaas** (gateway de cobrança IT Booster): assinaturas, cupons, webhooks em `/webhooks/asaas` (endpoint **plural**, ver commit `54a633a`)
- **Evolution API**: cliente HTTP para enviar/receber mensagens e gerenciar instâncias
- **SimplesMail** (e-mail transacional IT Booster): onboarding D0/D1/D3/D7/D14, cancel, win-back
- **Logto**: SSO

---

## 3. O que já está em produção (checklist)

- [x] Landing + planos + blog + páginas legais (`apps/web/app`)
- [x] **Comparativo público** `/comparativo` — atualizado Maio/2026 com 7 concorrentes ([apps/web/content/comparison.ts](../apps/web/content/comparison.ts))
- [x] Auth Logto (login/logout, sessão SSR)
- [x] Multi-tenant via Org (RLS no Postgres)
- [x] CRUD de instâncias Evolution (criar, QR code, status)
- [x] Envio de mensagem via API
- [x] Webhooks Evolution → consumer interno
- [x] **Billing Asaas completo:**
  - [x] Planos (Free, Pro, Scale, Anual) com limites de msgs/dia e instâncias
  - [x] Trial 7 dias
  - [x] CPF/CNPJ obrigatório no checkout
  - [x] Cupons (% e R$, single-use, multi-use, validade, restrições por plano)
  - [x] Cortesia VIP (admin concede acesso pleno bypass Asaas — `manualSubscriptionUntil`)
  - [x] Cancela assinaturas anteriores ativas antes de criar nova
  - [x] Erro claro quando valor final < R$5 (mínimo Asaas)
  - [x] UX subscription sem flash, plano atual destacado, upgrade/downgrade
- [x] **Email infra** (SimplesMail):
  - [x] Sequência onboarding D0/D1/D3/D7/D14
  - [x] Email de cancelamento + win-back
  - [x] Bugfix `from puro + fromName separado` (commit `520ad17`)
- [x] AuditLog (admin actions)
- [x] Admin UI: `/dashboard/admin/users` (cortesia, ver/revogar)

---

## 4. Pendências e próximos passos

### 4.1 Billing — backlog priorizado
Fonte: roadmap salvo em sessões anteriores + commits recentes.

1. **Win-back modal ao cancelar** (50% off próximo mês) — solicitado pelo Inael 2026-04-29. Criar cupom tipo `win_back` single-use validade 1 mês, PUT na fatura Asaas.
2. **Pause subscription** — pausar 30/60 dias em vez de cancelar.
3. **Referral / "amigo indica amigo"** — usar a skill `bootstrap-referral` (Tokia Sprint 46 como referência); decisão contábil de afiliados ainda pendente.
4. **Notificação 3 dias antes de fim do trial** — cron + template no SimplesMail.
5. **Recuperação de cobrança falha** (cartão expirado, etc) — email + retry.
6. **Trial estendido para VIPs** — flag opcional no `User`.

### 4.2 Plataforma compartilhada IT Booster
Conforme análise em [docs/analise/agentcrm-vs-simpleszap.md](analise/agentcrm-vs-simpleszap.md), antes do AgentCRM duplicar código:
1. Extrair `evolution-client` do SimplesZap para `packages/@itb/evolution-client`.
2. Expor billing Asaas + email infra como `@itb/billing-asaas` e `@itb/email-onboarding`.
3. Definir API pública no SimplesZap para o AgentCRM puxar contatos/conversas.
4. Atualizar `.itbooster-meta.yaml` (relacionados cruzados) — **arquivo ainda não existe na raiz** deste repo; criar a partir do template em `<ItBoosterEmpresa>/tools/catalog/template-projeto/`.

### 4.3 Higiene do repo
- [ ] Remover `apps/web/CLERK_EMAIL_TEMPLATES.md` (legado, hoje é Logto)
- [ ] Mover `apagar-sessao-claude-code.md` e `proposta-alyn.*` da raiz (são artefatos pessoais/comerciais; não devem estar no repo do produto)
- [ ] Adicionar `.itbooster-meta.yaml` na raiz (catálogo IT Booster)
- [ ] Avaliar `mcp/simpleszap-mcp` — está commitado? funciona? documentado?

### 4.4 Documentação / dev experience
- [ ] Sem `CLAUDE.md` no repo — criar com convenções específicas (autor inline, DB dedicado, endpoint plural webhooks Asaas, etc).
- [ ] Sem `README.md` na raiz — apenas `apps/web/README.md` (default Next).
- [ ] Documentar variáveis de ambiente esperadas (`.env.local` tem 5k+ chars mas não há template).

---

## 5. Convenções obrigatórias (não negociáveis)

**Git author inline em todo commit:**
```bash
git commit --author="inael <inael.rodrigues@gmail.com>" -m "..."
```
Sem isso, Vercel bloqueia o deploy com "Deployment Blocked" (autor do git config global não é membro do team IT Booster). Regra global em `~/.claude/CLAUDE.md`.

**Webhook Asaas:** endpoint é `/webhooks/asaas` (plural). Singular sobrescreve webhooks de outros produtos IT Booster (commit `54a633a`).

**SimplesMail:** `from` puro (só email) + `fromName` em campo separado. **Não** `"Name <email>"` (commit `520ad17`).

**DB:** sempre apontar para database `simpleszap`, nunca `postgres`. Connection string em `services.env`.

**Status dashboard:** ao expor URL nova (`*.itbooster.com.br`, novo deploy), cadastrar em https://status.toolpad.cloud/.

---

## 6. Onde achar contexto

| O quê | Onde |
|---|---|
| Credenciais (Logto, Asaas, Evolution, SMTP, Vercel) | `~/.claude/credentials/services.env` |
| Catálogo de todos os produtos IT Booster | `<ItBoosterEmpresa>/docs/catalogo/PROJETOS.md` |
| Análise vs AgentCRM (decisão de manter separados) | [docs/analise/agentcrm-vs-simpleszap.md](analise/agentcrm-vs-simpleszap.md) |
| Tabela comparativa pública | [apps/web/content/comparison.ts](../apps/web/content/comparison.ts) → renderizada em `/comparativo` |
| Histórico recente | `git log --oneline -30` (últimos 15 commits são billing + email) |

---

## 7. Comandos úteis

```bash
# Dev local
npm install                          # raiz (workspaces)
npm --workspace apps/web run dev     # Next dev (porta 3000)
npm --workspace apps/api run dev     # Express dev (porta 3001)

# Prisma
npm --workspace apps/api run db:push # aplicar schema no DB dedicado

# Testes
npx playwright test                  # E2E (tests/)
```

Antes de qualquer `db:push`, garantir que `DATABASE_URL` e `DIRECT_URL`
apontam para `/simpleszap` (não `/postgres`).
