import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold">SimplesZap</h1>
        <div className="flex gap-4">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
                Entrar
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition mr-4"
            >
              Ir para o Dashboard
            </Link>
            <UserButton />
          </SignedIn>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-8">
        <h2 className="text-4xl font-bold max-w-2xl">
          Conecte seu WhatsApp via API em segundos
        </h2>
        <p className="text-xl text-gray-600 max-w-xl">
          Crie instâncias, escaneie o QR Code e comece a enviar mensagens
          automaticamente. Simples, rápido e escalável.
        </p>

        <div className="flex gap-4">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-lg bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition">
                Começar Agora
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="text-lg bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition"
            >
              Acessar Painel
            </Link>
          </SignedIn>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 w-full max-w-4xl">
          <div className="p-6 border rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-2">Instâncias Isoladas</h3>
            <p className="text-gray-600">
              Cada número conecta em uma instância Docker dedicada.
            </p>
          </div>
          <div className="p-6 border rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-2">API Rest Simples</h3>
            <p className="text-gray-600">
              Envie texto, mídia e arquivos com requisições HTTP simples.
            </p>
          </div>
          <div className="p-6 border rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-2">Preço Justo</h3>
            <p className="text-gray-600">
              Pague apenas pelo que usar, com planos flexíveis.
            </p>
          </div>
        </div>
      </main>

      <footer className="p-4 text-center text-gray-500 text-sm border-t">
        © {new Date().getFullYear()} SimplesZap. Todos os direitos reservados.
      </footer>
    </div>
  );
}
