# Prompt — Integração AssinaAgora ↔ SimplesZap via API key

> Cole este prompt no Claude Code (ou IA equivalente) do repo **AssinaAgora** pra implementar a integração.
> Versão: 2026-05-20.

---

## Contexto pro modelo

Você está no repo do **AssinaAgora** (app SaaS de assinatura eletrônica da IT Booster).
Vamos adicionar uma feature de **notificações por WhatsApp** disparadas via **SimplesZap** (outro produto IT Booster — gateway de WhatsApp da casa).

A integração é **via API key** do SimplesZap, sem OAuth. O cliente:
1. Vai no SimplesZap, gera uma API key (`sk_...`)
2. Cola no AssinaAgora, em `Configurações → WhatsApp`
3. Daqui pra frente, o AssinaAgora dispara mensagens via SimplesZap quando assinaturas ocorrerem (lembrete, confirmação, etc).

O **fluxo recomendado é embutido**: o AssinaAgora não força o cliente a sair pra configurar nada no SimplesZap. Após colar a key, o AssinaAgora cria a instância de WhatsApp e mostra o QR code direto na tela dele.

---

## API SimplesZap — endpoints relevantes

**Base URL produção:** `https://back.simpleszap.com/api` (todas as rotas estão sob `/api` — confirmado em `apps/api/src/server.ts:72`)
**Autenticação:** header `x-api-key: sk_xxx` em todas as chamadas (alternativa: `Authorization: Bearer sk_xxx`).

| Método | Path | Scope (se key tiver scopes restritos) | O que faz |
|---|---|---|---|
| `POST` | `/instance/create` | `instances:create` | Cria uma nova instância de WhatsApp. Body: `{ "name": "AssinaAgora-{orgSlug}" }`. Retorno: `{ instance: { id, name, ... }, evolution: {...} }` |
| `GET` | `/instance/qr/:id` | `instances:read` | Retorna o QR code pra conectar a instância. Polling recomendado a cada 3s até `state="open"`. Retorno: `{ qrcode: { base64 }, state: "connecting" \| "open" }` |
| `GET` | `/instances` | (sem scope) | Lista as instâncias da org dona da key. Útil pra mostrar quais já existem antes de criar uma nova. |
| `POST` | `/message/sendText/:instanceId` | `messages:send` | Envia mensagem. Body: `{ "number": "5511999999999", "text": "Olá!" }`. `number` é E.164 sem `+`. |
| `DELETE` | `/instance/:id` | (sem scope) | Remove a instância. Útil se o usuário quiser desconectar. |

**Sobre scopes:** API keys criadas hoje vêm com `scopes: null` (acesso total). O backend só restringe se a key tiver lista de scopes preenchida. Pode ignorar scopes na primeira versão.

---

## Tratamento de erros — formato padronizado

Erros de limite de plano vêm com **payload estruturado**, pronto pra exibir pro usuário:

```http
HTTP 429 Too Many Requests (ou 403 pra limite de instâncias)
```
```json
{
  "error": {
    "code": "PLAN_DAILY_MESSAGE_LIMIT_REACHED",
    "message": "Limite diário de mensagens atingido (100/100). Faça upgrade ou aguarde até amanhã.",
    "messageEn": "Daily message limit reached (100/100). Upgrade your plan or wait until tomorrow.",
    "limit": 100,
    "current": 100,
    "planId": "free",
    "upgradeUrl": "https://simpleszap.com/dashboard/subscription",
    "supportUrl": "https://simpleszap.com/contato"
  }
}
```

**Códigos possíveis:**
- `PLAN_INSTANCE_LIMIT_REACHED` (HTTP 403) — cliente atingiu limite de instâncias do plano dele.
- `PLAN_DAILY_MESSAGE_LIMIT_REACHED` (HTTP 429) — limite diário de mensagens.

**Comportamento esperado no AssinaAgora:**
- Detectar `response.data.error.code` começando com `PLAN_*` → exibir `error.message` (PT-BR) num toast/banner amigável com link `error.upgradeUrl` ("Fazer upgrade").
- Para erros 401 (API key inválida/revogada) → marcar conexão como "expirada", pedir nova key.
- Para erros 5xx ou network → toast genérico, oferecer retry. **Não** mostrar stack trace.

---

## O que implementar no AssinaAgora

### 1. Schema
Adicionar campos em algum lugar (User/Organization, depende da arquitetura atual do AssinaAgora):
```
simpleszap_api_key       TEXT (criptografada em rest, ver lib `crypto` ou KMS atual)
simpleszap_instance_id   TEXT NULL
simpleszap_instance_name TEXT NULL
simpleszap_connected_at  TIMESTAMP NULL
```

### 2. Tela `Configurações → WhatsApp`
Estados visuais:

**A) Sem API key cadastrada**
- Input "Cole sua API key (sk_...)" + botão "Validar"
- Link helper: "Gerar uma chave no SimplesZap → https://simpleszap.com/dashboard/api-keys"
- Ao validar: `GET /instances` com a key. Se 200, salva criptografada. Se 401, mostra "Chave inválida".

**B) API key válida, sem instância conectada**
- Mostra "Conectar WhatsApp"
- Botão "Conectar agora" → POST `/instance/create` com `name: "AssinaAgora-{org.slug}"` → salva `instance_id`
- Em sequência, faz polling `GET /instance/qr/:id` a cada 3s
- Exibe o `qrcode.base64` num `<img src={"data:image/png;base64," + qrBase64} />`
- Quando `state === "open"` → atualiza `connected_at`, esconde QR, mostra "Conectado ✅"

**C) Conectado**
- Mostra número conectado + "Desconectar" (chama `DELETE /instance/:id` e limpa `instance_id`)
- Toggle "Notificar via WhatsApp ao assinar documento" (default on)

### 3. Disparos
Onde o AssinaAgora hoje envia e-mail de notificação, adicionar paralelo:
- Se a org tem `simpleszap_instance_id` + toggle ligado, chamar `POST /message/sendText/:instanceId` com `number` do destinatário (precisa cadastrar telefone no signer) e texto da notificação.
- Tratar erro estruturado (ver seção acima). Em caso de `PLAN_*_LIMIT_REACHED`, mostrar banner no dashboard do cliente: "WhatsApp não enviou: {error.message}".

### 4. Variáveis de ambiente
```
SIMPLESZAP_API_BASE_URL=https://back.simpleszap.com/api
```
(É só uma — toda credencial é por-cliente, vem da key dele.)

---

## Decisões de produto a confirmar com o usuário antes de codar

1. **Onde guardar a `simpleszap_api_key` no banco?** Em `Organization` (1 key por workspace) ou em `User` (1 por dono)? Recomendação: `Organization`.
2. **Encriptação:** se o AssinaAgora já tem helper de encrypt-at-rest, usar. Senão, adicionar com `crypto.createCipheriv` AES-256-GCM com chave em env `ENCRYPTION_KEY`.
3. **Templates de mensagem:** texto fixo no código ou editável pelo cliente? MVP: fixo no código (`"Olá {{nome}}, você tem um documento pra assinar: {{link}}"`).
4. **Retry/queue:** se SimplesZap retornar 5xx, enfileirar e tentar de novo? MVP: log + ignorar, falha graciosa.

---

## Antes de começar a codar

- Leia o `CLAUDE.md` na raiz do AssinaAgora — tem convenções IT Booster (autor de commit `inael <inael.rodrigues@gmail.com>`, status dashboard, etc).
- Confirme com o usuário a tabela onde vai guardar os campos (Organization vs User).
- Não invente endpoints. Os 5 acima são tudo que é necessário pro MVP.
- Cuidado com CORS: o AssinaAgora chama o SimplesZap **server-side** (Next.js API route / backend), nunca direto do browser. A API key não pode vazar pro frontend.

---

## Critério de "feito"

- [ ] Tela `Configurações → WhatsApp` com 3 estados (sem key / sem instância / conectado)
- [ ] QR code aparece e atualiza por polling até conexão
- [ ] Disparo automático ao assinar documento (com toggle on/off)
- [ ] Erros de limite mostrados de forma amigável com link de upgrade
- [ ] API key criptografada em rest
- [ ] Chamadas server-side só (nunca expor key ao browser)
- [ ] Logs estruturados de cada disparo (sucesso/falha/erro do SimplesZap)
