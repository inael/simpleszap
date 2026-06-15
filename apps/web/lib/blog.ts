import fs from "fs";
import path from "path";
import matter from "gray-matter";

const postsDirectory = path.join(process.cwd(), "content/blog");
const POST_EXTENSIONS = [".mdx", ".md"];

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  /** Data de publicacao (ISO). Aceita `date` ou o legado `publishedAt`. */
  publishedAt: string;
  /** Data da ultima revisao (ISO). Default: igual a publishedAt. */
  updatedAt: string;
  keywords: string[];
  tags: string[];
  author: string;
  cover?: string;
  coverAlt?: string;
  draft: boolean;
  /** Caminho absoluto opcional para canonical (URL completa). */
  canonical?: string;
  /** Perguntas frequentes para o schema FAQPage (opcional). */
  faq: { question: string; answer: string }[];
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

function resolveFile(slug: string): string | null {
  for (const ext of POST_EXTENSIONS) {
    const file = path.join(postsDirectory, `${slug}${ext}`);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

export function getPostSlugs(): string[] {
  if (!fs.existsSync(postsDirectory)) return [];
  const slugs = fs
    .readdirSync(postsDirectory)
    .filter((f) => POST_EXTENSIONS.some((ext) => f.endsWith(ext)))
    .map((f) => f.replace(/\.mdx?$/, ""));
  // Remove rascunhos (draft: true) da geracao estatica.
  return slugs.filter((slug) => {
    const post = getPostBySlug(slug);
    return post ? !post.meta.draft : false;
  });
}

export function getPostBySlug(slug: string): { meta: PostMeta; content: string } | null {
  const file = resolveFile(slug);
  if (!file) return null;
  const raw = fs.readFileSync(file, "utf8");
  const { data, content } = matter(raw);

  const publishedAt = String(data.date ?? data.publishedAt ?? "");
  const updatedAt = String(data.updated ?? data.updatedAt ?? publishedAt);

  return {
    meta: {
      slug,
      title: String(data.title ?? ""),
      description: String(data.description ?? ""),
      publishedAt,
      updatedAt,
      keywords: toArray(data.keywords),
      tags: toArray(data.tags),
      author: String(data.author ?? "IT Booster"),
      cover: data.cover ? String(data.cover) : undefined,
      coverAlt: data.coverAlt ? String(data.coverAlt) : undefined,
      draft: data.draft === true,
      canonical: data.canonical ? String(data.canonical) : undefined,
      faq: Array.isArray(data.faq)
        ? data.faq
            .map((f: { question?: unknown; answer?: unknown }) => ({
              question: String(f?.question ?? ""),
              answer: String(f?.answer ?? ""),
            }))
            .filter((f: { question: string; answer: string }) => f.question && f.answer)
        : [],
    },
    content,
  };
}

export function getAllPostsMeta(): PostMeta[] {
  return getPostSlugs()
    .map((slug) => getPostBySlug(slug))
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map((p) => p.meta)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}
