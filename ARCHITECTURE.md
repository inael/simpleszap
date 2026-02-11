# Arquitetura de Deploy - SimplesZap

Este projeto está configurado como um **Monorepo** contendo o Frontend e o Backend em diretórios separados.
A estratégia de deploy adotada utiliza **dois projetos distintos no Vercel**, permitindo gerenciamento, logs e escalabilidade independentes para cada parte da aplicação.

## Estrutura do Projeto

- **Frontend (`apps/web`)**: Aplicação Next.js.
- **Backend (`apps/api`)**: API Node.js com Express e Prisma.

## Projetos no Vercel

### 1. Frontend (SimplesZap Front)
- **URL do Projeto**: [simpleszap-front](https://vercel.com/inaels-projects-f2dcb9b7/simpleszap-front)
- **Diretório Raiz (Root Directory)**: `apps/web`
- **Framework Preset**: Next.js (Detectado automaticamente)
- **Variáveis de Ambiente Necessárias**:
  - `NEXT_PUBLIC_API_URL`: URL do Backend (ex: `https://simpleszap-back.vercel.app`)
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Chave pública do Clerk
  - `CLERK_SECRET_KEY`: Chave secreta do Clerk

### 2. Backend (SimplesZap Back)
- **URL do Projeto**: [simpleszap-back](https://vercel.com/inaels-projects-f2dcb9b7/simpleszap-back)
- **Diretório Raiz (Root Directory)**: `apps/api`
- **Configuração de Build**:
  - O Vercel utiliza o arquivo `apps/api/vercel.json` para transformar o Express em uma Serverless Function.
- **Banco de Dados**:
  - Migrações do Prisma são executadas automaticamente no build (`package.json` script: `build`).
- **Variáveis de Ambiente Necessárias**:
  - `DATABASE_URL`: Connection string do Supabase (Transaction Pooler - Porta 6543)
  - `DIRECT_URL`: Connection string do Supabase (Session Pooler - Porta 5432)
  - `CLERK_SECRET_KEY`: Chave secreta do Clerk (para validação de tokens, se necessário)
  - `CLERK_PUBLISHABLE_KEY`: Chave pública do Clerk

## Fluxo de Desenvolvimento

1. Faça alterações nas pastas `apps/web` ou `apps/api`.
2. Commit e Push para o branch `main`.
3. O Vercel detectará as mudanças e disparará builds independentes para cada projeto, dependendo de onde ocorreram as alterações.

## Observações Importantes

- **CORS**: O Backend deve estar configurado para aceitar requisições do domínio do Frontend.
- **Banco de Dados**: O comando `prisma migrate deploy` roda automaticamente no build da API para manter o schema atualizado.
