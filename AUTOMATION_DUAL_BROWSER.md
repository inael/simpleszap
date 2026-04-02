# Estratégia Dual Browser (SimplesZap)

O SimplesZap usa Playwright para E2E e pode usar CDP (Chrome DevTools Protocol) para reaproveitar sessão do Chrome real quando necessário.

## Quando usar cada abordagem

### Playwright (padrão)

- Testes E2E em CI/CD (headless)
- Regressão do produto com evidências (trace/screenshot)
- Fluxos repetitivos

### Chrome real via CDP (local)

- Portais que exigem 2FA/CAPTCHA ou sessão real (ex.: Clerk Dashboard, Vercel, Asaas)
- Debug visual com a sessão do usuário
- Extração de cookies para reutilizar no Playwright (cookie sync)

## Pré-requisito (CDP)

Iniciar o Chrome com porta CDP:

```powershell
"& 'C:\Program Files\Google\Chrome\Application\chrome.exe' --remote-debugging-port=9222"
```

Checar se está ativo:

```powershell
Start-Process http://localhost:9222/json/version
```

## Cookie sync (Chrome → Playwright)

Salvar cookies do Chrome (sessão real) para um arquivo:

```powershell
npm run cookie:sync
```

Customizar:

```powershell
$env:CHROME_CDP_PORT="9222"
$env:COOKIE_SYNC_OUT="data/cookies/simpleszap.json"
$env:COOKIE_SYNC_URLS="https://www.simpleszap.com,https://dashboard.clerk.com,https://vercel.com,https://app.asaas.com"
npm run cookie:sync
```

Saída: `data/cookies/simpleszap.json` (ignorado pelo git).

## Sites alvo (default)

- https://www.simpleszap.com
- https://back.simpleszap.com
- https://dashboard.clerk.com
- https://vercel.com
- https://app.asaas.com

