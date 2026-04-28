import { AuthProvider } from "@/lib/auth-context";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://simpleszap.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SimplesZap",
    template: "%s | SimplesZap",
  },
  description: "Sua API de WhatsApp simplificada para integrar sistemas, automações e atendimento.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "SimplesZap",
    title: "SimplesZap — API WhatsApp",
    description:
      "Automatize fluxos e notificações com API REST, webhooks e suporte nacional.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SimplesZap — API WhatsApp",
    description:
      "Automatize fluxos e notificações com API REST, webhooks e suporte nacional.",
  },
  icons: {
    icon: [{ url: "/icon-simpleszap.svg", type: "image/svg+xml" }],
    apple: "/icon-simpleszap.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
