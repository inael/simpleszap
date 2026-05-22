'use client';

import { motion } from 'motion/react';
import { Check, Zap, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function MetaBusinessSection({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <section className="bg-neutral-950 py-28 lg:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%,rgba(16,185,129,0.08),transparent_55%)]" />
      <div className="relative">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
        className="container mx-auto px-4 md:px-6 text-center max-w-2xl"
      >
        <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">
          Escolha seu caminho
        </p>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
          Cloud API oficial <span className="text-neutral-500">ou</span><br />
          conexão rápida por QR
        </h2>
        <p className="mt-6 text-lg text-neutral-400">
          Os dois caminhos no mesmo painel. Use o que faz sentido pro seu caso — ou ambos em paralelo.
        </p>
      </motion.div>

      <div className="container mx-auto px-4 md:px-6 mt-16 grid md:grid-cols-2 gap-6 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="relative rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-white/[0.02] p-8 shadow-[0_0_60px_-15px_rgba(16,185,129,0.4)] backdrop-blur-sm"
        >
          <div className="absolute -top-3 left-8 inline-flex items-center gap-1.5 bg-emerald-500 text-neutral-950 text-xs font-semibold px-3 py-1 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)]">
            <ShieldCheck className="w-3.5 h-3.5" />
            OFICIAL META
          </div>
          <h3 className="text-2xl font-bold text-white mb-2 mt-2">Cloud API (Meta Business)</h3>
          <p className="text-neutral-400 mb-6">Aprovação direto da Meta. Selo verificado, sem risco de banimento.</p>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2"><Check className="w-5 h-5 text-emerald-400 flex-shrink-0" /><span className="text-neutral-300">Selo verde verificado no perfil</span></li>
            <li className="flex items-start gap-2"><Check className="w-5 h-5 text-emerald-400 flex-shrink-0" /><span className="text-neutral-300">Templates aprovados para disparo em massa</span></li>
            <li className="flex items-start gap-2"><Check className="w-5 h-5 text-emerald-400 flex-shrink-0" /><span className="text-neutral-300">Sem limite diário fixo (escala com tier Meta)</span></li>
            <li className="flex items-start gap-2"><Check className="w-5 h-5 text-emerald-400 flex-shrink-0" /><span className="text-neutral-300">WhatsApp Flows nativos</span></li>
            <li className="flex items-start gap-2"><Check className="w-5 h-5 text-emerald-400 flex-shrink-0" /><span className="text-neutral-300">Setup em 3 a 7 dias (aprovação Meta)</span></li>
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-8 shadow-lg backdrop-blur-sm"
        >
          <div className="absolute -top-3 left-8 inline-flex items-center gap-1.5 bg-amber-500 text-neutral-950 text-xs font-semibold px-3 py-1 rounded-full shadow">
            <Zap className="w-3.5 h-3.5" />
            CONEXÃO RÁPIDA
          </div>
          <h3 className="text-2xl font-bold text-white mb-2 mt-2">Conexão por QR</h3>
          <p className="text-neutral-400 mb-6">Conecta lendo o QR code do app. Pronto em 30 segundos.</p>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2"><Check className="w-5 h-5 text-amber-400 flex-shrink-0" /><span className="text-neutral-300">Setup em 30 segundos via QR</span></li>
            <li className="flex items-start gap-2"><Check className="w-5 h-5 text-amber-400 flex-shrink-0" /><span className="text-neutral-300">Sem aprovação Meta</span></li>
            <li className="flex items-start gap-2"><Check className="w-5 h-5 text-amber-400 flex-shrink-0" /><span className="text-neutral-300">Ideal para testes, MVPs e operações pequenas</span></li>
            <li className="flex items-start gap-2"><Check className="w-5 h-5 text-amber-400 flex-shrink-0" /><span className="text-neutral-300">Suporta áudio, imagem e documentos</span></li>
            <li className="flex items-start gap-2"><Check className="w-5 h-5 text-amber-400 flex-shrink-0" /><span className="text-neutral-300">Atenção: risco de banimento se mal usado</span></li>
          </ul>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="container mx-auto px-4 md:px-6 mt-12 text-center"
      >
        <Link href={isSignedIn ? '/dashboard' : '/api/logto/sign-up'}>
          <Button size="lg" className="rounded-full px-8 h-12 text-base bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold shadow-[0_0_30px_rgba(16,185,129,0.4)]">
            {isSignedIn ? 'Conectar minha conta →' : 'Começar grátis →'}
          </Button>
        </Link>
      </motion.div>
      </div>
    </section>
  );
}
