import Link from "next/link";
import type { Metadata } from "next";
import { competitors, comparisonRows, comparisonUpdatedLabel } from "@/content/comparison";
import { MessageSquare, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Comparativo de APIs WhatsApp",
  description:
    "Compare critérios como foco, cobrança, webhooks e documentação entre SimplesZap e outras soluções públicas. Informações sujeitas a alteração.",
  alternates: {
    canonical: "/comparativo",
  },
  openGraph: {
    title: "Comparativo de APIs WhatsApp | SimplesZap",
    description:
      "Tabela comparativa com critérios técnicos e comerciais. Dados baseados em informações públicas.",
    url: "/comparativo",
    type: "website",
    locale: "pt_BR",
  },
};

export default function ComparativoPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b bg-white/95 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao início
          </Link>
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <span className="font-semibold text-green-950">SimplesZap</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-12 md:py-16 max-w-6xl">
        <div className="mb-10 max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-bold text-green-950 tracking-tight mb-4">
            Comparativo de APIs WhatsApp
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Visão objetiva para quem avalia integrações não oficiais. A tabela resume critérios frequentes
            em projetos brasileiros; não substitui a leitura dos sites e termos de cada fornecedor.
          </p>
          <p className="text-sm text-gray-500 mt-4">Atualização indicativa: {comparisonUpdatedLabel}</p>
        </div>

        {/* Desktop: tabela */}
        <div className="hidden lg:block overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-green-950 text-white">
                <th className="p-4 font-semibold w-[220px] rounded-tl-xl">Critério</th>
                {competitors.map((c) => (
                  <th
                    key={c.id}
                    className={`p-4 font-semibold align-bottom ${c.isUs ? "bg-primary/90" : ""}`}
                  >
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr
                  key={row.id}
                  className={i % 2 === 0 ? "bg-gray-50/80" : "bg-white"}
                >
                  <th className="p-4 font-medium text-green-950 border-t border-gray-100 align-top">
                    {row.label}
                  </th>
                  {competitors.map((c) => (
                    <td
                      key={c.id}
                      className={`p-4 border-t border-gray-100 text-gray-700 align-top ${
                        c.isUs ? "bg-primary/5" : ""
                      }`}
                    >
                      {row.cells[c.id]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile / tablet: cards */}
        <div className="lg:hidden space-y-10">
          {comparisonRows.map((row) => (
            <div key={row.id}>
              <h2 className="text-lg font-semibold text-green-950 mb-4 border-b border-gray-200 pb-2">
                {row.label}
              </h2>
              <ul className="space-y-4">
                {competitors.map((c) => (
                  <li
                    key={c.id}
                    className={`rounded-xl border p-4 ${
                      c.isUs ? "border-primary/40 bg-primary/5" : "border-gray-200 bg-gray-50/50"
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                      {c.name}
                    </p>
                    <p className="text-gray-700 text-sm leading-relaxed">{row.cells[c.id]}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <aside className="mt-12 rounded-xl bg-amber-50 border border-amber-100 p-6 text-sm text-amber-950 leading-relaxed">
          <p className="font-semibold mb-2">Aviso importante</p>
          <p>
            Recursos, preços e condições de terceiros são baseados em informações públicas disponíveis nos
            respectivos sites e documentação, e podem mudar sem aviso prévio. Este comparativo não constitui
            endosso, recomendação financeira ou avaliação de qualidade definitiva. Marcas citadas pertencem aos
            seus titulares. Confira sempre a fonte oficial antes de decidir.
          </p>
        </aside>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/blog"
            className="text-primary font-medium hover:underline"
          >
            Artigos no blog
          </Link>
          <span className="text-gray-300">|</span>
          <Link href="/#pricing" className="text-primary font-medium hover:underline">
            Ver planos SimplesZap
          </Link>
        </div>
      </main>
    </div>
  );
}
