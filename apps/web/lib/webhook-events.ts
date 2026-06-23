// Lista mestre de eventos suportados pelos webhooks SimplesZap.
// Usada tanto no /dashboard/webhooks (CRUD global) quanto no override por
// instância (/dashboard/instances → botão Webhook → expansion inline).

export type EventDef = {
  key: string;
  category: string;
  label: string;
  description: string;
};

export const AVAILABLE_EVENTS: EventDef[] = [
  { key: "message.sent",              category: "Saída",     label: "Mensagem enviada",          description: "Sua API/dashboard enviou uma mensagem com sucesso." },
  { key: "message.failed",            category: "Saída",     label: "Falha de envio",            description: "Tentativa de envio falhou (erro Evolution, sem internet, etc)." },
  { key: "message.received",          category: "Entrada",   label: "Mensagem recebida (texto)", description: "Lead/contato te mandou uma mensagem de texto." },
  { key: "message.audio.received",    category: "Entrada",   label: "Áudio recebido",            description: "Lead te mandou um áudio." },
  { key: "message.image.received",    category: "Entrada",   label: "Imagem recebida",           description: "Lead te mandou uma imagem." },
  { key: "message.video.received",    category: "Entrada",   label: "Vídeo recebido",            description: "Lead te mandou um vídeo." },
  { key: "message.document.received", category: "Entrada",   label: "Documento recebido",        description: "Lead te mandou um PDF/arquivo." },
  { key: "message.location.received", category: "Entrada",   label: "Localização recebida",      description: "Lead compartilhou localização." },
  { key: "message.reaction",          category: "Interação", label: "Reação a mensagem",         description: "Alguém reagiu a uma mensagem (emoji)." },
  { key: "message.delivered",         category: "Status",    label: "Mensagem entregue",         description: "WhatsApp confirmou entrega no dispositivo do destinatário." },
  { key: "message.read",              category: "Status",    label: "Mensagem lida",             description: "Destinatário abriu a conversa e leu sua mensagem." },
  { key: "instance.connected",        category: "Instância", label: "Instância conectada",       description: "Pareamento concluído — número online." },
  { key: "instance.disconnected",     category: "Instância", label: "Instância desconectada",    description: "Conexão caiu (celular offline, deslogou, etc)." },
  { key: "instance.qrcode.generated", category: "Instância", label: "QR code gerado",            description: "Novo QR disponível pra escanear." },
  { key: "contact.added",             category: "Contatos",  label: "Contato sincronizado",      description: "Contato apareceu no WhatsApp do número." },
  { key: "chat.presence",             category: "Interação", label: "Presença (typing/áudio)",   description: "Mostra quando o contato está digitando ou gravando áudio." },
];

export const CATEGORY_ORDER = ["Saída", "Entrada", "Status", "Instância", "Interação", "Contatos"] as const;

export const DEFAULT_SELECTED_EVENTS = [
  "message.sent",
  "message.failed",
  "message.received",
  "instance.connected",
];

export type GroupedEvents = { category: string; events: EventDef[] }[];

export function groupEventsByCategory(events: EventDef[] = AVAILABLE_EVENTS): GroupedEvents {
  const groups: Record<string, EventDef[]> = {};
  for (const ev of events) (groups[ev.category] ||= []).push(ev);
  return CATEGORY_ORDER
    .filter((c) => groups[c]?.length)
    .map((c) => ({ category: c as string, events: groups[c] }));
}
