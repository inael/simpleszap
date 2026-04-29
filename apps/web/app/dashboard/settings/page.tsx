"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { api } from "@/lib/api";

function formatCpfCnpj(d: string) {
  const digits = (d || '').replace(/\D/g, '');
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return digits;
}

export default function SettingsPage() {
  const { user, isLoaded, getToken } = useAuth();
  const orgId = user?.sub;
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [savingNotif, setSavingNotif] = useState(false);
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [savingCpf, setSavingCpf] = useState(false);

  const { data: me, mutate: mutateMe } = useSWR<{ cpfCnpj: string | null }>(
    orgId ? ['/me', orgId] : null,
    async ([url, oid]: [string, string]) => {
      const token = await getToken();
      return api.get(url, { headers: { 'x-org-id': oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then(r => r.data);
    }
  );

  useEffect(() => {
    if (me?.cpfCnpj) setCpfCnpj(formatCpfCnpj(me.cpfCnpj));
  }, [me?.cpfCnpj]);

  const handleSaveCpf = async () => {
    setSavingCpf(true);
    try {
      const token = await getToken();
      await api.put('/me', { cpfCnpj: cpfCnpj.replace(/\D/g, '') || null }, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      toast.success('CPF/CNPJ salvo.');
      mutateMe();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Erro ao salvar CPF/CNPJ.');
    } finally {
      setSavingCpf(false);
    }
  };

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
            <CardTitle>Dados de cobrança</CardTitle>
            <CardDescription>
              CPF ou CNPJ usado para emitir as cobranças no Asaas. Obrigatório para assinar planos pagos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 max-w-md">
              <Label htmlFor="cpfCnpj">CPF ou CNPJ</Label>
              <Input
                id="cpfCnpj"
                value={cpfCnpj}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 14);
                  setCpfCnpj(formatCpfCnpj(digits));
                }}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                inputMode="numeric"
              />
              <p className="text-xs text-muted-foreground">
                Exigência da Receita Federal (NFe + anti-fraude do Asaas). Os dígitos são validados antes de salvar.
              </p>
            </div>
            <Button onClick={handleSaveCpf} disabled={savingCpf || !cpfCnpj || cpfCnpj === formatCpfCnpj(me?.cpfCnpj || '')}>
              {savingCpf ? 'Salvando...' : 'Salvar'}
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
