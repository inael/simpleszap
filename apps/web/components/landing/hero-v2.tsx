'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function HeroV2({ isSignedIn, docsUrl }: { isSignedIn: boolean; docsUrl: string }) {
  return (
    <section className="relative overflow-hidden bg-neutral-950 text-white pt-20 pb-24 lg:pt-32 lg:pb-40">
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/40 via-neutral-950 to-neutral-950" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(16,185,129,0.18),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.10),transparent_40%)]" />

      <div className="container relative mx-auto px-4 md:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="flex justify-center lg:justify-end order-2 lg:order-1"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full max-w-[400px] rounded-3xl shadow-[0_30px_80px_-15px_rgba(16,185,129,0.35)]"
            >
              <source src="/hero-phone.webm" type="video/webm" />
              <source src="/hero-phone.mp4" type="video/mp4" />
            </video>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
            className="order-1 lg:order-2"
          >
            <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 mb-6">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
              Cloud API oficial + conexão por QR
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
              WhatsApp para<br />
              <span className="text-emerald-400">desenvolvedores</span>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-neutral-400 max-w-xl leading-relaxed">
              A forma mais simples de adicionar WhatsApp ao seu produto. REST, webhooks e Cloud API
              oficial &mdash; em minutos, com suporte 100% brasileiro.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              {!isSignedIn ? (
                <Link href="/api/logto/sign-up">
                  <Button
                    size="lg"
                    className="rounded-full px-8 h-12 text-base bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                  >
                    Começar grátis
                  </Button>
                </Link>
              ) : (
                <Link href="/dashboard">
                  <Button
                    size="lg"
                    className="rounded-full px-8 h-12 text-base bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold"
                  >
                    Acessar Painel
                  </Button>
                </Link>
              )}
              <Link href={docsUrl} target="_blank" rel="noopener noreferrer">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full px-8 h-12 text-base border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  Ler docs →
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
