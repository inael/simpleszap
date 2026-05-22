'use client';

import { motion } from 'motion/react';
import { Sparkles, Layers, MousePointerClick } from 'lucide-react';

export function FlowsSection() {
  return (
    <section className="bg-black py-28 lg:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(16,185,129,0.08),transparent_55%)]" />
      <div className="container mx-auto px-4 md:px-6 relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400 mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              WhatsApp Flows
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
              Mini-apps dentro do<br />
              <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-400 bg-clip-text text-transparent">WhatsApp</span>
            </h2>
            <p className="mt-6 text-lg text-neutral-400 leading-relaxed">
              Crie formulários, agendamentos, catálogos e fluxos interativos completos —
              tudo dentro da conversa, sem o cliente precisar sair do app.
            </p>
            <ul className="mt-8 space-y-4">
              <li className="flex items-start gap-3">
                <Layers className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className="text-neutral-300">
                  <strong className="text-white">Formulários multi-etapa</strong> — coleta dados estruturados com validação
                </span>
              </li>
              <li className="flex items-start gap-3">
                <MousePointerClick className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className="text-neutral-300">
                  <strong className="text-white">Botões, listas e seletores</strong> — UX rica sem digitação
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className="text-neutral-300">
                  <strong className="text-white">Conecta na sua API</strong> — qualquer endpoint REST, payload livre
                </span>
              </li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative"
          >
            <div className="relative max-w-[360px] mx-auto rounded-[2rem] bg-gradient-to-b from-[#075E54] to-[#128C7E] p-3 shadow-2xl">
              <div className="rounded-2xl bg-white p-5 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-gray-900">Agendar consulta</div>
                    <div className="text-xs text-gray-500">3 etapas</div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Especialidade</label>
                  <div className="mt-1.5 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 flex items-center justify-between">
                    Clínico geral
                    <span className="text-gray-400">⌄</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Data preferida</label>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {['Seg 15', 'Ter 16', 'Qua 17'].map((d, i) => (
                      <div
                        key={d}
                        className={`rounded-lg border text-xs font-medium py-2 text-center ${
                          i === 1 ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                </div>

                <button className="w-full bg-primary text-white text-sm font-semibold rounded-lg py-3 mt-2">
                  Confirmar agendamento
                </button>
              </div>
            </div>

            <div className="absolute -top-3 -right-3 bg-amber-100 text-amber-900 text-xs font-mono font-semibold px-3 py-1.5 rounded-full border border-amber-200 shadow">
              ✦ Novo
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
