# Migração Logto — `auth.toolpad.cloud` → `auth.itbooster.com.br`

> Data planejada: 2026-05-21
> Janela: ~30 min de downtime efetivo (Fase 2). Todos os usuários de todos os apps IT Booster são deslogados.
> Operador VPS: precisa executar os comandos da Fase 1-3.

## Por que

O hostname `auth.toolpad.cloud` aparecia no Google Authenticator dos usuários ao registrarem 2FA — nome genérico e pouco profissional. Movendo para subdomínio IT Booster, o entry no Authenticator passa a mostrar `auth.itbooster.com.br: <user>`.

Como o issuer OIDC é derivado do `ENDPOINT` env var do Logto OSS, mover o endpoint quebra **todos os tokens em circulação** e força relogin. Vale fazer só uma vez — depois fica estável.

---

## Apps afetados (atualizar env em cada um)

| Produto | Onde está a env | Owner |
|---|---|---|
| **SimplesZap** (back + web) | Vercel: `simpleszap`, `simpleszap-back` | Inael |
| **SimplesMail** (api + dashboard) | VPS (docker containers) | Inael |
| **FreelanceGo** | VPS (docker compose) | Inael |
| **DarkEmail** (tempmail) | Vercel + VPS | Inael |
| **AgentCRM** | depende do deploy | Inael |
| **Tokia** (usetokia) | ainda não deployado, só código local | Nilton (avisar) |
| **Outros** (MidiaPlay, BoxPratico, OsContemplados) | conferir caso a caso | Inael |

---

## Fase 1 — DNS (5 min, transparente)

Provedor de DNS de `itbooster.com.br` (provavelmente Registro.br / Cloudflare):

```
auth.itbooster.com.br        A       <IP_VPS_DA_ITBOOSTER>     (TTL 300)
auth-admin.itbooster.com.br  A       <IP_VPS_DA_ITBOOSTER>     (TTL 300)
```

Substituir `<IP_VPS_DA_ITBOOSTER>` pelo IP onde está o Traefik/Nginx que roteia para o container Logto.

**Validar:** `dig auth.itbooster.com.br +short` deve retornar o IP. Em 1-2 min após o set.

---

## Fase 2 — Traefik + Logto container (5-10 min, downtime curto)

Na VPS, no `docker-compose.yml` do stack do Logto (ou via `traefik.yml` labels):

1. **Adicionar hostname novo nas labels Traefik** do container Logto (junto com o antigo, em paralelo):
   ```yaml
   labels:
     - "traefik.http.routers.logto.rule=Host(`auth.toolpad.cloud`) || Host(`auth.itbooster.com.br`)"
     - "traefik.http.routers.logto.tls.certresolver=letsencrypt"
     - "traefik.http.routers.logto-admin.rule=Host(`auth-admin.toolpad.cloud`) || Host(`auth-admin.itbooster.com.br`)"
   ```

2. **Atualizar env do Logto** no docker-compose:
   ```yaml
   environment:
     ENDPOINT: https://auth.itbooster.com.br
     ADMIN_ENDPOINT: https://auth-admin.itbooster.com.br
   ```

3. **Restart**:
   ```bash
   docker compose up -d --no-deps logto
   # Aguardar healthcheck (~30s)
   docker compose logs -f logto | head -50
   ```

4. **Validar discovery OIDC**:
   ```bash
   curl https://auth.itbooster.com.br/oidc/.well-known/openid-configuration | jq .issuer
   # Esperado: "https://auth.itbooster.com.br/oidc"
   ```

5. **Validar admin**:
   ```bash
   curl -I https://auth-admin.itbooster.com.br/console
   # Esperado: 200 (HTML do console)
   ```

> ⚠️ A partir desse ponto, todos os tokens JWT emitidos com `iss=https://auth.toolpad.cloud/oidc` são inválidos. Apps consumidores vão dar 401 até atualizarem env e redeployarem.

---

## Fase 3 — Atualizar Apps Vercel (10 min)

Para cada projeto Vercel listado abaixo:

```bash
# 1. Login na CLI Vercel
vercel login

# 2. Em cada repo, linkar ao projeto certo
cd ~/Documents/GitHub/simpleszap
vercel link  # selecionar projeto simpleszap-back (ou simpleszap)

# 3. Atualizar envs (production + preview + development)
vercel env rm LOGTO_ENDPOINT production -y
vercel env add LOGTO_ENDPOINT production
# cole: https://auth.itbooster.com.br

vercel env rm LOGTO_ISSUER production -y
vercel env add LOGTO_ISSUER production
# cole: https://auth.itbooster.com.br/oidc

vercel env rm LOGTO_JWKS_URI production -y
vercel env add LOGTO_JWKS_URI production
# cole: https://auth.itbooster.com.br/oidc/jwks

# Se tiver NEXT_PUBLIC_LOGTO_ENDPOINT (frontend)
vercel env rm NEXT_PUBLIC_LOGTO_ENDPOINT production -y
vercel env add NEXT_PUBLIC_LOGTO_ENDPOINT production
# cole: https://auth.itbooster.com.br

# 4. Redeploy
vercel --prod
```

**Repita pra cada projeto:**
- `simpleszap` (frontend Vercel)
- `simpleszap-back` (backend Vercel)
- `tempmail` (DarkEmail Vercel)
- (outros conforme tiver)

---

## Fase 4 — Atualizar Containers VPS (5 min)

Pra cada produto rodando em container na VPS (SimplesMail, FreelanceGo, etc), atualizar `.env` no diretório do serviço:

```bash
ssh inael@vps-itbooster
cd /opt/simplesmail
sed -i 's|auth.toolpad.cloud|auth.itbooster.com.br|g' .env
docker compose up -d --force-recreate api dashboard

cd /opt/freelancego
sed -i 's|auth.toolpad.cloud|auth.itbooster.com.br|g' .env
docker compose up -d --force-recreate
```

(O mesmo `sed` funciona pra `auth-admin.toolpad.cloud`.)

---

## Fase 5 — Validação Final

1. Acessar `https://simpleszap.com` → fazer login → deve redirecionar pra `https://auth.itbooster.com.br/oidc/auth?...` (URL nova)
2. Mesmo teste em cada produto:
   - `https://app.simplesmail.itbooster.com.br`
   - `https://freelancego.com.br`
   - `https://darkemail.school`
3. Checar admin console: `https://auth-admin.itbooster.com.br/console` → loga com `admin / M@t3m@t1c@10`

---

## Fase 6 — Comunicar usuários

Enviar (via email/WhatsApp/in-app banner em cada produto):

> **Manutenção concluída** — Migramos nosso sistema de autenticação para um domínio próprio (`auth.itbooster.com.br`). Se você usa autenticação em 2 etapas, o entry antigo no seu Google Authenticator continua válido, mas agora aparece com o nome `auth.toolpad.cloud` (antigo). Pra atualizar pro nome novo, desative e reative o 2FA nas configurações de conta. Em caso de dúvida, fale com suporte@itbooster.com.br.

---

## Fase 7 — Cleanup (após 1-2 semanas)

Quando ninguém depender mais do nome antigo:

1. Remove `auth.toolpad.cloud` das labels do Traefik
2. Deixa `auth-admin.toolpad.cloud` cair também
3. Confirma que tudo continua funcionando via `auth.itbooster.com.br`
4. Apaga registros DNS antigos (opcional — se for subdomínio próprio do toolpad)

---

## Rollback

Se algo der errado na Fase 2:

```bash
# No docker-compose do Logto, reverter env:
ENDPOINT: https://auth.toolpad.cloud
ADMIN_ENDPOINT: https://auth-admin.toolpad.cloud

docker compose up -d --no-deps logto
```

Os labels com `Host(... || ...)` continuam aceitando os 2 domínios. Tokens antigos voltam a ser válidos.

---

## Checklist de execução

- [ ] Fase 1: DNS A records criados e propagados
- [ ] Fase 2: Traefik labels atualizadas + Logto container restartado com env nova
- [ ] Fase 2: `curl auth.itbooster.com.br/oidc/.well-known/openid-configuration` retorna issuer novo
- [ ] Fase 3: Vercel envs atualizadas + redeploy em cada projeto
- [ ] Fase 4: Containers VPS atualizados (SimplesMail, FreelanceGo, etc)
- [ ] Fase 5: Login testado em cada produto
- [ ] Fase 6: Comunicado enviado aos usuários
- [ ] Nilton avisado (Tokia ainda não deployou, só atualizar código local)
