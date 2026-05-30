# SimplesZap — API REST (v1)

Documentação pra integradores externos consumirem o SimplesZap via API key.
Atualizada após commits `01427b3`, `b85d8c5`, `f1d2f1d`, `1a8128d` (2026-05-24).

- **Base URL produção:** `https://back.simpleszap.com/api`
- **Autenticação:** `Authorization: Bearer sk_<sua-key>` em todas as requisições
- **Content-Type:** `application/json` em todos os `POST`/`PUT`

> SimplesZap é uma camada acima da Evolution API (baileys, conexão por QR).
> Todos os envios passam por **fila com jitter cumulativo** (900–2200ms entre
> mensagens da mesma instância) pra reduzir risco de banimento.

---

## 1. Conta e billing

### `GET /me`

Retorna o perfil do dono da API key.

```json
{
  "id": "e327b911-76d4-428a-9ce2-319dcd123fb0",
  "logtoId": "ch5jcxf2mxxg",
  "email": "agenda@consultoriasorian.com",
  "name": "Editora Sorian",
  "cpfCnpj": null
}
```

### `GET /billing` (alias de `/me/billing`)

Resumo das instâncias pagas, addons de mensagens e pool global.

```json
{
  "instances": [
    {
      "id": "e883cfd5-…",
      "name": "editora-sorian",
      "status": "connected",
      "subscriptionStatus": null,
      "pricePerMonthCents": 5900,
      "messagesIncluded": 300,
      "usedToday": 12,
      "paidUntil": null
    }
  ],
  "addons": [],
  "pool": { "limit": 0, "usage": 0, "remaining": 0 },
  "totalMonthlyCents": 0,
  "vipUntil": null
}
```

### `GET /usage?days=7`

Histórico diário (default 7 dias, max 90).

```json
{
  "days": 7,
  "startDate": "2026-05-18",
  "pool": [{ "date": "2026-05-22", "count": 8 }],
  "perInstance": [
    { "date": "2026-05-22", "instanceId": "e88…", "instance": "editora-sorian", "count": 8 }
  ]
}
```

---

## 2. Instâncias WhatsApp

### `GET /instances`

Lista todas as instâncias do tenant com status atual (synced com Evolution).

```json
[
  {
    "id": "e883cfd5-4c71-480d-93e4-b2ffecb89fc9",
    "name": "editora-sorian",
    "status": "connected",
    "evolutionInstanceName": "simpleszap_editora-sorian_e883cfd5"
  }
]
```

- `status`: `connected` | `connecting` | `disconnected`

### `GET /instance/qr/:id`

Retorna o QR code (base64 PNG) pra parear o número.

---

## 3. Envio de mensagens

> **Todos os endpoints retornam `202 Accepted` com `queueId`.** O cron
> processa a cada minuto (jitter 0,9–2,2s). Pra confirmar entrega use
> webhook `message.sent` / `message.failed` ou `GET /messages`.

### `POST /message/sendText/:instanceId`

```json
// Request
{
  "number": "5561999999999",
  "text": "Olá Maria!"
}

// Response 202
{
  "queued": true,
  "queueId": "6f9eca7f-…",
  "scheduledAt": "2026-05-24T20:05:55.385Z",
  "position": 1
}
```

### `POST /message/sendMedia/:instanceId`

Aceita imagem, vídeo, áudio (com PTT) e documento.

```json
// Imagem com legenda
{ "number": "5561…", "mediatype": "image", "media": "https://…/foto.jpg", "caption": "olha isso" }

// Áudio PTT (voice message — caso de uso agente IA Sorian)
{ "number": "5561…", "mediatype": "audio", "media": "https://…/saudacao.ogg", "ptt": true }

// Documento
{ "number": "5561…", "mediatype": "document", "media": "https://…/contrato.pdf", "fileName": "contrato.pdf" }
```

- `media` aceita **URL pública** OU **base64 data URI**
- `mediatype`: `image` | `video` | `audio` | `document`
- `ptt: true` (só áudio) → entrega como voice message; sem `ptt` entrega como anexo

### `POST /message/sendButtons/:instanceId` (beta — requer aceite)

Entrega não é garantida pela Meta. Cliente precisa aceitar termos beta
antes (via dashboard, `/dashboard/settings/beta`). Sem aceite, responde
`403 BETA_FEATURE_NOT_ACCEPTED`.

### `POST /chat/sendPresence/:instanceId`

Envia estado de presença (typing/recording) pra um número — o ícone de
"digitando..." ou "gravando áudio..." aparece pro contato no WhatsApp dele.
**Não conta no limite diário** de mensagens. Não enfileira (resposta imediata).
Útil pra agentes IA parecerem humanos enquanto processam a resposta.

```json
// Request
{
  "number": "5561993734747",
  "presence": "composing",
  "delay": 3000
}
```

- `presence`: `composing` | `recording` | `paused` | `available` | `unavailable`
- `delay` (ou `delayMs`): tempo em ms que o estado dura antes de sumir (default 3000). Os dois nomes são aceitos.

```json
// Response 200
{ "ok": true, "presence": "composing", "result": { ... } }
```

Padrão de uso (agente IA Sorian):

```js
// Antes de responder com texto:
await fetch(`${B}/chat/sendPresence/${INST}`, { method:"POST", headers:H,
  body: JSON.stringify({ number, presence: "composing", delay: 3000 }) });
await sleep(2500);
await fetch(`${B}/message/sendText/${INST}`, ... });

// Antes de mandar áudio (PTT):
await fetch(`${B}/chat/sendPresence/${INST}`, { method:"POST", headers:H,
  body: JSON.stringify({ number, presence: "recording", delay: 4000 }) });
await sleep(3500);
await fetch(`${B}/message/sendMedia/${INST}`, ... mediatype:"audio", ptt:true });
```

### `GET /messages?instanceId=…&limit=50`

Histórico de envios (com status real após o worker processar).

```json
[
  {
    "id": "...",
    "createdAt": "2026-05-24T20:17:52.511Z",
    "status": "sent",
    "type": "text",
    "to": "5561993734747",
    "body": "Olá",
    "whatsappMessageId": null,
    "error": null
  }
]
```

- `status`: `queued` | `sent` | `delivered` | `read` | `failed` | `received`
- `direction`: `sent` (saída) | `received` (entrada)

---

## 4. Contatos

### `GET /contacts`

Lista contatos do tenant.

### `POST /contacts`

```json
{ "name": "Maria", "phone": "5561999999999" }
```

### `POST /contacts/import/:instanceId`

Importa toda a agenda sincronizada pela Evolution na instância. Telefones
duplicados são ignorados.

```json
// Response
{ "imported": 142, "skipped": 38, "total": 180 }
```

---

## 5. Webhooks (configuração)

### `POST /webhooks/config`

Registra URL externa que vai receber eventos.

```json
{
  "url": "https://n8n.suaempresa.com/webhook/abc",
  "secret": "string-aleatoria-32-chars",
  "events": ["message.sent", "message.failed", "message.received", "instance.connected"],
  "instanceId": null
}
```

- `instanceId: null` → webhook **global** (recebe de todas instâncias)
- `instanceId: "..."` → **override** dessa instância específica (estilo Stripe)
- Pode ter múltiplos webhooks globais (todos disparam em paralelo)

### `GET /webhooks/config` / `PUT /webhooks/config/:id` / `DELETE /webhooks/config/:id`

CRUD padrão.

### `POST /webhooks/config/:id/test`

Dispara ping sintético pra validar URL (timeout 10s).

### `GET /webhooks/logs?limit=50`

Histórico de tentativas de entrega.

---

## 6. Eventos webhook (payload + signature)

Cada POST do SimplesZap pro seu endpoint vem com:

```http
Content-Type: application/json
X-Webhook-Signature: <HMAC-SHA256 do body com seu secret>
X-Webhook-Event: message.sent
```

**Validação da assinatura (Node):**

```js
const crypto = require("crypto");
const expected = crypto.createHmac("sha256", SECRET).update(rawBody).digest("hex");
if (signature !== expected) return res.status(401).end();
```

**Body padrão:**

```json
{
  "event": "message.sent",
  "instanceId": "e883cfd5-…",
  "occurredAt": "2026-05-24T20:17:52.511Z",
  "data": { /* varia por evento */ }
}
```

### Eventos suportados (16)

| Categoria | Event | Quando dispara |
|---|---|---|
| **Saída** | `message.sent` | Mensagem entregue ao Evolution com sucesso |
| | `message.failed` | Envio falhou (erro Evolution, internet, etc) |
| **Entrada** | `message.received` | Lead mandou texto |
| | `message.audio.received` | Lead mandou áudio |
| | `message.image.received` | Lead mandou imagem |
| | `message.video.received` | Lead mandou vídeo |
| | `message.document.received` | Lead mandou PDF/arquivo |
| | `message.location.received` | Lead compartilhou localização |
| **Status** | `message.delivered` | WhatsApp confirmou no celular do destinatário |
| | `message.read` | Destinatário leu (2 check azuis) |
| **Instância** | `instance.connected` | Pareamento concluído |
| | `instance.disconnected` | Conexão caiu |
| | `instance.qrcode.generated` | QR novo disponível |
| **Interação** | `message.reaction` | Reação (emoji) a uma mensagem |
| | `chat.presence` | Contato digitando / gravando áudio |
| **Contatos** | `contact.added` | Contato sincronizado |

Payload `data` de `message.received` (exemplo):

```json
{
  "from": "5561993734747",
  "fromName": "Maria Silva",
  "text": "Tem horário amanhã?",
  "whatsappMessageId": "3EB029287F0E5A90FA5DBC",
  "quotedMessageId": null
}
```

---

## 7. Códigos de erro

| HTTP | `code` | Significado |
|---|---|---|
| 401 | — | API key ausente ou inválida |
| 403 | `BETA_FEATURE_NOT_ACCEPTED` | sendButtons sem aceite de termos |
| 400 | `MISSING_CPF_CNPJ` | Tentou assinar plano sem CPF/CNPJ no perfil |
| 400 | `NEED_SUBSCRIPTION` | Tentou enviar excedendo limite Free |
| 400 | `PLAN_DAILY_MESSAGE_LIMIT_REACHED` | Cap diário da instância + pool estourado |
| 404 | — | Instância não pertence ao seu tenant |
| 409 | — | Conflito (ex: assinatura ativa duplicada) |

Shape padrão de erro:

```json
{
  "error": "Mensagem legível em pt-BR",
  "code": "CODIGO_OPCIONAL",
  "limit": 100,        // quando aplicável
  "current": 100,
  "planId": "free"
}
```

---

## 8. Limites e SLAs

- **Free (1 instância, sem cartão):** 100 msgs/dia
- **Instância paga (R$ 59/mês):** 300 msgs/dia/instância
- **Addon (R$ 15/mês):** +100 msgs/dia compartilhadas no pool
- **Cron processa fila a cada 1 minuto** (Vercel scheduled function)
- **Jitter entre envios da mesma instância:** 900–2200ms (anti-banimento)
- **Webhook timeout:** 10s. Sem retry exponencial por enquanto (próxima sprint)

---

## 9. Caso de uso: agente IA com áudio pré-gravado

Padrão Sorian — agente envia áudios em momentos-chave do funil:

```js
const KEY = process.env.SIMPLESZAP_KEY;
const INST = process.env.SIMPLESZAP_INSTANCE;
const B = "https://back.simpleszap.com/api";

async function sendVoiceNote(number, audioUrl) {
  return fetch(`${B}/message/sendMedia/${INST}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      number,
      mediatype: "audio",
      media: audioUrl,
      ptt: true
    })
  }).then(r => r.json());
}

// Saudação + 3s + explicação
await sendVoiceNote("5561993734747", "https://audios.sorian/saudacao-v3.ogg");
await new Promise(r => setTimeout(r, 3000));
await sendVoiceNote("5561993734747", "https://audios.sorian/explicacao-v3.ogg");
```

> O jitter da fila já garante 0,9–2,2s entre envios consecutivos da
> mesma instância — não precisa adicionar sleep manualmente entre chamadas
> consecutivas (mas pode pra UX mais natural).

---

## 10. Postman collection

`apps/web/public/simpleszap.postman_collection.json` na raiz do repo (também
servido em `https://back.simpleszap.com/simpleszap.postman_collection.json`
após o próximo deploy do web app).
