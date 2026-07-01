# SimplesZap multi-provider (Evolution + WAHA + Meta oficial)

Objetivo: SimplesZap vira um **gateway multi-backend**. Ao criar uma instância,
o usuário escolhe o provider (toggle). Cada número vive em UM backend.

- **Evolution** (Baileys) — padrão, todas as instâncias atuais. Ex.: ItBooster (SDR).
- **WAHA** (engine WEBJS, Chromium real) — melhor com mídia grande. Validado 2026-07-01:
  recebeu 5 áudios PTT de 97-166KB que a Evolution dropava. Ex.: BoxPrático.
- **Meta oficial** (Cloud API) — sem ban, mídia garantida. Requer provisionamento
  (Business verificado + WABA + número + token). Código pronto, ativa quando houver número.

## Princípio-chave (o que torna viável)

O SimplesZap já **normaliza** os eventos de cada backend pros MESMOS eventos
canônicos (`message.received`, `message.audio.received`, `contact.added`, etc.)
que o n8n/SDR consomem. Então adicionar um provider = escrever um **adapter de
webhook** que traduz pro canônico. **O SDR e o n8n não mudam nada.**

## Complexidade descoberta (importante)

Os envios NÃO são diretos: passam por uma **fila** processada por
`message-queue.controller.ts` (cron), e também por `campaigns.controller` e
`subscription-notify.controller`. Então o roteamento por provider precisa
acontecer **na hora do envio da fila**, não só no controller que enfileira.

## Modelo de dados

`Instance.provider` (`evolution` | `waha` | `meta_cloud`, default `evolution`) +
`Instance.providerConfig` (Json, p/ Meta phone_number_id/waba_id/token).
`evolutionInstanceName` guarda o nome da sessão também no WAHA.

## Etapas (seguras, aditivas, Evolution intocado)

### Stage 1 — Fundação (aditivo, zero risco)
- [ ] schema: `provider` + `providerConfig` na Instance (+ db push)
- [ ] `waha.service.ts`: createSession, getQr, getStatus, deleteSession,
      sendText, sendVoice/sendFile/sendImage, sendPresence (WAHA API, X-Api-Key)
- [ ] `waha-webhook.controller.ts`: POST /webhooks/waha/:session → traduz eventos
      do WAHA pros canônicos (WebhookDeliveryService.trigger, mesma shape da Evolution)
- [ ] rota + env `WAHA_BASE_URL` / `WAHA_API_KEY` (Vercel)

### Stage 2 — Roteamento por provider
- [ ] `getProvider(instance.provider)` helper
- [ ] instance.controller: create/getQr/delete ramificam por provider
      (WAHA: cria sessão + seta webhook /webhooks/waha/{session})
- [ ] message-queue.controller (processador da fila): envio ramifica por provider
- [ ] campaigns + subscription-notify: idem

### Stage 3 — Provider Meta oficial
- [ ] `meta-cloud.service.ts` (graph.facebook.com: send text/media, phone_number_id)
- [ ] `meta-webhook.controller.ts`: GET verify (hub.challenge) + POST → canônico
- [ ] providerConfig guarda token + phone_number_id + waba_id
- [ ] ativa quando o número oficial for provisionado

### Stage 4 — Frontend
- [ ] toggle de provider (Evolution / WAHA / Oficial) na tela "Nova Instância"
- [ ] QR/status funcionam pros 3

### Stage 5 — Migração
- [ ] BoxPrático → instância WAHA gerenciada pelo SimplesZap
- [ ] ItBooster segue na Evolution
- [ ] SDR com número dedicado no provider escolhido

## Estado atual (2026-07-01)
- WAHA no ar: `waha.toolpad.cloud` (VPS, /docker/waha, engine WEBJS 2026.6.2 CORE, grátis)
- Sessão de teste "teste" pareada com BoxPrático (556192529112) — validou áudio grande
- Credenciais no vault (`WAHA_*` em services.env)
