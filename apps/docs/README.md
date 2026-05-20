# @simpleszap/docs

Portal público de documentação da API SimplesZap — `docs.simpleszap.com`.

Renderiza [docs/api/openapi.yaml](../../docs/api/openapi.yaml) via [Scalar](https://github.com/scalar/scalar) + página de quickstart.

## Stack

- Next.js 15 (App Router)
- React 19
- Tailwind 3
- `@scalar/api-reference-react` para a API reference

## Desenvolvimento

```bash
cd apps/docs
npm install
npm run dev        # http://localhost:3002
```

O script `predev` copia `docs/api/openapi.yaml` (raiz) para `public/openapi.yaml`. Toda vez que mexer na spec, basta reiniciar o dev server.

## Build

```bash
npm run build
npm run start
```

## Deploy (Vercel)

1. Criar projeto no Vercel (org **IT Booster**):

   ```bash
   vercel link --project simpleszap-docs --scope inaels-projects-f2dcb9b7
   ```

2. Root directory: `apps/docs`

3. Build command: `npm run build` (já no `vercel.json`)

4. Adicionar domínio: **Settings → Domains → `docs.simpleszap.com`**

5. DNS no Cloudflare (ou registrar): `CNAME docs → cname.vercel-dns.com`

6. **IMPORTANTE** — cadastrar a nova URL em [status.toolpad.cloud](https://status.toolpad.cloud) (categoria `itbooster-saas`).

7. Git author obrigatório nos commits (regra IT Booster):

   ```bash
   git commit --author="inael <inael.rodrigues@gmail.com>" -m "..."
   ```

   Senão o Vercel bloqueia o deploy com "Deployment Blocked".

## Atualizar a spec

A fonte da verdade é `docs/api/openapi.yaml` (raiz do monorepo). Não editar em `apps/docs/public/` — é copiado no build.

Após qualquer edição:

```bash
cd apps/docs
npm run dev   # já roda sync-spec.mjs
```

Em produção o Vercel roda `npm run build` → `prebuild` → `sync-spec.mjs` → spec atualizada em `/openapi.yaml`.

## Estrutura

```
apps/docs/
├── app/
│   ├── layout.tsx           # html + tailwind + dark mode
│   ├── page.tsx             # landing
│   ├── reference/page.tsx   # Scalar (lê /openapi.yaml)
│   └── quickstart/page.tsx  # guia 5 passos
├── scripts/sync-spec.mjs    # copia openapi.yaml pro public/
├── public/openapi.yaml      # gerado no build (gitignored)
├── next.config.mjs
├── tailwind.config.ts
├── vercel.json              # config Vercel
└── .itbooster-meta.yaml     # catálogo IT Booster
```
