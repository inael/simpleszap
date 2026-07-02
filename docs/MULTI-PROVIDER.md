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

### Stage 1 — Fundação (aditivo, zero risco) ✅ FEITO (a42b99f)
- [x] schema: `provider` + `providerConfig` na Instance (migração aplicada no DB prod `simpleszap`)
- [x] `waha.service.ts`: createSession, getQr, getStatus, deleteSession, sendText/Voice/File/Image, sendPresence
- [x] `waha-webhook.controller.ts`: POST /webhooks/waha/:session → eventos canônicos
- [x] rota + env `WAHA_BASE_URL` / `WAHA_API_KEY` (Vercel)

### Stage 2 — Roteamento por provider ✅ FEITO (40ad427)
- [x] `provider.service.ts` (ProviderService) — dispatcher central dos 3 providers
- [x] instance.controller: create/getQr/delete/sendPresence roteados
- [x] message-queue.controller (fila): envio roteado
- [x] campaigns + subscription-notify + getPublicConnect: roteados
- [x] TESTADO: criar instância WAHA via SimplesZap → sessão criada no servidor + webhook
      auto-configurado + QR real retornado + delete removeu a sessão (404). Tudo verde.

### Stage 3 — Provider Meta oficial ✅ FEITO (b792b3a)
- [x] `meta-cloud.service.ts` (graph.facebook.com: sendText/sendMedia por phoneNumberId+token)
- [x] `meta-webhook.controller.ts`: GET verify (hub.challenge) + POST → canônico (resolve por phone_number_id)
- [x] providerConfig guarda accessToken + phoneNumberId + wabaId
- [x] rotas GET+POST /webhooks/meta; env `META_WEBHOOK_VERIFY_TOKEN` (Vercel)
- [x] TESTADO: verify token certo → 200+challenge; token errado → 403; POST evento → 200
- [ ] ativa de fato quando o número oficial for provisionado (Business + WABA + token)

### Stage 4 — Frontend ✅ FEITO (70301ba)
- [x] toggle 3-vias (Padrão/WAHA/Oficial) na tela "Nova Instância"
- [x] campos de credencial Meta aparecem quando provider=oficial; Meta pula o QR (já connected)
- [x] badge do provider na tabela; live em app.simpleszap.com

### Stage 5 — Migração (PENDENTE — precisa de ação física/decisão)
- [ ] BoxPrático → instância WAHA gerenciada pelo SimplesZap (criar via UI + **escanear QR no celular BoxPrático**)
- [x] ItBooster segue na Evolution (número mantido, intocado)
- [ ] número oficial Meta: só quando provisionar Business+WABA

## Estado atual (2026-07-01)
- **Stages 1-4 completos, deployados e validados em produção.** Evolution intocado, zero regressão.
- WAHA no ar: `waha.toolpad.cloud` (VPS, /docker/waha, engine WEBJS, grátis)
- Credenciais no vault (`WAHA_*`, `META_WEBHOOK_VERIFY_TOKEN` em services.env / Vercel)
- **Gotcha deploy:** back.simpleszap.com é alias Vercel FIXADO — re-apontar via
  `POST /v2/deployments/{uid}/aliases` após cada deploy; env nova exige REDEPLOY (não só re-alias).
  O front (app.simpleszap.com) auto-promove normal.
- Pendências: (1) parear BoxPrático na instância WAHA via SimplesZap (precisa do celular);
  (2) cadastrar `waha.toolpad.cloud` no status.toolpad.cloud.
