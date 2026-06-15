import type { PostMeta } from "@/lib/blog";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://simpleszap.com").replace(/\/$/, "");

export interface FaqItem {
  question: string;
  answer: string;
}

/** JSON-LD schema.org Article (+ FAQPage opcional) para o post. */
export function ArticleJsonLd({ meta, faq }: { meta: PostMeta; faq?: FaqItem[] }) {
  const url = `${SITE_URL}/blog/${meta.slug}`;
  const image = meta.cover ? `${SITE_URL}${meta.cover}` : `${SITE_URL}/icon-simpleszap.svg`;

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    description: meta.description,
    image: [image],
    datePublished: meta.publishedAt,
    dateModified: meta.updatedAt,
    keywords: meta.keywords.join(", "),
    author: { "@type": "Organization", name: meta.author, url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: "SimplesZap",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icon-simpleszap.svg` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  const faqLd =
    faq && faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}
    </>
  );
}
