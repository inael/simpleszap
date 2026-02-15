"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import useSWR from "swr";
import { useAdminApi } from "@/lib/use-admin-api";

export default function AdminAuditLogsPage() {
  const { adminFetcher } = useAdminApi();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSWR(
    `/admin/audit-logs?page=${page}&limit=50`,
    adminFetcher
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Logs de Auditoria</h1>
        <p className="text-muted-foreground">
          Registro de todas as ações realizadas no sistema.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Organização</TableHead>
                    <TableHead>Ator</TableHead>
                    <TableHead>Dados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.logs?.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{log.action}</TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {log.orgId}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.actorId || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {log.data || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data?.logs?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum log encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {data?.pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Página {data.page} de {data.pages} ({data.total} registros)
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
