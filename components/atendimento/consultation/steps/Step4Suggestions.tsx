"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  AlertTriangle,
  Search,
  Pill,
  FlaskConical,
  FileText,
  Trash2,
  ArrowRight,
  Pencil,
  Check,
} from "lucide-react";

interface CidCode {
  code: string;
  description: string;
  score: number;
}

interface Exame {
  nome: string;
  tipo: string;
  justificativa?: string;
}

interface Prescricao {
  medicamento: string;
  dosagem: string;
  posologia: string;
  duracao: string;
  justificativa?: string;
}

interface AnalysisResults {
  anamnese: string;
  cidCodes: CidCode[];
  exames: Exame[];
  prescricoes: Prescricao[];
}

interface Step4SuggestionsProps {
  analysisResults: AnalysisResults | null;
  cidsManuais: Array<{ code: string; description: string }>;
  examesManuais: Array<{ nome: string; tipo: string }>;
  prescricoes: Array<{ medicamento: string; dosagem: string; posologia: string; duracao: string }>;
  selectedCids: Set<number>;
  setSelectedCids: (s: Set<number>) => void;
  selectedExamesAI: Set<number>;
  setSelectedExamesAI: (s: Set<number>) => void;
  selectedPrescricoesAI: Set<number>;
  setSelectedPrescricoesAI: (s: Set<number>) => void;
  setCidDialogOpen: (v: boolean) => void;
  setExameDialogOpen: (v: boolean) => void;
  setExameSearchDialogOpen: (v: boolean) => void;
  setMedicamentoDialogOpen: (v: boolean) => void;
  setPrescricoes: (p: Array<{ medicamento: string; dosagem: string; posologia: string; duracao: string }>) => void;
  selectedPrescricaoIndex: number | null;
  setSelectedPrescricaoIndex: (i: number | null) => void;
  allergies: string[];
  onAdvance: () => void;
}

function relevanceBadge(score: number) {
  if (score >= 0.8) return { label: "Alta", className: "bg-red-50 text-red-700 border-red-200" };
  if (score >= 0.6) return { label: "Média", className: "bg-amber-50 text-amber-700 border-amber-200" };
  return { label: "Baixa", className: "bg-slate-50 text-slate-600 border-slate-200" };
}

function detectAllergyConflict(medicamento: string, allergies: string[]): string | null {
  const med = medicamento.toLowerCase();
  for (const allergy of allergies) {
    const al = allergy.toLowerCase();
    if (med.includes(al) || al.includes(med.split(" ")[0])) {
      return allergy;
    }
  }
  return null;
}

function AccordionSection({
  title,
  icon: Icon,
  children,
  badge,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  badge?: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 text-left"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-800">{title}</span>
          {badge && (
            <Badge variant="outline" className="text-xs text-slate-500 border-slate-200">
              {badge}
            </Badge>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {open && <div className="border-t border-slate-100">{children}</div>}
    </div>
  );
}

export function Step4Suggestions({
  analysisResults,
  cidsManuais,
  examesManuais,
  prescricoes,
  selectedCids,
  setSelectedCids,
  selectedExamesAI,
  setSelectedExamesAI,
  selectedPrescricoesAI,
  setSelectedPrescricoesAI,
  setCidDialogOpen,
  setExameDialogOpen,
  setExameSearchDialogOpen,
  setMedicamentoDialogOpen,
  setPrescricoes,
  selectedPrescricaoIndex,
  setSelectedPrescricaoIndex,
  allergies,
  onAdvance,
}: Step4SuggestionsProps) {
  const allCids = [...(analysisResults?.cidCodes || []), ...cidsManuais.map((c) => ({ ...c, score: 0 }))];
  const allExames = [...(analysisResults?.exames || []), ...examesManuais.map((e) => ({ ...e, justificativa: "" }))];

  const toggleCid = (i: number) => {
    const next = new Set(selectedCids);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelectedCids(next);
  };

  const toggleExame = (i: number) => {
    const next = new Set(selectedExamesAI);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelectedExamesAI(next);
  };

  const removePrescricao = (idx: number) => {
    const next = [...prescricoes];
    next.splice(idx, 1);
    setPrescricoes(next);
    if (selectedPrescricaoIndex === idx) setSelectedPrescricaoIndex(null);
  };

  // Agrupar exames por tipo
  const examesByType: Record<string, typeof allExames> = {};
  allExames.forEach((e) => {
    const t = e.tipo || "Outros";
    if (!examesByType[t]) examesByType[t] = [];
    examesByType[t].push(e);
  });

  return (
    <div className="space-y-4">
      {/* 4.1 — CID Sugerido */}
      <AccordionSection
        title="CID 10 Sugerido por IA"
        icon={FileText}
        badge={allCids.length > 0 ? `${allCids.length} sugestão(ões)` : undefined}
      >
        <div className="p-4 space-y-2">
          {allCids.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Nenhum CID sugerido pela IA.</p>
          ) : (
            allCids.map((cid, i) => {
              const selected = selectedCids.has(i);
              const rel = relevanceBadge(cid.score);
              return (
                <label
                  key={i}
                  onClick={() => toggleCid(i)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    selected
                      ? "bg-[var(--clinical-cobalt-light)] border-[var(--clinical-cobalt-border)]"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      selected ? "bg-[#1E40AF] border-[#1E40AF]" : "border-slate-300"
                    }`}
                  >
                    {selected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500 w-12 flex-shrink-0">
                    {cid.code}
                  </span>
                  <span className={`text-sm flex-1 ${selected ? "text-[#1E40AF] font-medium" : "text-slate-700"}`}>
                    {cid.description}
                  </span>
                  {cid.score > 0 && (
                    <Badge variant="outline" className={`text-xs flex-shrink-0 ${rel.className}`}>
                      {rel.label}
                    </Badge>
                  )}
                </label>
              );
            })
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCidDialogOpen(true)}
            className="h-7 px-3 text-xs gap-1.5 border-dashed border-slate-300 text-slate-500 hover:border-[#1E40AF] hover:text-[#1E40AF] w-full"
          >
            <Plus className="w-3 h-3" />
            Adicionar CID manualmente
          </Button>
        </div>
      </AccordionSection>

      {/* 4.2 — Exames Sugeridos */}
      <AccordionSection
        title="Exames Sugeridos por IA"
        icon={FlaskConical}
        badge={allExames.length > 0 ? `${allExames.length} sugestão(ões)` : undefined}
      >
        <div className="p-4 space-y-4">
          {Object.keys(examesByType).length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Nenhum exame sugerido pela IA.</p>
          ) : (
            Object.entries(examesByType).map(([tipo, exames]) => {
              const startIdx = allExames.findIndex((e) => e === exames[0]);
              return (
                <div key={tipo}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{tipo}</p>
                  <div className="space-y-1.5">
                    {exames.map((exame, j) => {
                      const globalIdx = allExames.indexOf(exame);
                      const selected = selectedExamesAI.has(globalIdx);
                      return (
                        <label
                          key={j}
                          onClick={() => toggleExame(globalIdx)}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                            selected
                              ? "bg-[var(--clinical-cobalt-light)] border-[var(--clinical-cobalt-border)] text-[#1E40AF]"
                              : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                              selected ? "bg-[#1E40AF] border-[#1E40AF]" : "border-slate-300"
                            }`}
                          >
                            {selected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                          </div>
                          <span className="flex-1 font-medium">{exame.nome}</span>
                          {exame.justificativa && (
                            <span className="text-xs text-slate-400 italic">{exame.justificativa}</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExameDialogOpen(true)}
              className="h-7 px-3 text-xs gap-1.5 border-dashed border-slate-300 text-slate-500 hover:border-[#1E40AF] hover:text-[#1E40AF] flex-1"
            >
              <Plus className="w-3 h-3" />
              Adicionar manualmente
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExameSearchDialogOpen(true)}
              className="h-7 px-3 text-xs gap-1.5 border-slate-200 text-slate-500 hover:border-slate-300"
            >
              <Search className="w-3 h-3" />
              Buscar catálogo
            </Button>
          </div>
        </div>
      </AccordionSection>

      {/* 4.3 — Prescrições Sugeridas */}
      <AccordionSection
        title="Prescrições"
        icon={Pill}
        badge={prescricoes.length > 0 ? `${prescricoes.length} item(ns)` : undefined}
      >
        <div className="p-4 space-y-2">
          {prescricoes.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Nenhuma prescrição adicionada.</p>
          ) : (
            prescricoes.map((p, i) => {
              const conflict = detectAllergyConflict(p.medicamento, allergies);
              return (
                <div
                  key={i}
                  className={`p-3 rounded-xl border transition-colors ${
                    conflict
                      ? "bg-[#FEF2F2] border-[#FECACA]"
                      : selectedPrescricaoIndex === i
                      ? "bg-[var(--clinical-cobalt-light)] border-[var(--clinical-cobalt-border)]"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {conflict && (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                        )}
                        <span className="text-sm font-semibold text-slate-800">{p.medicamento}</span>
                        {p.dosagem && (
                          <span className="text-xs text-slate-500">{p.dosagem}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {p.posologia}
                        {p.duracao && ` · ${p.duracao}`}
                      </p>
                      {conflict && (
                        <p className="text-xs text-red-700 font-medium mt-1">
                          ⚠️ Conflito: alergia a {conflict}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedPrescricaoIndex(selectedPrescricaoIndex === i ? null : i)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-[#1E40AF]"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removePrescricao(i)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => setMedicamentoDialogOpen(true)}
            className="h-7 px-3 text-xs gap-1.5 border-dashed border-slate-300 text-slate-500 hover:border-[#1E40AF] hover:text-[#1E40AF] w-full"
          >
            <Plus className="w-3 h-3" />
            Adicionar medicamento
          </Button>
        </div>
      </AccordionSection>

      {/* Botão Avançar */}
      <div className="flex justify-end">
        <Button
          onClick={onAdvance}
          className="h-9 px-6 text-sm gap-2 bg-[#1E40AF] hover:bg-[#1e3a8a] text-white"
        >
          Gerar Documentos
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
