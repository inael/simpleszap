export default function PrivacyPage() {
  return (
    <div className="container mx-auto p-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Política de Privacidade</h1>
      <div className="prose">
        <p>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
        <h2 className="text-xl font-semibold mt-4 mb-2">1. Coleta de Informações</h2>
        <p className="mb-4">
          Coletamos informações necessárias para fornecer nossos serviços, incluindo seu nome, e-mail e dados de pagamento.
          Não armazenamos o conteúdo das suas mensagens do WhatsApp.
        </p>
        <h2 className="text-xl font-semibold mt-4 mb-2">2. Uso das Informações</h2>
        <p className="mb-4">
          Usamos suas informações para operar, manter e melhorar nossos serviços, bem como para nos comunicarmos com você.
        </p>
        <h2 className="text-xl font-semibold mt-4 mb-2">3. Compartilhamento de Dados</h2>
        <p className="mb-4">
          Não vendemos suas informações pessoais para terceiros. Compartilhamos dados apenas com provedores de serviço necessários para a operação do sistema (ex: processamento de pagamentos).
        </p>
      </div>
    </div>
  );
}
