import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function InstancesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Instâncias</h1>
          <p className="text-muted-foreground">
            Gerencie suas conexões do WhatsApp.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova Instância
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suas Instâncias</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Principal</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    Desconectada
                  </Badge>
                </TableCell>
                <TableCell>-</TableCell>
                <TableCell>10/02/2026</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    Gerenciar
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
