"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, RefreshCw, Trash, QrCode, AlertCircle, Share2, Copy, Loader2, CheckCircle2, Send, Flame, Clock, ListChecks, Siren } from "lucide-react";
import { WebhookOverrideDialog } from "@/components/dashboard/webhook-override-dialog";
import { InstanceUpsellFlow } from "@/components/dashboard/instance-upsell-flow";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { TableLoadingRows } from "@/components/ui/table-loading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export default function InstancesPage() {
  const { getToken, user } = useAuth();
  const router = useRouter();
  const orgId = user?.sub;
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrInstanceId, setQrInstanceId] = useState<string | null>(null);
  const [qrSecondsLeft, setQrSecondsLeft] = useState(60);
  const [qrLoading, setQrLoading] = useState(false);
  const [shareLink, setShareLink] = useState<{ url: string; expiresAt: string; ttlMinutes: number; instanceId: string } | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareConnected, setShareConnected] = useState(false);
  const [testInstanceId, setTestInstanceId] = useState<string | null>(null);
  const [upsell, setUpsell] = useState<{ open: boolean; limit: number; current: number }>({ open: false, limit: 1, current: 0 });
  const [webhookFor, setWebhookFor] = useState<{ id: string; name: string } | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testText, setTestText] = useState("✅ Teste de envio SimplesZap. Se você recebeu, está tudo OK!");
  const [testSending, setTestSending] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: instances, error, mutate } = useSWR(
    orgId ? ["/instances", orgId] : null,
    async ([url, oid]) => {
      const token = await getToken();
      return api.get(url, { headers: { "x-org-id": oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then(res => res.data);
    },
    { refreshInterval: qrInstanceId ? 0 : 15000 }
  );

  // Stats da fila por instância — pra badge "N na fila"
  const { data: queueStats } = useSWR(
    orgId ? ["/messages/queue/stats", orgId, "instances-page"] : null,
    async ([url, oid]) => {
      const token = await getToken();
      return api.get(url, { headers: { "x-org-id": oid as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then(res => res.data);
    },
    { refreshInterval: 5000 }
  );
  const pendingByInstance: Record<string, number> = Array.isArray(queueStats?.perInstance)
    ? queueStats.perInstance.reduce((acc: Record<string, number>, p: any) => { acc[p.instanceId] = p.pending; return acc; }, {})
    : {};

  const creatingRef = useRef(false);

  const handleCreate = async () => {
    // Guard sync contra double-click: setState do React é assíncrono,
    // o usuário consegue clicar 2x antes do botão re-renderizar como disabled.
    if (creatingRef.current) return;
    if (!newInstanceName.trim()) return;
    if (!orgId) return toast.error("Erro de autenticação.");
    creatingRef.current = true;
    setIsCreating(true);
    try {
      const token = await getToken();
      const res = await api.post(
        "/instance/create",
        { name: newInstanceName },
        { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      const instanceId = res.data?.instance?.id;
      toast.success("Instância criada! Escaneie o QR Code para conectar.");
      setIsCreateOpen(false);
      setNewInstanceName("");
      await mutate();
      if (instanceId) {
        // Abre o QR direto — user não precisa clicar em "Conectar" depois.
        // Pequeno delay pra dar tempo da Evolution API gerar o QR após a criação;
        // sem isso a 1ª chamada às vezes volta vazia e mostra toast "sem QR".
        setTimeout(() => { void fetchQr(instanceId); }, 1200);
      }
    } catch (e: any) {
      const err = e?.response?.data?.error;
      const code = typeof err === "object" ? err?.code : undefined;
      if (code === "PLAN_INSTANCE_LIMIT_REACHED") {
        // Fecha o dialog de criar e abre o fluxo de upsell (3 telas).
        setIsCreateOpen(false);
        setNewInstanceName("");
        setUpsell({
          open: true,
          limit: typeof err === "object" ? Number(err?.limit) || 1 : 1,
          current: typeof err === "object" ? Number(err?.current) || 1 : 1,
        });
      } else {
        const msg = (typeof err === "object" ? err?.message : err) || "Erro ao criar instância.";
        toast.error(typeof msg === "string" ? msg : "Erro ao criar instância.");
      }
    } finally {
      creatingRef.current = false;
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta instância?")) return;
    try {
      const token = await getToken();
      await api.delete(`/instance/${id}`, { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      toast.success("Instância removida.");
      mutate();
    } catch (e) {
      toast.error("Erro ao remover instância.");
    }
  };

  const fetchQr = useCallback(async (instanceName: string) => {
    setQrLoading(true);
    try {
      const token = await getToken();
      const res = await api.get(`/instance/qr/${instanceName}`, { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      const base64 = res.data?.base64 || res.data?.qrcode?.base64 || null;
      const state = res.data?.instance?.state;
      if (state === 'open') {
        setQrCode(null);
        setQrInstanceId(null);
        toast.success("Já conectado!");
        mutate();
        return true;
      }
      if (base64) {
        setQrCode(base64);
        setQrInstanceId(instanceName);
        setQrSecondsLeft(60);
        return true;
      }
      toast.info("Sem QR disponível. Tente novamente.");
      return false;
    } catch {
      toast.error("Erro ao gerar QR Code.");
      return false;
    } finally {
      setQrLoading(false);
    }
  }, [getToken, orgId, mutate]);

  const handleConnect = (instanceName: string) => {
    void fetchQr(instanceName);
  };

  const handleShareLink = async (instanceId: string) => {
    if (!orgId || sharingId) return;
    setSharingId(instanceId);
    try {
      const token = await getToken();
      const res = await api.post(
        `/instance/${instanceId}/connect-link`,
        {},
        { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      setShareLink({ url: res.data.url, expiresAt: res.data.expiresAt, ttlMinutes: res.data.ttlMinutes, instanceId });
      setShareConnected(false);
    } catch {
      toast.error("Erro ao gerar link de conexão.");
    } finally {
      setSharingId(null);
    }
  };

  const copyShareLink = async () => {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink.url).catch(() => {});
    toast.success("Link copiado!");
  };

  const handleTestSend = async () => {
    if (!orgId || !testInstanceId || testSending) return;
    if (!testPhone.trim()) return toast.error("Informe o número.");
    setTestSending(true);
    try {
      const token = await getToken();
      await api.post(
        `/message/sendText/${testInstanceId}`,
        { number: testPhone, text: testText },
        { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      toast.success("Mensagem de teste enviada! Confira no celular destinatário.");
      setTestInstanceId(null);
    } catch (e: any) {
      const err = e?.response?.data?.error;
      const msg = (typeof err === "object" ? err?.message : err) || "Falha ao enviar.";
      const code = typeof err === "object" ? err?.code : undefined;
      if (code === "NEED_SUBSCRIPTION" || code === "PLAN_DAILY_MESSAGE_LIMIT_REACHED") {
        toast.error(typeof msg === "string" ? msg : "Falha ao enviar.", {
          action: {
            label: "Ir pra Assinatura",
            onClick: () => router.push("/dashboard/subscription"),
          },
          duration: 10000,
        });
      } else {
        toast.error(typeof msg === "string" ? msg : "Falha ao enviar.");
      }
    } finally {
      setTestSending(false);
    }
  };

  // Countdown + connection polling + auto-regen do QR enquanto o modal estiver aberto.
  // Auto-regen: aos 10s restantes (proativo, evita race do scan no último segundo)
  // e aos 0s (fallback). Botão manual continua ativo pra forçar novo QR a qualquer momento.
  useEffect(() => {
    if (!qrInstanceId) {
      if (tickRef.current) clearInterval(tickRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      tickRef.current = null;
      pollRef.current = null;
      return;
    }
    let regenerating = false;
    tickRef.current = setInterval(() => {
      setQrSecondsLeft((s) => {
        const next = s > 0 ? s - 1 : 0;
        if ((next === 10 || next === 0) && !regenerating && qrInstanceId) {
          regenerating = true;
          void fetchQr(qrInstanceId).finally(() => { regenerating = false; });
        }
        return next;
      });
    }, 1000);
    pollRef.current = setInterval(async () => {
      const list = await mutate();
      const inst = Array.isArray(list) ? list.find((i: any) => i.id === qrInstanceId) : null;
      if (inst?.status === 'connected') {
        setQrCode(null);
        setQrInstanceId(null);
        toast.success("WhatsApp conectado!");
      }
    }, 3000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [qrInstanceId, mutate, fetchQr]);

  const handleRegenerate = () => {
    if (qrInstanceId) void fetchQr(qrInstanceId);
  };

  // Polling enquanto modal de Compartilhar está aberto: detecta quando a outra
  // ponta escaneia e conecta, e mostra estado "Conectado" no dashboard tb.
  useEffect(() => {
    if (!shareLink || shareConnected) return;
    const id = shareLink.instanceId;
    const poll = setInterval(async () => {
      const list = await mutate();
      const inst = Array.isArray(list) ? list.find((i: any) => i.id === id) : null;
      if (inst && (inst.status === 'connected' || inst.status === 'open')) {
        setShareConnected(true);
        toast.success("WhatsApp conectado pelo link!");
      }
    }, 3000);
    return () => clearInterval(poll);
  }, [shareLink, shareConnected, mutate]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Instâncias</h1>
          <p className="text-muted-foreground">
            Gerencie suas conexões do WhatsApp.
          </p>
        </div>
        <Dialog
          open={isCreateOpen}
          onOpenChange={(o) => {
            // Bloqueia fechar (clique fora, ESC) enquanto cria —
            // evita estado fantasma se o user abrir/fechar rápido.
            if (isCreating) return;
            setIsCreateOpen(o);
          }}
        >
          <DialogTrigger asChild>
            <Button disabled={!orgId}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Instância
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Instância</DialogTitle>
              <DialogDescription>Dê um nome para sua nova conexão.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={newInstanceName} onChange={(e) => setNewInstanceName(e.target.value)} placeholder="Ex: Atendimento" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? "Criando..." : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>Erro ao carregar instâncias. Verifique sua conexão e tente novamente.</p>
        </div>
      )}

      {(() => {
        const list: any[] = Array.isArray(instances) ? instances : [];
        if (list.length < 2) return null;
        const unpaid = list.filter((i) => i.subscriptionStatus !== "active");
        if (unpaid.length < 2) return null;
        // Mais antiga ainda usa o Free (100/dia). As demais sem subscription
        // ficam bloqueadas com NEED_SUBSCRIPTION (402).
        const sortedByCreated = [...unpaid].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        const free = sortedByCreated[0];
        const blocked = sortedByCreated.slice(1);
        return (
          <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5" />
            <div className="flex-1 text-sm text-amber-900">
              <p className="font-semibold mb-1">{blocked.length} instância(s) sem assinatura ativa</p>
              <p>
                Só a instância mais antiga (<strong>{free?.name}</strong>) usa o plano Free (100 msgs/dia).
                Pra liberar envio nas demais ({blocked.map((b) => b.name).join(", ")}),
                assine R$ 59/mês cada (inclui 300 msgs/dia por instância).
              </p>
            </div>
            <Link href="/dashboard/subscription">
              <Button size="sm" variant="outline" className="border-amber-400 text-amber-900 hover:bg-amber-100">
                Ir pra Assinatura
              </Button>
            </Link>
          </div>
        );
      })()}

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
                <TableHead>ID</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instances === undefined && !error && (
                <TableLoadingRows colSpan={4} />
              )}
              {instances?.map((inst: any) => {
                const pendingCount = pendingByInstance[inst.id] || 0;
                return (
                <TableRow key={inst.id}>
                  <TableCell className="font-medium">{inst.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <Badge variant={inst.status === 'open' || inst.status === 'connected' ? "default" : "outline"}
                             className={inst.status === 'open' || inst.status === 'connected' ? "bg-green-500 hover:bg-green-600" : "bg-yellow-50 text-yellow-700 border-yellow-200"}>
                        {inst.status === 'open' || inst.status === 'connected' ? 'Conectado' : inst.status}
                      </Badge>
                      {pendingCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                          <Clock className="h-3 w-3" /> {pendingCount} na fila
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{inst.id}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {(() => {
                      const connected = inst.status === 'open' || inst.status === 'connected';
                      return (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConnect(inst.id)}
                            disabled={connected}
                            title={connected ? 'Instância já conectada — não precisa escanear QR de novo. Use "Testar envio" pra verificar a integração.' : 'Abrir QR Code pra escanear no WhatsApp'}
                          >
                            <QrCode className="h-4 w-4 mr-1" /> Conectar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleShareLink(inst.id)}
                            disabled={sharingId === inst.id || connected}
                            title={connected ? 'Instância já conectada — link de pareamento remoto só faz sentido quando ainda não está conectada.' : 'Gerar link público pra alguém escanear o QR remotamente sem precisar de login.'}
                          >
                            {sharingId === inst.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Share2 className="h-4 w-4 mr-1" />
                            )}
                            Compartilhar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setTestInstanceId(inst.id); setTestPhone(""); }}
                            disabled={!connected}
                            title={connected ? 'Enviar mensagem de teste pra confirmar que a integração com o WhatsApp está OK.' : 'Conecte a instância (escaneie o QR) antes de testar o envio.'}
                          >
                            <Send className="h-4 w-4 mr-1" /> Testar envio
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            title="Ver mensagens enfileiradas e histórico desta instância"
                          >
                            <Link href={`/dashboard/messages?instance=${inst.id}`}>
                              <ListChecks className="h-4 w-4 mr-1" /> Ver fila
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            title="Aquecimento de número: grupos sugeridos e checklist pra reduzir risco de banimento"
                          >
                            <Link href={`/dashboard/instances/${inst.id}/aquecimento`}>
                              <Flame className="h-4 w-4 mr-1 text-orange-500" /> Aquecimento
                            </Link>
                          </Button>
                        </>
                      );
                    })()}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setWebhookFor({ id: inst.id, name: inst.name })}
                      title="Configurar webhook desta instância (override do global)"
                    >
                      <Siren className="h-4 w-4 mr-1" /> Webhook
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(inst.id)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                );
              })}
              {Array.isArray(instances) && instances.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                    Nenhuma instância encontrada. Clique em "Nova Instância" pra começar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {webhookFor && (
        <WebhookOverrideDialog
          open={!!webhookFor}
          onOpenChange={(o) => !o && setWebhookFor(null)}
          instanceId={webhookFor.id}
          instanceName={webhookFor.name}
        />
      )}

      <InstanceUpsellFlow
        open={upsell.open}
        onOpenChange={(o) => setUpsell((s) => ({ ...s, open: o }))}
        limit={upsell.limit}
        current={upsell.current}
      />

      {testInstanceId && (
        <Dialog open={!!testInstanceId} onOpenChange={(o) => { if (!o && !testSending) setTestInstanceId(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Testar envio</DialogTitle>
              <DialogDescription>
                Envia uma mensagem de teste pra um número escolhido. Útil pra confirmar que a integração está OK.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <Label>Número de destino</Label>
                <PhoneInput value={testPhone} onChange={setTestPhone} placeholder="11 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea value={testText} onChange={(e) => setTestText(e.target.value)} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTestInstanceId(null)} disabled={testSending}>Cancelar</Button>
              <Button onClick={handleTestSend} disabled={testSending || !testPhone.trim()}>
                {testSending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" /> Enviar teste</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {shareLink && (
        <Dialog open={!!shareLink} onOpenChange={(o) => !o && setShareLink(null)}>
          <DialogContent>
            {shareConnected ? (
              <>
                <DialogHeader>
                  <DialogTitle className="text-green-700">WhatsApp conectado!</DialogTitle>
                  <DialogDescription>
                    A pessoa que recebeu o link escaneou o QR com sucesso. A instância já está pronta pra uso.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="rounded-full bg-green-100 p-4">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">O link público foi invalidado automaticamente.</p>
                  <Button onClick={() => setShareLink(null)} className="mt-2">Fechar</Button>
                </div>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Link de conexão público</DialogTitle>
                  <DialogDescription>
                    Envie esse link pra quem vai escanear o QR. O link funciona sem login e expira em {shareLink.ttlMinutes} minutos
                    (ou assim que a conexão for feita).
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3 p-2">
                  <div className="flex items-center gap-2">
                    <Input value={shareLink.url} readOnly className="font-mono text-xs" />
                    <Button variant="outline" size="icon" onClick={copyShareLink} title="Copiar">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Aguardando conexão... · Expira em {new Date(shareLink.expiresAt).toLocaleString("pt-BR")}
                  </p>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}

      {qrCode && (
          <Dialog open={!!qrCode} onOpenChange={(o) => !o && (setQrCode(null), setQrInstanceId(null))}>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>Escaneie o QR Code</DialogTitle>
                      <DialogDescription>
                        WhatsApp → Aparelhos conectados → Conectar um aparelho.
                      </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col items-center gap-3 p-4">
                      <img src={qrCode} alt="QR Code" className="max-w-[250px]" />
                      <p className={`text-sm ${qrSecondsLeft <= 10 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {qrLoading ? "Renovando..." : qrSecondsLeft > 0 ? `Expira em ${qrSecondsLeft}s · renova automaticamente` : "Renovando..."}
                      </p>
                      <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={qrLoading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${qrLoading ? "animate-spin" : ""}`} />
                        {qrLoading ? "Gerando..." : "Gerar novo QR agora"}
                      </Button>
                  </div>
              </DialogContent>
          </Dialog>
      )}
    </div>
  );
}
