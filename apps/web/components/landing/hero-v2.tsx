'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Fundo do video é #0f0f0f puro = mesmo bg da pagina => sem mask necessaria
// (mantenho mask sutil só pra suavizar microvariações de codec/blocking).
const videoMaskStyle = {
  WebkitMaskImage:
    'radial-gradient(ellipse 90% 95% at center, black 80%, transparent 100%)',
  maskImage:
    'radial-gradient(ellipse 90% 95% at center, black 80%, transparent 100%)',
};

export function HeroV2({ isSignedIn, docsUrl }: { isSignedIn: boolean; docsUrl: string }) {
  return (
    <section className="relative overflow-hidden bg-[#0f0f0f] text-white pt-24 pb-28 lg:pt-32 lg:pb-40">
      {/* Backdrop layers */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/30 via-[#0f0f0f] to-[#0f0f0f]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,rgba(16,185,129,0.18),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_10%_80%,rgba(56,189,248,0.08),transparent_50%)]" />
      {/* Subtle grain */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="container relative mx-auto px-4 md:px-6">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
          {/* Esquerda: copy */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 mb-8">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
              Cloud API oficial + conexão por QR
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02]">
              WhatsApp para
              <br />
              <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
                desenvolvedores
              </span>
            </h1>
            <p className="mt-7 text-lg lg:text-xl text-neutral-400 max-w-xl leading-relaxed">
              A forma mais simples de adicionar WhatsApp ao seu produto. REST, webhooks e Cloud API
              oficial &mdash; em minutos, com suporte 100% brasileiro.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              {!isSignedIn ? (
                <Link href="/api/logto/sign-up">
                  <Button
                    size="lg"
                    className="rounded-full px-8 h-12 text-base bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold shadow-[0_0_40px_rgba(16,185,129,0.45)]"
                  >
                    Começar grátis
                  </Button>
                </Link>
              ) : (
                <Link href="/dashboard">
                  <Button
                    size="lg"
                    className="rounded-full px-8 h-12 text-base bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold shadow-[0_0_40px_rgba(16,185,129,0.45)]"
                  >
                    Acessar Painel
                  </Button>
                </Link>
              )}
              <Link href={docsUrl} target="_blank" rel="noopener noreferrer">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full px-8 h-12 text-base border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white backdrop-blur-sm"
                >
                  Ler docs →
                </Button>
              </Link>
            </div>

            {/* Mini stats (Resend-style) */}
            <div className="mt-12 grid grid-cols-3 gap-6 max-w-md">
              <div>
                <div className="text-2xl font-semibold text-white">99.9%</div>
                <div className="text-xs text-neutral-500 mt-1">Uptime</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-white">&lt; 50ms</div>
                <div className="text-xs text-neutral-500 mt-1">Latência média</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-white">gru1</div>
                <div className="text-xs text-neutral-500 mt-1">Hospedado no Brasil</div>
              </div>
            </div>
          </motion.div>

          {/* Direita: vídeo do celular com máscara radial */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.15, ease: 'easeOut' }}
            className="relative flex justify-center lg:justify-end"
          >
            {/* Glow emerald atrás */}
            <div className="absolute inset-0 -z-10 flex items-center justify-center">
              <div className="w-[420px] h-[420px] rounded-full bg-emerald-500/15 blur-[120px]" />
            </div>

            <div className="relative w-full max-w-[440px] aspect-[9/16] rounded-3xl overflow-hidden">
              <video
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                className="w-full h-full object-cover"
                style={videoMaskStyle}
              >
                <source src="/hero-celular.webm" type="video/webm" />
                <source src="/hero-celular.mp4" type="video/mp4" />
              </video>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
