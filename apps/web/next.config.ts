import type { NextConfig } from "next";
import path from "path";
import pkg from "./package.json";

// Carimbo de versão gerado em BUILD TIME (next.config roda no build, não em runtime).
// Cada `next build` recalcula data/hora — em produção fica o instante do deploy.
const BUILD_TIME = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
}).format(new Date());

// SHA curto: Vercel expõe VERCEL_GIT_COMMIT_SHA; em local cai pra vazio.
const GIT_SHA = (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7);

const nextConfig: NextConfig = {
  // Variáveis NEXT_PUBLIC_* são inlinadas no bundle no momento do build.
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_BUILD_TIME: BUILD_TIME,
    NEXT_PUBLIC_GIT_SHA: GIT_SHA,
  },
  // Monorepo: evita aviso de raiz do Turbopack quando há lockfile na raiz do git
  turbopack: {
    root: path.join(__dirname),
  },
  // Doc do produto vive em https://docs.simpleszap.com (projeto separado).
  // Redireciona pra evitar 404 quando user digita /docs no dominio errado
  // ou tem bookmark antigo. Backend Express tem regra equivalente.
  async redirects() {
    return [
      { source: "/docs", destination: "https://docs.simpleszap.com", permanent: false },
      { source: "/docs/:path*", destination: "https://docs.simpleszap.com/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
