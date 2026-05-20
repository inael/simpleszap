# Integração SimplesZap ← assina-agora

> **Doc pública (com Swagger):** [https://docs.simpleszap.com](https://docs.simpleszap.com)
> Este arquivo é o briefing interno pro Inael repassar. A doc oficial pro dev externo é o link acima.

Contrato público da API do SimplesZap para o dev do **assina-agora** integrar (disparo de WhatsApp via SimplesZap).

---

## 1. URL base

```
Produção: https://back.simpleszap.com/api
Local:    http://localhost:3001/api
```

`GET /health` (sem `/api`) responde `{ status: "ok" }` — use pra smoke test.

---

## 2. Autenticação

Header obrigatório em toda chamada protegida:

```
x-api-key: sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> Alternativa: `Authorization: Bearer sk_...` também funciona — o middleware aceita o prefixo `sk_` ou `sz_` em ambos os headers.

**Como gerar a chave:**

1. Logar no app do SimplesZap (`https://simpleszap.com`) com a conta que vai disparar as mensagens.
2. Ir em **Configurações → API Keys** → "Criar nova chave".
3. Copiar o valor `sk_...` (mostrado uma vez só).

A chave é vinculada à `orgId` do usuário — quem chama com a chave herda a org/plano dela. Rate limit aplica `messagesPerDay` do plano do dono da chave.

**Scope necessário pra enviar mensagem:** `messages:send` (chaves novas vêm sem scopes = acesso total; se restringir, incluir esse).

---

## 3. Fluxo de integração assina-agora → SimplesZap

```
[assina-agora]  ──POST /message/sendText/:instanceId──▶  [SimplesZap API]  ──▶  Evolution API  ──▶  WhatsApp
```

`:instanceId` é a instância WhatsApp do cliente (pareada via QR no app SimplesZap antes — o dev do assina-agora **não** cria instância, só usa uma já conectada).

Pegar o `instanceId` em `GET /api/instances` (lista as instâncias da org).

---

## 4. Endpoint principal — enviar texto

```http
POST /api/message/sendText/{instanceId}
Host: back.simpleszap.com
Content-Type: application/json
x-api-key: sk_...

{
  "number": "5511999999999",
  "text": "Olá! Sua assinatura foi confirmada."
}
```

**Campos do body:**

| Campo    | Tipo   | Obrigatório | Descrição                                                  |
|----------|--------|-------------|------------------------------------------------------------|
| `number` | string | sim         | Número no formato E.164 sem `+` (DDI+DDD+número). Ex: `5511999999999` |
| `text`   | string | sim         | Conteúdo da mensagem                                       |

**Resposta sucesso (200):**

```json
{
  "key": { "remoteJid": "...", "id": "..." },
  "status": "sent"
}
```

(Repassa o retorno cru da Evolution API — o que importa pro caller é `200 OK`.)

**Erros:**

| Status | Body                                    | Causa                                          |
|--------|-----------------------------------------|------------------------------------------------|
| 401    | `{ "error": "API Key required" }`       | Header `x-api-key` ausente                     |
| 401    | `{ "error": "Invalid API Key" }`        | Chave não existe ou foi revogada               |
| 403    | `{ "error": "Insufficient scope" }`     | Chave sem scope `messages:send`                |
| 429    | `{ "error": "Daily message limit reached" }` | Estourou o `messagesPerDay` do plano      |
| 500    | `{ "error": "<msg da Evolution>" }`     | Falha no envio (número inválido, instância desconectada, etc) |

---

## 5. Endpoints auxiliares (leitura)

Mesma auth (`x-api-key`).

| Método | Path                  | Pra que serve                                |
|--------|-----------------------|----------------------------------------------|
| `GET`  | `/api/instances`      | Listar instâncias WhatsApp da org            |
| `GET`  | `/api/messages`       | Histórico de mensagens enviadas              |
| `GET`  | `/api/me/subscription`| Ver plano atual + limite diário              |

---

## 6. Exemplo `curl`

```bash
curl -X POST https://back.simpleszap.com/api/message/sendText/INSTANCE_ID \
  -H "x-api-key: sk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" \
  -H "Content-Type: application/json" \
  -d '{"number":"5511999999999","text":"Assinatura confirmada!"}'
```

## 7. Exemplo Node.js (axios)

```js
import axios from 'axios';

const SIMPLESZAP_API = 'https://back.simpleszap.com/api';
const API_KEY = process.env.SIMPLESZAP_API_KEY;        // sk_...
const INSTANCE_ID = process.env.SIMPLESZAP_INSTANCE_ID;

await axios.post(
  `${SIMPLESZAP_API}/message/sendText/${INSTANCE_ID}`,
  { number: '5511999999999', text: 'Assinatura confirmada!' },
  { headers: { 'x-api-key': API_KEY } }
);
```

---

## 8. Webhooks (opcional — SimplesZap → assina-agora)

Se o assina-agora quiser receber callback de **mensagem entregue / lida / falhou**, cadastrar URL em:

- App SimplesZap → **Configurações → Webhooks** → adicionar URL `https://assina-agora.com.br/webhooks/simpleszap`
- Eventos disponíveis: `message.sent`, `message.failed`
- Payload: `{ event, orgId, data: { instanceId, number, text, error? } }`

Sem assinatura HMAC ainda (roadmap). Recomendado pelo menos validar IP de origem ou token na URL.

---

## 9. CORS

Liberado para `*.simpleszap.com`, `*.vercel.app` e `localhost:*`.
Se o assina-agora rodar em outro domínio (ex: `*.assina-agora.com.br`) e quiser bater direto do browser, **avisar** que precisamos liberar o origin no `apps/api/src/server.ts`. Backend-to-backend (que é o caso típico) não tem essa restrição.

---

## Checklist pro Inael repassar

- [ ] Mandar link da doc: **https://docs.simpleszap.com**
- [ ] Gerar `sk_...` em `simpleszap.com → Configurações → API Keys` e mandar pro dev (canal seguro)
- [ ] Mandar `instanceId` da instância que o assina-agora vai usar (`GET /api/instances`)
- [ ] (Opcional) Cadastrar webhook de callback no app

A doc pública já cobre todo o resto: URL base, schemas, exemplos curl, quickstart 5 passos, e tem "Try it out" embutido (Scalar).
