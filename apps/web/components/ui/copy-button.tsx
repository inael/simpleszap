"use client";

import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CopyButtonProps {
  value: string;
  title?: string;
  className?: string;
  size?: "sm" | "icon";
}

export function CopyButton({ value, title = "Copiar", className, size = "icon" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copiado!");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={size === "icon" ? `h-7 w-7 ${className ?? ""}` : className}
      onClick={handleCopy}
      title={title}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}
