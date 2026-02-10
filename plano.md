text
Você é um engenheiro full-stack sênior especialista em SaaS de APIs WhatsApp não oficiais. Crie um SaaS COMPLETO chamado "SimplesZap" (DOMÍNIO: simpleszap.com) baseado EXATAMENTE nas funcionalidades do Z-API (TODOS os prints/protótipos estão na pasta `prototipos/` - dashboard, planos, endpoints, webhooks, painéis de uso, instâncias, etc.).

## CONTEXTO TÉCNICO OBRIGATÓRIO
- **DOMÍNIO**: simpleszap.com (TODAS URLs, webhooks, emails usam este domínio)
- **Infra**: VPS Linux já rodando Evolution API (http://IP_DA_VPS:8080). INTEGRAR diretamente via HTTP requests.
- **Stack Frontend**: Next.js 15 + Tailwind CSS + Shadcn/UI (UI IDENTICA aos protótipos em prototipos/)
- **Stack Backend**: Node.js + Express + Prisma + PostgreSQL
- **PAGAMENTOS**: ASAAS (Checkout + Webhooks) - plano brasileiro PMEs
- **Email**: Resend.com 
- **SMS**: Vonage (Nexmo) API (R$0,08/SMS)
- **Autenticação**: Clerk.dev (com teams/orgs)
- **Deploy**: Vercel (FE simpleszap.com) + VPS (BE + DB)

## PLANOS ASAAS (MELHOR QUE CONCORRENTES)
BÁSICO - R$29/mês (41% MAIS BARATO que Z-API)
├─ 1 Instância WhatsApp
├─ 8.000 mensagens/dia
├─ Webhooks básicos
├─ Trial 14 dias grátis

PRO - R$69/mês (30% MAIS BARATO que Uzapi)
├─ 5 Instâncias simultâneas
├─ 40.000 mensagens/dia
├─ Webhooks avançados + templates
├─ 500 SMS Vonage inclusos

ENTERPRISE - R$149/mês (50% MAIS VOLUME que ChatLabs)
├─ Instâncias ilimitadas
├─ 200.000 mensagens/dia
├─ SMS ilimitado (R$0,08/un)
├─ IP dedicado + SLA 99.9%

text

## COMPARATIVO VISUAL OBRIGATÓRIO (TABELA NO DASHBOARD)
Plano	SimplesZap	Z-API	Uzapi	Meta Oficial
Básico	R$29 (8k/dia)	R$49 (5k/dia)	R$79 (10k/dia)	R$0,20/msg
Pro	R$69 (40k/dia)	R$99 (25k/dia)	R$149 (30k/dia)	R$0,35/msg
Instâncias	1-∞	1-10	1-5	1 por R$500/mês
Trial	14 dias	7 dias	Sem trial	Sem trial
text

## FUNCIONALIDADES (EXATAMENTE COMO PROTÓTIPOS NA PASTA prototipos/)

### 1. DASHBOARD PRINCIPAL (prototipos/dashboard-*.png)
URL: https://simpleszap.com/dashboard

Cards: Instâncias ativas, mensagens hoje, plano atual/expiração

Gráficos: mensagens/dia, consumo % plano (IGUAL prototipos/)

Tabela comparativo VISÍVEL "41% mais barato que Z-API"

Botão "Nova Instância" → modal

text

### 2. GESTÃO DE INSTÂNCIAS (prototipos/instancias-*.png)
Listar instâncias: ID, status (🟢/🔴), QR Code, última conexão

Criar: POST /instance/create (Evolution API)

Conectar: GET /instance/qr/{id}

Enviar: POST /message/sendText/{instance}

Webhooks por instância → https://simpleszap.com/api/webhook/{instance}

text

### 3. PLANOS ASAAS + COMPARATIVO (prototipos/plans-*.png)
URL: https://simpleszap.com/plans com TABELA comparativo VISÍVEL

Checkout Asaas → simpleszap.com/checkout/{plano}

Dashboard mostra: "Você economiza R$X vs Z-API"

Webhook Asaas: https://simpleszap.com/api/asaas/webhook

Trial 14 dias Básico automático

text

### 4. API PÚBLICA (prototipos/api-docs-*.png)
Endpoints autenticados por API Key:

text
undefined
https://simpleszap.com/api/{instance}/sendText
https://simpleszap.com/api/{instance}/sendImage
https://simpleszap.com/api/{instance}/sendFile
https://simpleszap.com/api/{instance}/chats

text
undefined
Swagger: https://simpleszap.com/api-docs

text

### 5. SISTEMA LIMITES
Redis rate limiting: básico=8k/dia, pro=40k/dia

Bloqueio + email@simpleszap.com + SMS Vonage

text

## ESTRUTURA ARQUIVOS ESPERADA
simpleszap/
├── prototipos/ (prints Z-API já existem aqui)
├── apps/
│ ├── web/ (Next.js → simpleszap.com)
│ └── api/ (Express + Asaas)
├── prisma/schema.prisma
├── docker-compose.yml (Postgres + Redis)
├── deploy-vps.sh
└── .env.example

text

## DELIVERABLES OBRIGATÓRIOS
Código 100% funcional ZIPADO como "simpleszap-v1.0"

.env.example:
ASAAS_PUBLIC_KEY=ak_test_xxx
ASAAS_API_KEY=aaabcccddd
EVOLUTION_API_URL=http://IP_DA_VPS:8080
NEXT_PUBLIC_BASE_URL=https://simpleszap.com

Script deploy VPS (nginx + pm2)

Tabela comparativo NO DASHBOARD e /plans

Swagger https://simpleszap.com/api-docs funcionando

README com "Config Asaas para simpleszap.com"

text

## ASAAS CONFIGURAÇÃO (DOMÍNIO simpleszap.com)
Criar 3 produtos no Asaas:

"SimplesZap Básico" - R$29/mês (ID_1)

"SimplesZap Pro" - R$69/mês (ID_2)

"SimplesZap Enterprise" - R$149/mês (ID_3)
Webhook: https://simpleszap.com/api/asaas/webhook
PIX + Cartão brasileiro funcionando

text

## REGRAS RÍGIDAS
DOMÍNIO simpleszap.com EM TODAS URLs, webhooks, emails

REFERÊNCIAS VISUAIS: pasta prototipos/ é AUTORIDADE máxima

NUNCA recriar Evolution API - só HTTP requests

UI 100% FIEL aos protótipos (verde/preto Z-API)

Rate limits FUNCIONANDO dia 1

Mobile responsive (BR usa celular)

Checkout Asaas com PIX brasileiro

text

IMPORTANTE: Gere CÓDIGO COMPLETO agora. Pasta prototipos/ tem TODOS prints Z-API como referência visual EXATA para simpleszap.com. Pergunte ANTES de codificar.


Prompt para Implementação de Preços Dinâmicos - SimplesZap
Contexto
Preciso implementar um sistema de preços dinâmicos onde o administrador pode configurar os planos de assinatura pelo painel admin, e esses valores são consumidos tanto pelo app quanto por uma landing page externa via API pública.

Arquitetura Desejada
1. Banco de Dados (Tabela subscription_plans)
Criar tabela com os seguintes campos:


CREATE TABLE subscription_plans (
  id TEXT PRIMARY KEY, -- 'free', 'starter', 'professional', 'business', 'enterprise'
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_annual DECIMAL(10,2) NOT NULL DEFAULT 0, -- preço mensal se pagar anual
  
  -- Limites
  messages_per_month INTEGER NOT NULL DEFAULT 100, -- -1 = ilimitado
  contacts_limit INTEGER NOT NULL DEFAULT 50, -- -1 = ilimitado
  team_members INTEGER NOT NULL DEFAULT 1, -- -1 = ilimitado
  
  -- Features (booleanos)
  has_api_access BOOLEAN DEFAULT false,
  has_webhooks BOOLEAN DEFAULT false,
  has_templates BOOLEAN DEFAULT false,
  has_priority_support BOOLEAN DEFAULT false,
  has_custom_branding BOOLEAN DEFAULT false,
  has_reports BOOLEAN DEFAULT false,
  
  -- Integração com gateway de pagamento
  payment_provider_id TEXT, -- ID do produto no Asaas/Stripe
  payment_link_monthly TEXT, -- URL do payment link mensal
  payment_link_annual TEXT, -- URL do payment link anual
  
  -- Controle
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Inserir planos iniciais
INSERT INTO subscription_plans (id, name, description, price_monthly, price_annual, messages_per_month, contacts_limit, display_order) VALUES
('free', 'Gratuito', 'Para começar', 0, 0, 100, 50, 1),
('starter', 'Starter', 'Para pequenos negócios', 29.90, 24.90, 1000, 500, 2),
('professional', 'Profissional', 'Para profissionais', 59.90, 49.90, 5000, 2000, 3),
('business', 'Empresarial', 'Para empresas', 99.90, 79.90, 20000, 10000, 4),
('enterprise', 'Enterprise', 'Tudo ilimitado', 199.90, 166.58, -1, -1, 5);
2. API Pública de Preços
Criar endpoint GET /api/pricing que retorna os planos para consumo externo (landing page):


// app/api/pricing/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  // Buscar planos ativos do banco
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  // Formatar resposta
  const formattedPlans = plans?.map(plan => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    pricing: {
      monthly: plan.price_monthly,
      annual: plan.price_annual,
      currency: 'BRL',
      annualDiscount: plan.price_monthly > 0 
        ? Math.round((1 - plan.price_annual / plan.price_monthly) * 100)
        : 0
    },
    limits: {
      messagesPerMonth: plan.messages_per_month,
      contactsLimit: plan.contacts_limit,
      teamMembers: plan.team_members
    },
    features: {
      hasApiAccess: plan.has_api_access,
      hasWebhooks: plan.has_webhooks,
      hasTemplates: plan.has_templates,
      hasPrioritySupport: plan.has_priority_support,
      hasCustomBranding: plan.has_custom_branding,
      hasReports: plan.has_reports
    },
    checkout: {
      monthlyUrl: plan.payment_link_monthly,
      annualUrl: plan.payment_link_annual
    }
  }));

  return NextResponse.json(
    { 
      plans: formattedPlans,
      updatedAt: new Date().toISOString()
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*', // ou domínio específico da landing
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=300' // cache 5 minutos
      }
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    }
  });
}
3. Painel Admin para Gerenciar Planos
Criar página /admin/planos com:

Lista de todos os planos
Formulário para editar cada plano (preços, limites, features)
Botão para ativar/desativar plano
Botão para sincronizar com gateway de pagamento (criar/atualizar payment links)

// Exemplo de estrutura do formulário
interface PlanForm {
  name: string;
  description: string;
  priceMonthly: number;
  priceAnnual: number;
  messagesPerMonth: number; // -1 para ilimitado
  contactsLimit: number;
  teamMembers: number;
  // features...
}
4. Hook para Consumir Planos no Frontend

// hooks/usePlans.ts
import { useState, useEffect } from 'react';

interface Plan {
  id: string;
  name: string;
  pricing: { monthly: number; annual: number };
  limits: { messagesPerMonth: number; contactsLimit: number };
  features: Record<string, boolean>;
}

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/pricing')
      .then(res => res.json())
      .then(data => {
        setPlans(data.plans || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getPlan = (planId: string) => plans.find(p => p.id === planId);
  
  const formatLimit = (value: number) => value === -1 ? 'Ilimitado' : value.toLocaleString('pt-BR');
  
  const formatPrice = (price: number) => {
    if (price === 0) return 'Grátis';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
  };

  return { plans, loading, getPlan, formatLimit, formatPrice };
}
5. Verificação de Limites no Backend
Criar função para verificar limites do usuário antes de permitir ações:


// lib/limits.ts
export async function checkUserLimit(userId: string, limitType: 'messages' | 'contacts') {
  // 1. Buscar plano do usuário
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_plan')
    .eq('user_id', userId)
    .single();

  const planId = profile?.subscription_plan || 'free';

  // 2. Buscar limites do plano no banco
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .single();

  // 3. Contar uso atual
  const currentUsage = await countUserUsage(userId, limitType);

  // 4. Verificar limite
  const limit = limitType === 'messages' 
    ? plan.messages_per_month 
    : plan.contacts_limit;

  // -1 = ilimitado
  if (limit === -1) {
    return { canProceed: true, currentUsage, limit: -1 };
  }

  return {
    canProceed: currentUsage < limit,
    currentUsage,
    limit,
    planName: plan.name
  };
}
6. Integração com Landing Page Externa
Na landing page (projeto separado), consumir a API assim:


// Na landing page (outro projeto)
const API_URL = 'https://app.simpleszap.com/api/pricing';

async function fetchPlans() {
  const response = await fetch(API_URL);
  const data = await response.json();
  return data.plans;
}

// Para checkout, redirecionar para:
// https://app.simpleszap.com/assinar?plan=professional&cycle=monthly
Fluxo Completo
Admin edita preço → Salva no banco → Opcionalmente sincroniza com Asaas
Landing page externa → Chama GET /api/pricing → Exibe preços atualizados
Usuário clica "Assinar" → Redireciona para app.simpleszap.com/assinar?plan=X&cycle=Y
App verifica login → Se não logado, redireciona para login com parâmetros preservados
Após login → Exibe checkout inline (iframe do Asaas) com o plano selecionado
Ao usar features → Backend verifica limites do plano em tempo real
Arquivos a Criar
Arquivo	Descrição
migration.sql	Tabela subscription_plans
app/api/pricing/route.ts	API pública de preços
app/api/admin/plans/route.ts	CRUD de planos (admin)
app/admin/planos/page.tsx	UI admin para gerenciar planos
hooks/usePlans.ts	Hook para consumir planos
lib/limits.ts	Funções para verificar limites
app/assinar/page.tsx	Página de checkout com redirect
Importante
Fonte de verdade: Sempre o banco de dados
Fallback: Ter valores default no código caso o banco falhe
Cache: API pública pode ter cache de 5 minutos
CORS: Configurar para permitir requisições da landing page
Segurança: Admin protegido por autenticação + verificação de role
Domínios:

Landing page: simpleszap.com
App: app.simpleszap.com