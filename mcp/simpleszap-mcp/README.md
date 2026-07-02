# MCP SimplesZap

Servidor [Model Context Protocol](https://modelcontextprotocol.io) para consultar e ajustar configurações de **envio em massa** (jitter) via API.

## Instalação

```bash
cd mcp/simpleszap-mcp
npm install
```

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `SIMPLESZAP_API_URL` | URL base da API, ex: `https://seu-backend.com/api` |
| `SIMPLESZAP_ORG_ID` | Mesmo valor que `x-org-id` (normalmente o `sub` do Logto) |
| `SIMPLESZAP_API_KEY` | Chave `sk_...` criada no painel |
| `SIMPLESZAP_CLIENT_TOKEN` | Obrigatório se **Segurança → Client-Token** estiver ativo |

## Ferramentas expostas

- `simpleszap_get_user_settings` — lê jitter, variantes e flags (sem segredos).
- `simpleszap_update_campaign_jitter` — define `minMs` / `maxMs`.

## Cursor

Em **Settings → MCP → Add server**, use:

- **Command:** `node`
- **Args:** caminho absoluto para `mcp/simpleszap-mcp/server.mjs`
- **Env:** preencha as variáveis acima.

Chamadas com **somente JWT** (painel web) não usam este MCP; o servidor espera **API key** + opcionalmente **Client-Token**, como integrações server-side.
