"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import { toast } from "sonner";

export default function MessagesPage() {
  const { userId } = useAuth();
  const [selectedInstance, setSelectedInstance] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const { data: instances } = useSWR(
    userId ? ["/instances", userId] : null,
    ([url, uid]) => api.get(url, { headers: { "x-user-id": uid } }).then(res => res.data)
  );

  const handleSend = async () => {
    if (!selectedInstance || !phone || !message) {
      toast.error("Preencha todos os campos.");
      return;
    }

    setSending(true);
    try {
      await api.post(`/message/sendText/${selectedInstance}`, {
        number: phone,
        text: message
      }, { headers: { "x-user-id": userId } });
      toast.success("Mensagem enviada!");
      setMessage("");
    } catch (e) {
      toast.error("Erro ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Mensagens</h1>
        <p className="text-muted-foreground">
          Envie mensagens e veja o histórico.
        </p>
      </div>

      <Tabs defaultValue="send" className="space-y-4">
        <TabsList>
          <TabsTrigger value="send">Enviar Mensagem</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>
        <TabsContent value="send" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Nova Mensagem</CardTitle>
                <CardDescription>
                  Envie uma mensagem de texto simples ou com mídia.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="instance">Instância</Label>
                  <Select value={selectedInstance} onValueChange={setSelectedInstance}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma instância" />
                    </SelectTrigger>
                    <SelectContent>
                      {instances?.map((inst: any) => (
                        <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Número (com DDD)</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5511999999999" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Digite sua mensagem aqui..."
                    className="min-h-[100px]"
                  />
                </div>
                <Button className="w-full" onClick={handleSend} disabled={sending}>
                  <Send className="mr-2 h-4 w-4" /> {sending ? "Enviando..." : "Enviar Mensagem"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Envios</CardTitle>
              <CardDescription>
                Registro das últimas mensagens enviadas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10 text-muted-foreground">
                Nenhuma mensagem enviada ainda.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
