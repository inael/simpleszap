# Postmortem — SimplesZap-back caído por engine Prisma errado

**Data:** 2026-06-19 (incidente começou ~2026-06-16 com deploy `224387e`)
**Duração:** ~72h em prod com falha intermitente / completa
**Impacto:** SDR-IA Editora Sorian quebrado (P0), dashboard zerado, login com Hydration error
**Severidade:** P0 — primeiro cliente real impactado

## Timeline

- **2026-06-16 15:30 BRT** — Deploy `224387e` ("ci(vercel): deploy via token p/ time multi-dev") sobe via `vercel deploy --prebuilt`. Build rodado no laptop Windows do Inael.
- **2026-06-16 15:32 BRT** — Cron `/api/cron/process-message-queue` começa a retornar 500 a cada minuto. `orgAuth: API key lookup failed` em todas as rotas que tocam DB.
- **2026-06-19 16:30 BRT** — User reporta dashboard zerado e React Hydration error.
- **2026-06-19 16:45 BRT** — Diagnóstico: TCP DB open, credenciais OK, eu conecto via `pg` direto, mas Vercel não. `pg_stat_activity` mostra **1 conexão (a minha)** com `max_connections=100`. Prisma do lambda nunca abriu nem 1 conexão.
- **2026-06-19 19:20 BRT** — Fix `2c1eef4` aplicado: `binaryTargets = ["native", "rhel-openssl-3.0.x"]` no `prisma/schema.prisma`. Sistema volta em ~30s.

## Causa raiz

`prisma/schema.prisma` tinha:

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../apps/api/node_modules/.prisma/client"
}
```

Sem `binaryTargets`, o Prisma assume `native` — o engine binary do **OS onde rodou o `prisma generate`**. Como a CI nova (multi-dev via VERCEL_TOKEN) faz `vercel deploy --prebuilt` rodando `vercel build` no laptop do dev (Windows), só o engine `query_engine-windows.dll.node` foi empacotado em `.vercel/output`.

Lambda Vercel = Amazon Linux/RHEL → não consegue carregar `windows.dll.node` → **PrismaClientInitializationError** em **toda** rota que toca DB. App não crasha (rotas estáticas funcionam), mas qualquer query Prisma falha na inicialização — antes de tentar conectar.

## Por que demorou 72h pra detectar

1. App seguiu "rodando" (rotas como `/api/pricing` retornam 200) → health checks passam
2. Erros 400/500 só apareceram quando cliente real (Sorian) e cron tentaram tocar DB
3. Sintoma confunde: "DB caiu" → mas DB tá perfeito
4. Vercel runtime logs truncam mensagem em ~50 chars → causa real (`PrismaClientInitializationError` + binary path) ficou escondida

## Fix aplicado (`2c1eef4`)

```prisma
generator client {
  provider      = "prisma-client-js"
  output        = "../apps/api/node_modules/.prisma/client"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}
```

`native` = OS local do dev (qualquer). `rhel-openssl-3.0.x` = lambda Vercel. `prisma generate` empacota **ambos** os engines. Build prebuilt do Windows agora carrega o Linux engine quando rodando em produção.

## Prevenção — ação para CI multi-dev

### 1. Documentar `binaryTargets` como obrigatório
Qualquer projeto IT Booster com Prisma + Vercel **PRECISA** ter o array completo no schema. Adicionar checklist no template-projeto IT Booster.

### 2. Smoke test pós-deploy
Adicionar step na GH Actions que, após `vercel deploy`, faça `curl https://back.simpleszap.com/api/billing -H "Authorization: Bearer $TEST_KEY"` e exija 200/401 (não 500). Se falhar → automatic rollback.

### 3. Health endpoint que toca DB
Criar `/api/health/db` que faz `prisma.user.count()` simples. Vercel monitor + UptimeRobot apontam pra cá em vez de `/`. Detecta esse tipo de bug em segundos, não em 72h.

### 4. Revisar outros produtos IT Booster
**Mesma armadilha** afeta qualquer projeto que: (a) usa Prisma, (b) faz `vercel deploy --prebuilt` da CI multi-dev. Checar:
- assina-agora
- darkemail
- freelancego
- usetokia
- consorcio-marketplace
- cotaflow-app
- lancefy-proprietario-hub

Comando rápido por projeto: `grep -A5 "generator client" prisma/schema.prisma` → se não tiver `rhel-openssl-3.0.x` em `binaryTargets`, é uma bomba relógio.

## Aprendizados

1. **`gitDirty: 1` em deploy é red flag** — significa que rodou de máquina dev, não da Vercel. Tudo que assume "build sempre acontece num ambiente padronizado" pode quebrar.
2. **`PrismaClientInitializationError` ≠ DB problem.** É problema do **client**, antes de tocar rede. Sempre verificar engine binary antes de mexer em DB.
3. **Truncamento de logs Vercel esconde causas reais** — investir em logs estruturados via Logtail/Axiom seria diferencial. Custo baixo, retorno alto.
