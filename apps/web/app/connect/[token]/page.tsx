"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Loader2, MessageSquare } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://back.simpleszap.com/api";

type ConnectResponse =
  | { state: "open"; message?: string }
  | { state: "connecting"; base64: string | null; instanceName: string; expiresAt: string };

type UiState =
  | { kind: "loading" }
  | { kind: "qr"; qr: string | null; instanceName: string; expiresAt: string }
  | { kind: "connected" }
  | { kind: "error"; message: string; status?: number };

export default function PublicConnectPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [ui, setUi] = useState<UiState>({ kind: "loading" });
  const [secondsLeft, setSecondsLeft] = useState(60);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQr = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/public/connect/${token}`, { cache: "no-store" });
      if (res.status === 410) {
        setUi({ kind: "error", status: 410, message: "Link expirado. Peça outro ao remetente." });
        return;
      }
      if (res.status === 404) {
        setUi({ kind: "error", status: 404, message: "Link inválido ou já utilizado." });
        return;
      }
      if (!res.ok) {
        setUi({ kind: "error", message: "Erro ao carregar o QR. Tente recarregar a página." });
        return;
      }
      const data: ConnectResponse = await res.json();
      if (data.state === "open") {
        setUi({ kind: "connected" });
        return;
      }
      setUi({ kind: "qr", qr: data.base64, instanceName: data.instanceName, expiresAt: data.expiresAt });
      setSecondsLeft(60);
    } catch {
      setUi({ kind: "error", message: "Erro de rede. Verifique sua conexão." });
    }
  };

  useEffect(() => {
    void fetchQr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (ui.kind !== "qr") {
      if (tickTimer.current) clearInterval(tickTimer.current);
      if (refreshTimer.current) clearInterval(refreshTimer.current);
      return;
    }
    tickTimer.current = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    // Auto-regen aos 10s e aos 0s (igual o fluxo interno do dashboard)
    refreshTimer.current = setInterval(() => {
      void fetchQr();
    }, 50000);
    // Polling de status conectado
    const statusPoll = setInterval(() => {
      void fetchQr();
    }, 4000);
    return () => {
      if (tickTimer.current) clearInterval(tickTimer.current);
      if (refreshTimer.current) clearInterval(refreshTimer.current);
      clearInterval(statusPoll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.kind]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/40 to-white flex flex-col">
      <header className="border-b bg-white/95 px-4 py-4">
        <div className="container mx-auto flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-lg">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <span className="text-lg font-bold text-green-950">SimplesZap</span>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Conectar WhatsApp</CardTitle>
            <CardDescription>
              {ui.kind === "qr"
                ? `Escaneie o QR Code com o WhatsApp do número que vai usar a instância "${ui.instanceName}".`
                : ui.kind === "connected"
                ? "WhatsApp conectado com sucesso."
                : ui.kind === "error"
                ? "Não foi possível abrir esse link."
                : "Carregando..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {ui.kind === "loading" && <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />}

            {ui.kind === "qr" && ui.qr && (
              <>
                <img src={ui.qr} alt="QR Code" className="w-64 h-64" />
                <p className={`text-sm ${secondsLeft <= 10 ? "text-amber-600" : "text-muted-foreground"}`}>
                  {secondsLeft > 0 ? `Expira em ${secondsLeft}s · renova automaticamente` : "Renovando..."}
                </p>
                <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1 self-start">
                  <li>Abra o WhatsApp no celular</li>
                  <li>Toque em <strong>Configurações → Aparelhos conectados</strong></li>
                  <li>Toque em <strong>Conectar um aparelho</strong> e aponte a câmera pro QR</li>
                </ol>
              </>
            )}

            {ui.kind === "qr" && !ui.qr && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Gerando QR...
              </div>
            )}

            {ui.kind === "connected" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
                <p className="text-lg font-semibold">Conectado!</p>
                <p className="text-sm text-muted-foreground text-center">
                  Pode fechar essa janela. O sistema do remetente já recebeu a confirmação.
                </p>
              </div>
            )}

            {ui.kind === "error" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <AlertCircle className="h-12 w-12 text-amber-500" />
                <p className="text-sm text-muted-foreground text-center">{ui.message}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <footer className="text-center text-xs text-muted-foreground py-4">
        Powered by SimplesZap · simpleszap.com
      </footer>
    </div>
  );
}
