# Runbook — CORS Logto bloqueando login na landing

## Sintoma

Acessando `https://simpleszap.com`, console mostra:

```
Access to fetch at 'https://auth.itbooster.com.br/oidc/auth?client_id=x1dw9nzyw04imoao637ua…'
(redirected from 'https://simpleszap.com/api/logto/sign-in')
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header
```

Login e signup quebrados. Hero da landing fica visível mas qualquer clique em "Login" / "Começar Grátis" falha silenciosamente.

## Causa raiz

Quando o domínio do Logto self-hosted IT Booster foi migrado de `auth.toolpad.cloud` → `auth.itbooster.com.br` (referência: [infra_logto_dominio.md](../../C:/Users/inael-pc/.claude/projects/c--Users-inael-pc-Documents-GitHub-simpleszap/memory/infra_logto_dominio.md)), a configuração do app SimplesZap (`client_id=x1dw9nzyw04imoao637ua`) não recebeu update na lista de **Allowed CORS Origins**.

Por isso o navegador faz preflight `OPTIONS` no endpoint OIDC e o Logto não responde com o header CORS — bloqueia a requisição antes do auth flow começar.

## Fix (manual no painel admin Logto)

1. Abrir `https://auth.itbooster.com.br/admin` (painel admin) — credenciais em `~/.claude/credentials/services.env` seção Logto.
2. Sidebar → **Applications** → procurar **SimplesZap** (App ID `x1dw9nzyw04imoao637ua`).
3. Aba **Settings** → role até **CORS allowed origins**.
4. Adicionar (cada URL em linha separada):
   ```
   https://simpleszap.com
   https://www.simpleszap.com
   https://back.simpleszap.com
   http://localhost:3000
   http://localhost:3100
   ```
5. Confirmar **Redirect URIs** já contém:
   ```
   https://simpleszap.com/api/logto/callback
   https://simpleszap.com/api/logto/sign-in-callback
   http://localhost:3000/api/logto/callback
   ```
6. Confirmar **Post sign-out redirect URIs**:
   ```
   https://simpleszap.com
   http://localhost:3000
   ```
7. Botão **Save changes** no rodapé.
8. **Não precisa redeploy** — config Logto é runtime, propaga em segundos.

## Validação

```bash
# Preflight CORS (esperado: 200/204 com header Access-Control-Allow-Origin)
curl -i -X OPTIONS https://auth.itbooster.com.br/oidc/auth \
  -H "Origin: https://simpleszap.com" \
  -H "Access-Control-Request-Method: GET" | grep -i access-control
```

Esperado:
```
access-control-allow-origin: https://simpleszap.com
access-control-allow-credentials: true
```

Depois, no navegador (hard reload `Ctrl+Shift+R` em `https://simpleszap.com`):
- Clicar **Login** → deve redirecionar pro Logto (sem erro no console)
- Clicar **Começar Grátis** → deve abrir signup do Logto

## Aplicar mesmo procedimento nos outros apps IT Booster

Mesmo bug provavelmente afeta:
- AssinaAgora (`x1dw9nzyw04...` — outro client_id, próprio app no Logto)
- Tokia
- SimplesMail
- Qualquer SaaS IT Booster que ainda referencia `auth.toolpad.cloud` ou que foi criado antes da migração de domínio

Faz a mesma checagem de CORS allowed origins em cada um.

## Por que não foi pego em deploy

Login funciona normal no dashboard logado (`/dashboard/*`) porque essas rotas já têm sessão Logto via cookie SSR — não passam por CORS. Só quem inicia auth flow **a partir da landing pública** (`/api/logto/sign-in`) bate no CORS, e essas rotas não são testadas em CI.

Sugestão de prevenção: smoke test E2E (Playwright) que clica em "Login" na landing e verifica que chega no `/oidc/auth` sem erro de CORS.
