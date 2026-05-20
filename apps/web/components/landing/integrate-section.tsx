'use client';

import { useState } from 'react';
import { motion } from 'motion/react';

const samples: Record<string, string> = {
  curl: `curl -X POST https://back.simpleszap.com/api/message/sendText/INSTANCE_ID \\
  -H "x-api-key: sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"number":"5511999999999","text":"Olá!"}'`,

  Node: `import axios from 'axios';

await axios.post(
  'https://back.simpleszap.com/api/message/sendText/INSTANCE_ID',
  { number: '5511999999999', text: 'Olá!' },
  { headers: { 'x-api-key': process.env.SIMPLESZAP_API_KEY } }
);`,

  Python: `import os, requests

requests.post(
  'https://back.simpleszap.com/api/message/sendText/INSTANCE_ID',
  json={'number': '5511999999999', 'text': 'Olá!'},
  headers={'x-api-key': os.environ['SIMPLESZAP_API_KEY']},
)`,

  PHP: `<?php
$ch = curl_init('https://back.simpleszap.com/api/message/sendText/INSTANCE_ID');
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => [
    'x-api-key: ' . getenv('SIMPLESZAP_API_KEY'),
    'Content-Type: application/json',
  ],
  CURLOPT_POSTFIELDS => json_encode(['number' => '5511999999999', 'text' => 'Olá!']),
  CURLOPT_RETURNTRANSFER => true,
]);
echo curl_exec($ch);`,

  Go: `req, _ := http.NewRequest("POST",
  "https://back.simpleszap.com/api/message/sendText/INSTANCE_ID",
  strings.NewReader(\`{"number":"5511999999999","text":"Olá!"}\`),
)
req.Header.Set("x-api-key", os.Getenv("SIMPLESZAP_API_KEY"))
req.Header.Set("Content-Type", "application/json")
http.DefaultClient.Do(req)`,
};

const langs = Object.keys(samples) as Array<keyof typeof samples>;

export function IntegrateSection() {
  const [active, setActive] = useState<keyof typeof samples>('curl');
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(samples[active]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="bg-neutral-950 text-white py-24 lg:py-32 border-t border-white/5">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
        className="container mx-auto px-4 md:px-6 text-center max-w-2xl"
      >
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
          Integre <span className="text-emerald-400">esta tarde</span>
        </h2>
        <p className="mt-6 text-lg text-neutral-400">
          Uma API simples e elegante. Comece a disparar em minutos com qualquer linguagem.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="container mx-auto px-4 md:px-6 mt-14"
      >
        <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-6">
          {langs.map((l) => (
            <button
              key={l}
              onClick={() => setActive(l)}
              className={`px-4 py-2 rounded-lg text-sm font-mono font-medium transition ${
                active === l
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                  : 'bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10 hover:text-neutral-200'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="max-w-3xl mx-auto rounded-xl border border-white/10 bg-neutral-900/80 backdrop-blur overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-neutral-900">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
            </div>
            <span className="text-xs font-mono text-neutral-500">enviar.{active.toLowerCase()}</span>
            <button
              onClick={copy}
              className="text-xs font-mono text-neutral-400 hover:text-emerald-300 transition"
            >
              {copied ? '✓ copiado' : 'copiar'}
            </button>
          </div>
          <motion.pre
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="p-6 text-sm leading-relaxed text-neutral-300 font-mono overflow-x-auto whitespace-pre"
          >
            <code>{samples[active]}</code>
          </motion.pre>
        </div>
      </motion.div>
    </section>
  );
}
