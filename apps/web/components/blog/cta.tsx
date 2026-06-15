import Link from "next/link";
import { MessageSquare, ArrowRight } from "lucide-react";

type CTAProps = {
  /** Titulo opcional para sobrescrever o padrao. */
  title?: string;
  /** Texto de apoio opcional. */
  description?: string;
  /** Rotulo do botao. */
  label?: string;
};

/**
 * Call-to-action do SimplesZap. Usar no meio e no fim dos posts.
 * Leva para o cadastro do produto (Logto sign-up).
 */
export function CTA({
  title = "Automatize seu WhatsApp com o SimplesZap",
  description = "API REST de WhatsApp, webhooks e suporte nacional. Integre notificacoes, lembretes e atendimento ao seu sistema em minutos.",
  label = "Comece agora",
}: CTAProps) {
  return (
    <aside className="not-prose my-10 rounded-2xl border border-primary/20 bg-gradient-to-br from-green-50 to-white p-6 md:p-8 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="hidden sm:flex bg-primary/10 p-3 rounded-xl shrink-0">
          <MessageSquare className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl md:text-2xl font-bold text-green-950 tracking-tight">
            {title}
          </h2>
          <p className="mt-2 text-gray-600 leading-relaxed">{description}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/api/logto/sign-up"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {label}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/comparativo"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-green-950 transition-colors hover:border-primary/40"
            >
              Comparar APIs
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default CTA;
