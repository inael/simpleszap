'use client';

import { motion } from 'motion/react';
import { Shuffle, Layers, Repeat, Activity, Shield } from 'lucide-react';

const PROTECTIONS = [
  {
    icon: Shuffle,
    title: 'Jitter aleatório',
    desc: 'Entre cada envio o sistema aguarda um tempo aleatório (900–2200ms padrão, configurável). Elimina padrão robótico que ativa filtros do WhatsApp.',
    metric: '900–2200ms',
  },
  {
    icon: Layers,
    title: '3 variantes A/B/C',
    desc: 'Cada template exige 3 versões diferentes do mesmo texto. O sistema sorteia automaticamente em cada envio — mensagens idênticas em escala é o gatilho nº 1 de ban.',
    metric: '3 textos por template',
  },
  {
    icon: Repeat,
    title: 'Fila com retry',
    desc: 'Falha de envio entra em retry exponencial sem você se preocupar. Limite diário do plano respeitado automaticamente — não estoura nem trava a campanha.',
    metric: 'Retry exponencial',
  },
  {
    icon: Activity,
    title: 'Logs e webhooks',
    desc: 'Tudo registrado: status de envio, falha, entrega, leitura. Webhook em tempo real pro seu sistema. Você vê o que tá acontecendo, sem caixa-preta.',
    metric: '16 eventos rastreáveis',
  },
];

export function AntiBanSection() {
  return (
    <section className="bg-[#0e0e0e] py-28 lg:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%,rgba(16,185,129,0.08),transparent_55%)]" />
      <div className="container relative mx-auto px-4 md:px-6 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 mb-6">
            <Shield className="w-3.5 h-3.5" />
            Proteção anti-banimento
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            4 camadas pra você não ser bloqueado
          </h2>
          <p className="mt-6 text-lg text-neutral-400">
            Conexão por QR é mais barata que Cloud API mas tem risco de ban se mal usada.
            Embutimos proteções no sistema pra reduzir esse risco a quase zero — sem você
            precisar implementar nada.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-5">
          {PROTECTIONS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group rounded-2xl border border-white/5 bg-white/[0.02] p-7 hover:border-emerald-500/30 hover:bg-white/[0.04] transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/15 transition-colors">
                  <p.icon className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{p.title}</h3>
                    <span className="text-[10px] font-mono text-emerald-400/80 whitespace-nowrap">{p.metric}</span>
                  </div>
                  <p className="text-sm text-neutral-400 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="text-xs text-neutral-500 text-center mt-10 max-w-2xl mx-auto">
          Nenhuma proteção elimina 100% do risco — uso responsável (opt-in, cadência sã, lista limpa) ainda é seu papel.
          Documentamos as melhores práticas em <a href="/dashboard/security" className="text-emerald-400 hover:underline">Segurança da API</a>.
        </p>
      </div>
    </section>
  );
}
