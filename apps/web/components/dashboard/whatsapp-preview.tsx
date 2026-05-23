"use client";

/**
 * Preview de como uma variante de template fica no chat do WhatsApp do destinatário.
 * Usa /whatsapp-mockup.png como moldura/celular e sobrepõe o bubble verde com o texto
 * renderizado (variáveis {{name}}, {{phone}} substituídas por exemplo).
 */

type Variant = "A" | "B" | "C";

interface Props {
  text: string;
  variant: Variant;
  exampleName?: string;
  examplePhone?: string;
}

const ACCENT: Record<Variant, { ring: string; chip: string }> = {
  A: { ring: "ring-sky-500/40", chip: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  B: { ring: "ring-amber-500/40", chip: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  C: { ring: "ring-fuchsia-500/40", chip: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30" },
};

function renderTemplate(t: string, name: string, phone: string) {
  return (t || "")
    .replace(/\{\{\s*name\s*\}\}/g, name)
    .replace(/\{\{\s*phone\s*\}\}/g, phone)
    .trim();
}

export function WhatsAppPreview({
  text,
  variant,
  exampleName = "Maria",
  examplePhone = "11 99999-9999",
}: Props) {
  const rendered = renderTemplate(text, exampleName, examplePhone);
  const colors = ACCENT[variant];

  return (
    <div className="flex flex-col items-center gap-3">
      <span className={`text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border ${colors.chip}`}>
        Variante {variant}
      </span>

      <div
        className={`relative w-full max-w-[240px] aspect-[9/19.5] rounded-[2rem] overflow-hidden shadow-2xl ring-1 ${colors.ring}`}
      >
        {/* Mockup do celular como background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url("/whatsapp-mockup.png")' }}
        />

        {/* Bubble de mensagem (entrante = bot enviou pro contato).
            Posicionado na área típica de chat do WhatsApp (35-65% verticais).
            Se a imagem mudar, ajustar top/left/right aqui. */}
        <div className="absolute top-[35%] left-[6%] right-[28%]">
          {rendered ? (
            <div className="bg-white text-gray-900 text-[10px] leading-snug p-2 rounded-lg rounded-tl-sm shadow-md break-words whitespace-pre-wrap">
              {rendered}
              <div className="text-[7px] text-gray-400 text-right mt-1">10:23</div>
            </div>
          ) : (
            <div className="bg-white/70 text-gray-400 text-[10px] italic p-2 rounded-lg rounded-tl-sm shadow-md">
              Preview da mensagem aparece aqui…
            </div>
          )}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Exemplo: <span className="font-mono">{exampleName}</span> · <span className="font-mono">{examplePhone}</span>
      </p>
    </div>
  );
}
