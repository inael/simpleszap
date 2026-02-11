"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
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
              Suas informações pessoais. Gerenciado pelo Clerk.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" defaultValue="Usuário Exemplo" disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" defaultValue="usuario@exemplo.com" disabled />
            </div>
            <Button variant="outline" className="w-fit" onClick={() => window.location.href = "/user-profile"}>
              Gerenciar Perfil no Clerk
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
              {/* Switch component not installed yet, using checkbox as placeholder or nothing */}
              <input type="checkbox" id="email-notif" className="h-4 w-4" />
            </div>
            <Separator />
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="security-notif" className="flex flex-col space-y-1">
                <span>Alertas de Segurança</span>
                <span className="font-normal text-xs text-muted-foreground">Receba alertas sobre atividades suspeitas.</span>
              </Label>
              <input type="checkbox" id="security-notif" className="h-4 w-4" checked readOnly />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
