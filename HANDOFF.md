# SimplesZap — Handoff (contexto para outra IA)

## Objetivo atual (estado do projeto)

O SimplesZap está com fluxo de assinatura implementado usando **Assinaturas via API do Asaas** e checkout **hospedado** (abre em nova aba), reduzindo escopo de PCI (o app não coleta dados de cartão).

Ambiente em produção:
- Web: https://app.simpleszap.com
- API: https://back.simpleszap.com

Risco: **HIGH** (pagamentos + webhook + regra de atualização de plano)

## Estrutura do repositório

- `apps/web`: Next.js (App Router) + Clerk (auth) + UI
- `apps/api`: Express (serverless na Vercel) + Prisma + integrações
- `prisma/schema.prisma`: modelos do banco (inclui `User`, `SubscriptionPlan`, `AuditLog`)
- `tests/e2e`: Playwright (há testes smoke/landing/auth/health)

## O que já foi feito (implementação)

### 1) Checkout de assinatura (Web)

Página de assinatura com alternância **Mensal/Anual**, chamando backend e abrindo checkout do Asaas em nova aba:
- [page.tsx](file:///c:/Users/inael-pc/Documents/GitHub/simpleszap/apps/web/app/dashboard/subscription/page.tsx#L12-L88)

Comportamento:
- `POST /subscription/checkout` com `{ planId, cycle }`
- Header: `x-user-id` = `userId` do Clerk (via `useAuth()`)
- Se backend retornar `paymentLink`, abre `window.open(paymentLink, '_blank')`

### 2) Criação de assinatura no Asaas (API)

Serviço do Asaas:
- [asaas.service.ts](file:///c:/Users/inael-pc/Documents/GitHub/simpleszap/apps/api/src/services/asaas.service.ts#L14-L93)

Backend “checkout”:
- [subscription.controller.ts](file:///c:/Users/inael-pc/Documents/GitHub/simpleszap/apps/api/src/controllers/subscription.controller.ts#L6-L61)

Pontos importantes:
- O backend procura usuário no banco por `User.clerkId` (o header `x-user-id` é o ID do Clerk).
- Para correlacionar pagamento → usuário/plano, o backend embute um identificador dentro da `description` da assinatura no Asaas:
  - `sz|uid:<clerkId>|plan:<planId>|cycle:<MONTHLY|YEARLY>`
- Depois de criar a assinatura, o backend chama:
  - `GET /subscriptions/{id}/payments`
  - e tenta pegar o primeiro payment para retornar `invoiceUrl/bankSlipUrl` como `paymentLink`.

### 3) Webhook do Asaas (API)

Controlador:
- [asaas-webhook.controller.ts](file:///c:/Users/inael-pc/Documents/GitHub/simpleszap/apps/api/src/controllers/asaas-webhook.controller.ts#L4-L47)

Regras:
- Valida header `asaas-access-token` contra `ASAAS_WEBHOOK_TOKEN` (ou `ASAAS_WEBHOOK_ACCESS_TOKEN`).
- Em status contendo `RECEIVED` ou `CONFIRMED`, extrai `uid` e `plan` da descrição e atualiza:
  - `User.subscriptionPlanId` do usuário (`where: { clerkId: uid }`)
- Loga o payload (best-effort) em `AuditLog` com `actorId='asaas'` e `action='WEBHOOK_RECEIVED'`.

### 4) Webhook do Clerk (API)

Controlador:
- [webhook.controller.ts](file:///c:/Users/inael-pc/Documents/GitHub/simpleszap/apps/api/src/controllers/webhook.controller.ts#L6-L98)

Regras:
- Verifica assinatura Svix usando `CLERK_WEBHOOK_SECRET`.
- Em `user.created`, cria `User` no banco com `clerkId`, `email`, `name`.
- Em `user.updated`/`user.deleted`, sincroniza.

### 5) Server / rotas (API)

Server:
- [server.ts](file:///c:/Users/inael-pc/Documents/GitHub/simpleszap/apps/api/src/server.ts#L41-L95)

Notas:
- Health check: `GET /health` retorna `{status:'ok'}`
- `clerkMiddleware()` só é aplicado se `CLERK_SECRET_KEY` estiver setado.
- Se o bundle de rotas falhar, o server expõe fallback:
  - `GET /api/health` (degraded)
  - `POST /api/webhooks/asaas` (apenas valida token e responde ok)

## Validação do Asaas (o que foi verificado)

Validação via API do Asaas (sem interface):
- O webhook `SimplesZap Webhook` foi **upsert (update)** com:
  - URL: `https://back.simpleszap.com/api/webhooks/asaas`
  - `sendType: SEQUENTIALLY`
  - `apiVersion: 3`
  - `enabled: true`
  - `interrupted: false`
- O endpoint do backend respondeu `200` com `{ ok: true }` quando enviado `asaas-access-token` correto.

Limitação encontrada ao tentar gerar “evento real”:
- Ao criar cobrança por API (`POST /payments`), o Asaas exigiu **CPF/CNPJ no customer**.
- Ao criar assinatura por API (`POST /subscriptions`):
  - com customer sem CPF: erro genérico
  - com customer com CPF: erro de “valor mínimo” se `value < 5.00`

Isso implica que o fluxo atual pode falhar caso o customer criado não tenha CPF/CNPJ cadastrado no Asaas.

## Variáveis de ambiente (nomes apenas; não colocar valores em código)

### Web (Vercel)
- `NEXT_PUBLIC_API_URL` (ex.: `https://back.simpleszap.com/api`)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

### API (Vercel)
- `DATABASE_URL`
- `CLERK_SECRET_KEY` (para clerkMiddleware)
- `CLERK_WEBHOOK_SECRET` (para webhook Svix do Clerk)
- `ASAAS_API_URL` (sandbox/prod conforme conta)
- `ASAAS_API_KEY`
- `ASAAS_WEBHOOK_TOKEN` (deve bater com header `asaas-access-token` do Asaas)

## Pendências / próximos passos (prioridade)

### P0 — Garantir que assinaturas não falham por CPF/CNPJ

Problema:
- Asaas pode exigir `cpfCnpj` para criar cobranças/assinaturas via API.

Opções (exigem decisão/approval por ser pagamento + PII):
- (A) Capturar CPF/CNPJ no momento do checkout (UI) e enviar ao backend para criar/atualizar customer no Asaas.
  - Ideal: persistir no banco com cuidado (PII) ou salvar apenas no Asaas e manter um `asaasCustomerId` no banco.
- (B) Criar customer no Asaas só quando houver CPF disponível (bloquear “Assinar” até preencher).
- (C) Mudar estratégia para “link de pagamento/checkout” que cadastre customer com CPF no checkout (depende do produto/limitações do Asaas).

### P0 — Endurecer autenticação do backend (anti-fraude)

Hoje:
- O backend confia em `x-user-id` vindo do frontend.

Recomendado:
- Validar JWT do Clerk no backend (ex.: Authorization Bearer) e derivar `clerkId` do token.
- Isso é mudança em auth → requer aprovação humana.

### P1 — Persistir `asaasCustomerId` no banco

Hoje:
- O `createCustomer()` busca por email e, se não existe, cria novo.
- Sem persistência, pode haver duplicidade/erros ao longo do tempo.

Recomendado:
- Adicionar campo `User.asaasCustomerId` e migrar.
- Ao criar assinatura, reutilizar `asaasCustomerId`.

### P1 — Observabilidade do webhook

Hoje:
- O webhook grava `AuditLog` (best-effort), mas não há endpoint/admin UI para consultar.

Recomendado:
- Criar endpoint/admin página para listar últimos `AuditLog` de `actorId='asaas'`.

### P2 — QA/Docs/Produto

- Rodar QA E2E “de verdade” em navegador não-headless (o Clerk pode exigir “Verify you are human” em headless).
- Gerar manual do usuário (prints/GIF) do fluxo de assinatura.

## Checklist operacional (para validar no painel do Asaas)

1) Asaas → Integrações → Webhooks:
   - Confirmar webhook ativo para `https://back.simpleszap.com/api/webhooks/asaas`
   - Confirmar token e versão `v3`
   - Confirmar eventos de pagamento/assinatura estão marcados

2) Asaas → página de entregas/log do webhook:
   - Confirmar chamadas chegando
   - Confirmar respostas `200`

3) App → /dashboard/subscription:
   - Alternar Mensal/Anual
   - Clicar “Assinar”
   - Verificar abertura do checkout do Asaas

4) Após pagamento (sandbox):
   - Confirmar recebimento do evento no Asaas (log)
   - Confirmar plano aplicado ao usuário (via UI do app ou checando DB)

