'use client';

import { motion } from 'motion/react';
import { Workflow, Bot, Plug } from 'lucide-react';

type Integration = {
  name: string;
  desc: string;
  initial: string;
};

const integrations: Integration[] = [
  { name: 'n8n', desc: 'Dispare e receba mensagens em qualquer workflow via nó HTTP.', initial: 'n8' },
  { name: 'Make (Integromat)', desc: 'Cenários automáticos disparando WhatsApp em cada evento.', initial: 'Mk' },
  { name: 'Zapier', desc: 'Conecte 6.000+ apps ao seu número com Zaps simples.', initial: 'Zp' },
  { name: 'Typebot', desc: 'Fluxos conversacionais entregando respostas pelo WhatsApp.', initial: 'Tb' },
  { name: 'Chatwoot', desc: 'Central de atendimento multi-agente ligada às suas instâncias.', initial: 'Cw' },
  { name: 'Bubble', desc: 'Notifique usuários do seu app no-code direto no chat.', initial: 'Bb' },
  { name: 'Flutterflow', desc: 'Envie confirmações e alertas do seu app mobile low-code.', initial: 'Ff' },
  { name: 'WeWeb', desc: 'Gatilhos de front-end no-code chamando a API REST.', initial: 'Ww' },
];

const categories = ['Automação', 'Chatbots', 'No-code apps', 'IA'];

export function NoCodeIntegrationsSection() {
  return (
    <section className="bg-neutral-950 text-white py-24 lg:py-32 border-t border-white/5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(16,185,129,0.07),transparent_55%)]" />

      <div className="container mx-auto px-4 md:px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400 mb-6">
            <Plug className="w-3.5 h-3.5" />
            Integrações no-code
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            Conecte com as ferramentas que <span className="text-emerald-400">você já usa</span>
          </h2>
          <p className="mt-6 text-lg text-neutral-400 leading-relaxed">
            O SimplesZap pluga nas principais plataformas no-code e low-code via API REST e webhooks —
            sem escrever backend. Orquestre o WhatsApp de onde você já trabalha.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <span
                key={cat}
                className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300"
              >
                {cat}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.ul
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-14 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto"
        >
          {integrations.map((item, i) => (
            <motion.li
              key={item.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: (i % 4) * 0.05 }}
              className="group rounded-xl border border-white/10 bg-white/5 backdrop-blur p-5 hover:border-emerald-500/30 hover:bg-white/[0.07] transition-all"
            >
              <div
                aria-hidden="true"
                className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-sm font-bold text-emerald-300 group-hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] transition-shadow"
              >
                {item.initial}
              </div>
              <h3 className="text-base font-semibold text-white">{item.name}</h3>
              <p className="mt-1.5 text-sm text-neutral-400 leading-relaxed">{item.desc}</p>
            </motion.li>
          ))}

          {/* Card destaque: sua stack via REST + webhooks / IA */}
          <motion.li
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="group rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 backdrop-blur p-5 hover:border-emerald-500/50 transition-all"
          >
            <div
              aria-hidden="true"
              className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.35)]"
            >
              <Workflow className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white flex items-center gap-1.5">
              Sua stack via REST + Webhooks
              <Bot className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            </h3>
            <p className="mt-1.5 text-sm text-neutral-300 leading-relaxed">
              Qualquer sistema ou agente de IA (LLMs) conversa com o WhatsApp pela API aberta. Se fala HTTP, integra.
            </p>
          </motion.li>
        </motion.ul>
      </div>
    </section>
  );
}
