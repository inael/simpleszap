import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MessageSquare,
  Check,
  Server,
  Zap,
  Shield,
  Star,
  Globe,
  Smartphone,
  Code2,
  Users,
  Target,
  Briefcase,
  ShieldCheck,
  ListOrdered,
} from "lucide-react";
import Image from "next/image";
import { getLogtoContext } from "@logto/next/server-actions";
import { getLogtoConfigFromHeaders } from "@/lib/logto";
import { HeroV2 } from "@/components/landing/hero-v2";
import { IntegrateSection } from "@/components/landing/integrate-section";
import { FlowsSection } from "@/components/landing/flows-section";
import { MetaBusinessSection } from "@/components/landing/meta-business-section";

const docsUrl = process.env.NEXT_PUBLIC_DOCS_URL || "https://docs.simpleszap.com";
const supportWaDigits = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "5511999999999").replace(/\D/g, "");
const contactWhatsAppHref = `https://wa.me/${supportWaDigits}`;

export default async function Home() {
  const context = await getLogtoContext(await getLogtoConfigFromHeaders());
  const isSignedIn = context.isAuthenticated;

  return (
    <div className="flex flex-col min-h-screen bg-[#0e0e0e] text-white">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0e0e0e]/60 backdrop-blur-lg">
        <div className="container flex h-20 items-center justify-between mx-auto px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-emerald-500/15 p-2 rounded-lg">
              <MessageSquare className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">SimplesZap</span>
          </Link>

          <nav className="hidden md:flex gap-8 text-sm font-medium text-neutral-400">
            <Link href="#features" className="hover:text-white transition-colors">Funcionalidades</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Preços</Link>
            <Link href="/comparativo" className="hover:text-white transition-colors">Comparativo</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <Link href={docsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">Docs API</Link>
            <Link href="#faq" className="hover:text-white transition-colors">FAQ</Link>
          </nav>

          <div className="flex items-center gap-3">
            {!isSignedIn ? (
              <>
                <Link href="/api/logto/sign-in">
                  <Button variant="ghost" className="text-neutral-300 hover:text-white hover:bg-white/5">Login</Button>
                </Link>
                <Link href="/api/logto/sign-up">
                  <Button className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold rounded-full px-6 shadow-[0_0_30px_rgba(16,185,129,0.35)]">
                    Começar Grátis
                  </Button>
                </Link>
              </>
            ) : (
              <Link href="/dashboard">
                <Button className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold rounded-full px-6 shadow-[0_0_30px_rgba(16,185,129,0.35)]">
                  Dashboard
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <HeroV2 isSignedIn={isSignedIn} docsUrl={docsUrl} />
      <IntegrateSection />
      <FlowsSection />
      <MetaBusinessSection isSignedIn={isSignedIn} />

      {/* Social proof — texto honesto (sem marcas fictícias) */}
      <section className="py-14 border-y border-white/5 bg-neutral-950">
        <div className="container px-4 mx-auto text-center max-w-3xl">
          <p className="text-xs font-semibold text-emerald-400 mb-4 uppercase tracking-wider">Feito para quem envia código para produção</p>
          <p className="text-neutral-400 leading-relaxed">
            Times de produto, agências e desenvolvedores independentes usam APIs como a nossa para ligar CRMs,
            ERPs e automações ao WhatsApp — com foco em estabilidade e integração via HTTP.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-28 bg-[#0e0e0e] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.10),transparent_60%)]" />
        <div className="container px-4 md:px-6 mx-auto relative">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-xs font-semibold text-emerald-400 mb-4 uppercase tracking-wider">Tudo que você precisa</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">Pronto para escalar</h2>
            <p className="text-lg text-neutral-400">
              Infraestrutura desenhada para estabilidade e facilidade de uso por devs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: <Server className="w-6 h-6 text-emerald-400" />,
                title: "Instâncias Isoladas",
                desc: "Cada número roda em um container Docker dedicado, garantindo que o problema de um cliente não afete outro."
              },
              {
                icon: <Zap className="w-6 h-6 text-emerald-400" />,
                title: "Integração Plug & Play",
                desc: "API REST simples e documentada. Conecte em minutos usando qualquer linguagem (Node, Python, PHP, etc)."
              },
              {
                icon: <Shield className="w-6 h-6 text-emerald-400" />,
                title: "Segurança de Dados",
                desc: "Criptografia ponta a ponta. Não armazenamos suas mensagens. Seus dados são seus."
              },
              {
                icon: <Globe className="w-6 h-6 text-emerald-400" />,
                title: "Webhooks em Tempo Real",
                desc: "Receba notificações instantâneas sobre mensagens recebidas, status de envio e desconexões."
              },
              {
                icon: <Smartphone className="w-6 h-6 text-emerald-400" />,
                title: "Suporte a Mídia",
                desc: "Envie e receba imagens, vídeos, áudios e documentos (PDF, Docx) facilmente."
              },
              {
                icon: <Users className="w-6 h-6 text-emerald-400" />,
                title: "Múltiplos Atendentes",
                desc: "Centralize o atendimento de vários números em um único dashboard ou sistema."
              }
            ].map((feature, i) => (
              <div
                key={i}
                className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-emerald-500/30 hover:bg-white/[0.04] transition-all duration-300"
              >
                <div className="mb-5 inline-flex p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/15 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Para quem é */}
      <section id="para-quem" className="py-24 bg-neutral-950 border-t border-white/5">
        <div className="container px-4 md:px-6 mx-auto max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">Para quem é o SimplesZap</h2>
            <p className="text-lg text-neutral-400">
              Se você precisa de uma camada de API confiável para conectar sistemas ao WhatsApp — sem reinventar infraestrutura de sessão — estamos falando a mesma língua.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: <Target className="w-5 h-5 text-emerald-400" />,
                title: "Squads de produto",
                desc: "Quem já tem backend e quer expor envio, recebimento e webhooks com contratos HTTP previsíveis.",
              },
              {
                icon: <Briefcase className="w-5 h-5 text-emerald-400" />,
                title: "Agências e integradores",
                desc: "Projetos com CRMs, ERPs ou orquestradores: menos tempo brigando com conexão e mais tempo no fluxo do cliente.",
              },
              {
                icon: <Code2 className="w-5 h-5 text-emerald-400" />,
                title: "Devs que valorizam doc e suporte",
                desc: "Documentação em português e um time que entende o contexto de produção no Brasil.",
              },
            ].map((item, i) => (
              <div key={i} className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-emerald-500/30 transition-all">
                <div className="mb-4 inline-flex p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">{item.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Casos de uso + ilustração */}
      <section className="py-24 bg-[#0e0e0e] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(16,185,129,0.07),transparent_55%)]" />
        <div className="container px-4 md:px-6 mx-auto max-w-6xl relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold text-emerald-400 mb-3 uppercase tracking-wider">Casos comuns</p>
              <h2 className="text-4xl font-bold text-white mb-6 tracking-tight">O que clientes mandam pela gente</h2>
              <ul className="space-y-4 text-neutral-300">
                <li className="flex gap-3">
                  <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Confirmações e lembretes de agendamento, pedidos e pagamentos.</span>
                </li>
                <li className="flex gap-3">
                  <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Notificações operacionais para times internos (alertas, filas, incidentes).</span>
                </li>
                <li className="flex gap-3">
                  <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Integração com ferramentas de automação via HTTP (por exemplo n8n) mantendo rastreabilidade no seu backend.</span>
                </li>
              </ul>
              <p className="mt-6 text-sm text-neutral-500">
                O desenho ideal combina <strong className="text-white">cadência</strong>,{" "}
                <strong className="text-white">opt-in</strong> e monitoramento — temos artigos no{" "}
                <Link href="/blog" className="text-emerald-400 font-medium hover:underline">blog</Link> sobre isso.
              </p>
            </div>
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/[0.02] shadow-2xl">
              <Image
                src="/landing-integracao.svg"
                alt="Diagrama: seu sistema conecta à API SimplesZap e ao WhatsApp"
                width={800}
                height={520}
                className="w-full h-auto opacity-90"
                priority={false}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Segurança e boas práticas */}
      <section className="py-24 bg-neutral-950">
        <div className="container px-4 md:px-6 mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 relative rounded-2xl overflow-hidden border border-white/10 bg-white/[0.02] shadow-2xl">
              <Image
                src="/landing-seguranca.svg"
                alt="Ilustração: segurança e boas práticas em produção"
                width={800}
                height={520}
                className="w-full h-auto opacity-90"
              />
            </div>
            <div className="order-1 lg:order-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-3">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-xs uppercase tracking-wider">Segurança e boas práticas</span>
              </div>
              <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Menos surpresas em produção</h2>
              <p className="text-neutral-400 leading-relaxed mb-4">
                Nenhuma API substitui políticas da plataforma: o que funciona é combinar limites de envio, consentimento
                do usuário e observabilidade (filas, retries, logs). O SimplesZap ajuda na camada técnica; a postura do
                seu time define o risco de bloqueio e compliance.
              </p>
              <p className="text-neutral-500 leading-relaxed text-sm">
                Leia também o comparativo com critérios honestos sobre limitações em{" "}
                <Link href="/comparativo" className="text-emerald-400 font-medium hover:underline">/comparativo</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Como começar em 3 passos */}
      <section className="py-24 bg-[#0e0e0e] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(16,185,129,0.12),transparent_60%)]" />
        <div className="container relative px-4 md:px-6 mx-auto max-w-4xl">
          <div className="flex items-center gap-2 text-emerald-400 font-medium mb-3">
            <ListOrdered className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">Onboarding direto</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-12 tracking-tight">Como começar em 3 passos</h2>
          <ol className="space-y-8">
            {[
              {
                step: "1",
                title: "Crie sua conta",
                body: "Entre com e-mail ou fluxo de cadastro e escolha um plano alinhado ao número de instâncias.",
              },
              {
                step: "2",
                title: "Conecte o número",
                body: "Siga o assistente no painel para vincular o WhatsApp que receberá e enviará mensagens.",
              },
              {
                step: "3",
                title: "Integre sua API",
                body: "Use a documentação para autenticar chamadas REST e configurar webhooks no seu sistema.",
              },
            ].map((row) => (
              <li key={row.step} className="flex gap-6">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-bold text-lg">
                  {row.step}
                </span>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">{row.title}</h3>
                  <p className="text-neutral-400 leading-relaxed">{row.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-12 flex flex-wrap gap-3">
            {!isSignedIn ? (
              <Link href="/api/logto/sign-up">
                <Button size="lg" className="rounded-full px-8 h-12 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                  Criar conta
                </Button>
              </Link>
            ) : (
              <Link href="/dashboard">
                <Button size="lg" className="rounded-full px-8 h-12 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold">
                  Abrir painel
                </Button>
              </Link>
            )}
            <Link href={docsUrl} target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="rounded-full px-8 h-12 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                Abrir documentação
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA comparativo */}
      <section className="py-16 bg-neutral-950 border-y border-white/5">
        <div className="container px-4 md:px-6 mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Veja como nos comparamos</h2>
          <p className="text-neutral-400 mb-7 max-w-2xl mx-auto">
            Tabela com foco em critérios técnicos e comerciais (webhooks, modelo de cobrança, documentação). Informações de terceiros baseadas em sites públicos.
          </p>
          <Link href="/comparativo">
            <Button size="lg" className="rounded-full px-8 h-12 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold shadow-[0_0_30px_rgba(16,185,129,0.35)]">
              Abrir comparativo
            </Button>
          </Link>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-28 bg-[#0e0e0e] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-25 z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-500 rounded-full blur-[120px]"></div>
        </div>

        <div className="container px-4 md:px-6 mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-xs font-semibold text-emerald-400 mb-4 uppercase tracking-wider">Preços</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Pague pelo que usar</h2>
            <p className="text-lg text-neutral-400">
              Sem planos fixos. Comece grátis, escale por instância. Sem fidelidade, cancele a qualquer momento.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
            {/* Free */}
            <Card className="bg-white/[0.03] border-white/10 text-white backdrop-blur-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Free</CardTitle>
                <CardDescription className="text-neutral-400">Pra testar, validar integração e usos leves</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-4xl font-bold text-white">R$ 0 <span className="text-lg font-normal text-neutral-500">/mês</span></div>
                <ul className="space-y-3 text-sm text-neutral-300">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> 1 instância de WhatsApp</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> 100 mensagens/dia</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> API REST + Webhooks completos</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Sem cartão de crédito</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Link href="/api/logto/sign-up" className="w-full">
                  <Button className="w-full bg-white/10 hover:bg-white/20 text-white border-0">Começar grátis</Button>
                </Link>
              </CardFooter>
            </Card>

            {/* Profissional — elástico */}
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 text-white border-emerald-500/30 shadow-[0_0_60px_-15px_rgba(16,185,129,0.4)] relative rounded-2xl">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-neutral-950 px-4 py-1 rounded-full text-xs font-semibold shadow-[0_0_20px_rgba(16,185,129,0.6)]">
                RECOMENDADO
              </div>
              <CardHeader>
                <CardTitle className="text-2xl text-white">Profissional</CardTitle>
                <CardDescription className="text-neutral-400">Cresça por instância, sem se preocupar com limites de plano</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="text-4xl font-bold text-white">R$ 59 <span className="text-lg font-normal text-neutral-500">/mês por instância</span></div>
                  <p className="text-sm text-neutral-400 mt-1">Inclui 300 mensagens/dia <em>por instância</em>.</p>
                </div>
                <ul className="space-y-3 text-sm font-medium text-neutral-200">
                  <li className="flex items-center gap-2"><div className="bg-emerald-500/20 p-1 rounded-full"><Check className="w-3 h-3 text-emerald-400" /></div> Quantas instâncias quiser (R$ 59 cada)</li>
                  <li className="flex items-center gap-2"><div className="bg-emerald-500/20 p-1 rounded-full"><Check className="w-3 h-3 text-emerald-400" /></div> 300 msgs/dia incluídas por instância</li>
                  <li className="flex items-center gap-2"><div className="bg-emerald-500/20 p-1 rounded-full"><Check className="w-3 h-3 text-emerald-400" /></div> Precisa mais? <strong className="text-white">+100 msgs/dia por R$ 15/mês</strong></li>
                  <li className="flex items-center gap-2"><div className="bg-emerald-500/20 p-1 rounded-full"><Check className="w-3 h-3 text-emerald-400" /></div> Campanhas, fila com jitter anti-banimento, aquecimento</li>
                  <li className="flex items-center gap-2"><div className="bg-emerald-500/20 p-1 rounded-full"><Check className="w-3 h-3 text-emerald-400" /></div> Sem fidelidade — cancela quando quiser</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Link href="/api/logto/sign-up" className="w-full">
                  <Button className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold h-12 text-base shadow-[0_0_30px_rgba(16,185,129,0.45)]">Criar conta e assinar</Button>
                </Link>
              </CardFooter>
            </Card>
          </div>

          {/* Bloco explicando o modelo elástico */}
          <div className="mt-14 max-w-4xl mx-auto bg-white/[0.03] border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h3 className="text-xl font-semibold mb-4 text-white">Como funciona o preço elástico</h3>
            <div className="grid md:grid-cols-3 gap-6 text-sm text-neutral-400">
              <div>
                <p className="font-semibold text-emerald-400 mb-1">1. Comece grátis</p>
                <p>1 instância + 100 msgs/dia, permanente. Sem cartão.</p>
              </div>
              <div>
                <p className="font-semibold text-emerald-400 mb-1">2. Adicione instâncias</p>
                <p>Pague R$ 59/mês por cada número conectado. Cada um vem com 300 msgs/dia.</p>
              </div>
              <div>
                <p className="font-semibold text-emerald-400 mb-1">3. Compre lotes se precisar</p>
                <p>+100 msgs/dia por R$ 15/mês, pool global entre instâncias.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-28 bg-neutral-950">
        <div className="container px-4 md:px-6 mx-auto max-w-3xl">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-emerald-400 mb-3 uppercase tracking-wider">Dúvidas comuns</p>
            <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Perguntas frequentes</h2>
            <p className="text-neutral-400">Tire suas dúvidas sobre o funcionamento da API.</p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {[
              {
                q: "Preciso manter meu celular conectado?",
                a: "Não! Nossa tecnologia em nuvem mantém sua conexão ativa 24/7, mesmo que seu celular esteja sem internet ou desligado."
              },
              {
                q: "Existe risco de bloqueio?",
                a: "Trabalhamos com as melhores práticas para minimizar riscos, mas o uso responsável é essencial. Fornecemos guias de boas práticas para evitar bloqueios."
              },
              {
                q: "Posso usar em quantos números?",
                a: "Depende do seu plano. Cada instância adicional custa R$ 59/mês — você pode ter quantas quiser."
              },
              {
                q: "Vocês fornecem o número?",
                a: "Não, você deve usar seus próprios chips/números de WhatsApp existentes (físicos ou virtuais)."
              }
            ].map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-b border-white/10">
                <AccordionTrigger className="text-left text-white hover:text-emerald-400 hover:no-underline py-6 text-lg">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-neutral-400 pb-6 text-base leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0e0e0e] text-neutral-400 py-16 border-t border-white/5">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-emerald-500/15 p-2 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-xl font-bold text-white">SimplesZap</span>
              </div>
              <p className="mb-6 max-w-sm">
                A plataforma mais simples e eficiente para escalar seu atendimento e automações no WhatsApp.
              </p>
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-emerald-500/15 hover:border-emerald-500/30 hover:text-emerald-400 flex items-center justify-center transition-all cursor-pointer">
                  <Globe className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-6 text-sm uppercase tracking-wider">Produto</h3>
              <ul className="space-y-3 text-sm">
                <li><Link href="#features" className="hover:text-emerald-400 transition-colors">Funcionalidades</Link></li>
                <li><Link href="#pricing" className="hover:text-emerald-400 transition-colors">Preços</Link></li>
                <li><Link href="/blog" className="hover:text-emerald-400 transition-colors">Blog</Link></li>
                <li><Link href="/comparativo" className="hover:text-emerald-400 transition-colors">Comparativo</Link></li>
                <li>
                  <Link href={docsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">
                    Docs API
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-6 text-sm uppercase tracking-wider">Legal</h3>
              <ul className="space-y-3 text-sm">
                <li><Link href="/terms" className="hover:text-emerald-400 transition-colors">Termos de Uso</Link></li>
                <li><Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacidade</Link></li>
                <li>
                  <a href={contactWhatsAppHref} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">
                    Contato
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-16 pt-8 border-t border-white/5 text-center text-xs text-neutral-500">
            © {new Date().getFullYear()} SimplesZap Tecnologia. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
