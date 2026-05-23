'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { Check, X, Minus } from 'lucide-react';

type Mark = boolean | 'partial';

type Row = {
  label: string;
  simpleszap: string | Mark;
  zapi: string | Mark;
  wapi: string | Mark;
  wasender: string | Mark;
};

const ROWS: Row[] = [
  { label: 'Preço base / mês',     simpleszap: 'R$ 59 /inst', zapi: 'R$ 89+',    wapi: 'R$ 99+',    wasender: 'US$ 19+' },
  { label: 'Cobra por mensagem',   simpleszap: false,         zapi: false,        wapi: false,        wasender: false },
  { label: 'Doc 100% PT-BR',       simpleszap: true,          zapi: true,         wapi: true,         wasender: 'partial' },
  { label: 'Webhooks por instância', simpleszap: true,        zapi: 'partial',    wapi: 'partial',    wasender: 'partial' },
  { label: 'Variantes A/B/C anti-ban', simpleszap: true,      zapi: false,        wapi: false,        wasender: false },
  { label: 'Jitter aleatório',     simpleszap: true,          zapi: 'partial',    wapi: false,        wasender: false },
  { label: 'Suporte BR',           simpleszap: true,          zapi: true,         wapi: true,         wasender: false },
  { label: 'Postman + OpenAPI',    simpleszap: true,          zapi: 'partial',    wapi: 'partial',    wasender: true },
];

function MarkCell({ value, accent }: { value: string | Mark; accent?: boolean }) {
  if (value === true)
    return <Check className={`w-5 h-5 inline ${accent ? 'text-emerald-400' : 'text-emerald-500'}`} />;
  if (value === false) return <X className="w-5 h-5 inline text-red-500/70" />;
  if (value === 'partial') return <Minus className="w-5 h-5 inline text-amber-500" />;
  return <span className={`text-sm font-medium ${accent ? 'text-emerald-300' : 'text-neutral-300'}`}>{value}</span>;
}

export function CompetitorsTableSection() {
  return (
    <section className="bg-[#0e0e0e] py-28 lg:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(16,185,129,0.07),transparent_55%)]" />
      <div className="container relative mx-auto px-4 md:px-6 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-xs font-semibold text-emerald-400 mb-3 uppercase tracking-wider">Comparativo</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            SimplesZap vs concorrentes
          </h2>
          <p className="mt-6 text-lg text-neutral-400 max-w-2xl mx-auto">
            Quadro objetivo. Sem promessa de upgrade no boleto — preços e features baseados em sites públicos.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm"
        >
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="p-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Critério</th>
                <th className="p-4 bg-emerald-500/10 text-center">
                  <span className="text-sm font-bold text-emerald-300">SimplesZap</span>
                </th>
                <th className="p-4 text-center text-sm font-semibold text-neutral-400">Z-API</th>
                <th className="p-4 text-center text-sm font-semibold text-neutral-400">W-API</th>
                <th className="p-4 text-center text-sm font-semibold text-neutral-400">Wasender</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr key={row.label} className={`border-b border-white/5 ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                  <td className="p-4 text-sm text-neutral-300 font-medium">{row.label}</td>
                  <td className="p-4 text-center bg-emerald-500/[0.04]">
                    <MarkCell value={row.simpleszap} accent />
                  </td>
                  <td className="p-4 text-center"><MarkCell value={row.zapi} /></td>
                  <td className="p-4 text-center"><MarkCell value={row.wapi} /></td>
                  <td className="p-4 text-center"><MarkCell value={row.wasender} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        <div className="text-center mt-8">
          <Link href="/comparativo" className="text-sm text-emerald-400 hover:underline font-medium">
            Ver comparativo completo (7 concorrentes) →
          </Link>
        </div>
      </div>
    </section>
  );
}
