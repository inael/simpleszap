import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Silencia warning de monorepo: aponta pra raiz onde fica o package-lock principal
  outputFileTracingRoot: path.join(__dirname, '../..'),
  experimental: {
    typedRoutes: true,
  },
  async headers() {
    return [
      {
        source: '/openapi.yaml',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300, must-revalidate' },
          { key: 'Content-Type', value: 'application/yaml; charset=utf-8' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
};

export default nextConfig;
