import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
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
