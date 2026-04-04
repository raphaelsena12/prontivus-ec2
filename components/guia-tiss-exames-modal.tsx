"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  FlaskConical,
  ScanLine,
  Microscope,
  Activity,
  Dna,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCheck,
} from "lucide-react";

export interface ExameSolicitado {
  nome: string;
  tipo?: string;
  justificativa?: string;
  codigoTussId?: string | null;
  codigoTuss?: string | null;
}

export type PrioridadeTISS = "eletiva" | "urgencia";

export interface GuiaSADTDadosAdicionais {
  numeroCarteirinha?: string;
  cidCodigo?: string;
  indicacaoClinica?: string;
}

interface GuiaTissExamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (exames: ExameSolicitado[], dadosAdicionais: GuiaSADTDadosAdicionais) => void;
  examesDisponiveis: ExameSolicitado[];
  isLoading?: boolean;
  pacienteCarteirinha?: string;
  cidSelecionado?: string;
}

const CATEGORIA_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  LABORATORIAL:      { icon: FlaskConical, color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-200" },
  IMAGEM:            { icon: ScanLine,     color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  ANATOMOPATOLOGICO: { icon: Microscope,   color: "text-rose-600",   bg: "bg-rose-50",   border: "border-rose-200" },
  FUNCIONAL:         { icon: Activity,     color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200" },
  GENETICO:          { icon: Dna,          color: "text-teal-600",   bg: "bg-teal-50",   border: "border-teal-200" },
  OUTROS:            { icon: MoreHorizontal, color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-200" },
};

function getCategoriaConfig(tipo: string) {
  return CATEGORIA_CONFIG[tipo.toUpperCase()] ?? CATEGORIA_CONFIG["OUTROS"];
}

export function GuiaTissExamesModal({
  isOpen,
  onClose,
  onConfirm,
  examesDisponiveis,
  isLoading = false,
  pacienteCarteirinha,
  cidSelecionado,
}: GuiaTissExamesModalProps) {
  const [selected, setSelected] = useState<Set<number>>(() =>
    new Set(examesDisponiveis.map((_, i) => i))
  );
  const [justificativas, setJustificativas] = useState<Record<number, string>>({});
  const [expandedJustificativas, setExpandedJustificativas] = useState<Set<number>>(new Set());
  const [numeroCarteirinha, setNumeroCarteirinha] = useState(pacienteCarteirinha || "");
  const [cidCodigo, setCidCodigo] = useState(cidSelecionado || "");
  const [indicacaoClinica, setIndicacaoClinica] = useState("");

  const grupos = useMemo(() => {
    const map: Record<string, number[]> = {};
    examesDisponiveis.forEach((exame, i) => {
      const tipo = exame.tipo || "OUTROS";
      if (!map[tipo]) map[tipo] = [];
      map[tipo].push(i);
    });
    return map;
  }, [examesDisponiveis]);

  const toggleExame = (idx: number) => {
    const next = new Set(selected);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelected(next);
  };

  const toggleCategoria = (indices: number[]) => {
    const allSelected = indices.every((i) => selected.has(i));
    const next = new Set(selected);
    if (allSelected) indices.forEach((i) => next.delete(i));
    else indices.forEach((i) => next.add(i));
    setSelected(next);
  };

  const toggleJustificativa = (idx: number) => {
    const next = new Set(expandedJustificativas);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setExpandedJustificativas(next);
  };

  const handleConfirm = () => {
    const exames: ExameSolicitado[] = Array.from(selected).map((idx) => ({
      nome: examesDisponiveis[idx].nome,
      tipo: examesDisponiveis[idx].tipo,
      justificativa: justificativas[idx]?.trim() || undefined,
      codigoTussId: examesDisponiveis[idx].codigoTussId,
      codigoTuss: examesDisponiveis[idx].codigoTuss,
    }));
    onConfirm(exames, {
      numeroCarteirinha: numeroCarteirinha.trim() || undefined,
      cidCodigo: cidCodigo.trim() || undefined,
      indicacaoClinica: indicacaoClinica.trim() || undefined,
    });
  };

  const totalSelecionados = selected.size;
  const total = examesDisponiveis.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl sm:max-w-xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden rounded-xl">

        {/* Header */}
        <DialogHeader className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2.5 text-sm font-semibold text-slate-800">
            <div className="h-7 w-7 rounded-lg bg-[#306953]/10 flex items-center justify-center flex-shrink-0">
              <FileText className="h-3.5 w-3.5 text-[#306953]" />
            </div>
            Guia Consulta - SADT
            <span className="text-slate-400 font-normal">—</span>
            <span className="text-slate-500 font-normal">Seleção de Exames</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 min-h-0">

          {/* Dados da Guia */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dados da Guia</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Nº Carteirinha (convênio)</label>
                <Input
                  placeholder="Número da carteirinha"
                  value={numeroCarteirinha}
                  onChange={(e) => setNumeroCarteirinha(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">CID-10</label>
                <Input
                  placeholder="Ex: J06.9"
                  value={cidCodigo}
                  onChange={(e) => setCidCodigo(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Indicação Clínica</label>
              <Textarea
                placeholder="Descreva a indicação clínica para os exames solicitados..."
                value={indicacaoClinica}
                onChange={(e) => setIndicacaoClinica(e.target.value)}
                rows={2}
                className="text-xs resize-none border-slate-200 focus-visible:ring-[#306953]/30 focus-visible:border-[#306953]/50"
              />
            </div>
          </div>

          {/* Exames */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Exames</p>
              {total > 0 && (
                <span className="text-[10px] text-slate-400">
                  {totalSelecionados}/{total} selecionados
                </span>
              )}
            </div>

            {examesDisponiveis.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <FlaskConical className="h-5 w-5 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-500">Nenhum exame disponível</p>
                <p className="text-xs text-slate-400 mt-1">Adicione exames na etapa anterior.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {Object.entries(grupos).map(([tipo, indices]) => {
                  const allChecked = indices.every((i) => selected.has(i));
                  const someChecked = indices.some((i) => selected.has(i));
                  const cfg = getCategoriaConfig(tipo);
                  const CatIcon = cfg.icon;
                  const countSelected = indices.filter((i) => selected.has(i)).length;

                  return (
                    <div key={tipo} className={`rounded-xl border overflow-hidden ${cfg.border}`}>
                      {/* Categoria header */}
                      <div
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 ${cfg.bg} cursor-pointer select-none`}
                        onClick={() => toggleCategoria(indices)}
                      >
                        <Checkbox
                          id={`cat-${tipo}`}
                          checked={allChecked ? true : someChecked ? "indeterminate" : false}
                          onCheckedChange={() => toggleCategoria(indices)}
                          onClick={(e) => e.stopPropagation()}
                          className="data-[state=checked]:bg-[#306953] data-[state=checked]:border-[#306953]"
                        />
                        <div className={`h-5 w-5 rounded-md flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                          <CatIcon className={`h-3.5 w-3.5 ${cfg.color}`} />
                        </div>
                        <label
                          htmlFor={`cat-${tipo}`}
                          className={`text-[11px] font-semibold uppercase tracking-wider cursor-pointer flex-1 ${cfg.color}`}
                        >
                          {tipo}
                        </label>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] h-4 px-1.5 font-medium ${
                            countSelected === indices.length
                              ? "bg-[#306953]/10 text-[#306953]"
                              : countSelected === 0
                              ? "bg-slate-100 text-slate-400"
                              : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          {countSelected}/{indices.length}
                        </Badge>
                      </div>

                      {/* Exames da categoria */}
                      <div className="bg-white divide-y divide-slate-50">
                        {indices.map((idx) => {
                          const exame = examesDisponiveis[idx];
                          const isChecked = selected.has(idx);
                          const justifExpanded = expandedJustificativas.has(idx);

                          return (
                            <div key={idx} className={`px-3.5 py-2.5 transition-colors ${isChecked ? "bg-white hover:bg-slate-50/50" : "bg-slate-50/40"}`}>
                              <div className="flex items-center gap-2.5">
                                <Checkbox
                                  id={`exame-${idx}`}
                                  checked={isChecked}
                                  onCheckedChange={() => toggleExame(idx)}
                                  className="data-[state=checked]:bg-[#306953] data-[state=checked]:border-[#306953] flex-shrink-0"
                                />
                                <label
                                  htmlFor={`exame-${idx}`}
                                  className={`text-sm flex-1 cursor-pointer leading-tight transition-colors ${
                                    isChecked ? "text-slate-800 font-medium" : "text-slate-400"
                                  }`}
                                >
                                  {exame.nome}
                                  {exame.codigoTuss && (
                                    <span className={`ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded-md inline-flex items-center align-middle ${
                                      isChecked ? "bg-slate-100 text-slate-500" : "bg-slate-100 text-slate-300"
                                    }`}>
                                      {exame.codigoTuss}
                                    </span>
                                  )}
                                </label>
                                <button
                                  type="button"
                                  onClick={() => toggleJustificativa(idx)}
                                  className={`flex items-center gap-1 text-[11px] rounded-md px-2 py-1 transition-all flex-shrink-0 ${
                                    justifExpanded
                                      ? "bg-[#306953]/10 text-[#306953]"
                                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                  }`}
                                  title="Justificativa clínica (opcional)"
                                >
                                  {justifExpanded ? (
                                    <ChevronUp className="h-3 w-3" />
                                  ) : (
                                    <ChevronDown className="h-3 w-3" />
                                  )}
                                  <span>Justificativa</span>
                                </button>
                              </div>
                              {justifExpanded && (
                                <div className="mt-2 ml-7">
                                  <Textarea
                                    placeholder="Descreva a justificativa clínica para este exame..."
                                    value={justificativas[idx] ?? ""}
                                    onChange={(e) =>
                                      setJustificativas((prev) => ({ ...prev, [idx]: e.target.value }))
                                    }
                                    rows={2}
                                    className="text-xs resize-none border-slate-200 focus-visible:ring-[#306953]/30 focus-visible:border-[#306953]/50"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="flex-shrink-0 px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center gap-3">
          {/* Status badge */}
          <div className="flex-1">
            {totalSelecionados === 0 ? (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                Nenhum exame selecionado
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-[#306953] font-medium">
                <CheckCheck className="h-3.5 w-3.5" />
                {totalSelecionados} exame{totalSelecionados !== 1 ? "s" : ""} na guia
              </div>
            )}
          </div>

          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="h-8 text-xs px-3.5"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || totalSelecionados === 0}
            className="h-8 text-xs px-4 bg-[#306953] hover:bg-[#306953]/90 text-white shadow-sm"
          >
            {isLoading ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Gerando...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Gerar Guia
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
