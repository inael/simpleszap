'use client';

import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { TrendingDown } from 'lucide-react';

// Tarifa oficial Meta Cloud API — Brasil, categoria Marketing, vigente desde
// 1º jan/2026 (mudança per-conversation -> per-message).
// USD $0,0625 ≈ R$ 0,35 (cotação março/2026, BRL nativo previsto pra 2º sem/2026)
// Fonte: business.whatsapp.com/products/platform-pricing
const META_BRL_PER_MSG = 0.35;
const SZ_BASE = 59; // 1 instância
const SZ_PACK_BRL = 15; // pack de +100 msgs/dia
const SZ_PACK_DAY = 100;

const VOLUMES = [
  { label: '10 mil msgs/mês', value: 10_000 },
  { label: '100 mil msgs/mês', value: 100_000 },
  { label: '1 milhão msgs/mês', value: 1_000_000 },
];

function calcSimplesZap(monthlyMsgs: number) {
  // Cada pack adiciona SZ_PACK_DAY msgs/dia ≈ SZ_PACK_DAY * 30 msgs/mês.
  // Calcula quantos packs precisamos pra cobrir o volume.
  const includedPerMonth = 300 * 30; // plano base inclui 300/dia
  const extra = Math.max(0, monthlyMsgs - includedPerMonth);
  const packsNeeded = Math.ceil(extra / (SZ_PACK_DAY * 30));
  return SZ_BASE + packsNeeded * SZ_PACK_BRL;
}

function AnimatedNumber({ value, prefix = '', decimals = 0 }: { value: number; prefix?: string; decimals?: number }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) =>
    `${prefix}${v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
  );
  const [text, setText] = useState(`${prefix}0`);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1.4,
      ease: 'easeOut',
    });
    const unsub = rounded.on('change', setText);
    return () => {
      controls.stop();
      unsub();
    };
  }, [value, motionValue, rounded]);

  return <span>{text}</span>;
}

export function PricingVsMetaSection() {
  const [volume, setVolume] = useState(VOLUMES[1].value);
  const metaCost = volume * META_BRL_PER_MSG;
  const szCost = calcSimplesZap(volume);
  const savings = Math.max(0, metaCost - szCost);

  return (
    <section className="bg-gradient-to-b from-[#0e0e0e] to-[#0e0e0e] py-28 lg:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.10),transparent_55%)]" />
      <div className="container relative mx-auto px-4 md:px-6 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-xs font-semibold text-emerald-400 mb-3 uppercase tracking-wider">Preço justo</p>
          <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight">
            Meta cobra por mensagem.<br />
            <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Aqui você não paga.
            </span>
          </h2>
          <p className="mt-6 text-lg text-neutral-400 max-w-2xl mx-auto">
            Cloud API oficial cobra <strong className="text-white">R$ 0,35 por mensagem de marketing</strong> no Brasil (tarifa vigente desde jan/2026).
            No SimplesZap você paga <strong className="text-white">R$ 59/mês por instância</strong> e dispara à vontade.
          </p>
        </motion.div>

        {/* Tabs de volume */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="flex flex-wrap justify-center gap-2 mb-10"
        >
          {VOLUMES.map((v) => (
            <button
              key={v.value}
              onClick={() => setVolume(v.value)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition ${
                volume === v.value
                  ? 'bg-emerald-500 text-neutral-950 shadow-[0_0_25px_rgba(16,185,129,0.4)]'
                  : 'bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              {v.label}
            </button>
          ))}
        </motion.div>

        {/* Cards comparativos */}
        <div className="grid md:grid-cols-2 gap-5 mb-10">
          {/* Meta */}
          <motion.div
            key={`meta-${volume}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-8 relative overflow-hidden"
          >
            <div className="absolute -top-3 left-8 bg-red-500/90 text-white text-xs font-semibold px-3 py-1 rounded-full">
              META CLOUD API
            </div>
            <p className="text-neutral-400 text-sm mt-2 mb-1">Você pagaria</p>
            <div className="text-5xl md:text-6xl font-bold text-white">
              R$ <AnimatedNumber value={metaCost} decimals={0} />
            </div>
            <p className="text-neutral-500 text-sm mt-2">
              {volume.toLocaleString('pt-BR')} msgs × R$ 0,35 (marketing BR, jan/2026)
            </p>
          </motion.div>

          {/* SimplesZap */}
          <motion.div
            key={`sz-${volume}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 p-8 relative overflow-hidden shadow-[0_0_60px_-15px_rgba(16,185,129,0.5)]"
          >
            <div className="absolute -top-3 left-8 bg-emerald-500 text-neutral-950 text-xs font-semibold px-3 py-1 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.6)]">
              SIMPLESZAP
            </div>
            <p className="text-neutral-400 text-sm mt-2 mb-1">Você paga</p>
            <div className="text-5xl md:text-6xl font-bold text-white">
              R$ <AnimatedNumber value={szCost} decimals={0} />
            </div>
            <p className="text-neutral-500 text-sm mt-2">
              R$ 59/mês por instância + packs opcionais de +msgs
            </p>
          </motion.div>
        </div>

        {/* Banner economia */}
        <motion.div
          key={`save-${volume}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 p-8 text-center"
        >
          <div className="flex items-center justify-center gap-2 text-emerald-400 mb-2">
            <TrendingDown className="w-5 h-5" />
            <span className="text-sm font-semibold uppercase tracking-wider">Você economiza</span>
          </div>
          <div className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
            R$ <AnimatedNumber value={savings} decimals={0} />
          </div>
          <p className="text-neutral-400 mt-3">por mês — sem mexer no seu fluxo</p>
          <div className="mt-6">
            <Link href="/api/logto/sign-up">
              <Button
                size="lg"
                className="rounded-full px-8 h-12 text-base bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold shadow-[0_0_40px_rgba(16,185,129,0.45)]"
              >
                Começar grátis →
              </Button>
            </Link>
          </div>
        </motion.div>

        <p className="text-xs text-neutral-500 text-center mt-6 max-w-2xl mx-auto">
          Tarifa Meta: R$ 0,35/msg para templates de Marketing no Brasil (vigente desde 1º jan/2026, modelo per-message).
          Utility/Authentication são mais baratos (~R$ 0,04) e Service (resposta dentro da janela de 24h) é grátis —
          mas disparo em massa cai sempre em Marketing.{" "}
          <a href="https://business.whatsapp.com/products/platform-pricing" target="_blank" rel="noopener" className="underline hover:text-emerald-400">
            Fonte: tabela oficial Meta
          </a>.
          SimplesZap usa conexão por QR (não-oficial) — sem cobrança por msg, com proteções anti-banimento embutidas.
        </p>
      </div>
    </section>
  );
}
