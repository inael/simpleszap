# Webhooks SimplesZap — Lista de Eventos

Ao configurar um webhook em `/dashboard/webhooks`, você assina os eventos que quer receber. Toda chamada chega como `POST` no URL configurado, com o header `x-simpleszap-signature: <hmac sha256 do body com o secret do webhook>` para verificação de autenticidade.

## Shape geral do payload

Todo evento entregue pelo SimplesZap tem o mesmo envelope no topo. O que muda é só o conteúdo de `data`, específico de cada evento.

```json
{
  "event": "<event.name>",
  "instanceId": "<uuid>",
  "instanceName": "<nome amigável>",
  "occurredAt": "<ISO8601>",
  "data": { /* shape específico do evento */ }
}
```

---

## 1. Saída (mensagens enviadas pelo cliente via API/dashboard)

### `message.sent`
Sua API enviou uma mensagem com sucesso.

```json
{
  "messageId": "<id whatsapp>",
  "to": "5511999999999",
  "type": "text",
  "body": "Olá",
  "queueId": "<uuid>"
}
```

### `message.failed`
Tentativa de envio falhou (número inválido, fora do WhatsApp, instância desconectada, etc).

```json
{
  "queueId": "<uuid>",
  "to": "5511999999999",
  "type": "text",
  "body": "Olá",
  "error": "número não está no whatsapp"
}
```

---

## 2. Entrada (mensagens recebidas pelo número)

### `message.received`
Mensagem de texto entrante.

```json
{
  "messageId": "...",
  "from": "5511999999999",
  "fromName": "João Silva",
  "fromMe": false,
  "type": "text",
  "text": "Boa tarde, tenho uma dúvida.",
  "quotedMessageId": null
}
```

### `message.audio.received`
Áudio recebido (PTT ou arquivo de áudio).

```json
{
  "messageId": "...",
  "from": "5511999999999",
  "fromName": "João Silva",
  "type": "audio",
  "mediaUrl": "https://cdn.simpleszap.com/media/abc123.ogg",
  "durationSeconds": 12,
  "mimetype": "audio/ogg"
}
```

### `message.image.received`
Imagem recebida.

```json
{
  "messageId": "...",
  "from": "5511999999999",
  "fromName": "João Silva",
  "type": "image",
  "mediaUrl": "https://cdn.simpleszap.com/media/abc123.jpg",
  "mimetype": "image/jpeg",
  "caption": "Olha só esse produto"
}
```

### `message.video.received`
Vídeo recebido.

```json
{
  "messageId": "...",
  "from": "5511999999999",
  "fromName": "João Silva",
  "type": "video",
  "mediaUrl": "https://cdn.simpleszap.com/media/abc123.mp4",
  "mimetype": "video/mp4",
  "caption": "Vídeo do evento",
  "durationSeconds": 34
}
```

### `message.document.received`
Documento recebido (PDF, DOCX, XLSX, etc).

```json
{
  "messageId": "...",
  "from": "5511999999999",
  "fromName": "João Silva",
  "type": "document",
  "mediaUrl": "https://cdn.simpleszap.com/media/abc123.pdf",
  "fileName": "contrato-assinado.pdf",
  "mimetype": "application/pdf"
}
```

### `message.location.received`
Localização compartilhada (estática ou ao vivo).

```json
{
  "messageId": "...",
  "from": "5511999999999",
  "fromName": "João Silva",
  "type": "location",
  "latitude": -23.5613,
  "longitude": -46.6565,
  "name": "Avenida Paulista, 1578",
  "address": "Bela Vista, São Paulo - SP"
}
```

---

## 3. Status (delivery & leitura)

### `message.delivered`
O destinatário recebeu a mensagem no dispositivo (dois tiquinhos cinzas).

```json
{
  "messageId": "...",
  "to": "5511999999999",
  "deliveredAt": "2026-05-22T18:00:00Z"
}
```

### `message.read`
O destinatário leu a mensagem (dois tiquinhos azuis). Só dispara se o destinatário tiver confirmação de leitura ativada.

```json
{
  "messageId": "...",
  "to": "5511999999999",
  "readAt": "2026-05-22T18:01:00Z"
}
```

---

## 4. Instância

### `instance.connected`
Pareamento concluído — a instância está online e pronta pra enviar/receber.

```json
{
  "phoneNumber": "5511999999999",
  "profileName": "João",
  "profilePictureUrl": "https://pps.whatsapp.net/v/..."
}
```

### `instance.disconnected`
A conexão caiu (logout manual, celular sem internet, sessão expirada).

```json
{
  "reason": "logout",
  "lastSeenAt": "2026-05-22T17:55:00Z"
}
```

Possíveis valores de `reason`: `logout`, `connection_lost`, `banned`, `replaced`, `unknown`.

### `instance.qrcode.generated`
Novo QR code disponível para pareamento. Disparado sempre que a instância precisa ser (re)conectada e gera um novo código.

```json
{
  "qrcodeBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "expiresInSeconds": 60
}
```

---

## 5. Interação

### `message.reaction`
Alguém reagiu a uma mensagem com emoji.

```json
{
  "messageId": "<id da msg reagida>",
  "from": "5511999999999",
  "emoji": "❤️"
}
```

### `chat.presence`
Mudança de presença do contato no chat (digitando, gravando áudio, etc).

```json
{
  "from": "5511999999999",
  "presence": "composing"
}
```

Possíveis valores de `presence`:
- `available` — online
- `unavailable` — offline
- `composing` — digitando
- `recording` — gravando áudio
- `paused` — parou de digitar/gravar

---

## 6. Contatos

### `contact.added`
Contato sincronizado com a base do SimplesZap (vindo da agenda do WhatsApp ou de uma conversa nova).

```json
{
  "number": "5511999999999",
  "name": "João",
  "profilePictureUrl": "https://pps.whatsapp.net/v/..."
}
```

---

## Boas práticas

- **Verifique a assinatura HMAC**: calcule `HMAC-SHA256(secret, raw_body)` e compare com o header `x-simpleszap-signature`. Rejeite requisições que não baterem. Use o `raw body` (string original), não o JSON parseado.
- **Retry**: o SimplesZap tenta entregar até 3 vezes em caso de resposta `5xx` ou timeout, com backoff exponencial (1s, 5s, 30s).
- **Timeout**: se sua resposta demorar mais de 10s, consideramos failure e entra na fila de retry. Responda `200` rápido (ex: enfileira em job) e processa depois.
- **Idempotência**: use `messageId` (ou `queueId` para eventos de envio) como chave de dedup — a mesma mensagem pode chegar duas vezes em caso de retry. Guarde os IDs já processados.
- **Filtre eventos no servidor, não no consumer**: assine só o que vai usar em `/dashboard/webhooks`. Receber 16 eventos e descartar 14 no seu código gasta banda e tempo de processamento à toa.
- **Teste local com ngrok ou webhook.site**: aponte o webhook pra `https://<id>.ngrok.io` ou cole a URL gerada em https://webhook.site pra inspecionar os payloads reais antes de codar o handler.
- **Sempre responda `200 OK`** depois de validar a assinatura, mesmo que vá ignorar o evento. Códigos `4xx` não entram em retry, mas poluem nossos logs e dificultam debug seu.
