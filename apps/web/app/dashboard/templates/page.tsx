"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useMemo, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AlertCircle, Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { TableLoadingRows } from "@/components/ui/table-loading";
import { WhatsAppPreview } from "@/components/dashboard/whatsapp-preview";

const TEMPLATE_VARIABLES = [
  { label: "Nome do contato", value: "{{name}}" },
  { label: "Telefone do contato", value: "{{phone}}" },
] as const;

type Variant = "A" | "B" | "C";

export default function TemplatesPage() {
  const { getToken, user } = useAuth();
  const orgId = user?.sub;
  const refs = {
    A: useRef<HTMLTextAreaElement | null>(null),
    B: useRef<HTMLTextAreaElement | null>(null),
    C: useRef<HTMLTextAreaElement | null>(null),
  };

  const { data: templates, error: templatesError, mutate } = useSWR(
    orgId ? ["/templates", orgId] : null,
    async ([url, oid]) => {
      const token = await getToken();
      return api.get(url, { headers: { "x-org-id": oid, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then(res => res.data);
    }
  );

  const [name, setName] = useState("");
  const [variantA, setVariantA] = useState("");
  const [variantB, setVariantB] = useState("");
  const [variantC, setVariantC] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const variants: Record<Variant, { value: string; set: (s: string) => void }> = {
    A: { value: variantA, set: setVariantA },
    B: { value: variantB, set: setVariantB },
    C: { value: variantC, set: setVariantC },
  };

  // Validação client-side espelha backend: trim, todas preenchidas, todas diferentes
  const validation = useMemo(() => {
    const a = variantA.trim();
    const b = variantB.trim();
    const c = variantC.trim();
    const missing: Variant[] = [];
    if (!a) missing.push("A");
    if (!b) missing.push("B");
    if (!c) missing.push("C");
    const dupes: string[] = [];
    if (a && b && a === b) dupes.push("A=B");
    if (b && c && b === c) dupes.push("B=C");
    if (a && c && a === c) dupes.push("A=C");
    return {
      ok: missing.length === 0 && dupes.length === 0 && !!name.trim(),
      missing,
      dupes,
      missingName: !name.trim(),
    };
  }, [name, variantA, variantB, variantC]);

  const insertAt = (v: Variant, text: string) => {
    const ta = refs[v].current;
    const current = variants[v].value;
    if (!ta) {
      variants[v].set(current + text);
      return;
    }
    const start = ta.selectionStart ?? current.length;
    const end = ta.selectionEnd ?? current.length;
    const next = current.slice(0, start) + text + current.slice(end);
    variants[v].set(next);
    queueMicrotask(() => {
      ta.focus();
      const pos = start + text.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const add = async () => {
    if (creating) return;
    if (!orgId) return toast.error("Erro de autenticação");
    if (!validation.ok) {
      if (validation.missingName) return toast.error("Informe o nome do template");
      if (validation.missing.length) return toast.error(`Preencha as variantes faltando: ${validation.missing.join(", ")}`);
      if (validation.dupes.length) return toast.error(`Variantes não podem ser iguais: ${validation.dupes.join(", ")}`);
      return;
    }
    setCreating(true);
    try {
      const token = await getToken();
      await api.post(
        "/templates",
        { name: name.trim(), variantA: variantA.trim(), variantB: variantB.trim(), variantC: variantC.trim() },
        { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      setName(""); setVariantA(""); setVariantB(""); setVariantC("");
      mutate();
      toast.success("Template criado!");
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Erro ao criar template");
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string) => {
    if (!orgId || deletingId) return;
    if (!confirm("Excluir esse template? Campanhas que usam ele vão precisar de outro template.")) return;
    setDeletingId(id);
    try {
      const token = await getToken();
      await api.delete(`/templates/${id}`, { headers: { "x-org-id": orgId as string, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      mutate();
      toast.success("Template removido.");
    } catch { toast.error("Erro ao remover."); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
        <p className="text-muted-foreground">
          Crie templates com <strong>3 variantes diferentes</strong> de texto. O sistema sorteia entre A/B/C
          em cada envio — reduz risco de banimento do WhatsApp quando você dispara em massa.
        </p>
      </div>

      {templatesError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>Erro ao carregar templates. Verifique sua conexão e tente novamente.</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Novo Template</CardTitle>
          <CardDescription>
            As <strong>3 variantes são obrigatórias</strong> e devem ter conteúdos <strong>diferentes entre si</strong>.
            A Meta marca como spam mensagens idênticas enviadas pra muitos números — variar o texto reduz drasticamente o risco.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Nome do template</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Boas-vindas, Lembrete boleto, Aniversário..." />
            <p className="text-xs text-muted-foreground">Só pra você identificar. Os clientes não veem.</p>
          </div>

          {(["A", "B", "C"] as Variant[]).map((v) => {
            const isMissing = validation.missing.includes(v);
            const isDup =
              (v === "A" && (validation.dupes.includes("A=B") || validation.dupes.includes("A=C"))) ||
              (v === "B" && (validation.dupes.includes("A=B") || validation.dupes.includes("B=C"))) ||
              (v === "C" && (validation.dupes.includes("B=C") || validation.dupes.includes("A=C")));
            return (
              <div key={v} className="space-y-1">
                <Label className="flex items-center gap-2">
                  Variante {v}
                  {isMissing && <span className="text-xs text-amber-600">(faltando)</span>}
                  {isDup && <span className="text-xs text-red-600">(igual a outra variante)</span>}
                </Label>
                <Textarea
                  ref={refs[v]}
                  value={variants[v].value}
                  onChange={(e) => variants[v].set(e.target.value)}
                  placeholder={
                    v === "A" ? "Ex: Olá {{name}}, tudo bem? Queria te mostrar uma novidade." :
                    v === "B" ? "Ex: Oi {{name}}! Tenho uma coisa pra você dar uma olhada." :
                                "Ex: {{name}}, separei algo especial pra você."
                  }
                  rows={3}
                  className={isDup ? "border-red-400 focus-visible:ring-red-400" : ""}
                />
                <div className="flex gap-2 flex-wrap">
                  {TEMPLATE_VARIABLES.map((tv) => (
                    <Button
                      key={tv.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertAt(v, tv.value)}
                    >
                      + {tv.label}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Previews ao vivo: 1 celular pra cada variante */}
          <div className="rounded-xl border border-zinc-200 bg-gradient-to-b from-zinc-50 to-zinc-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-800">Preview no WhatsApp</h3>
                <p className="text-xs text-zinc-500">Como o cliente vai ver cada variante. Variáveis substituídas por exemplo.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 justify-items-center">
              <WhatsAppPreview text={variantA} variant="A" />
              <WhatsAppPreview text={variantB} variant="B" />
              <WhatsAppPreview text={variantC} variant="C" />
            </div>
          </div>

          {!validation.ok && (variantA || variantB || variantC || name) && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                {validation.missingName && <p>• Informe o nome do template</p>}
                {validation.missing.length > 0 && <p>• Preencha as variantes: {validation.missing.join(", ")}</p>}
                {validation.dupes.length > 0 && <p>• Variantes não podem ser iguais: {validation.dupes.join(", ")} (use textos diferentes)</p>}
              </div>
            </div>
          )}

          <div>
            <Button
              onClick={add}
              disabled={creating || !validation.ok}
              title={validation.ok ? "Criar template" : "Preencha nome + 3 variantes diferentes"}
            >
              {creating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...</>
              ) : "Adicionar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Variantes (preview)</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates === undefined && !templatesError && (
                <TableLoadingRows colSpan={3} />
              )}
              {templates?.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium align-top">{t.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground space-y-1 align-top">
                    <div><span className="font-semibold text-foreground">A:</span> {t.variantA?.slice(0, 80)}{t.variantA?.length > 80 ? "…" : ""}</div>
                    <div><span className="font-semibold text-foreground">B:</span> {t.variantB?.slice(0, 80)}{t.variantB?.length > 80 ? "…" : ""}</div>
                    <div><span className="font-semibold text-foreground">C:</span> {t.variantC?.slice(0, 80)}{t.variantC?.length > 80 ? "…" : ""}</div>
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => remove(t.id)}
                      disabled={deletingId === t.id}
                      title="Excluir template"
                    >
                      {deletingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {Array.isArray(templates) && templates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                    Nenhum template ainda. Crie o primeiro acima — sem ele você não consegue criar campanhas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
