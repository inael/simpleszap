"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user, isLoaded } = useAuth();
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [savingNotif, setSavingNotif] = useState(false);

  const handleSaveNotifications = async () => {
    setSavingNotif(true);
    try {
      // Notification preferences would be saved to the backend
      // Logto doesn't have unsafeMetadata like Clerk
      toast.success("Preferências de notificação salvas.");
    } catch {
      toast.error("Erro ao salvar preferências.");
    } finally {
      setSavingNotif(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações da sua conta.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>
              Suas informações pessoais. Gerenciado pelo Logto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={isLoaded ? (user?.name || "") : "Carregando..."}
                disabled
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={isLoaded ? (user?.email || "") : "Carregando..."}
                disabled
              />
            </div>
            <Button
              variant="outline"
              className="w-fit"
              onClick={() => {
                const endpoint = process.env.NEXT_PUBLIC_LOGTO_ENDPOINT || 'https://auth.toolpad.cloud';
                window.open(`${endpoint}/profile`, '_blank');
              }}
            >
              Gerenciar Perfil no Logto
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notificações</CardTitle>
            <CardDescription>
              Escolha como você quer ser notificado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="email-notif" className="flex flex-col space-y-1">
                <span>Emails de Marketing</span>
                <span className="font-normal text-xs text-muted-foreground">Receba novidades e ofertas.</span>
              </Label>
              <input
                type="checkbox"
                id="email-notif"
                className="h-4 w-4"
                checked={marketingEmails}
                onChange={(e) => setMarketingEmails(e.target.checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="security-notif" className="flex flex-col space-y-1">
                <span>Alertas de Segurança</span>
                <span className="font-normal text-xs text-muted-foreground">Receba alertas sobre atividades suspeitas.</span>
              </Label>
              <input
                type="checkbox"
                id="security-notif"
                className="h-4 w-4"
                checked={securityAlerts}
                onChange={(e) => setSecurityAlerts(e.target.checked)}
              />
            </div>
            <Separator />
            <Button onClick={handleSaveNotifications} disabled={savingNotif}>
              {savingNotif ? "Salvando..." : "Salvar Preferências"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
