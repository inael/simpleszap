import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { CTA } from "./cta";
import { CrossLink, CrossLinkBox } from "./cross-link";

/** Componentes disponiveis dentro do MDX dos artigos. */
const components = {
  CTA,
  CrossLink,
  CrossLinkBox,
  a: ({ href, children, ...props }: React.ComponentProps<"a">) => {
    const external = typeof href === "string" && href.startsWith("http");
    return (
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        {...props}
      >
        {children}
      </a>
    );
  },
};

/**
 * Renderiza o corpo MDX de um post no servidor (RSC), 100% em build-time.
 * Reaproveita o tema tipografico do produto via @tailwindcss/typography.
 */
export function MdxContent({ source }: { source: string }) {
  return (
    <div className="prose prose-gray max-w-none prose-headings:text-green-950 prose-headings:tracking-tight prose-a:text-primary prose-strong:text-green-950 prose-img:rounded-xl">
      <MDXRemote
        source={source}
        components={components}
        options={{
          parseFrontmatter: true,
          mdxOptions: { remarkPlugins: [remarkGfm] },
        }}
      />
    </div>
  );
}
