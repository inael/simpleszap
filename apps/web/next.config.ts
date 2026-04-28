import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Monorepo: evita aviso de raiz do Turbopack quando há lockfile na raiz do git
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
