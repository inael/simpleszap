# Mensagem para o Nilton (dev Tokia)

> Cole no WhatsApp ou Telegram do Nilton.

---

Oi Nilton, tudo bem?

Aviso rápido sobre o Tokia: hoje a gente vai migrar o domínio do Logto (nosso servidor de autenticação self-hosted da IT Booster) de `auth.toolpad.cloud` pra `auth.itbooster.com.br`. Motivo: ter o auth num subdomínio próprio da empresa, e o nome ficar mais limpo no Google Authenticator dos usuários.

**O que muda pra você:**

Como o Tokia ainda não foi deployado, o impacto é só nos arquivos locais do repo. Eu já atualizei os docs:
- `usetokia/CLAUDE.md`
- `usetokia/docs/SETUP_NEW_MACHINE.md`
- `usetokia/docs/PROMPT_BOOTSTRAP_PC_NOVO.md`
- `usetokia/docs/context/ACTIVE_PLAN.md`
- `usetokia/docs/context/DECISIONS.md`

**O que você precisa fazer:**

1. `git pull` no repo `usetokia` (vou commitar isso ainda hoje)
2. Quando for criar os Apps do Tokia no Logto Console, use:
   - **Endpoint:** `https://auth.itbooster.com.br` (não mais `auth.toolpad.cloud`)
   - **Admin Console:** `https://auth-admin.itbooster.com.br/console`
   - Credenciais admin continuam as mesmas (estão no `services.env` global)
3. Os env vars dos apps Tokia devem usar o novo domínio:
   ```
   LOGTO_ENDPOINT=https://auth.itbooster.com.br
   LOGTO_ISSUER=https://auth.itbooster.com.br/oidc
   LOGTO_JWKS_URI=https://auth.itbooster.com.br/oidc/jwks
   ```

**Por enquanto os 2 domínios funcionam** (deixei o antigo respondendo em paralelo por 1-2 semanas pra evitar quebrar nada). Mas já configura no novo desde o começo pra não criar dívida técnica.

Qualquer dúvida me chama 👍

— Inael
