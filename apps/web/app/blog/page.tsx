import Link from "next/link";
import type { Metadata } from "next";
import { getAllPostsMeta } from "@/lib/blog";
import { MessageSquare, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Blog | SimplesZap",
  description:
    "Artigos evergreen sobre API WhatsApp, boas práticas de envio e integração com sistemas.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Blog | SimplesZap",
    description: "Guias práticos sobre automação e WhatsApp para desenvolvedores e produto.",
    url: "/blog",
    type: "website",
    locale: "pt_BR",
  },
};

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "long",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function BlogIndexPage() {
  const posts = getAllPostsMeta();

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50/40 to-white">
      <header className="border-b bg-white/90 backdrop-blur sticky top-0 z-10">
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
            <span className="font-semibold text-green-950">Blog</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-12 md:py-16 max-w-4xl">
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-green-950 tracking-tight mb-4">
            Blog SimplesZap
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            Conteúdo estável para quem integra sistemas ao WhatsApp: conceitos, riscos e boas práticas —
            sem depender de novidades diárias do feed.
          </p>
        </div>

        <ul className="space-y-6">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="block group">
                <Card className="border-gray-200 shadow-sm transition-shadow group-hover:shadow-md group-hover:border-primary/30">
                  <CardHeader>
                    <div className="text-sm text-gray-500 mb-1">{formatDate(post.publishedAt)}</div>
                    <CardTitle className="text-xl text-green-950 group-hover:text-primary transition-colors">
                      {post.title}
                    </CardTitle>
                    <CardDescription className="text-base text-gray-600 leading-relaxed">
                      {post.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <span className="text-primary text-sm font-medium inline-flex items-center gap-1">
                      Ler artigo
                      <span aria-hidden>→</span>
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-12 text-sm text-gray-500">
          Quer comparar critérios entre fornecedores? Veja também o{" "}
          <Link href="/comparativo" className="text-primary font-medium hover:underline">
            comparativo de APIs
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
