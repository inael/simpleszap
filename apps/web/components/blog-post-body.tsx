import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function BlogPostBody({ content }: { content: string }) {
  return (
    <div className="prose prose-gray max-w-none prose-headings:text-green-950 prose-a:text-primary prose-strong:text-green-950">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => {
            const external = href?.startsWith("http");
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
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
