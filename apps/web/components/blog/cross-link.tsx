import { ArrowUpRight } from "lucide-react";

/**
 * Links cruzados por tema entre os produtos IT Booster.
 * Usar dentro dos artigos quando o texto encostar no assunto.
 */
const PRODUCTS = {
  tokia: {
    name: "Tokia",
    label: "Hub de IA",
    href: "https://usetokia.com",
    blurb: "centraliza acesso a modelos de IA para automacoes e chatbots.",
  },
  simplesmail: {
    name: "SimplesMail",
    label: "e-mail transacional",
    href: "https://simplesmail.itbooster.com.br",
    blurb: "envio de e-mail transacional com boa entregabilidade.",
  },
  assinaagora: {
    name: "AssinaAgora",
    label: "assinatura de documentos",
    href: "https://assinaagora.com.br",
    blurb: "assinatura eletronica de contratos e documentos.",
  },
  darkemail: {
    name: "darkemail",
    label: "e-mail temporario",
    href: "https://darkemail.com.br",
    blurb: "e-mail temporario para proteger sua privacidade contra spam e vazamentos.",
  },
  freelancego: {
    name: "FreelanceGo",
    label: "contratar dev",
    href: "https://freelancego.com.br",
    blurb: "encontre desenvolvedores para tocar o seu projeto.",
  },
  itbooster: {
    name: "IT Booster",
    label: "software sob medida",
    href: "https://itbooster.com.br",
    blurb: "desenvolvimento de software sob medida para pequenas empresas.",
  },
} as const;

export type ProductKey = keyof typeof PRODUCTS;

/** Link inline simples para um produto IT Booster. */
export function CrossLink({
  to,
  children,
}: {
  to: ProductKey;
  children?: React.ReactNode;
}) {
  const p = PRODUCTS[to];
  return (
    <a
      href={p.href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary font-medium underline-offset-2 hover:underline"
    >
      {children ?? `${p.name} (${p.label})`}
    </a>
  );
}

/** Caixa de destaque para um produto IT Booster relacionado ao tema. */
export function CrossLinkBox({ to }: { to: ProductKey }) {
  const p = PRODUCTS[to];
  return (
    <aside className="not-prose my-8 rounded-xl border border-gray-200 bg-gray-50/70 p-5">
      <p className="text-sm text-gray-500 mb-1">Produto relacionado</p>
      <a
        href={p.href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-lg font-semibold text-green-950 hover:text-primary transition-colors"
      >
        {p.name}
        <ArrowUpRight className="w-4 h-4" />
      </a>
      <p className="mt-1 text-gray-600 leading-relaxed">
        {p.name} {p.blurb}
      </p>
    </aside>
  );
}

export default CrossLink;
