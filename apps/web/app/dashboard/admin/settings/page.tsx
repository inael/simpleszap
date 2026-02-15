"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import useSWR from "swr";
import { useAdminApi } from "@/lib/use-admin-api";

export default function AdminSettingsPage() {
  const { adminFetcher } = useAdminApi();
  const { data, isLoading } = useSWR("/admin/settings", adminFetcher);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Configurações do Sistema</h1>
        <p className="text-muted-foreground">
          Configurações globais da plataforma.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Evolution API</CardTitle>
              <CardDescription>Configuração da integração com WhatsApp.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={data?.evolutionApiUrl === "não configurado" ? "destructive" : "default"}>
                  {data?.evolutionApiUrl}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plano Padrão</CardTitle>
              <CardDescription>Plano atribuído automaticamente a novos usuários.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                ID do plano: <code className="bg-muted px-2 py-1 rounded">{data?.defaultPlanId}</code>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Modo Manutenção</CardTitle>
              <CardDescription>Quando ativo, usuários não conseguem acessar o sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant={data?.maintenanceMode ? "destructive" : "secondary"}>
                {data?.maintenanceMode ? "Ativo" : "Desativado"}
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
