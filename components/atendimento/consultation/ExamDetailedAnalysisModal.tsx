"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Activity,
  Shield,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Finding {
  type: "lab_value" | "anatomical_region" | "suspected_anomaly";
  label: string;
  value?: string;
  reference_range?: string;
  attention_level: "baixo" | "moderado" | "alto";
  description: string;
  clinical_note: string;
  bounding_box: BoundingBox | null;
  visual_hint: "circle" | "arrow" | "rectangle";
}

export interface ImageAnnotation {
  type: "anatomical_region" | "suspected_anomaly";
  label: string;
  attention_level: "baixo" | "moderado" | "alto";
  description: string;
  clinical_note: string;
  bounding_box: BoundingBox | null;
  visual_hint: "circle" | "arrow" | "rectangle";
}

export interface DetailedExamAnalysis {
  summary: string;
  findings: Finding[];
  image_annotations: ImageAnnotation[];
  disclaimer: string;
}

interface ExamDetailedAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exameName: string;
  exameId: string;
  exameType: "exame-imagem" | "exame-pdf";
  /** If analysis was already fetched, pass it to avoid re-fetching */
  cachedAnalysis?: DetailedExamAnalysis | null;
  onAnalysisFetched?: (exameId: string, analysis: DetailedExamAnalysis) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────

const ATTENTION_CONFIG = {
  alto: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
    dot: "bg-rose-500",
    icon: AlertTriangle,
    label: "Alto",
  },
  moderado: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    dot: "bg-amber-500",
    icon: AlertCircle,
    label: "Moderado",
  },
  baixo: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
    label: "Baixo",
  },
} as const;

const TYPE_LABELS: Record<string, string> = {
  lab_value: "Valor laboratorial",
  anatomical_region: "Região anatômica",
  suspected_anomaly: "Possível anomalia",
};

// ── Component ──────────────────────────────────────────────────────────

export function ExamDetailedAnalysisModal({
  open,
  onOpenChange,
  exameName,
  exameId,
  exameType,
  cachedAnalysis,
  onAnalysisFetched,
}: ExamDetailedAnalysisModalProps) {
  const [analysis, setAnalysis] = useState<DetailedExamAnalysis | null>(
    cachedAnalysis || null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFinding, setExpandedFinding] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Fetch analysis when modal opens
  useEffect(() => {
    if (!open) return;
    if (cachedAnalysis) {
      setAnalysis(cachedAnalysis);
      return;
    }
    fetchAnalysis();
  }, [open, exameId, cachedAnalysis]);

  // Fetch image URL for image exams
  useEffect(() => {
    if (!open || exameType !== "exame-imagem") return;
    fetchImageUrl();
  }, [open, exameId, exameType]);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/medico/analisar-exame-detalhado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exameId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao analisar exame");
      }
      const data = await res.json();
      setAnalysis(data.analise);
      onAnalysisFetched?.(exameId, data.analise);
    } catch (err: any) {
      setError(err.message || "Erro ao analisar exame");
    } finally {
      setLoading(false);
    }
  };

  const fetchImageUrl = async () => {
    try {
      const res = await fetch(
        `/api/medico/exames/url?exameId=${encodeURIComponent(exameId)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.url) setImageUrl(data.url);
      }
    } catch {
      // Silently fail — image preview is optional
    }
  };

  const allItems = [
    ...(analysis?.findings || []).map((f, i) => ({ ...f, _kind: "finding" as const, _index: i })),
    ...(analysis?.image_annotations || []).map((a, i) => ({
      ...a,
      _kind: "annotation" as const,
      _index: (analysis?.findings?.length || 0) + i,
    })),
  ];

  const sortedItems = [...allItems].sort((a, b) => {
    const order = { alto: 0, moderado: 1, baixo: 2 };
    return order[a.attention_level] - order[b.attention_level];
  });

  const highCount = allItems.filter((i) => i.attention_level === "alto").length;
  const modCount = allItems.filter((i) => i.attention_level === "moderado").length;
  const lowCount = allItems.filter((i) => i.attention_level === "baixo").length;

  const overallLevel: "alto" | "moderado" | "baixo" = highCount > 0
    ? "alto"
    : modCount > 0
    ? "moderado"
    : "baixo";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[92vh] p-0 overflow-hidden border-slate-200 flex flex-col">
        {/* Header */}
        <DialogHeader>
          <div className="px-5 py-4 pr-14 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-white border border-blue-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Brain className="w-4.5 h-4.5 text-blue-700" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-sm font-semibold text-slate-800 truncate">
                  {exameName || "Análise do exame"}
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Análise detalhada com pontos de atenção clínica
                </p>
              </div>
              {analysis && !loading && (
                <span
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${ATTENTION_CONFIG[overallLevel].bg} ${ATTENTION_CONFIG[overallLevel].text} ${ATTENTION_CONFIG[overallLevel].border}`}
                >
                  {highCount > 0
                    ? `${highCount} alerta${highCount > 1 ? "s" : ""}`
                    : modCount > 0
                    ? `${modCount} atenção`
                    : "Normal"}
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-blue-100 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              </div>
              <p className="text-sm text-slate-600 font-medium">
                Analisando exame...
              </p>
              <p className="text-xs text-slate-400">
                Identificando pontos de atenção clínica
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <p className="text-sm text-slate-700 font-medium">
                Erro na análise
              </p>
              <p className="text-xs text-slate-500 text-center max-w-sm">
                {error}
              </p>
              <Button
                variant="outline"
                className="h-8 text-xs mt-2"
                onClick={fetchAnalysis}
              >
                Tentar novamente
              </Button>
            </div>
          ) : analysis ? (
            <div className="flex flex-col lg:flex-row">
              {/* Left: Image preview */}
              {exameType === "exame-imagem" && imageUrl && (
                <div className="lg:w-1/2 border-b lg:border-b-0 lg:border-r border-slate-100 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Visualização do exame
                    </p>
                  </div>
                  <div
                    className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-900"
                  >
                    <img
                      src={imageUrl}
                      alt={exameName}
                      className="w-full h-auto"
                    />
                  </div>
                  {/* Open in new tab */}
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => window.open(imageUrl, "_blank")}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Abrir original
                    </button>
                  </div>
                </div>
              )}

              {/* Right: Findings list */}
              <div
                className={`${
                  exameType === "exame-imagem" && imageUrl
                    ? "lg:w-1/2"
                    : "w-full"
                } flex flex-col`}
              >
                {/* Summary */}
                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        Resumo
                      </p>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {analysis.summary}
                    </p>
                  </div>
                </div>

                {/* Counters */}
                {allItems.length > 0 && (
                  <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
                    <Activity className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Achados ({allItems.length})
                    </p>
                    <div className="flex items-center gap-2 ml-auto">
                      {highCount > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-600">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          {highCount}
                        </span>
                      )}
                      {modCount > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          {modCount}
                        </span>
                      )}
                      {lowCount > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          {lowCount}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Findings list */}
                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2 max-h-[50vh]">
                  {sortedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      <p className="text-sm text-slate-600 font-medium">
                        Nenhum ponto de atenção identificado
                      </p>
                      <p className="text-xs text-slate-400">
                        O exame não apresenta alterações detectáveis pela IA
                      </p>
                    </div>
                  ) : (
                    sortedItems.map((item, idx) => {
                      const config = ATTENTION_CONFIG[item.attention_level];
                      const Icon = config.icon;
                      const isExpanded = expandedFinding === item._index;
                      const isFinding = item._kind === "finding";

                      return (
                        <div
                          key={`item-${idx}`}
                          className={`rounded-lg border transition-all duration-200 cursor-pointer ${
                            config.border
                          } bg-white hover:bg-slate-50`}
                          onClick={() =>
                            setExpandedFinding(
                              isExpanded ? null : item._index
                            )
                          }
                        >
                          {/* Header */}
                          <div className="px-3.5 py-2.5 flex items-start gap-2.5">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${config.bg}`}
                            >
                              <Icon className={`w-3.5 h-3.5 ${config.text}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-semibold text-slate-800 truncate">
                                  {item.label}
                                </p>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${config.bg} ${config.text} ${config.border} border`}
                                >
                                  {config.label}
                                </span>
                                <span className="text-[9px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100">
                                  {TYPE_LABELS[item.type] || item.type}
                                </span>
                              </div>
                              {isFinding && (item as any).value && (
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[11px] font-mono font-semibold text-slate-700">
                                    {(item as any).value}
                                  </span>
                                  {(item as any).reference_range && (
                                    <span className="text-[10px] text-slate-400">
                                      (ref: {(item as any).reference_range})
                                    </span>
                                  )}
                                </div>
                              )}
                              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                {item.description}
                              </p>
                            </div>
                            <button
                              className="p-1 rounded text-slate-400 hover:text-slate-600 flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedFinding(
                                  isExpanded ? null : item._index
                                );
                              }}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Expanded content */}
                          {isExpanded && (
                            <div className="px-3.5 pb-3 pt-0 ml-8">
                              <div
                                className={`rounded-lg p-3 ${config.bg} border ${config.border}`}
                              >
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                                  Nota clínica
                                </p>
                                <p className="text-xs text-slate-700 leading-relaxed">
                                  {item.clinical_note}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Disclaimer */}
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
                  <div className="flex items-start gap-2">
                    <Shield className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      {analysis.disclaimer}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {analysis && !loading && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-white">
            <Button
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={fetchAnalysis}
            >
              <Brain className="w-3.5 h-3.5" />
              Reanalisar
            </Button>
            <div className="flex items-center gap-2">
              {exameType === "exame-imagem" && imageUrl && (
                <Button
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => window.open(imageUrl, "_blank")}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir exame
                </Button>
              )}
              <Button
                className="h-8 text-xs bg-[#1E40AF] hover:bg-[#1e3a8a] text-white"
                onClick={() => onOpenChange(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
