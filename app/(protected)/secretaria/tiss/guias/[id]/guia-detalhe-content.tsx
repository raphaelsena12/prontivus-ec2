"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, FileText, Plus, Trash2, CheckCircle, Search } from "lucide-react";
import { toast } from "sonner";

interface CodigoTuss { id: string; codigoTuss: string; descricao: string }
interface Procedimento {
  id: string; codigoTussId: string; quantidade: number;
  valorUnitario: string; valorTotal: string; codigoTuss: CodigoTuss;
}
interface Guia {
  id: string; numeroGuia: string | null; tipoGuia: string; status: string;
  dataAtendimento: string; numeroCarteirinha: string; observacoes: string | null;
  paciente: { id: string; nome: string; cpf: string };
  operadora: { id: string; codigoAns: string; razaoSocial: string };
  planoSaude: { id: string; nome: string } | null;
  lote: { id: string; numeroLote: string; status: string } | null;
  procedimentos: Procedimento[];
}

const STATUS_LABELS: Record<string, string> = {
  RASCUNHO: "Rascunho", VALIDADA: "Validada", LOTE: "Em Lote", GERADA: "XML Gerado", ENVIADA: "Enviada",
};
const STATUS_CLASSES: Record<string, string> = {
  RASCUNHO: "bg-transparent border-yellow-500 text-yellow-700 text-[10px] py-0.5 px-1.5 leading-tight",
  VALIDADA: "bg-transparent border-green-500 text-green-700 text-[10px] py-0.5 px-1.5 leading-tight",
  LOTE:     "bg-transparent border-blue-500 text-blue-700 text-[10px] py-0.5 px-1.5 leading-tight",
  GERADA:   "bg-transparent border-purple-500 text-purple-700 text-[10px] py-0.5 px-1.5 leading-tight",
  ENVIADA:  "bg-transparent border-gray-500 text-gray-700 text-[10px] py-0.5 px-1.5 leading-tight",
};
const TIPO_LABELS: Record<string, string> = {
  CONSULTA: "Guia de Consulta", SPSADT: "Guia SP/SADT", INTERNACAO: "Guia de Internação", HONORARIO: "Guia de Honorário",
};

export function GuiaDetalheContent({ id }: { id: string }) {
  const router = useRouter();
  const [guia, setGuia] = useState<Guia | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [tussOptions, setTussOptions] = useState<CodigoTuss[]>([]);
  const [tussSearch, setTussSearch] = useState("");
  const [selectedTuss, setSelectedTuss] = useState<CodigoTuss | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [valorUnitario, setValorUnitario] = useState("");
  const [addingProc, setAddingProc] = useState(false);

  const fetchGuia = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/secretaria/tiss/guias/${id}`);
      if (!res.ok) { router.push("/secretaria/tiss/guias"); return; }
      setGuia(await res.json());
    } finally { setLoading(false); }
  }, [id, router]);

  useEffect(() => { fetchGuia(); }, [fetchGuia]);

  const searchTuss = useCallback(async (q: string) => {
    const res = await fetch(`/api/secretaria/tiss/dados?tipo=tuss&q=${encodeURIComponent(q)}`);
    setTussOptions(await res.json());
  }, []);

  useEffect(() => { if (tussSearch.length >= 2) searchTuss(tussSearch); }, [tussSearch, searchTuss]);

  const handleAddProcedimento = async () => {
    if (!selectedTuss || !valorUnitario) return;
    const vu = parseFloat(valorUnitario);
    setAddingProc(true);
    try {
      const res = await fetch(`/api/secretaria/tiss/guias/${id}/procedimentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigoTussId: selectedTuss.id, quantidade, valorUnitario: vu, valorTotal: vu * quantidade }),
      });
      if (res.ok) {
        toast.success("Procedimento adicionado");
        setAddOpen(false); setSelectedTuss(null); setQuantidade(1);
        setValorUnitario(""); setTussSearch(""); setTussOptions([]);
        fetchGuia();
      } else toast.error("Erro ao adicionar procedimento");
    } finally { setAddingProc(false); }
  };

  const handleRemover = async (procId: string) => {
    if (!confirm("Remover este procedimento?")) return;
    const res = await fetch(`/api/secretaria/tiss/guias/${id}/procedimentos/${procId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Procedimento removido"); fetchGuia(); }
    else toast.error("Erro ao remover procedimento");
  };

  const handleValidar = async () => {
    setValidating(true);
    try {
      const res = await fetch(`/api/secretaria/tiss/guias/${id}/validar`, { method: "POST" });
      const data = await res.json();
      if (data.valida) { toast.success("Guia validada com sucesso"); fetchGuia(); }
      else toast.error("Erros: " + (data.erros ?? []).join(", "));
    } finally { setValidating(false); }
  };

  if (loading) {
    return (
      <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground">Carregando guia...</span>
        </div>
      </div>
    );
  }
  if (!guia) return null;

  const canEdit = !["ENVIADA", "LOTE", "GERADA"].includes(guia.status);
  const totalGuia = guia.procedimentos.reduce((acc, p) => acc + parseFloat(p.valorTotal), 0);

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={FileText}
        title={TIPO_LABELS[guia.tipoGuia] ?? guia.tipoGuia}
        subtitle={`Nº ${guia.numeroGuia ?? "—"} · ${guia.paciente.nome}`}
      >
        <Button variant="ghost" size="sm" className="text-xs h-8"
          onClick={() => router.push("/secretaria/tiss/guias")}>
          <ArrowLeft className="mr-1 h-3 w-3" /> Voltar
        </Button>
        <Badge variant="outline" className={STATUS_CLASSES[guia.status] ?? STATUS_CLASSES.RASCUNHO}>
          {STATUS_LABELS[guia.status] ?? guia.status}
        </Badge>
        {guia.status === "RASCUNHO" && (
          <Button size="sm" className="h-8 text-xs gap-1" disabled={validating} onClick={handleValidar}>
            <CheckCircle className="h-3 w-3" />
            {validating ? "Validando..." : "Validar Guia"}
          </Button>
        )}
      </PageHeader>

      {/* Dados */}
      <div className="overflow-hidden rounded-lg border mb-5">
        <div className="bg-muted px-4 py-2 border-b">
          <span className="text-xs font-semibold">Informações da Guia</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 divide-x divide-y">
          <div className="px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Paciente</p>
            <p className="text-xs font-medium">{guia.paciente.nome}</p>
            <p className="text-xs text-muted-foreground">CPF: {guia.paciente.cpf}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Operadora</p>
            <p className="text-xs font-medium">{guia.operadora.razaoSocial}</p>
            <p className="text-xs text-muted-foreground">ANS: {guia.operadora.codigoAns}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Carteirinha</p>
            <p className="text-xs font-medium">{guia.numeroCarteirinha}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Data de Atendimento</p>
            <p className="text-xs font-medium">
              {format(new Date(guia.dataAtendimento), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
          {guia.planoSaude && (
            <div className="px-4 py-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Plano</p>
              <p className="text-xs font-medium">{guia.planoSaude.nome}</p>
            </div>
          )}
          {guia.lote && (
            <div className="px-4 py-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Lote</p>
              <p className="text-xs font-medium">#{guia.lote.numeroLote}</p>
            </div>
          )}
          {guia.observacoes && (
            <div className="px-4 py-3 col-span-2 md:col-span-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Observações</p>
              <p className="text-xs">{guia.observacoes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Procedimentos */}
      <div className="flex flex-col">
        <div className="flex items-center justify-end gap-2 pb-3">
          <span className="text-xs font-semibold mr-auto">Procedimentos ({guia.procedimentos.length})</span>
          {canEdit && (
            <Button size="sm" className="h-8 text-xs" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1 h-3 w-3" /> Adicionar Procedimento
            </Button>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="text-xs font-semibold py-3">Código TUSS</TableHead>
                <TableHead className="text-xs font-semibold py-3">Descrição</TableHead>
                <TableHead className="text-xs font-semibold py-3 text-center">Qtd.</TableHead>
                <TableHead className="text-xs font-semibold py-3 text-right">Valor Unit.</TableHead>
                <TableHead className="text-xs font-semibold py-3 text-right">Total</TableHead>
                {canEdit && <TableHead className="py-3" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {guia.procedimentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 6 : 5} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-10 w-10 text-muted-foreground opacity-50" />
                      <span className="text-xs text-muted-foreground">Nenhum procedimento adicionado</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {guia.procedimentos.map((proc) => (
                    <TableRow key={proc.id} className="hover:bg-muted/50">
                      <TableCell className="text-xs py-3 font-mono font-semibold text-primary">
                        {proc.codigoTuss.codigoTuss}
                      </TableCell>
                      <TableCell className="text-xs py-3">{proc.codigoTuss.descricao}</TableCell>
                      <TableCell className="text-xs py-3 text-center">{proc.quantidade}</TableCell>
                      <TableCell className="text-xs py-3 text-right">
                        R$ {parseFloat(proc.valorUnitario).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs py-3 text-right font-medium">
                        R$ {parseFloat(proc.valorTotal).toFixed(2)}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-xs py-3 text-right">
                          <Button variant="outline" size="sm"
                            className="h-7 text-xs text-red-500 hover:text-red-600 hover:border-red-300"
                            onClick={() => handleRemover(proc.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={canEdit ? 4 : 4} className="text-xs py-3 text-right font-semibold">
                      Total Geral:
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right font-bold text-primary">
                      R$ {totalGuia.toFixed(2)}
                    </TableCell>
                    {canEdit && <TableCell />}
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog: Adicionar */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Adicionar Procedimento TUSS</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Código TUSS *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código ou descrição..."
                  value={tussSearch}
                  className="pl-9 text-xs h-9"
                  onChange={(e) => {
                    setTussSearch(e.target.value);
                    if (e.target.value.length >= 2) searchTuss(e.target.value);
                    if (selectedTuss) setSelectedTuss(null);
                  }}
                />
                {tussOptions.length > 0 && tussSearch.length >= 2 && !selectedTuss && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {tussOptions.map((t) => (
                      <button key={t.id} type="button"
                        className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex gap-2"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedTuss(t);
                          setTussSearch(`${t.codigoTuss} — ${t.descricao}`);
                          setTussOptions([]);
                        }}>
                        <span className="font-mono font-semibold text-primary shrink-0">{t.codigoTuss}</span>
                        <span className="text-muted-foreground truncate">{t.descricao}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedTuss && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>Selecionado: <strong className="text-primary">{selectedTuss.codigoTuss}</strong> — {selectedTuss.descricao}</span>
                  <button type="button" className="text-red-500 underline text-xs"
                    onClick={() => { setSelectedTuss(null); setTussSearch(""); setTussOptions([]); }}>
                    Limpar
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Quantidade *</Label>
                <Input type="number" min={1} value={quantidade} className="h-9 text-xs"
                  onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valor Unitário (R$) *</Label>
                <Input type="number" min={0} step={0.01} value={valorUnitario} className="h-9 text-xs"
                  onChange={(e) => setValorUnitario(e.target.value)} placeholder="0,00" />
              </div>
            </div>
            {valorUnitario && quantidade > 0 && (
              <div className="rounded-lg bg-muted px-3 py-2">
                <span className="text-xs text-muted-foreground">Total: </span>
                <span className="text-xs font-bold text-primary">
                  R$ {(parseFloat(valorUnitario || "0") * quantidade).toFixed(2)}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button size="sm" className="text-xs h-8" onClick={handleAddProcedimento}
              disabled={!selectedTuss || !valorUnitario || addingProc}>
              {addingProc ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
