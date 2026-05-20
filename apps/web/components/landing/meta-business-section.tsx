'use client';

import { motion } from 'motion/react';
import { Check, Zap, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function MetaBusinessSection({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <section className="bg-gradient-to-b from-neutral-50 to-white py-24 lg:py-32">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
        className="container mx-auto px-4 md:px-6 text-center max-w-2xl"
      >
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
          Escolha seu caminho
        </p>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-green-950">
          Cloud API oficial <span className="text-gray-400">ou</span><br />
          conexão rápida por QR
        </h2>
        <p className="mt-6 text-lg text-gray-600">
          Os dois caminhos no mesmo painel. Use o que faz sentido pro seu caso — ou ambos em paralelo.
        </p>
      </motion.div>

      <div className="container mx-auto px-4 md:px-6 mt-16 grid md:grid-cols-2 gap-6 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="relative rounded-2xl border-2 border-primary/20 bg-white p-8 shadow-lg"
        >
          <div className="absolute -top-3 left-8 inline-flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
            <ShieldCheck className="w-3.5 h-3.5" />
            OFICIAL META
          </div>
          <h3 className="text-2xl font-bold text-green-950 mb-2 mt-2">Cloud API (Meta Business)</h3>
          <p className="text-gray-600 mb-6">Aprovação direto da Meta. Selo verificado, sem risco de banimento.</p>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2"><Check className="w-5 h-5 text-primary flex-shrink-0" /><span className="text-gray-700">Selo verde verificado no perfil</span></li>
            <li className="flex items-start gap-2"><Check className="w-5 h-5 text-primary flex-shrink-0" /><span className="text-gray-700">Templates aprovados para disparo em massa</span></li>
            <li className="flex items-start gap-2"><Check className="w-5 h-5 text-primary flex-shrink-0" /><span className="text-gray-700">Sem limite diário fixo (escala com tier Meta)</span></li>
            <li className="flex items-start gap-2"><Check className="w-5 h-5 text-primary flex-shrink-0" /><span className="text-gray-700">WhatsApp Flows nativos</span></li>
            <li className="flex items-start gap-2"><Check className="w-5 h-5 text-primary flex-shrink-0" /><span className="text-gray-700">Setup em 3 a 7 dias (aprovação Meta)</span></li>
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative rounded-2xl border border-gray-200 bg-white p-8 shadow-lg"
        >
          <div className="absolute -top-3 left-8 inline-flex items-center gap-1.5 bg-amber-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
            <Zap className="w-3.5 h-3.5" />
            CONEXÃO RÁPIDA
          </div>
          <h3 className="text-2xl font-bold text-green-950 mb-2 mt-2">Conexão por QR</h3>
          <p className="text-gray-600 mb-6">Conecta lendo o QR code do app. Pronto em 30 segundos.</p>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2"><Check className="w-5 h-5 text-amber-500 flex-shrink-0" /><span className="text-gray-700">Setup em 30 segundos via QR</span></li>
            <li className="flex items-start gap-2"><Check className="w-5 h-5 text-amber-500 flex-shrink-0" /><span className="text-gray-700">Sem aprovação Meta</span></li>
            <li className="flex items-start gap-2"><Check className="w-5 h-5 text-amber-500 flex-shrink-0" /><span className="text-gray-700">Ideal para testes, MVPs e operações pequenas</span></li>
            <li className="flex items-start gap-2"><Check className="w-5 h-5 text-amber-500 flex-shrink-0" /><span className="text-gray-700">Suporta áudio, imagem e documentos</span></li>
            <li className="flex items-start gap-2"><Check className="w-5 h-5 text-amber-500 flex-shrink-0" /><span className="text-gray-700">Atenção: risco de banimento se mal usado</span></li>
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
          <Button size="lg" className="rounded-full px-8 h-12 text-base">
            {isSignedIn ? 'Conectar minha conta →' : 'Começar grátis →'}
          </Button>
        </Link>
      </motion.div>
    </section>
  );
}
