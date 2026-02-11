import { UserButton } from "@clerk/nextjs";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">SimplesZap Dashboard</h1>
        <UserButton />
      </nav>
      <main className="container mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">Bem-vindo ao seu Painel</h2>
          <p className="text-gray-600">
            Aqui você poderá gerenciar suas instâncias do WhatsApp e visualizar métricas.
          </p>
        </div>
      </main>
    </div>
  );
}
