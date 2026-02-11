export default function TermsPage() {
  return (
    <div className="container mx-auto p-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Termos de Serviço</h1>
      <div className="prose">
        <p>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
        <h2 className="text-xl font-semibold mt-4 mb-2">1. Aceitação dos Termos</h2>
        <p className="mb-4">
          Ao acessar e usar o SimplesZap, você concorda em cumprir e estar vinculado a estes Termos de Serviço.
        </p>
        <h2 className="text-xl font-semibold mt-4 mb-2">2. Uso do Serviço</h2>
        <p className="mb-4">
          Você concorda em usar o serviço apenas para fins legais e de acordo com todas as leis aplicáveis.
          O uso indevido da API do WhatsApp pode resultar no bloqueio da sua conta.
        </p>
        <h2 className="text-xl font-semibold mt-4 mb-2">3. Cancelamento</h2>
        <p className="mb-4">
          Você pode cancelar sua assinatura a qualquer momento. O cancelamento entrará em vigor no final do ciclo de faturamento atual.
        </p>
      </div>
    </div>
  );
}
