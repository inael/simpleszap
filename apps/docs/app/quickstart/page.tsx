import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quickstart',
  description: 'Do zero ao primeiro envio de WhatsApp em 5 minutos.',
};

export default function QuickstartPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="text-sm text-brand-500 hover:underline">
        ← Voltar
      </Link>

      <header className="mt-6 mb-10">
        <div className="mb-3 text-xs font-mono uppercase tracking-wider text-brand-500">
          Guide
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Quickstart</h1>
        <p className="mt-3 text-lg text-neutral-400">
          Do zero ao primeiro envio em ~5 minutos.
        </p>
      </header>

      <Step n={1} title="Criar conta e parear WhatsApp">
        <p>
          Crie sua conta em{' '}
          <a className="link" href="https://simpleszap.com">simpleszap.com</a>{' '}
          e pareie um número WhatsApp via QR code (Instâncias → Nova
          instância). O número fica disponível enquanto o status estiver{' '}
          <code className="code">connected</code>.
        </p>
      </Step>

      <Step n={2} title="Gerar uma API key">
        <p>
          No painel, vá em <strong>Configurações → API Keys</strong> e clique
          em <strong>Criar nova chave</strong>. Copie o valor{' '}
          <code className="code">sk_...</code> — ele é mostrado <strong>uma vez só</strong>.
        </p>
        <Callout>
          A chave herda o plano da sua conta. Limite diário e features
          (webhooks, templates) seguem o que está contratado.
        </Callout>
      </Step>

      <Step n={3} title="Pegar o instanceId">
        <pre className="block-code">
{`curl https://back.simpleszap.com/api/instances \\
  -H "x-api-key: sk_..."`}
        </pre>
        <p>
          A resposta lista as instâncias da conta. Copie o{' '}
          <code className="code">id</code> da instância que vai usar para
          enviar.
        </p>
      </Step>

      <Step n={4} title="Enviar a primeira mensagem">
        <pre className="block-code">
{`curl -X POST https://back.simpleszap.com/api/message/sendText/INSTANCE_ID \\
  -H "x-api-key: sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"number":"5511999999999","text":"Olá!"}'`}
        </pre>
        <p>
          Resposta <code className="code">200 OK</code> = enviado. A mensagem
          fica registrada em <code className="code">GET /messages</code> e o
          contador diário avança.
        </p>
      </Step>

      <Step n={5} title="(Opcional) Receber callbacks via webhook">
        <p>
          Para receber notificações de <code className="code">message.sent</code> e{' '}
          <code className="code">message.failed</code>, cadastre uma URL em{' '}
          <strong>Configurações → Webhooks</strong> ou via{' '}
          <code className="code">POST /webhooks/config</code>.
        </p>
        <pre className="block-code">
{`{
  "event": "message.sent",
  "orgId": "...",
  "data": { "instanceId": "...", "number": "5511...", "text": "Olá!" }
}`}
        </pre>
      </Step>

      <section className="mt-16 rounded-xl border border-neutral-800 bg-neutral-900/30 p-6">
        <h2 className="mb-2 text-lg font-semibold">Próximos passos</h2>
        <ul className="space-y-2 text-sm text-neutral-400">
          <li>
            ▸ <Link href="/reference" className="link">API Reference completa</Link>
          </li>
          <li>
            ▸ Use{' '}
            <code className="code">POST /templates</code>{' '}
            para criar mensagens com variáveis <code className="code">{`{{nome}}`}</code>
          </li>
          <li>
            ▸ Use{' '}
            <code className="code">POST /campaigns</code>
            {' '}+ <code className="code">/run</code> para disparo em massa por tag
          </li>
        </ul>
      </section>

      <style>{`
        .link { color: #10b981; }
        .link:hover { text-decoration: underline; }
        .code {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.875rem;
          background: rgba(255,255,255,0.08);
          padding: 2px 6px;
          border-radius: 4px;
        }
        .block-code {
          display: block;
          overflow-x: auto;
          background: #0a0a0a;
          border: 1px solid #1f1f1f;
          padding: 16px;
          border-radius: 8px;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.875rem;
          margin: 12px 0;
        }
      `}</style>
    </article>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10 border-l-2 border-brand-500/30 pl-6">
      <div className="mb-2 flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/20 text-sm font-mono font-bold text-brand-500">
          {n}
        </span>
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <div className="space-y-3 text-neutral-300">{children}</div>
    </section>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200/90">
      ⚠ {children}
    </div>
  );
}
