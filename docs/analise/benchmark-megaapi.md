# Benchmark competitivo — MEGA-API (megaapi.io)

> Análise feita em 2026-07-01 navegando o painel `plan_start` (conta teste) + landing `megaapi.io`.
> Concorrente direto no nicho "gateway WhatsApp não-oficial BR". Screenshots em `.playwright-mcp/megaapi-0*.png`.

## 1. Posicionamento e modelo de negócio

- **Tagline:** "Mensagens ilimitadas // preço fixo". Integração em <5 min, sem cartão pra testar.
- **API não-oficial** (não homologada Meta) — e fazem cross-sell claro pro produto irmão **WaBlast** (API Oficial Meta Cloud), mesmo ecossistema (Script7). Estratégia de portfólio: "escolha a solução certa pra cada operação".
- **Prova social:** 10k+ usuários, 99.9% uptime, 24/7 suporte.
- **Trial:** 5 dias grátis sem cartão.

### Preços (elástico por instância — igual filosofia SimplesZap)
| Plano | Preço cheio | Por 1 instância | Instâncias | Endpoints | Extras |
|---|---|---|---|---|---|
| **START** | R$ 99,90/mês | R$ 69,90/mês | 03 | 32 básicos | Webhook, suporte padrão, ∞ msgs |
| **BUSINESS** | R$ 139,90/mês | R$ 99,90/mês | 02 dedicadas | 118 avançados | Grupos, catálogo, labels, enquetes, botões, suporte prioritário |

> Diferença-chave vs SimplesZap: eles vendem **mensagens ilimitadas / preço fixo por instância**. SimplesZap é **metered** (cap diário por instância + pool de addons). Vale revisar se o "ilimitado" deles é argumento de venda que estamos perdendo.

### Arquitetura multi-host
- Instâncias distribuídas em `apistart01/02/03.megaapi.com.br` (o painel mostra o HOST de cada instância). Swagger por host + Postman único.

### Ecossistema de integrações (forte no marketing)
N8N, Make, Typebot, Chatwoot, Bubble, Flutterflow, WeWeb, FiQon, Nicochat + **IA** (Claude Code, Codex, Gemini, DeepSeek) + builders (Lovable, Replit). Muro de logos no-code/low-code é destaque da landing.

## 2. Telas do painel (o que observei)

- **Home/Dashboard:** 3 cards de stats com mini-sparkline (Total instâncias / Ativas / Bloqueadas), 3 cards de documentação (Postman/Swagger/Guia), feed "Últimas Novidades" (changelog) e coluna de comunidade (grupo WhatsApp, GitHub, YouTube). Banner de aviso de suporte no topo. Botão flutuante WhatsApp.
- **Minhas Instâncias:** tabela agrupada por Plano — colunas Nome, Host, InstanceKey, Token, Status (badge Ativa), **Expirar** (vencimento), **Pagamento** (badge), Ações. CTAs "Adicionar nova instância" e "Adicionar novo plano".
- **Detalhes da instância (a melhor tela):**
  - **Botão de copiar em TODOS os campos** (ID, Host, InstanceKey, Token) — DX excelente.
  - **Webhook editável inline** por instância.
  - Bloco **Assinatura**: Status Atual, Renova em, **Cancelar assinatura** (self-service por instância).
  - Ações agrupadas: **QRCODE / STATUS / LOGOUT** — QR renderiza **inline** (sem modal), no lugar da ilustração. Texto-guia explicando quando usar cada botão.
- **Pagamentos:** histórico (empty state simples "Nenhum pagamento efetuado").
- **Minha Conta:** Nome/Razão, CPF/CNPJ, E-mail, senha e **WhatsApp que recebe notificações da conta** (avisam vencimento/conta via WhatsApp — muito on-brand).
- Obs: painel é template admin comprado (Vuexy — tem "Template Customizer"). SimplesZap tem UI própria/mais brandada — vantagem nossa.

## 3. Aprendizados acionáveis pro SimplesZap

### Alto valor / baixo esforço
1. **Copiar em 1 clique** em toda credencial (instance token, API key, host, IDs). Hoje o usuário seleciona na mão.
2. **Data de vencimento + badge de pagamento** na lista de instâncias (coluna "Expira em" + status assinatura). Já temos `paidUntil`/`subscriptionStatus` no schema — só expor.
3. **Bloco Assinatura na tela da instância** com "Renova em" + "Cancelar assinatura" self-service (reduz ticket de suporte). Encaixa no modelo per-instance que já temos.
4. **QR/Status/Logout agrupados e claros** na conexão, com texto-guia de quando usar cada um.

### Médio esforço / alto impacto
5. **Notificações de conta via WhatsApp** (vencimento, pagamento, instância caiu) usando o próprio número do cliente. Diferencial natural pra um produto de WhatsApp — e reforça retenção/cobrança.
6. **Dashboard com stats + sparkline** (instâncias ativas/bloqueadas, mensagens hoje) + **feed de novidades/changelog** + bloco comunidade (grupo, GitHub, YouTube, docs).
7. **Muro de integrações no-code** na landing (N8N, Make, Typebot, Chatwoot, IA) — hoje o mercado decide por "integra com o que eu já uso".

### Estratégico (decisão de produto)
8. Avaliar oferta/plano **"mensagens ilimitadas por instância / preço fixo"** como contraponto ao metered — é o principal gancho de venda deles.
9. **Portfólio oficial vs não-oficial:** eles separam MegaAPI (não-oficial) de WaBlast (oficial Meta). Definir a narrativa do SimplesZap quando o cliente pedir API oficial.
10. **Trial sem cartão 5 dias** com destaque — reduzir fricção de entrada.

## 4. O que NÃO copiar (onde já somos melhores)
- MegaAPI é gateway "cru": não tem campanhas, contatos, templates A/B anti-ban — que o SimplesZap tem. Nosso produto é mais "plataforma" que "API pura". Manter e destacar isso.
- UI deles é template genérico; a nossa é própria/mais premium.
