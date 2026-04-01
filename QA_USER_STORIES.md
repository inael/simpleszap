# Plano de QA por Histórias de Usuário (Admin / Member)

## Objetivo

Cobrir as funcionalidades do SimplesZap na visão do usuário final, mapeando o produto via engenharia reversa (UI + API) e convertendo isso em:

- Histórias de usuário por perfil (Admin / Member)
- Critérios de aceitação (positivo, negativo e borda)
- Casos E2E Playwright rastreáveis por história
- Backlog de gaps/bugs para evolução do produto

## Perfis (estado atual)

- Admin: acesso total + área /dashboard/admin + endpoints /api/admin/*
- Member: acesso ao operacional; sem acesso à área admin

Fonte no código:

- Gate do frontend: `/dashboard/admin*` via middleware do Next (Clerk)
- Gate do backend: `/api/admin/*` via middleware `requireAdmin`
- UI: sidebar exibe seção Admin apenas quando o usuário é Admin

## Pré-requisitos de execução (E2E)

Para rodar os testes “logados” (Admin/Member) sem expor senha em variáveis:

1) Gerar storageState Admin:

```powershell
npx playwright codegen https://www.simpleszap.com --save-storage=test-results/.auth/admin.json
```

2) Gerar storageState Member:

```powershell
npx playwright codegen https://www.simpleszap.com --save-storage=test-results/.auth/member.json
```

3) Rodar regressão:

```powershell
$env:BASE_URL="https://www.simpleszap.com"
$env:API_BASE_URL="https://simpleszap-back.vercel.app"
$env:ADMIN_STORAGE_STATE="test-results/.auth/admin.json"
$env:MEMBER_STORAGE_STATE="test-results/.auth/member.json"
npm test
```

## Convenções de histórias

- Prefixos:
  - AUTH: autenticação/organização
  - INS: instâncias
  - MSG: mensagens
  - CNT: contatos
  - TPL: templates
  - WHK: webhooks
  - CMP: campanhas
  - API: chaves de API
  - SUB: assinatura
  - ADM: painel admin
- Severidade:
  - P0: bloqueia uso
  - P1: core do produto
  - P2: importante
  - P3: melhoria

## Histórias (Admin)

### AUTH-ADM-001 (P0) — Login e acesso ao dashboard

- Como Admin, quero fazer login para acessar o painel.
- Aceitação:
  - Dado que estou deslogado, quando eu faço login, então acesso `/dashboard` ou sou direcionado para criar/selecionar organização.
  - Quando eu acesso `/dashboard` deslogado, então sou direcionado ao login.
- Testes:
  - `tests/e2e/auth.spec.ts` (não logado)
  - `tests/e2e/admin.spec.ts` (logado via storageState)

### AUTH-ADM-002 (P0) — Criação/seleção de organização

- Como Admin, quero criar/selecionar organização para usar o sistema.
- Aceitação:
  - Se logado sem org, ao acessar `/dashboard`, devo ir para `/create-organization`.
  - Se logado com org, acessar `/create-organization` deve redirecionar para `/dashboard`.
- Testes:
  - Planejado: `tests/e2e/org.spec.ts`

### INS-ADM-001 (P0) — Criar instância

- Como Admin, quero criar uma instância para conectar meu WhatsApp.
- Aceitação:
  - Criar instância com nome válido retorna sucesso e lista atualiza.
  - Não falha por CORS em `https://www.simpleszap.com`.
  - Nome vazio deve ser bloqueado na UI.
- Testes:
  - Planejado: `tests/e2e/instances.spec.ts`

### INS-ADM-002 (P1) — Conectar instância (QR) e estados

- Como Admin, quero conectar uma instância via QR e acompanhar status.
- Aceitação:
  - Exibe QR quando necessário.
  - Exibe status (conectando/conectado/desconectado) e ações compatíveis.
- Testes:
  - Planejado: `tests/e2e/instances-connect.spec.ts` (depende de ambiente/sandbox)

### MSG-ADM-001 (P1) — Enviar mensagem

- Como Admin, quero enviar mensagem para um contato.
- Aceitação:
  - Envio cria registro/feedback de sucesso.
  - Falhas (instância offline) exibem mensagem clara.
- Testes:
  - Planejado: `tests/e2e/messages-send.spec.ts` (depende de instância conectada)

### WHK-ADM-001 (P1) — Configurar webhooks

- Como Admin, quero cadastrar webhooks para receber eventos.
- Aceitação:
  - CRUD de configuração
  - Teste de entrega / status de entrega
- Testes:
  - Planejado: `tests/e2e/webhooks.spec.ts`

### API-ADM-001 (P1) — Criar/revogar chave de API

- Como Admin, quero criar e revogar chaves para integrar sistemas.
- Aceitação:
  - Criar chave exibe valor uma vez.
  - Revogar chave impede uso.
- Testes:
  - Planejado: `tests/e2e/api-keys.spec.ts`

### SUB-ADM-001 (P1) — Ver assinatura e status

- Como Admin, quero ver o status da assinatura e limites do plano.
- Aceitação:
  - Mostra plano atual e estado (ativa/inadimplente/cancelada).
  - Bloqueia features quando aplicável (se regra existir).
- Testes:
  - Planejado: `tests/e2e/subscription.spec.ts`

### ADM-ADM-001 (P0) — Acessar área admin

- Como Admin, quero acessar o painel admin para gerenciar planos/usuários/métricas.
- Aceitação:
  - `/dashboard/admin` acessível e sidebar mostra seção Administração.
  - `/api/admin/*` retorna 2xx quando autenticado como admin.
- Testes:
  - `tests/e2e/admin.spec.ts` (UI)
  - Planejado: `tests/e2e/admin-api.spec.ts` (API)

## Histórias (Member)

### AUTH-MEM-001 (P0) — Login e acesso ao dashboard

- Como Member, quero fazer login para acessar o painel.
- Aceitação:
  - Igual ao Admin, mas com restrições de admin.
- Testes:
  - Planejado: `tests/e2e/member-auth.spec.ts`

### PERM-MEM-001 (P0) — Restrições de admin

- Como Member, não devo ver nem acessar a seção Administração.
- Aceitação:
  - Sidebar não mostra “Administração”.
  - Acessar `/dashboard/admin` redireciona para `/dashboard`.
- Testes:
  - `tests/e2e/member-permissions.spec.ts`

## Backlog de gaps (para virar issues)

- Definir e validar roles no Clerk (admin/member) + garantir consistência entre UI/middleware/API.
- Completar E2E dos módulos principais (instâncias, mensagens, contatos, templates, webhooks, campanhas, API keys, assinatura).
- Criar portal de documentação + playground (benchmark Z-API).
- Melhorar landing com conteúdo e estrutura inspirados no z-api.io.

