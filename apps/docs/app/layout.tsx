import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://docs.simpleszap.com'),
  title: {
    default: 'SimplesZap — Docs',
    template: '%s · SimplesZap Docs',
  },
  description: 'Documentação pública da API SimplesZap. Envie WhatsApp em escala com REST + webhooks.',
  openGraph: {
    title: 'SimplesZap API Docs',
    description: 'Envie WhatsApp em escala via REST. Auth por API key, webhooks de entrega, templates.',
    url: 'https://docs.simpleszap.com',
    siteName: 'SimplesZap Docs',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
