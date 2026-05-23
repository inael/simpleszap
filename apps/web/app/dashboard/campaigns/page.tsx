"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useSWR from "swr";
import { api } from "@/lib/api";
import axios from "axios";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertCircle, Loader2, Search, Users, UserPlus } from "lucide-react";
import { TableLoadingRows } from "@/components/ui/table-loading";
import { ListLoadingSkeleton } from "@/components/ui/list-loading";
import { useMemo } from "react";

export default function CampaignsPage() {
  const { getToken, user } = useAuth();
  const orgId = user?.sub;
  const { data: campaigns, error: campaignsError, mutate } = useSWR(
    orgId ? ["/campaigns", orgId] : null,
    async ([url, oid]) => {
      const token = await getToken();
      return api.get(url, { headers: { "x-org-id": oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then(res => res.data);
    }
  );
  const { data: instances, error: instancesError } = useSWR(
    orgId ? ["/instances", orgId, "campaigns"] : null,
    async ([url, oid]) => {
      const token = await getToken();
      return api.get(url, { headers: { "x-org-id": oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then(res => res.data);
    }
  );
  const { data: templates, error: templatesError } = useSWR(
    orgId ? ["/templates", orgId, "campaigns"] : null,
    async ([url, oid]) => {
      const token = await getToken();
      return api.get(url, { headers: { "x-org-id": oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then(res => res.data);
    }
  );
  const { data: contacts } = useSWR<Array<{ id: string; name: string | null; phone: string; tags: string | null }>>(
    orgId ? ["/contacts", orgId, "campaigns"] : null,
    async ([url, oid]: [string, string, string]) => {
      const token = await getToken();
      return api.get(url, { headers: { "x-org-id": oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then(res => res.data);
    }
  );

  const [name, setName] = useState("");
  const [instanceId, setInstanceId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");

  // Tags únicas pra dropdown de filtro
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const c of contacts || []) {
      const tags = c.tags ? (() => { try { return JSON.parse(c.tags) as string[]; } catch { return []; } })() : [];
      for (const t of tags) if (t) set.add(t);
    }
    return Array.from(set).sort();
  }, [contacts]);

  // Lista filtrada por search + tag
  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    return (contacts || []).filter((c) => {
      if (q) {
        const hay = `${c.name || ""} ${c.phone}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (tagFilter !== "all") {
        const tags = c.tags ? (() => { try { return JSON.parse(c.tags) as string[]; } catch { return []; } })() : [];
        if (!tags.includes(tagFilter)) return false;
      }
      return true;
    });
  }, [contacts, contactSearch, tagFilter]);

  const toggleContact = (id: string) => {
    setSelectedContactIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const selectAllFiltered = () => {
    setSelectedContactIds((prev) => Array.from(new Set([...prev, ...filteredContacts.map((c) => c.id)])));
  };
  const clearSelection = () => setSelectedContactIds([]);
  const [validationError, setValidationError] = useState("");
  const [creating, setCreating] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  const create = async () => {
    setValidationError("");
    if (!name) { setValidationError("Informe o nome da campanha"); return; }
    if (!instanceId) { setValidationError("Selecione uma instância para criar a campanha"); return; }
    if (!templateId) { setValidationError("Selecione um template"); return; }
    if (selectedContactIds.length === 0) { setValidationError("Selecione pelo menos 1 destinatário"); return; }
    if (creating) return;
    setCreating(true);
    try {
      const token = await getToken();
      await api.post("/campaigns", {
        name,
        instanceId,
        templateId,
        contactIds: selectedContactIds,
      }, { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      setName(""); setInstanceId(""); setTemplateId("");
      setSelectedContactIds([]);
      setContactSearch(""); setTagFilter("all");
      mutate();
      toast.success("Campanha criada");
    } catch {
      toast.error("Erro ao criar campanha");
    } finally {
      setCreating(false);
    }
  };

  const run = async (id: string) => {
    if (runningId) return;
    setRunningId(id);
    try {
      const token = await getToken();
      await api.post(`/campaigns/${id}/run`, {}, { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      mutate();
      toast.success("Campanha executada");
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 403 && e.response?.data?.error === "terms_required") {
        toast.error("Aceite os termos em Envio em massa (config) antes de executar.");
        return;
      }
      toast.error("Erro na execução");
    } finally {
      setRunningId(null);
    }
  };

  const loadError = campaignsError || instancesError || templatesError;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campanhas</h1>
          <p className="text-muted-foreground">Crie e execute envios em massa.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/campaigns/settings">Envio em massa (anti-ban) e termos</Link>
        </Button>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>Erro ao carregar dados. Verifique sua conexão e tente novamente.</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Nova Campanha</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-2">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Instância</Label>
            <Select value={instanceId} onValueChange={setInstanceId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {instances?.map((i: any) => {
                  const ready = i.status === 'connected' || i.status === 'open';
                  return (
                    <SelectItem key={i.id} value={i.id} disabled={!ready}>
                      <span className="flex items-center gap-2">
                        <span>{i.name}</span>
                        <span className={`text-[10px] uppercase tracking-wide ${ready ? 'text-green-600' : 'text-amber-600'}`}>
                          {ready ? '✓ conectado' : `· ${i.status || 'aguardando'}`}
                        </span>
                      </span>
                    </SelectItem>
                  );
                })}
                {!instances?.length && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma instância. Crie uma em Instâncias.</div>
                )}
              </SelectContent>
            </Select>
            {instances && instances.length > 0 && !instances.some((i: any) => i.status === 'connected' || i.status === 'open') && (
              <p className="text-xs text-amber-600">⚠ Conecte uma instância em <a href="/dashboard/instances" className="underline">Instâncias</a> antes de criar campanha.</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Template (obrigatório)</Label>
            {Array.isArray(templates) && templates.length === 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 space-y-2">
                <p>Você ainda não tem nenhum template. Toda campanha precisa de um template com 3 variantes (anti-banimento WhatsApp).</p>
                <Link href="/dashboard/templates" className="inline-flex items-center gap-1 font-semibold underline">
                  Criar template agora →
                </Link>
              </div>
            ) : (
              <>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((t: any) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Cada mensagem da campanha sorteia entre as 3 variantes do template — protege contra detecção de spam.{" "}
                  <Link href="/dashboard/templates" className="underline">Gerenciar templates</Link>
                </p>
              </>
            )}
          </div>
          <div className="md:col-span-4 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Destinatários
              </Label>
              <p className="text-xs text-muted-foreground">
                <strong>{selectedContactIds.length}</strong> selecionado(s) de {contacts?.length ?? 0} contato(s)
              </p>
            </div>

            {Array.isArray(contacts) && contacts.length === 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-2">
                <p>Você ainda não tem nenhum contato cadastrado. A campanha precisa de pelo menos 1 destinatário.</p>
                <Link href="/dashboard/contacts" className="inline-flex items-center gap-1 font-semibold underline">
                  <UserPlus className="h-4 w-4" /> Configurar contatos →
                </Link>
              </div>
            ) : (
              <>
                <div className="flex gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      placeholder="Buscar por nome ou telefone..."
                      className="flex-1"
                    />
                  </div>
                  <Select value={tagFilter} onValueChange={setTagFilter}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as tags</SelectItem>
                      {availableTags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="sm" onClick={selectAllFiltered}>
                    Selecionar visíveis ({filteredContacts.length})
                  </Button>
                  {selectedContactIds.length > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={clearSelection}>
                      Limpar ({selectedContactIds.length})
                    </Button>
                  )}
                </div>

                <div className="border rounded-md max-h-[280px] overflow-y-auto divide-y">
                  {contacts === undefined ? (
                    <div className="p-3"><ListLoadingSkeleton rows={3} lines={2} /></div>
                  ) : filteredContacts.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground text-center">Nenhum contato bate com esse filtro.</p>
                  ) : filteredContacts.map((c) => {
                    const checked = selectedContactIds.includes(c.id);
                    const tags = c.tags ? (() => { try { return JSON.parse(c.tags) as string[]; } catch { return []; } })() : [];
                    return (
                      <label key={c.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40 text-sm">
                        <input type="checkbox" checked={checked} onChange={() => toggleContact(c.id)} className="h-4 w-4" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{c.name || "(sem nome)"}</div>
                          <div className="text-xs text-muted-foreground font-mono">{c.phone}</div>
                        </div>
                        {tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {tags.slice(0, 3).map((t) => (
                              <span key={t} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{t}</span>
                            ))}
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="md:col-span-4 flex flex-col gap-2">
            {validationError && <p className="text-sm text-red-600">{validationError}</p>}
            <Button
              onClick={create}
              disabled={
                creating ||
                !templateId ||
                selectedContactIds.length === 0 ||
                !instances?.some((i: any) => i.id === instanceId && (i.status === 'connected' || i.status === 'open'))
              }
              title={
                !templateId ? "Selecione um template (obrigatório)" :
                selectedContactIds.length === 0 ? "Selecione pelo menos 1 destinatário" :
                !instances?.some((i: any) => i.id === instanceId && (i.status === 'connected' || i.status === 'open')) ? "Conecte uma instância antes" :
                `Criar campanha para ${selectedContactIds.length} contato(s)`
              }
            >
              {creating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...</>
              ) : (
                "Criar"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Campanhas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns === undefined && !campaignsError && (
                <TableLoadingRows colSpan={3} />
              )}
              {campaigns?.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.status}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" onClick={() => run(c.id)} disabled={runningId === c.id}>
                      {runningId === c.id ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Executando...</>
                      ) : (
                        "Executar"
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {Array.isArray(campaigns) && campaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">Nenhuma campanha</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
