import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageSquare, Check, Server, Zap, Shield, ArrowRight, Menu, Star, Globe, Smartphone, Code2, Users } from "lucide-react";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-20 items-center justify-between mx-auto px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight text-green-950">SimplesZap</span>
          </div>

          <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-600">
            <Link href="#features" className="hover:text-primary transition-colors">Funcionalidades</Link>
            <Link href="#pricing" className="hover:text-primary transition-colors">Preços</Link>
            <Link href="#faq" className="hover:text-primary transition-colors">FAQ</Link>
            <Link href="#" className="hover:text-primary transition-colors">Blog</Link>
          </nav>

          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="ghost" className="text-gray-600 hover:text-primary hover:bg-primary/5">Login</Button>
              </SignInButton>
              <SignInButton mode="modal">
                <Button className="bg-primary hover:bg-primary/90 text-white rounded-full px-6">
                  Começar Grátis
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <Button className="bg-primary hover:bg-primary/90 text-white rounded-full px-6">
                  Dashboard
                </Button>
              </Link>
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 lg:pt-32 lg:pb-40 bg-gradient-to-br from-green-50/50 to-white">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-6 text-left">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary w-fit">
                <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                API WhatsApp Mais Estável do Brasil
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-green-950 leading-[1.1]">
                Conecte seu negócio ao <span className="text-primary relative">
                  WhatsApp
                  <svg className="absolute w-full h-3 -bottom-1 left-0 text-primary/20" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                  </svg>
                </span>
              </h1>
              <p className="text-xl text-gray-600 max-w-[600px] leading-relaxed">
                Automatize fluxos, notificações e atendimento. Uma API robusta para integrar CRMs, ERPs e sistemas próprios com suporte 100% nacional.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-2">
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button size="lg" className="rounded-full px-8 h-12 text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                      Teste Grátis por 7 Dias
                    </Button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <Link href="/dashboard">
                    <Button size="lg" className="rounded-full px-8 h-12 text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                      Acessar Painel
                    </Button>
                  </Link>
                </SignedIn>
                <Button variant="outline" size="lg" className="rounded-full px-8 h-12 text-base border-2 hover:bg-gray-50/50">
                  Ver Documentação
                </Button>
              </div>
              
              <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center overflow-hidden">
                      <Image src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${i}`} alt="User" width={32} height={32} />
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex text-yellow-400">
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                  <span className="font-medium text-gray-700">4.9/5 de 500+ devs</span>
                </div>
              </div>
            </div>

            <div className="relative lg:h-[600px] w-full flex items-center justify-center">
              {/* Abstract decorative elements */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl opacity-50"></div>
              
              {/* Main Image Representation */}
              <div className="relative z-10 w-full max-w-[400px]">
                 <div className="relative rounded-[2.5rem] border-8 border-gray-900 bg-gray-900 shadow-2xl overflow-hidden aspect-[9/19]">
                    <div className="absolute top-0 w-full h-8 bg-gray-800 rounded-b-2xl z-20 flex justify-center">
                        <div className="w-20 h-4 bg-black rounded-b-xl"></div>
                    </div>
                    <div className="h-full w-full bg-white flex flex-col pt-12 relative overflow-hidden">
                         {/* Chat UI Mockup */}
                         <div className="bg-[#075E54] p-4 flex items-center gap-3 text-white shadow-sm">
                             <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                <MessageSquare className="w-5 h-5" />
                             </div>
                             <div>
                                 <div className="font-semibold text-sm">SimplesZap Bot</div>
                                 <div className="text-xs opacity-80">Online</div>
                             </div>
                         </div>
                         <div className="flex-1 bg-[#E5DDD5] p-4 flex flex-col gap-4 overflow-hidden relative">
                             {/* Background pattern opacity */}
                             <div className="absolute inset-0 opacity-[0.05] bg-repeat" style={{backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')"}}></div>
                             
                             <div className="self-start bg-white rounded-lg rounded-tl-none p-3 shadow-sm max-w-[80%] z-10">
                                 <p className="text-sm text-gray-800">Olá! Gostaria de saber mais sobre a API.</p>
                                 <span className="text-[10px] text-gray-400 block text-right mt-1">10:42</span>
                             </div>

                             <div className="self-end bg-[#dcf8c6] rounded-lg rounded-tr-none p-3 shadow-sm max-w-[80%] z-10">
                                 <p className="text-sm text-gray-800">Claro! O SimplesZap permite automação completa.</p>
                                 <span className="text-[10px] text-gray-500 block text-right mt-1">10:42</span>
                             </div>

                             <div className="self-end bg-[#dcf8c6] rounded-lg rounded-tr-none p-3 shadow-sm max-w-[80%] z-10">
                                 <p className="text-sm text-gray-800">Você pode enviar textos, mídias e arquivos.</p>
                                 <span className="text-[10px] text-gray-500 block text-right mt-1">10:43</span>
                             </div>

                             <div className="self-start bg-white rounded-lg rounded-tl-none p-3 shadow-sm max-w-[80%] z-10">
                                 <p className="text-sm text-gray-800">Funciona com Webhooks?</p>
                                 <span className="text-[10px] text-gray-400 block text-right mt-1">10:44</span>
                             </div>

                             <div className="self-end bg-[#dcf8c6] rounded-lg rounded-tr-none p-3 shadow-sm max-w-[80%] z-10">
                                 <p className="text-sm text-gray-800">Sim! Notificamos seu sistema em tempo real sobre qualquer evento.</p>
                                 <span className="text-[10px] text-gray-500 block text-right mt-1">10:44</span>
                             </div>
                         </div>
                    </div>
                 </div>

                 {/* Floating Cards */}
                 <div className="absolute -right-12 top-20 bg-white p-4 rounded-xl shadow-xl border border-gray-100 animate-bounce duration-[3000ms]">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-full">
                            <Check className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-800">Mensagem Enviada</p>
                            <p className="text-xs text-gray-500">Via API Rest</p>
                        </div>
                    </div>
                 </div>

                 <div className="absolute -left-8 bottom-32 bg-white p-4 rounded-xl shadow-xl border border-gray-100 animate-bounce duration-[4000ms]">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-full">
                            <Code2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-800">Webhook Recebido</p>
                            <p className="text-xs text-gray-500">Status: 200 OK</p>
                        </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logo Wall */}
      <section className="py-12 border-y bg-gray-50/50">
        <div className="container px-4 mx-auto text-center">
          <p className="text-sm font-semibold text-gray-500 mb-8 uppercase tracking-wider">Confiança de empresas que crescem rápido</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
             {/* Simple Text Logos for demo purposes */}
             {['Acme Corp', 'Global Tech', 'Nebula', 'Fox Hub', 'Circle AI'].map((logo) => (
                 <span key={logo} className="text-2xl font-bold text-gray-400">{logo}</span>
             ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-green-950 mb-4">Tudo que você precisa para escalar</h2>
            <p className="text-xl text-gray-600">
              Nossa infraestrutura foi desenhada para garantir estabilidade e facilidade de uso para desenvolvedores.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Server className="w-10 h-10 text-primary" />,
                title: "Instâncias Isoladas",
                desc: "Cada número roda em um container Docker dedicado, garantindo que o problema de um cliente não afete outro."
              },
              {
                icon: <Zap className="w-10 h-10 text-primary" />,
                title: "Integração Plug & Play",
                desc: "API Rest simples e documentada. Conecte em minutos usando qualquer linguagem (Node, Python, PHP, etc)."
              },
              {
                icon: <Shield className="w-10 h-10 text-primary" />,
                title: "Segurança de Dados",
                desc: "Criptografia ponta a ponta. Não armazenamos suas mensagens. Seus dados são seus."
              },
              {
                icon: <Globe className="w-10 h-10 text-primary" />,
                title: "Webhooks em Tempo Real",
                desc: "Receba notificações instantâneas sobre mensagens recebidas, status de envio e desconexões."
              },
              {
                icon: <Smartphone className="w-10 h-10 text-primary" />,
                title: "Suporte a Mídia",
                desc: "Envie e receba imagens, vídeos, áudios e documentos (PDF, Docx) facilmente."
              },
              {
                icon: <Users className="w-10 h-10 text-primary" />,
                title: "Múltiplos Atendentes",
                desc: "Centralize o atendimento de vários números em um único dashboard ou sistema."
              }
            ].map((feature, i) => (
              <Card key={i} className="border-none shadow-lg shadow-gray-100 hover:shadow-xl transition-shadow bg-gray-50/50">
                <CardHeader>
                  <div className="mb-4 bg-white w-fit p-3 rounded-2xl shadow-sm border border-gray-100">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl text-green-950">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-green-950 text-white relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[120px]"></div>
        </div>

        <div className="container px-4 md:px-6 mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Escolha o plano ideal</h2>
            <p className="text-xl text-green-100/80">
              Comece pequeno e cresça conosco. Sem contratos de fidelidade.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
            {/* Free Plan */}
            <Card className="bg-white/5 border-white/10 text-white backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl">Starter</CardTitle>
                <CardDescription className="text-green-100/60">Para testes e pequenos projetos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-4xl font-bold">R$ 0 <span className="text-lg font-normal text-green-100/60">/mês</span></div>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> 1 Instância</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> 100 mensagens/dia</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Webhooks Básicos</li>
                  <li className="flex items-center gap-2 text-white/40"><Check className="w-4 h-4" /> Suporte Prioritário</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-white/10 hover:bg-white/20 text-white border-0">Começar Grátis</Button>
              </CardFooter>
            </Card>

            {/* Pro Plan */}
            <Card className="bg-white text-green-950 border-primary shadow-2xl scale-110 z-20 relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">
                Mais Popular
              </div>
              <CardHeader>
                <CardTitle className="text-2xl">Pro</CardTitle>
                <CardDescription className="text-gray-500">Para empresas em crescimento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-4xl font-bold">R$ 89 <span className="text-lg font-normal text-gray-500">/mês</span></div>
                <ul className="space-y-3 text-sm font-medium">
                  <li className="flex items-center gap-2"><div className="bg-primary/20 p-1 rounded-full"><Check className="w-3 h-3 text-primary" /></div> 3 Instâncias</li>
                  <li className="flex items-center gap-2"><div className="bg-primary/20 p-1 rounded-full"><Check className="w-3 h-3 text-primary" /></div> Mensagens Ilimitadas</li>
                  <li className="flex items-center gap-2"><div className="bg-primary/20 p-1 rounded-full"><Check className="w-3 h-3 text-primary" /></div> Envios de Mídia</li>
                  <li className="flex items-center gap-2"><div className="bg-primary/20 p-1 rounded-full"><Check className="w-3 h-3 text-primary" /></div> Grupos e Listas</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-primary hover:bg-primary/90 text-white h-12 text-base shadow-lg shadow-primary/20">Assinar Pro</Button>
              </CardFooter>
            </Card>

            {/* Business Plan */}
            <Card className="bg-white/5 border-white/10 text-white backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl">Scale</CardTitle>
                <CardDescription className="text-green-100/60">Para alta demanda</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-4xl font-bold">R$ 199 <span className="text-lg font-normal text-green-100/60">/mês</span></div>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> 10 Instâncias</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Mensagens Ilimitadas</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> API White-label</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Suporte via WhatsApp</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-white/10 hover:bg-white/20 text-white border-0">Falar com Vendas</Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-gray-50">
        <div className="container px-4 md:px-6 mx-auto max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-green-950 mb-4">Perguntas Frequentes</h2>
            <p className="text-gray-600">Tire suas dúvidas sobre o funcionamento da API.</p>
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
                a: "Depende do seu plano. O plano Pro permite até 3 números simultâneos, mas você pode escalar para quantos precisar no plano Scale."
              },
              {
                q: "Vocês fornecem o número?",
                a: "Não, você deve usar seus próprios chips/números de WhatsApp existentes (físicos ou virtuais)."
              }
            ].map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-b-gray-200">
                <AccordionTrigger className="text-left text-green-950 hover:text-primary hover:no-underline py-6 text-lg">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-6 text-base">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16 border-t border-gray-800">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-primary p-2 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">SimplesZap</span>
              </div>
              <p className="mb-6 max-w-sm">
                A plataforma mais simples e eficiente para escalar seu atendimento e automações no WhatsApp.
              </p>
              <div className="flex gap-4">
                {/* Social icons placeholders */}
                <div className="w-10 h-10 rounded-full bg-gray-800 hover:bg-primary/20 hover:text-primary flex items-center justify-center transition-colors cursor-pointer">
                  <Globe className="w-5 h-5" />
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-white mb-6">Produto</h3>
              <ul className="space-y-4">
                <li><Link href="#" className="hover:text-primary transition-colors">Funcionalidades</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Preços</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Documentação</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Status</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-6">Legal</h3>
              <ul className="space-y-4">
                <li><Link href="#" className="hover:text-primary transition-colors">Termos de Uso</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Privacidade</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Contato</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-16 pt-8 border-t border-gray-800 text-center text-sm">
            © {new Date().getFullYear()} SimplesZap Tecnologia. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
