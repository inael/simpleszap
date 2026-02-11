import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Copy, Trash } from "lucide-react";

export default function ApiKeysPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chaves de API</h1>
          <p className="text-muted-foreground">
            Gerencie as chaves de acesso para integração via API.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova Chave
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suas Chaves</CardTitle>
          <CardDescription>
            Use estas chaves para autenticar suas requisições na nossa API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Chave (Prefixo)</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead>Último uso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Padrão</TableCell>
                <TableCell className="font-mono text-xs">sz_live_...</TableCell>
                <TableCell>10/02/2026</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-right flex justify-end gap-2">
                  <Button variant="ghost" size="icon">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                    <Trash className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
