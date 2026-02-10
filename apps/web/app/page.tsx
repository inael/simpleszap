import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageSquare, Server, Zap, Shield, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold">SimplesZap</h1>
        </div>
        <div className="flex gap-4 items-center">
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost">Entrar</Button>
            </SignInButton>
            <SignInButton mode="modal">
              <Button>Começar Agora</Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard">
              <Button variant="outline" className="mr-4">
                Ir para o Dashboard
              </Button>
            </Link>
            <UserButton />
          </SignedIn>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-8">
        <div className="bg-muted/50 p-2 rounded-full px-4 text-sm font-medium text-muted-foreground mb-4">
          🚀 API de WhatsApp Não-Oficial #1 do Brasil
        </div>
        <h2 className="text-5xl font-extrabold max-w-3xl tracking-tight">
          Conecte seu WhatsApp via API em{" "}
          <span className="text-primary">segundos</span>
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Crie instâncias, escaneie o QR Code e comece a enviar mensagens
          automaticamente. Simples, rápido e escalável.
        </p>

        <div className="flex gap-4 mt-4">
          <SignedOut>
            <SignInButton mode="modal">
              <Button size="lg" className="gap-2">
                Começar Grátis <ArrowRight className="w-4 h-4" />
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard">
              <Button size="lg" className="gap-2">
                Acessar Painel <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </SignedIn>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 w-full max-w-5xl px-4">
          <div className="p-6 border rounded-xl shadow-sm bg-card hover:shadow-md transition-all">
            <Server className="w-10 h-10 text-primary mb-4 mx-auto" />
            <h3 className="text-xl font-semibold mb-2">Instâncias Isoladas</h3>
            <p className="text-muted-foreground">
              Cada número conecta em uma instância Docker dedicada para máxima
              estabilidade.
            </p>
          </div>
          <div className="p-6 border rounded-xl shadow-sm bg-card hover:shadow-md transition-all">
            <Zap className="w-10 h-10 text-primary mb-4 mx-auto" />
            <h3 className="text-xl font-semibold mb-2">API Rest Simples</h3>
            <p className="text-muted-foreground">
              Envie texto, mídia e arquivos com requisições HTTP simples e
              documentadas.
            </p>
          </div>
          <div className="p-6 border rounded-xl shadow-sm bg-card hover:shadow-md transition-all">
            <Shield className="w-10 h-10 text-primary mb-4 mx-auto" />
            <h3 className="text-xl font-semibold mb-2">Seguro e Privado</h3>
            <p className="text-muted-foreground">
              Seus dados são criptografados e não compartilhamos nada com
              terceiros.
            </p>
          </div>
        </div>
      </main>

      <footer className="p-8 text-center text-muted-foreground text-sm border-t bg-muted/20">
        <div className="flex justify-center gap-4 mb-4">
          <Link href="#" className="hover:text-primary transition">Termos</Link>
          <Link href="#" className="hover:text-primary transition">Privacidade</Link>
          <Link href="#" className="hover:text-primary transition">Status</Link>
        </div>
        © {new Date().getFullYear()} SimplesZap. Todos os direitos reservados.
      </footer>
    </div>
  );
}
