/**
 * Normalização de número de telefone pra envio via WhatsApp/Evolution API.
 * Brasil-first: se vier sem DDI, assume 55.
 *
 * Aceita formatos:
 *   "11999999999"        -> "5511999999999"
 *   "(11) 99999-9999"    -> "5511999999999"
 *   "+55 11 99999-9999"  -> "5511999999999"
 *   "5511999999999"      -> "5511999999999"  (passa direto)
 *   "5511999999999@s.whatsapp.net" -> "5511999999999"
 */
export function normalizePhoneBR(raw: string): string {
  if (!raw) return raw;
  // remove sufixo @s.whatsapp.net e tudo que não for dígito
  const digits = raw.replace(/@.*/, '').replace(/\D/g, '');

  // já começa com DDI Brasil (12-13 dígitos, ex: 5511999999999)
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }
  // 10 ou 11 dígitos = DDD+numero (com ou sem 9 inicial em SP/celular)
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  // Outros DDIs (qualquer coisa começando com dígitos != 55) -> mantém como veio
  return digits;
}
