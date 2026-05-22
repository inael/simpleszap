"use client";

import { Input } from "@/components/ui/input";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * Input de telefone Brasil-first: mostra bandeira 🇧🇷 + DDI +55 fixos.
 * O usuário digita só DDD + número. Backend (normalizePhoneBR) também aceita
 * com DDI já incluso, mas a UX padrão é não pedir DDI.
 */
export function PhoneInput({ value, onChange, placeholder = "11 99999-9999", disabled, className }: Props) {
  return (
    <div className={`flex items-stretch rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-hidden bg-background ${className || ""}`}>
      <div className="flex items-center gap-1.5 px-3 bg-muted/40 border-r border-input text-sm text-muted-foreground">
        <span className="text-base leading-none" aria-label="Brasil">🇧🇷</span>
        <span className="font-medium">+55</span>
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        inputMode="tel"
        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </div>
  );
}
