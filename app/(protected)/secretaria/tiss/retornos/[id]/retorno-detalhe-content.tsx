"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { PageHeader } from "@/components/page-header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft, FileCheck, AlertTriangle, CheckCircle, Plus,
} from "lucide-react";
import { toast } from "sonner";

/* ── Interfaces ────────────────────────────────────────────────── */

interface Procedimento {
  id: string;
  quantidade: number;
  valorTotal: string;
  codigoTuss: { codigoTuss: string; descricao: string };
}

interface Guia {
  id: string;
  numeroGuia: string | null;
  tipoGuia: string;
  status: string;
  paciente: { nome: string; cpf: string };
  procedimentos: Procedimento[];
}

interface Glosa {
  id: string;
  codigoGlosa: string;
  descricaoGlosa: string | null;
  valorGlosado: string;
  guia?: { numeroGuia: string | null; paciente?: { nome: string } };
  procedimento?: { codigoTuss?: { codigoTuss: string; descricao: string } };
}

interface Retorno {
  id: string;
  numeroProtocolo: string | null;
  status: string;
  dataRecebimento: string;
  observacoes: string | null;
  operadora: { id: string; codigoAns: string; razaoSocial: string };
  lote: {
    id: string;
    numeroLote: string;
    guias: Guia[];
  } | null;
  glosas: Glosa[];
}

/* ── Status per guia during processing ─────────────────────────── */

type GuiaStatusType = "APROVADA" | "GLOSADA" | "PARCIAL_GLOSA";

interface GlosaInput {
  procedimentoId: string;
  codigoGlosa: string;
  descricaoGlosa: string;
  valorGlosado: string;
}

interface GuiaProcessamento {
  guiaId: string;
  status: GuiaStatusType;
  glosas: GlosaInput[];
}

const STATUS_CLASSES: Record<string, string> = {
  RECEBIDO:   "bg-transparent border-yellow-500 text-yellow-700 text-[10px] py-0.5 px-1.5 leading-tight",
  PROCESSADO: "bg-transparent border-green-500 text-green-700 text-[10px] py-0.5 px-1.5 leading-tight",
};

const STATUS_LABELS: Record<string, string> = {
  RECEBIDO: "Recebido",
  PROCESSADO: "Processado",
};

const GUIA_STATUS_CLASSES: Record<string, string> = {
  APROVADA:       "bg-transparent border-green-500 text-green-700 text-[10px] py-0.5 px-1.5 leading-tight",
  GLOSADA:        "bg-transparent border-red-500 text-red-700 text-[10px] py-0.5 px-1.5 leading-tight",
  PARCIAL_GLOSA:  "bg-transparent border-yellow-500 text-yellow-700 text-[10px] py-0.5 px-1.5 leading-tight",
};

const GUIA_STATUS_LABELS: Record<string, string> = {
  APROVADA: "Aprovada",
  GLOSADA: "Glosada",
  PARCIAL_GLOSA: "Glosa Parcial",
};

/* ── Component ─────────────────────────────────────────────────── */

export function RetornoDetalheContent({ retornoId }: { retornoId: string }) {
  const router = useRouter();
  const [retorno, setRetorno] = useState<Retorno | null>(null);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);

  // Processing state: one entry per guia
  const [guiasProc, setGuiasProc] = useState<GuiaProcessamento[]>([]);

  const fetchRetorno = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/secretaria/tiss/retornos/${retornoId}`);
      if (!res.ok) {
        router.push("/secretaria/tiss/retornos");
        return;
      }
      const data: Retorno = await res.json();
      setRetorno(data);

      // Initialize processing state from lote guias
      if (data.status === "RECEBIDO" && data.lote?.guias) {
        setGuiasProc(
          data.lote.guias.map((g) => ({
            guiaId: g.id,
            status: "APROVADA" as GuiaStatusType,
            glosas: [],
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }, [retornoId, router]);

  useEffect(() => {
    fetchRetorno();
  }, [fetchRetorno]);

  /* ── Processing helpers ────────────────────────────────────── */

  const updateGuiaStatus = (guiaId: string, status: GuiaStatusType) => {
    setGuiasProc((prev) =>
      prev.map((g) =>
        g.guiaId === guiaId
          ? { ...g, status, glosas: status === "APROVADA" ? [] : g.glosas }
          : g
      )
    );
  };

  const addGlosa = (guiaId: string, procedimentoId: string) => {
    setGuiasProc((prev) =>
      prev.map((g) =>
        g.guiaId === guiaId
          ? {
              ...g,
              glosas: [
                ...g.glosas,
                { procedimentoId, codigoGlosa: "", descricaoGlosa: "", valorGlosado: "" },
              ],
            }
          : g
      )
    );
  };

  const updateGlosa = (
    guiaId: string,
    index: number,
    field: keyof GlosaInput,
    value: string
  ) => {
    setGuiasProc((prev) =>
      prev.map((g) => {
        if (g.guiaId !== guiaId) return g;
        const glosas = [...g.glosas];
        glosas[index] = { ...glosas[index], [field]: value };
        return { ...g, glosas };
      })
    );
  };

  const removeGlosa = (guiaId: string, index: number) => {
    setGuiasProc((prev) =>
      prev.map((g) => {
        if (g.guiaId !== guiaId) return g;
        const glosas = g.glosas.filter((_, i) => i !== index);
        return { ...g, glosas };
      })
    );
  };

  const handleProcessar = async () => {
    // Validate: glosa entries for GLOSADA / PARCIAL_GLOSA must have at least one glosa
    const invalid = guiasProc.find(
      (g) =>
        (g.status === "GLOSADA" || g.status === "PARCIAL_GLOSA") &&
        g.glosas.length === 0
    );
    if (invalid) {
      toast.error("Guias glosadas devem ter pelo menos uma glosa registrada");
      return;
    }

    // Validate: every glosa needs codigoGlosa and valorGlosado
    for (const gp of guiasProc) {
      for (const gl of gp.glosas) {
        if (!gl.codigoGlosa.trim() || !gl.valorGlosado.trim()) {
          toast.error("Preencha o codigo e o valor de todas as glosas");
          return;
        }
      }
    }

    setProcessando(true);
    try {
      // Convert valorGlosado from string to number for the API
      const payload = {
        guias: guiasProc.map((gp) => ({
          ...gp,
          glosas: gp.glosas.map((gl) => ({
            ...gl,
            valorGlosado: parseFloat(gl.valorGlosado) || 0,
          })),
        })),
      };
      const res = await fetch(`/api/secretaria/tiss/retornos/${retornoId}/processar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Retorno processado com sucesso");
        fetchRetorno();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Erro ao processar retorno");
      }
    } catch {
      toast.error("Erro ao processar retorno");
    } finally {
      setProcessando(false);
    }
  };

  /* ── Render ────────────────────────────────────────────────── */

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={FileCheck}
        title={retorno ? `Retorno #${retorno.numeroProtocolo ?? retorno.id.slice(0, 8)}` : "Retorno"}
        subtitle={
          retorno
            ? `${retorno.operadora.razaoSocial} — recebido em ${format(new Date(retorno.dataRecebimento), "dd/MM/yyyy HH:mm", { locale: ptBR })}`
            : "Carregando..."
        }
      >
        <Button variant="ghost" size="sm" className="text-xs h-8" asChild>
          <Link href="/secretaria/tiss/retornos">
            <ArrowLeft className="mr-1 h-3 w-3" /> Voltar
          </Link>
        </Button>
        {retorno && (
          <Badge variant="outline" className={STATUS_CLASSES[retorno.status] ?? STATUS_CLASSES.RECEBIDO}>
            {STATUS_LABELS[retorno.status] ?? retorno.status}
          </Badge>
        )}
      </PageHeader>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground">Carregando retorno...</span>
        </div>
      ) : !retorno ? null : (
        <div className="flex flex-col gap-6">
          {/* Info Cards */}
          <div className="overflow-hidden rounded-lg border">
            <div className="bg-muted px-4 py-2 border-b">
              <span className="text-xs font-semibold">Dados do Retorno</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y">
              <div className="px-4 py-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Operadora</p>
                <p className="text-xs font-medium">{retorno.operadora.razaoSocial}</p>
                <p className="text-[10px] text-muted-foreground">ANS: {retorno.operadora.codigoAns}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Lote Vinculado</p>
                <p className="text-xs font-medium font-mono">
                  {retorno.lote ? `#${retorno.lote.numeroLote}` : "—"}
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Data Recebimento</p>
                <p className="text-xs font-medium">
                  {format(new Date(retorno.dataRecebimento), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Protocolo</p>
                <p className="text-xs font-medium font-mono">{retorno.numeroProtocolo ?? "—"}</p>
              </div>
              {retorno.observacoes && (
                <div className="col-span-2 md:col-span-4 px-4 py-3 border-t">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Observacoes</p>
                  <p className="text-xs">{retorno.observacoes}</p>
                </div>
              )}
            </div>
          </div>

          {/* ── RECEBIDO: Processing Section ────────────────── */}
          {retorno.status === "RECEBIDO" && retorno.lote?.guias && retorno.lote.guias.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <h2 className="text-sm font-semibold">Processar Retorno</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  {retorno.lote.guias.length} guia(s) no lote vinculado
                </p>
              </div>

              <div className="space-y-4">
                {retorno.lote.guias.map((guia) => {
                  const gp = guiasProc.find((g) => g.guiaId === guia.id);
                  const showGlosas = gp?.status === "GLOSADA" || gp?.status === "PARCIAL_GLOSA";

                  return (
                    <div key={guia.id} className="rounded-lg border overflow-hidden">
                      {/* Guia header */}
                      <div className="bg-muted/60 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-semibold text-primary">
                              Guia {guia.numeroGuia ?? guia.id.slice(0, 8)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              ({guia.tipoGuia})
                            </span>
                          </div>
                          <p className="text-xs mt-0.5">
                            <span className="font-medium">{guia.paciente.nome}</span>
                            <span className="text-muted-foreground ml-2">{guia.paciente.cpf}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">Status:</Label>
                          <Select
                            value={gp?.status ?? "APROVADA"}
                            onValueChange={(v) => updateGuiaStatus(guia.id, v as GuiaStatusType)}
                          >
                            <SelectTrigger className="h-8 text-xs w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="APROVADA" className="text-xs">Aprovada</SelectItem>
                              <SelectItem value="GLOSADA" className="text-xs">Glosada</SelectItem>
                              <SelectItem value="PARCIAL_GLOSA" className="text-xs">Glosa Parcial</SelectItem>
                            </SelectContent>
                          </Select>
                          {gp && (
                            <Badge variant="outline" className={GUIA_STATUS_CLASSES[gp.status]}>
                              {GUIA_STATUS_LABELS[gp.status]}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Procedures list */}
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
                          Procedimentos
                        </p>
                        <div className="space-y-1.5">
                          {guia.procedimentos.map((proc) => (
                            <div key={proc.id} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-xs font-mono text-muted-foreground">
                                  {proc.codigoTuss.codigoTuss}
                                </span>
                                <span className="text-xs truncate">{proc.codigoTuss.descricao}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-muted-foreground">
                                  Qtd: {proc.quantidade}
                                </span>
                                <span className="text-xs font-medium">
                                  R$ {parseFloat(proc.valorTotal).toFixed(2)}
                                </span>
                                {showGlosas && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-[10px] gap-1 text-red-600 hover:text-red-700 hover:border-red-300"
                                    onClick={() => addGlosa(guia.id, proc.id)}
                                  >
                                    <Plus className="h-2.5 w-2.5" />
                                    Glosa
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Glosa entries for this guia */}
                      {showGlosas && gp && gp.glosas.length > 0 && (
                        <div className="border-t bg-red-50/50 px-4 py-3">
                          <p className="text-[10px] uppercase tracking-wide text-red-600 mb-2 font-semibold">
                            Glosas Registradas
                          </p>
                          <div className="space-y-3">
                            {gp.glosas.map((gl, idx) => {
                              const proc = guia.procedimentos.find((p) => p.id === gl.procedimentoId);
                              return (
                                <div key={idx} className="rounded border bg-white p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-muted-foreground">
                                      Proc: {proc?.codigoTuss.codigoTuss ?? gl.procedimentoId.slice(0, 8)} — {proc?.codigoTuss.descricao ?? ""}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 text-[10px] text-red-500 hover:text-red-600 px-1"
                                      onClick={() => removeGlosa(guia.id, idx)}
                                    >
                                      Remover
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-0.5">
                                      <Label className="text-[10px]">Codigo Glosa *</Label>
                                      <Input
                                        className="h-7 text-xs"
                                        placeholder="Ex: A10"
                                        value={gl.codigoGlosa}
                                        onChange={(e) =>
                                          updateGlosa(guia.id, idx, "codigoGlosa", e.target.value)
                                        }
                                      />
                                    </div>
                                    <div className="space-y-0.5">
                                      <Label className="text-[10px]">Descricao</Label>
                                      <Input
                                        className="h-7 text-xs"
                                        placeholder="Descricao da glosa"
                                        value={gl.descricaoGlosa}
                                        onChange={(e) =>
                                          updateGlosa(guia.id, idx, "descricaoGlosa", e.target.value)
                                        }
                                      />
                                    </div>
                                    <div className="space-y-0.5">
                                      <Label className="text-[10px]">Valor Glosado *</Label>
                                      <Input
                                        className="h-7 text-xs"
                                        placeholder="0.00"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={gl.valorGlosado}
                                        onChange={(e) =>
                                          updateGlosa(guia.id, idx, "valorGlosado", e.target.value)
                                        }
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Confirm Processing */}
              <div className="flex justify-end pt-2">
                <Button
                  className="h-9 text-xs gap-2"
                  onClick={handleProcessar}
                  disabled={processando}
                >
                  <CheckCircle className="h-4 w-4" />
                  {processando ? "Processando..." : "Confirmar Processamento"}
                </Button>
              </div>
            </div>
          )}

          {/* RECEBIDO but no linked lote */}
          {retorno.status === "RECEBIDO" && (!retorno.lote || !retorno.lote.guias || retorno.lote.guias.length === 0) && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-6 flex flex-col items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <p className="text-xs text-yellow-700 text-center">
                Este retorno nao possui um lote vinculado ou o lote nao contem guias.
                <br />
                Vincule um lote para poder processar o retorno.
              </p>
            </div>
          )}

          {/* ── PROCESSADO: Glosas List ─────────────────────── */}
          {retorno.status === "PROCESSADO" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <h2 className="text-sm font-semibold">Resultado do Processamento</h2>
              </div>

              {retorno.glosas.length === 0 ? (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-6 flex flex-col items-center gap-2">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <p className="text-xs text-green-700">
                    Todas as guias foram aprovadas sem glosas.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <div className="bg-muted px-4 py-2 border-b flex items-center justify-between">
                    <span className="text-xs font-semibold">
                      {retorno.glosas.length} glosa(s) registrada(s)
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-transparent border-red-400 text-red-600 text-[10px] py-0.5 px-1.5 leading-tight"
                    >
                      Total glosado: R${" "}
                      {retorno.glosas
                        .reduce((acc, g) => acc + parseFloat(g.valorGlosado || "0"), 0)
                        .toFixed(2)}
                    </Badge>
                  </div>
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead className="text-xs font-semibold py-3">Guia</TableHead>
                        <TableHead className="text-xs font-semibold py-3">Paciente</TableHead>
                        <TableHead className="text-xs font-semibold py-3">Procedimento</TableHead>
                        <TableHead className="text-xs font-semibold py-3">Cod. Glosa</TableHead>
                        <TableHead className="text-xs font-semibold py-3">Descricao</TableHead>
                        <TableHead className="text-xs font-semibold py-3 text-right">Valor Glosado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {retorno.glosas.map((glosa) => (
                        <TableRow key={glosa.id} className="hover:bg-muted/50">
                          <TableCell className="text-xs py-3 font-mono">
                            {glosa.guia?.numeroGuia ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs py-3">
                            {glosa.guia?.paciente?.nome ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs py-3">
                            {glosa.procedimento?.codigoTuss ? (
                              <div>
                                <span className="font-mono text-muted-foreground">
                                  {glosa.procedimento.codigoTuss.codigoTuss}
                                </span>
                                <span className="ml-1">
                                  {glosa.procedimento.codigoTuss.descricao}
                                </span>
                              </div>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-xs py-3 font-mono font-semibold text-red-600">
                            {glosa.codigoGlosa}
                          </TableCell>
                          <TableCell className="text-xs py-3 text-muted-foreground">
                            {glosa.descricaoGlosa || "—"}
                          </TableCell>
                          <TableCell className="text-xs py-3 text-right font-medium text-red-600">
                            R$ {parseFloat(glosa.valorGlosado || "0").toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={5} className="text-xs py-3 text-right font-semibold">
                          Total Glosado:
                        </TableCell>
                        <TableCell className="text-xs py-3 text-right font-bold text-red-600">
                          R${" "}
                          {retorno.glosas
                            .reduce((acc, g) => acc + parseFloat(g.valorGlosado || "0"), 0)
                            .toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
