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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/page-header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Layers, Plus, Eye, Download, FileCode, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface GuiaResumida { id: string; numeroGuia: string | null; tipoGuia: string; status: string }
interface Lote {
  id: string; numeroLote: string; status: string;
  dataGeracao: string | null; createdAt: string; observacoes: string | null;
  operadora: { id: string; codigoAns: string; razaoSocial: string };
  guias: GuiaResumida[];
}
interface Operadora { id: string; codigoAns: string; razaoSocial: string }

const STATUS_CLASSES: Record<string, string> = {
  ABERTO:     "bg-transparent border-blue-500 text-blue-700 text-[10px] py-0.5 px-1.5 leading-tight",
  FECHADO:    "bg-transparent border-gray-500 text-gray-700 text-[10px] py-0.5 px-1.5 leading-tight",
  XML_GERADO: "bg-transparent border-green-500 text-green-700 text-[10px] py-0.5 px-1.5 leading-tight",
};
const STATUS_LABELS: Record<string, string> = { ABERTO: "Aberto", FECHADO: "Fechado", XML_GERADO: "XML Gerado" };

export function LotesContent() {
  const router = useRouter();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [novoOpen, setNovoOpen] = useState(false);
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [selectedOperadora, setSelectedOperadora] = useState("");
  const [guiasValidadas, setGuiasValidadas] = useState<GuiaResumida[]>([]);
  const [selectedGuias, setSelectedGuias] = useState<string[]>([]);
  const [criando, setCriando] = useState(false);

  const [gerandoXml, setGerandoXml] = useState<string | null>(null);

  const fetchLotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/secretaria/tiss/lotes?limit=100");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLotes(data.lotes ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Erro ao carregar lotes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLotes();
    fetch("/api/secretaria/tiss/dados?tipo=operadoras").then((r) => r.json()).then(setOperadoras);
  }, [fetchLotes]);

  const fetchGuiasValidadas = useCallback(async (opId: string) => {
    const res = await fetch(`/api/secretaria/tiss/guias?status=VALIDADA&operadoraId=${opId}&limit=100`);
    const data = await res.json();
    setGuiasValidadas(data.guias ?? []);
    setSelectedGuias([]);
  }, []);

  useEffect(() => {
    if (selectedOperadora) fetchGuiasValidadas(selectedOperadora);
    else { setGuiasValidadas([]); setSelectedGuias([]); }
  }, [selectedOperadora, fetchGuiasValidadas]);

  const toggleGuia = (id: string) =>
    setSelectedGuias((p) => p.includes(id) ? p.filter((g) => g !== id) : [...p, id]);

  const handleCriarLote = async () => {
    if (!selectedOperadora || selectedGuias.length === 0) return;
    setCriando(true);
    try {
      const res = await fetch("/api/secretaria/tiss/lotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operadoraId: selectedOperadora, guiaIds: selectedGuias }),
      });
      if (res.ok) {
        toast.success("Lote criado com sucesso");
        setNovoOpen(false); setSelectedOperadora(""); setSelectedGuias([]);
        fetchLotes();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Erro ao criar lote");
      }
    } finally { setCriando(false); }
  };

  const handleGerarXml = async (id: string) => {
    setGerandoXml(id);
    try {
      const res = await fetch(`/api/secretaria/tiss/lotes/${id}/gerar-xml`, { method: "POST" });
      if (res.ok) { toast.success("XML gerado com sucesso"); fetchLotes(); }
      else { const d = await res.json(); toast.error(d.error ?? "Erro ao gerar XML"); }
    } finally { setGerandoXml(null); }
  };

  const handleExcluir = async (id: string) => {
    if (!confirm("Excluir este lote? As guias voltarão ao status Validada.")) return;
    const res = await fetch(`/api/secretaria/tiss/lotes/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Lote excluído"); fetchLotes(); }
    else toast.error("Erro ao excluir lote");
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={Layers}
        title="Lotes TISS"
        subtitle="Agrupe guias validadas em lotes e gere o XML para envio às operadoras"
      />

      <div className="flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-end gap-2 pb-4">
          <Button className="h-9 text-xs" onClick={() => setNovoOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Lote
          </Button>
        </div>

        {/* Tabela */}
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="text-xs font-semibold py-3">Nº Lote</TableHead>
                <TableHead className="text-xs font-semibold py-3">Operadora</TableHead>
                <TableHead className="text-xs font-semibold py-3 text-center">Guias</TableHead>
                <TableHead className="text-xs font-semibold py-3">Status</TableHead>
                <TableHead className="text-xs font-semibold py-3">XML Gerado em</TableHead>
                <TableHead className="text-xs font-semibold py-3">Criado em</TableHead>
                <TableHead className="text-xs font-semibold py-3 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      <span className="text-xs text-muted-foreground">Carregando lotes...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : lotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Layers className="h-12 w-12 text-muted-foreground opacity-50" />
                      <span className="text-xs text-muted-foreground">Nenhum lote criado</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                lotes.map((lote) => (
                  <TableRow key={lote.id} className="hover:bg-muted/50">
                    <TableCell className="text-xs py-3 font-semibold text-primary font-mono">
                      #{lote.numeroLote}
                    </TableCell>
                    <TableCell className="text-xs py-3">
                      <div className="font-medium">{lote.operadora.razaoSocial}</div>
                      <div className="text-muted-foreground">ANS: {lote.operadora.codigoAns}</div>
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center">{lote.guias.length}</TableCell>
                    <TableCell className="text-xs py-3">
                      <Badge variant="outline" className={STATUS_CLASSES[lote.status] ?? STATUS_CLASSES.ABERTO}>
                        {STATUS_LABELS[lote.status] ?? lote.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs py-3 text-muted-foreground">
                      {lote.dataGeracao
                        ? format(new Date(lote.dataGeracao), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : "-"}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-muted-foreground">
                      {format(new Date(lote.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="outline" size="sm" className="h-7 text-xs"
                          onClick={() => router.push(`/secretaria/tiss/lotes/${lote.id}`)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        {lote.status === "ABERTO" && (
                          <Button variant="outline" size="sm"
                            className="h-7 text-xs gap-1 text-blue-600 hover:text-blue-700 hover:border-blue-300"
                            disabled={gerandoXml === lote.id}
                            onClick={() => handleGerarXml(lote.id)}>
                            <FileCode className="h-3 w-3" />
                            {gerandoXml === lote.id ? "..." : "Gerar XML"}
                          </Button>
                        )}
                        {lote.status === "XML_GERADO" && (
                          <Button variant="outline" size="sm"
                            className="h-7 text-xs gap-1 text-green-600 hover:text-green-700 hover:border-green-300"
                            onClick={() => window.open(`/api/secretaria/tiss/lotes/${lote.id}/download-xml`, "_blank")}>
                            <Download className="h-3 w-3" />
                            Baixar
                          </Button>
                        )}
                        {lote.status !== "XML_GERADO" && (
                          <Button variant="outline" size="sm"
                            className="h-7 text-xs text-red-500 hover:text-red-600 hover:border-red-300"
                            onClick={() => handleExcluir(lote.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!loading && total > 0 && (
          <p className="text-xs text-muted-foreground mt-2 text-right">{total} lote(s)</p>
        )}
      </div>

      {/* Dialog: Novo Lote */}
      <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Criar Novo Lote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Operadora *</Label>
              <Select value={selectedOperadora} onValueChange={setSelectedOperadora}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecionar operadora..." />
                </SelectTrigger>
                <SelectContent>
                  {operadoras.map((o) => (
                    <SelectItem key={o.id} value={o.id} className="text-xs">
                      {o.razaoSocial} — ANS: {o.codigoAns}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedOperadora && (
              <div className="space-y-2">
                <Label className="text-xs">Guias Validadas</Label>
                {guiasValidadas.length === 0 ? (
                  <div className="flex flex-col items-center py-4 gap-1">
                    <FileCode className="h-8 w-8 text-muted-foreground opacity-40" />
                    <p className="text-xs text-muted-foreground">Nenhuma guia validada para esta operadora</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border max-h-48 overflow-y-auto">
                    {guiasValidadas.map((guia) => (
                      <div key={guia.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 border-b last:border-b-0">
                        <Checkbox
                          id={guia.id}
                          checked={selectedGuias.includes(guia.id)}
                          onCheckedChange={() => toggleGuia(guia.id)}
                        />
                        <label htmlFor={guia.id} className="text-xs cursor-pointer">
                          <span className="font-mono font-semibold text-primary">
                            {guia.numeroGuia ?? guia.id.slice(0, 8)}
                          </span>
                          <span className="text-muted-foreground ml-2">— {guia.tipoGuia}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                {selectedGuias.length > 0 && (
                  <p className="text-xs text-muted-foreground">{selectedGuias.length} guia(s) selecionada(s)</p>
                )}
              </div>
            )}

            {/* Sem operadora selecionada */}
            {!selectedOperadora && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Selecione uma operadora para ver as guias disponíveis
                </Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setNovoOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" className="text-xs h-8" onClick={handleCriarLote}
              disabled={!selectedOperadora || selectedGuias.length === 0 || criando}>
              {criando ? "Criando..." : "Criar Lote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
