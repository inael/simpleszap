import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-500">
          <span className="h-2 w-2 rounded-full bg-brand-500" />
          API estável · v1.0.0
        </div>
        <h1 className="text-5xl font-bold tracking-tight">SimplesZap Docs</h1>
        <p className="mt-4 text-lg text-neutral-400">
          Envie WhatsApp em escala via REST. Auth por API key, webhooks de entrega, templates.
        </p>
      </header>

      <section className="mb-12 grid gap-4 sm:grid-cols-2">
        <Link
          href="/reference"
          className="group rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 transition hover:border-brand-500/50 hover:bg-neutral-900"
        >
          <div className="mb-2 text-xs font-mono uppercase tracking-wider text-brand-500">Reference</div>
          <h2 className="mb-1 text-xl font-semibold">API Reference</h2>
          <p className="text-sm text-neutral-400">
            Todos os endpoints, schemas e exemplos. Powered by Scalar + OpenAPI 3.1.
          </p>
          <span className="mt-4 inline-block text-sm text-brand-500 group-hover:translate-x-1 transition-transform">
            Abrir →
          </span>
        </Link>

        <Link
          href="/quickstart"
          className="group rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 transition hover:border-brand-500/50 hover:bg-neutral-900"
        >
          <div className="mb-2 text-xs font-mono uppercase tracking-wider text-brand-500">Guide</div>
          <h2 className="mb-1 text-xl font-semibold">Quickstart</h2>
          <p className="text-sm text-neutral-400">
            Do zero ao primeiro envio em 5 minutos. Gerar chave, pegar instanceId, enviar.
          </p>
          <span className="mt-4 inline-block text-sm text-brand-500 group-hover:translate-x-1 transition-transform">
            Começar →
          </span>
        </Link>
      </section>

      <section className="mb-12 rounded-xl border border-neutral-800 bg-neutral-900/30 p-6">
        <h2 className="mb-3 text-lg font-semibold">Base URL</h2>
        <pre className="overflow-x-auto rounded bg-neutral-950 px-4 py-3 font-mono text-sm text-brand-500">
          https://back.simpleszap.com/api
        </pre>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">Exemplo rápido</h2>
        <pre className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950 p-4 font-mono text-sm">
          <code>{`curl -X POST https://back.simpleszap.com/api/message/sendText/INSTANCE_ID \\
  -H "x-api-key: sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"number":"5511999999999","text":"Olá!"}'`}</code>
        </pre>
      </section>

      <footer className="mt-16 border-t border-neutral-800 pt-6 text-sm text-neutral-500">
        <p>
          Dúvidas? <a className="text-brand-500 hover:underline" href="mailto:suporte@simpleszap.com">suporte@simpleszap.com</a>
          {' · '}
          <a className="text-brand-500 hover:underline" href="https://simpleszap.com">simpleszap.com</a>
        </p>
      </footer>
    </main>
  );
}
