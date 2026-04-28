import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPostBySlug, getPostSlugs } from "@/lib/blog";
import { BlogPostBody } from "@/components/blog-post-body";
import { MessageSquare, ArrowLeft } from "lucide-react";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    return { title: "Artigo | SimplesZap" };
  }
  const { meta } = post;
  const canonicalPath = `/blog/${meta.slug}`;
  const canonical = meta.canonical ?? canonicalPath;

  return {
    title: `${meta.title} | SimplesZap`,
    description: meta.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: canonicalPath,
      type: "article",
      publishedTime: meta.publishedAt,
      locale: "pt_BR",
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
    },
  };
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "long",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const { meta, content } = post;

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b bg-white/95 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Todos os artigos
          </Link>
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <span className="font-semibold text-green-950 hidden sm:inline">SimplesZap</span>
          </div>
        </div>
      </header>

      <article className="container mx-auto px-4 md:px-6 py-12 md:py-16 max-w-3xl">
        <header className="mb-10 pb-8 border-b border-gray-100">
          <p className="text-sm text-gray-500 mb-3">{formatDate(meta.publishedAt)}</p>
          <h1 className="text-3xl md:text-4xl font-bold text-green-950 tracking-tight leading-tight">
            {meta.title}
          </h1>
          <p className="mt-4 text-lg text-gray-600 leading-relaxed">{meta.description}</p>
        </header>

        <BlogPostBody content={content} />

        <footer className="mt-16 pt-8 border-t border-gray-100">
          <Link href="/comparativo" className="text-primary font-medium hover:underline">
            Comparativo de APIs WhatsApp
          </Link>
        </footer>
      </article>
    </div>
  );
}
