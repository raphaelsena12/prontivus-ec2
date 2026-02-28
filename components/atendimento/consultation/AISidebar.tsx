"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  CheckCircle2,
  Plus,
  Loader2,
  FileText,
  FileCheck,
  FlaskConical,
  AlertCircle,
  AlertTriangle,
  Pill,
  Stethoscope,
  ExternalLink,
  Printer,
  X,
  RefreshCw,
  Search,
  Trash2,
  History,
  ChevronDown,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface ExameAnexado {
  id: string;
  nome: string;
  isFromCurrentConsulta?: boolean;
}

interface AnalysisResults {
  anamnese: string;
  cidCodes: Array<{ code: string; description: string; score: number }>;
  protocolos: Array<{ nome: string; descricao: string; justificativa?: string }>;
  exames: Array<{ nome: string; tipo: string; justificativa: string }>;
  prescricoes: Array<{
    medicamento: string;
    dosagem: string;
    posologia: string;
    duracao: string;
  }>;
}

interface Prontuario {
  id: string;
  anamnese: string | null;
  exameFisico: string | null;
  diagnostico: string | null;
  conduta: string | null;
  evolucao: string | null;
}

export interface AIContext {
  anamnese: boolean;
  alergias: boolean;
  examesIds: string[]; // IDs dos exames individuais selecionados
  medicamentos: boolean;
}

interface AISidebarProps {
  isProcessing: boolean;
  analysisResults: AnalysisResults | null;
  prontuario?: Prontuario | null;
  // Context data (para contar e enviar)
  examesAnexados: ExameAnexado[];
  medicamentosEmUso: any[];
  historicoConsultas: any[];
  // CID
  selectedCids: Set<number>;
  setSelectedCids: (s: Set<number>) => void;
  cidsManuais: Array<{ code: string; description: string }>;
  setCidDialogOpen: (v: boolean) => void;
  // Exames AI
  selectedExamesAI: Set<number>;
  setSelectedExamesAI: (s: Set<number>) => void;
  examesManuais: Array<{ nome: string; tipo: string }>;
  setExameDialogOpen: (v: boolean) => void;
  setExameSearchDialogOpen: (v: boolean) => void;
  // Prescrições
  prescricoes: Array<{ medicamento: string; dosagem: string; posologia: string; duracao: string }>;
  setPrescricoes: (p: any[]) => void;
  selectedPrescricoesAI: Set<number>;
  setSelectedPrescricoesAI: (s: Set<number>) => void;
  setMedicamentoDialogOpen: (v: boolean) => void;
  selectedPrescricaoIndex: number | null;
  setSelectedPrescricaoIndex: (v: number | null) => void;
  allergies: string[];
  // Documents
  documentModels: Array<{ id: string; nome: string }>;
  documentosGerados: Array<{
    id: string;
    tipoDocumento: string;
    nomeDocumento: string;
    createdAt: string;
    pdfBlob?: Blob;
    assinado: boolean;
    assinando?: boolean;
    erroAssinatura?: string;
  }>;
  handleGenerateDocument: (modelId: string) => Promise<void>;
  onSignDocument?: (id: string) => void | Promise<void>;
  onDeleteDocument?: (id: string) => void;
  // Action
  onGenerateSuggestions: (context: AIContext) => void;
  consultationMode: "manual" | "ai";
  // Histórico clínico para repetição
  historicoClinico?: Array<{
    consultaId: string;
    dataHora: string;
    cids: Array<{ code: string; description: string }>;
    exames: Array<{ nome: string; tipo: string | null }>;
    prescricoes: Array<{ medicamento: string; dosagem: string | null; posologia: string; duracao: string | null }>;
  }>;
  onRepetirItens?: (itens: {
    cids: Array<{ code: string; description: string }>;
    exames: Array<{ nome: string; tipo: string | null }>;
    prescricoes: Array<{ medicamento: string; dosagem: string | null; posologia: string; duracao: string | null }>;
  }) => void;
  // Legacy — não utilizados internamente, mantidos para compatibilidade
  selectedExams?: Set<string>;
  setSelectedExams?: (s: Set<string>) => void;
  documentoSearch?: string;
  setDocumentoSearch?: (v: string) => void;
  documentoSuggestions?: Array<{ id: string; nome: string }>;
}

export function AISidebar({
  isProcessing,
  analysisResults,
  prontuario,
  examesAnexados,
  medicamentosEmUso,
  selectedCids,
  setSelectedCids,
  cidsManuais,
  setCidDialogOpen,
  selectedExamesAI,
  setSelectedExamesAI,
  examesManuais,
  setExameDialogOpen,
  setExameSearchDialogOpen,
  prescricoes,
  setPrescricoes,
  selectedPrescricoesAI,
  setSelectedPrescricoesAI,
  setMedicamentoDialogOpen,
  selectedPrescricaoIndex,
  setSelectedPrescricaoIndex,
  allergies,
  documentModels,
  documentosGerados,
  handleGenerateDocument,
  onSignDocument,
  onDeleteDocument,
  onGenerateSuggestions,
  historicoClinico = [],
  onRepetirItens,
}: AISidebarProps) {
  // ── Contexto da IA ─────────────────────────────────────────────────────────
  const [aiContext, setAiContext] = useState<AIContext>({
    anamnese: true,
    alergias: true,
    examesIds: [],
    medicamentos: false,
  });

  const toggleExameContexto = (id: string) => {
    setAiContext((prev) => {
      const already = prev.examesIds.includes(id);
      return {
        ...prev,
        examesIds: already
          ? prev.examesIds.filter((x) => x !== id)
          : [...prev.examesIds, id],
      };
    });
  };

  // ── Dialog: Repetir atendimento anterior ──────────────────────────────────
  const [repetirDialogOpen, setRepetirDialogOpen] = useState(false);
  const [repetirConsultaIdx, setRepetirConsultaIdx] = useState(0);
  const [repetirTab, setRepetirTab] = useState<"prescricoes" | "exames" | "cids">("prescricoes");
  const [repetirSelPrescricoes, setRepetirSelPrescricoes] = useState<Set<number>>(new Set());
  const [repetirSelExames, setRepetirSelExames] = useState<Set<number>>(new Set());
  const [repetirSelCids, setRepetirSelCids] = useState<Set<number>>(new Set());

  const handleOpenRepetirDialog = (tab: "prescricoes" | "exames" | "cids" = "prescricoes") => {
    setRepetirConsultaIdx(0);
    setRepetirTab(tab);
    setRepetirSelPrescricoes(new Set());
    setRepetirSelExames(new Set());
    setRepetirSelCids(new Set());
    setRepetirDialogOpen(true);
  };

  const handleConfirmRepetir = () => {
    if (!onRepetirItens) return;
    const consulta = historicoClinico[repetirConsultaIdx];
    if (!consulta) return;
    onRepetirItens({
      cids: [...repetirSelCids].map(i => consulta.cids[i]).filter(Boolean),
      exames: [...repetirSelExames].map(i => consulta.exames[i]).filter(Boolean),
      prescricoes: [...repetirSelPrescricoes].map(i => consulta.prescricoes[i]).filter(Boolean),
    });
    setRepetirDialogOpen(false);
  };

  // ── Documentos picklist ────────────────────────────────────────────────────
  const [docSearch, setDocSearch] = useState("");
  const [docDropdownOpen, setDocDropdownOpen] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null);
  const [documentosImpressos, setDocumentosImpressos] = useState<Set<string>>(new Set());
  const docInputRef = useRef<HTMLInputElement>(null);
  const docDropdownRef = useRef<HTMLDivElement>(null);

  const filteredDocs = documentModels.filter(
    (d) =>
      docSearch.trim() === "" ||
      d.nome.toLowerCase().includes(docSearch.toLowerCase())
  );

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        docDropdownRef.current &&
        !docDropdownRef.current.contains(e.target as Node) &&
        docInputRef.current &&
        !docInputRef.current.contains(e.target as Node)
      ) {
        setDocDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleGenDoc = async (id: string) => {
    setLoadingDoc(id);
    setDocSearch("");
    setDocDropdownOpen(false);
    try {
      await handleGenerateDocument(id);
    } finally {
      setLoadingDoc(null);
    }
  };

  const openDoc = (doc: (typeof documentosGerados)[0]) => {
    if (doc.pdfBlob) {
      const url = URL.createObjectURL(doc.pdfBlob);
      window.open(url, "_blank");
    }
  };

  const printDoc = (doc: (typeof documentosGerados)[0]) => {
    if (doc.pdfBlob) {
      const url = URL.createObjectURL(doc.pdfBlob);
      const win = window.open(url, "_blank");
      win?.addEventListener("load", () => {
        win.print();
        // Marcar documento como impresso
        setDocumentosImpressos((prev) => new Set(prev).add(doc.id));
      });
    }
  };

  // ── AI data helpers ────────────────────────────────────────────────────────
  // hasAIData só é true se houver análise completa (CID, protocolos, exames ou prescrições)
  // Não apenas anamnese, que é gerada automaticamente após transcrição
  const hasAIData = !!(
    analysisResults && (
      (analysisResults.cidCodes && analysisResults.cidCodes.length > 0) ||
      (analysisResults.protocolos && analysisResults.protocolos.length > 0) ||
      (analysisResults.exames && analysisResults.exames.length > 0) ||
      (analysisResults.prescricoes && analysisResults.prescricoes.length > 0)
    )
  );
  const hasAnamnese = !!(
    (analysisResults?.anamnese && analysisResults.anamnese.trim()) ||
    (prontuario?.anamnese && prontuario.anamnese.trim())
  );

  const toggleCid = (i: number) => {
    const next = new Set(selectedCids);
    next.has(i) ? next.delete(i) : next.add(i);
    setSelectedCids(next);
  };

  const toggleExame = (i: number) => {
    const next = new Set(selectedExamesAI);
    next.has(i) ? next.delete(i) : next.add(i);
    setSelectedExamesAI(next);
  };

  const acceptPrescricao = (rx: AnalysisResults["prescricoes"][0], i: number) => {
    const next = new Set(selectedPrescricoesAI);
    next.add(i);
    setSelectedPrescricoesAI(next);
    setPrescricoes([...prescricoes, rx]);
  };

  const hasAllergyConflict = (med: string) =>
    allergies.some((a) => med.toLowerCase().includes(a.toLowerCase()));

  const hasCids =
    hasAIData &&
    ((analysisResults!.cidCodes?.length ?? 0) > 0 || cidsManuais.length > 0);

  const hasExames =
    hasAIData &&
    ((analysisResults!.exames?.length ?? 0) > 0 || examesManuais.length > 0);

  const hasPrescricoes =
    prescricoes.length > 0 ||
    (hasAIData && (analysisResults!.prescricoes?.length ?? 0) > 0);

  const FIXED_CONTEXT_ITEMS = [
    { key: "anamnese" as const,     label: "Anamnese da consulta" },
    { key: "alergias" as const,     label: "Alergias do paciente" },
    { key: "medicamentos" as const, label: "Medicamentos em uso" },
  ];

  return (
    <div className="space-y-1.5 w-full min-w-0 overflow-x-hidden">
    <style>{`
      @keyframes ai-slow-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes checkmark-pop {
        0% { opacity: 0; transform: scale(0.2) rotate(-15deg); }
        60% { transform: scale(1.2) rotate(3deg); }
        100% { opacity: 1; transform: scale(1) rotate(0deg); }
      }
      @keyframes ai-glow-pulse {
        0%, 100% { box-shadow: 0 0 6px 1px rgba(245,158,11,0.45); }
        50% { box-shadow: 0 0 14px 4px rgba(245,158,11,0.75); }
      }
      @keyframes ai-icon-glow {
        0%, 100% { 
          filter: drop-shadow(0 0 2px rgba(96, 165, 250, 0.6)) drop-shadow(0 0 4px rgba(59, 130, 246, 0.4));
          transform: scale(1);
        }
        50% { 
          filter: drop-shadow(0 0 4px rgba(96, 165, 250, 0.9)) drop-shadow(0 0 8px rgba(59, 130, 246, 0.6));
          transform: scale(1.05);
        }
      }
      @keyframes ai-icon-highlight {
        0%, 100% { 
          transform: scale(1);
        }
        50% { 
          transform: scale(1.1);
        }
      }
      @keyframes ai-btn-glow {
        0%, 100% {
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.4), 0 0 20px rgba(59, 130, 246, 0.2);
        }
        50% {
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.6), 0 0 30px rgba(59, 130, 246, 0.4);
        }
      }
      @keyframes ai-btn-shimmer {
        0% {
          background-position: -200% 0;
        }
        100% {
          background-position: 200% 0;
        }
      }
      @keyframes gold-shimmer {
        0% {
          background-position: -200% 0;
        }
        100% {
          background-position: 200% 0;
        }
      }
      @keyframes gold-glow {
        0%, 100% {
          box-shadow: 0 0 8px rgba(245, 158, 11, 0.5), 0 0 12px rgba(245, 158, 11, 0.3), 0 0 16px rgba(245, 158, 11, 0.2);
        }
        50% {
          box-shadow: 0 0 12px rgba(245, 158, 11, 0.7), 0 0 18px rgba(245, 158, 11, 0.5), 0 0 24px rgba(245, 158, 11, 0.3);
        }
      }
      .ai-icon-ring {
        animation: ai-slow-spin 5s linear infinite;
      }
      .ai-icon-ring-fast {
        animation: ai-slow-spin 0.7s linear infinite;
      }
      .ai-icon-animated {
        animation: ai-icon-glow 2s ease-in-out infinite;
      }
      .ai-icon-highlight {
        animation: ai-icon-highlight 2s ease-in-out infinite;
      }
      .ai-btn-glow {
        animation: ai-btn-glow 2s ease-in-out infinite;
      }
      .checkmark-anim {
        animation: checkmark-pop 0.18s cubic-bezier(0.34,1.56,0.64,1) forwards;
      }
    `}</style>

      {/* ── Box 1: IA Clínica ── */}
      <div
        className="border border-slate-200 rounded-lg overflow-hidden shadow-sm flex flex-col w-full min-w-0"
        style={{ backgroundColor: isProcessing ? "#EEF3FF" : "#F5F8FF" }}
      >

        {/* Cabeçalho azul — título do box */}
        <div
          className="px-3 py-2.5 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, #1E40AF 0%, #1e3a8a 100%)" }}
        >
          <div className="flex items-center gap-2.5 text-white">
            <Sparkles
              className="flex-shrink-0 ai-icon-highlight"
              style={{ width: "14px", height: "14px", color: "#FBBF24" }}
            />
            <span className="text-xs font-bold tracking-wider">IA Prontivus</span>
          </div>
          <span
            className={`text-[9px] px-2 py-0.5 rounded-full font-semibold border transition-all duration-500 relative overflow-hidden ${
              isProcessing
                ? "bg-amber-400/20 border-amber-300/40 text-amber-100 animate-pulse"
                : hasAIData
                ? "bg-emerald-400/20 border-emerald-300/40 text-emerald-100"
                : "bg-transparent text-white border-amber-400/60"
            }`}
            style={!isProcessing && !hasAIData ? {
              animation: 'gold-glow 2s ease-in-out infinite',
            } : {}}
          >
            {!isProcessing && !hasAIData && (
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/30 to-transparent"
                style={{
                  animation: 'gold-shimmer 2s ease-in-out infinite',
                  backgroundSize: '200% 100%',
                }}
              />
            )}
            <span className="relative z-10">
              {isProcessing ? "Analisando..." : hasAIData ? "✦ Ativa" : "✦ Ativa"}
            </span>
          </span>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden max-h-[900px]">

        {/* Contexto da IA — não é colapsável */}
        <div className="px-3 pt-3 pb-2.5">
          <p className="text-[10px] font-semibold text-[#1E40AF] uppercase tracking-widest mb-2.5">
            Selecione informações desejadas para análise:
          </p>
          <div className="space-y-2">
            {/* Itens fixos: anamnese, alergias, medicamentos */}
            {FIXED_CONTEXT_ITEMS.map((item) => {
              const checked = aiContext[item.key] as boolean;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setAiContext((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                  className="flex items-center gap-2.5 cursor-pointer group w-full text-left"
                >
                  {/* Custom tech checkbox */}
                  <div
                    className="relative flex-shrink-0 flex items-center justify-center transition-all duration-200"
                    style={{
                      width: "15px",
                      height: "15px",
                      borderRadius: "4px",
                      background: checked
                        ? "linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)"
                        : "transparent",
                      border: checked ? "none" : "1.5px solid rgba(100,116,139,0.5)",
                      boxShadow: checked
                        ? "0 0 8px rgba(37,99,235,0.5), inset 0 1px 0 rgba(255,255,255,0.15)"
                        : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {/* Corner accent lines when unchecked */}
                    {!checked && (
                      <>
                        <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "1.5px", background: "#3B82F6", borderRadius: "1px" }} />
                        <div style={{ position: "absolute", top: 0, left: 0, width: "1.5px", height: "4px", background: "#3B82F6", borderRadius: "1px" }} />
                        <div style={{ position: "absolute", bottom: 0, right: 0, width: "4px", height: "1.5px", background: "#3B82F6", borderRadius: "1px" }} />
                        <div style={{ position: "absolute", bottom: 0, right: 0, width: "1.5px", height: "4px", background: "#3B82F6", borderRadius: "1px" }} />
                      </>
                    )}
                    {checked && (
                      <svg className="checkmark-anim" width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path d="M1 3.5L3.2 5.8L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors leading-none">
                    {item.label}
                  </span>
                </button>
              );
            })}

            {/* Exames individuais */}
            {examesAnexados.length > 0 && (
              <div className="pt-0.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                  Exames anexados
                </p>
                <div className="space-y-1.5">
                  {examesAnexados.map((exame) => {
                    const checked = aiContext.examesIds.includes(exame.id);
                    return (
                      <button
                        key={exame.id}
                        type="button"
                        onClick={() => toggleExameContexto(exame.id)}
                        className="flex items-center gap-2.5 cursor-pointer group w-full text-left"
                      >
                        <div
                          className="relative flex-shrink-0 flex items-center justify-center transition-all duration-200"
                          style={{
                            width: "15px",
                            height: "15px",
                            borderRadius: "4px",
                            background: checked
                              ? "linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)"
                              : "transparent",
                            border: checked ? "none" : "1.5px solid rgba(100,116,139,0.5)",
                            boxShadow: checked
                              ? "0 0 8px rgba(37,99,235,0.5), inset 0 1px 0 rgba(255,255,255,0.15)"
                              : "none",
                          }}
                        >
                          {!checked && (
                            <>
                              <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "1.5px", background: "#3B82F6", borderRadius: "1px" }} />
                              <div style={{ position: "absolute", top: 0, left: 0, width: "1.5px", height: "4px", background: "#3B82F6", borderRadius: "1px" }} />
                              <div style={{ position: "absolute", bottom: 0, right: 0, width: "4px", height: "1.5px", background: "#3B82F6", borderRadius: "1px" }} />
                              <div style={{ position: "absolute", bottom: 0, right: 0, width: "1.5px", height: "4px", background: "#3B82F6", borderRadius: "1px" }} />
                            </>
                          )}
                          {checked && (
                            <svg className="checkmark-anim" width="9" height="7" viewBox="0 0 9 7" fill="none">
                              <path d="M1 3.5L3.2 5.8L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors truncate">
                          {exame.nome}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botão Gerar */}
        <div className="px-3 pb-3 border-t border-slate-100 pt-2.5">
          <div className="relative">
            <Button
              onClick={() => onGenerateSuggestions(aiContext)}
              disabled={isProcessing || !hasAnamnese}
              className={`relative w-full gap-1.5 h-8 text-xs border-blue-300 text-blue-700 hover:text-blue-800 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 hover:from-blue-100 hover:via-indigo-100 hover:to-blue-100 flex-shrink-0 overflow-hidden transition-all duration-300 font-semibold ${
                !hasAnamnese || isProcessing ? "cursor-not-allowed opacity-50" : "ai-btn-glow"
              }`}
              style={{ 
                borderRadius: "5px",
                backgroundSize: '200% 100%',
                animation: (!hasAnamnese || isProcessing) ? 'none' : 'ai-btn-glow 2s ease-in-out infinite',
              }}
              variant="outline"
            >
              {/* Efeito shimmer - só quando não está desabilitado */}
              {hasAnamnese && !isProcessing && (
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  style={{
                    animation: 'ai-btn-shimmer 3s ease-in-out infinite',
                    backgroundSize: '200% 100%',
                  }}
                />
              )}
              
              {/* Conteúdo do botão */}
              <div className="relative flex items-center gap-1.5 z-10">
                {isProcessing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : hasAIData ? (
                  <RefreshCw className="w-3.5 h-3.5" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                )}
                <span className="font-semibold">
                  {isProcessing
                    ? "Analisando..."
                    : hasAIData
                    ? "Regenerar Sugestões"
                    : "Analisar com IA"}
                </span>
              </div>
            </Button>
          </div>
        </div>

        {/* ── CID Sugerido ── */}
        <div className="border-t border-slate-100">
          <div className="px-3 py-2 border-b border-slate-200 flex items-center gap-1.5" style={{ background: "linear-gradient(135deg, #1E40AF 0%, #1e3a8a 100%)" }}>
            <Stethoscope
              className="flex-shrink-0 ai-icon-highlight"
              style={{ width: "14px", height: "14px", color: "#FBBF24" }}
            />
            <span className="text-xs font-semibold text-white">CID 10 Sugerido por IA</span>
            {(analysisResults?.cidCodes?.length ?? 0) > 0 && (
              <span className="ml-auto text-[10px] bg-white/20 text-white border border-white/30 px-1.5 py-0.5 rounded-full font-medium">
                {analysisResults!.cidCodes.length}
              </span>
            )}
          </div>
          <div className="divide-y divide-slate-50">
            {isProcessing ? (
              <div className="px-3 py-3 space-y-2">
                <Skeleton className="h-4 rounded bg-blue-50/80" style={{ width: "70%" }} />
                <Skeleton className="h-3 rounded bg-blue-50/60" style={{ width: "50%" }} />
              </div>
            ) : (analysisResults?.cidCodes?.length ?? 0) === 0 && cidsManuais.length === 0 ? (
              <div className="px-3 py-2 flex items-center gap-2">
                <Stethoscope className="w-3 h-3 text-slate-300" />
                <p className="text-[11px] text-slate-300">Aguardando análise da IA</p>
              </div>
            ) : (
              <>
                {analysisResults?.cidCodes?.map((cid, i) => (
                  <div
                    key={i}
                    className={`px-3 py-2.5 flex items-center justify-between gap-2 transition-colors animate-in fade-in duration-300 ${
                      selectedCids.has(i) ? "bg-blue-50/40" : "hover:bg-slate-50"
                    }`}
                  >
                    <button
                      onClick={() => toggleCid(i)}
                      className="flex items-center gap-2.5 flex-1 text-left"
                    >
                      {selectedCids.has(i) ? (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-xs font-medium text-slate-600 leading-none">{cid.code}</p>
                        <p className="text-xs text-slate-400 leading-tight mt-0.5">{cid.description}</p>
                      </div>
                    </button>
                    {!selectedCids.has(i) && (
                      <button
                        onClick={() => toggleCid(i)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded flex-shrink-0 transition-colors"
                      >
                        Aceitar
                      </button>
                    )}
                  </div>
                ))}
                {cidsManuais.map((cid, i) => (
                  <div key={`m-${i}`} className="px-3 py-2.5 flex items-center gap-2.5 animate-in fade-in duration-300">
                    <CheckCircle2 className="w-4 h-4 text-blue-300 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-slate-600">{cid.code}</p>
                      <p className="text-xs text-slate-400">{cid.description}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
            <div className="px-3 py-2">
              <button
                onClick={() => setCidDialogOpen(true)}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Adicionar CID manualmente
              </button>
            </div>
          </div>
        </div>

        {/* ── Exames Recomendados ── */}
        <div className="border-t border-slate-100">
          <div className="px-3 py-2 border-b border-slate-200 flex items-center gap-1.5" style={{ background: "linear-gradient(135deg, #1E40AF 0%, #1e3a8a 100%)" }}>
            <FlaskConical
              className="flex-shrink-0 ai-icon-highlight"
              style={{ width: "14px", height: "14px", color: "#FBBF24" }}
            />
            <span className="text-xs font-semibold text-white">Exames Sugeridos por IA</span>
            <div className="ml-auto flex items-center gap-2">
              {(analysisResults?.exames?.length ?? 0) > 0 && (
                <span className="text-[10px] bg-white/20 text-white border border-white/30 px-1.5 py-0.5 rounded-full font-medium">
                  {analysisResults!.exames.length}
                </span>
              )}
              <button
                onClick={() => handleOpenRepetirDialog("exames")}
                className="p-0.5 rounded text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                title="Histórico de exames anteriores"
              >
                <History className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setExameSearchDialogOpen(true)}
                className="p-0.5 rounded text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                title="Buscar exame"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {isProcessing ? (
              <div className="px-3 py-3 space-y-2">
                <Skeleton className="h-4 rounded bg-blue-50/80" style={{ width: "65%" }} />
                <Skeleton className="h-4 rounded bg-blue-50/60" style={{ width: "80%" }} />
              </div>
            ) : (analysisResults?.exames?.length ?? 0) === 0 && examesManuais.length === 0 ? (
              <div className="px-3 py-2 flex items-center gap-2">
                <FlaskConical className="w-3 h-3 text-slate-300" />
                <p className="text-[11px] text-slate-300">Aguardando análise da IA</p>
              </div>
            ) : (
              <>
                {analysisResults?.exames?.map((exame, i) => (
                  <div
                    key={i}
                    onClick={() => toggleExame(i)}
                    className={`px-3 py-2.5 flex items-center gap-2.5 cursor-pointer transition-colors animate-in fade-in duration-300 ${
                      selectedExamesAI.has(i) ? "bg-blue-50/40" : "hover:bg-slate-50"
                    }`}
                  >
                    {selectedExamesAI.has(i) ? (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded border-2 border-slate-300 flex-shrink-0" />
                    )}
                    <span className="text-xs font-medium text-slate-600">{exame.nome}</span>
                  </div>
                ))}
                {examesManuais.map((e, i) => (
                  <div key={`m-${i}`} className="px-3 py-2.5 flex items-center gap-2.5 animate-in fade-in duration-300">
                    <CheckCircle2 className="w-4 h-4 text-blue-300 flex-shrink-0" />
                    <span className="text-xs text-slate-600">{e.nome}</span>
                  </div>
                ))}
              </>
            )}
            <div className="px-3 py-2 flex items-center gap-2">
              <button
                onClick={() => setExameDialogOpen(true)}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Adicionar exames manualmente
              </button>
            </div>
          </div>
        </div>

        {/* ── Prescrições ── */}
        <div className="border-t border-slate-100">
          <div className="px-3 py-2 border-b border-slate-200 flex items-center gap-1.5" style={{ background: "linear-gradient(135deg, #1E40AF 0%, #1e3a8a 100%)" }}>
            <Pill
              className="flex-shrink-0 ai-icon-highlight"
              style={{ width: "14px", height: "14px", color: "#FBBF24" }}
            />
            <span className="text-xs font-semibold text-white">Prescrições Sugeridas por IA</span>
            <div className="ml-auto flex items-center gap-2">
              {prescricoes.length > 0 && (
                <span className="text-[10px] bg-white/20 text-white border border-white/30 px-1.5 py-0.5 rounded-full font-medium">
                  {prescricoes.length}
                </span>
              )}
              <button
                onClick={() => handleOpenRepetirDialog("prescricoes")}
                className="p-0.5 rounded text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                title="Histórico de prescrições anteriores"
              >
                <History className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setSelectedPrescricaoIndex(null);
                  setMedicamentoDialogOpen(true);
                }}
                className="p-0.5 rounded text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                title="Buscar medicamento"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {isProcessing ? (
              <div className="px-3 py-3 space-y-2">
                <Skeleton className="h-4 rounded bg-blue-50/80" style={{ width: "72%" }} />
                <Skeleton className="h-3 rounded bg-blue-50/60" style={{ width: "45%" }} />
              </div>
            ) : prescricoes.length === 0 && (analysisResults?.prescricoes?.length ?? 0) === 0 ? (
              <div className="px-3 py-2 flex items-center gap-2">
                <Pill className="w-3 h-3 text-slate-300" />
                <p className="text-[11px] text-slate-300">Aguardando análise da IA</p>
              </div>
            ) : (
              <>
                {prescricoes.map((rx, i) => {
                  const conflict = hasAllergyConflict(rx.medicamento);
                  return (
                    <div key={`rx-${i}`} className={`px-3 py-2.5 animate-in fade-in duration-300 ${conflict ? "bg-red-50/60" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-1.5 flex-1">
                          {conflict && (
                            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          )}
                          <div>
                            <p className="text-xs font-medium text-slate-600">{rx.medicamento}</p>
                            <p className="text-xs text-slate-400">
                              {rx.dosagem}{rx.posologia ? ` · ${rx.posologia}` : ""}
                            </p>
                            {conflict && (
                              <p className="text-xs text-red-600 font-medium mt-0.5">
                                Atenção: possível conflito com alergia
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setPrescricoes(prescricoes.filter((_, idx) => idx !== i))}
                          className="text-slate-200 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {analysisResults?.prescricoes
                  ?.filter(
                    (rx, i) =>
                      !selectedPrescricoesAI.has(i) &&
                      !prescricoes.find((p) => p.medicamento === rx.medicamento)
                  )
                  .map((rx, i) => (
                    <div key={`ai-rx-${i}`} className="px-3 py-2.5 bg-blue-50/30 animate-in fade-in duration-300">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium text-slate-600">{rx.medicamento}</p>
                          <p className="text-xs text-slate-400">
                            {rx.dosagem}{rx.posologia ? ` · ${rx.posologia}` : ""}
                          </p>
                        </div>
                        <button
                          onClick={() => acceptPrescricao(rx, i)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded flex-shrink-0 transition-colors"
                        >
                          Aceitar
                        </button>
                      </div>
                    </div>
                  ))}
              </>
            )}
            <div className="px-3 py-2">
              <button
                onClick={() => {
                  setSelectedPrescricaoIndex(null);
                  setMedicamentoDialogOpen(true);
                }}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Adicionar prescrição manualmente
              </button>
            </div>
          </div>
        </div>

        </div> {/* fim scroll wrapper */}
      </div>

      {/* ── Dialog: Repetir atendimento anterior ── */}
      <Dialog open={repetirDialogOpen} onOpenChange={setRepetirDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <History className="w-4 h-4 text-indigo-600" />
              Carregar atendimento anterior
            </DialogTitle>
          </DialogHeader>

          {/* Estado vazio */}
          {historicoClinico.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <History className="w-8 h-8 text-slate-300" />
              <p className="text-sm text-slate-500 font-medium">Nenhum atendimento anterior encontrado</p>
              <p className="text-xs text-slate-400">Este paciente não possui consultas anteriores com prescrições ou exames registrados.</p>
            </div>
          )}

          {/* Seletor de consulta */}
          {historicoClinico.length > 1 && (
            <div className="px-1 pb-2">
              <p className="text-xs text-slate-500 mb-1.5 font-medium">Selecionar consulta:</p>
              <div className="flex flex-wrap gap-1.5">
                {historicoClinico.map((c, idx) => {
                  const dt = new Date(c.dataHora);
                  const label = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
                  const total = c.prescricoes.length + c.exames.length + c.cids.length;
                  return (
                    <button
                      key={c.consultaId}
                      onClick={() => {
                        setRepetirConsultaIdx(idx);
                        setRepetirSelPrescricoes(new Set());
                        setRepetirSelExames(new Set());
                        setRepetirSelCids(new Set());
                      }}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        repetirConsultaIdx === idx
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                      }`}
                    >
                      {label} · {total} iten{total !== 1 ? "s" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Abas */}
          {(() => {
            const consulta = historicoClinico[repetirConsultaIdx];
            if (!consulta) return null;
            return (
              <Tabs value={repetirTab} onValueChange={(v) => setRepetirTab(v as "prescricoes" | "exames" | "cids")} className="flex-1 flex flex-col min-h-0">
                <TabsList className="grid grid-cols-3 h-8 mb-2">
                  <TabsTrigger value="prescricoes" className="text-xs">
                    Prescrições {consulta.prescricoes.length > 0 && <span className="ml-1 text-[10px] bg-slate-200 px-1 rounded-full">{consulta.prescricoes.length}</span>}
                  </TabsTrigger>
                  <TabsTrigger value="exames" className="text-xs">
                    Exames {consulta.exames.length > 0 && <span className="ml-1 text-[10px] bg-slate-200 px-1 rounded-full">{consulta.exames.length}</span>}
                  </TabsTrigger>
                  <TabsTrigger value="cids" className="text-xs">
                    CIDs {consulta.cids.length > 0 && <span className="ml-1 text-[10px] bg-slate-200 px-1 rounded-full">{consulta.cids.length}</span>}
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto min-h-0">
                  <TabsContent value="prescricoes" className="mt-0">
                    {consulta.prescricoes.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">Nenhuma prescrição neste atendimento</p>
                    ) : (
                      <div className="space-y-1">
                        {consulta.prescricoes.map((p, i) => (
                          <label key={i} className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={repetirSelPrescricoes.has(i)}
                              onChange={() => setRepetirSelPrescricoes(prev => {
                                const next = new Set(prev);
                                next.has(i) ? next.delete(i) : next.add(i);
                                return next;
                              })}
                              className="mt-0.5 w-3.5 h-3.5 rounded border-slate-300 accent-indigo-600 cursor-pointer flex-shrink-0"
                            />
                            <div>
                              <p className="text-xs font-medium text-slate-700">{p.medicamento}{p.dosagem ? ` ${p.dosagem}` : ""}</p>
                              <p className="text-xs text-slate-400">{p.posologia}{p.duracao ? ` · ${p.duracao}` : ""}</p>
                            </div>
                          </label>
                        ))}
                        <button
                          onClick={() => setRepetirSelPrescricoes(new Set(consulta.prescricoes.map((_, i) => i)))}
                          className="text-xs text-indigo-600 hover:underline px-2 pb-1"
                        >
                          Selecionar todas
                        </button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="exames" className="mt-0">
                    {consulta.exames.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">Nenhum exame neste atendimento</p>
                    ) : (
                      <div className="space-y-1">
                        {consulta.exames.map((e, i) => (
                          <label key={i} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={repetirSelExames.has(i)}
                              onChange={() => setRepetirSelExames(prev => {
                                const next = new Set(prev);
                                next.has(i) ? next.delete(i) : next.add(i);
                                return next;
                              })}
                              className="w-3.5 h-3.5 rounded border-slate-300 accent-indigo-600 cursor-pointer flex-shrink-0"
                            />
                            <div>
                              <p className="text-xs font-medium text-slate-700">{e.nome}</p>
                              {e.tipo && <p className="text-xs text-slate-400">{e.tipo}</p>}
                            </div>
                          </label>
                        ))}
                        <button
                          onClick={() => setRepetirSelExames(new Set(consulta.exames.map((_, i) => i)))}
                          className="text-xs text-indigo-600 hover:underline px-2 pb-1"
                        >
                          Selecionar todos
                        </button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="cids" className="mt-0">
                    {consulta.cids.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">Nenhum CID neste atendimento</p>
                    ) : (
                      <div className="space-y-1">
                        {consulta.cids.map((c, i) => (
                          <label key={i} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={repetirSelCids.has(i)}
                              onChange={() => setRepetirSelCids(prev => {
                                const next = new Set(prev);
                                next.has(i) ? next.delete(i) : next.add(i);
                                return next;
                              })}
                              className="w-3.5 h-3.5 rounded border-slate-300 accent-indigo-600 cursor-pointer flex-shrink-0"
                            />
                            <div>
                              <p className="text-xs font-medium text-slate-700">{c.code}</p>
                              <p className="text-xs text-slate-400">{c.description}</p>
                            </div>
                          </label>
                        ))}
                        <button
                          onClick={() => setRepetirSelCids(new Set(consulta.cids.map((_, i) => i)))}
                          className="text-xs text-indigo-600 hover:underline px-2 pb-1"
                        >
                          Selecionar todos
                        </button>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            );
          })()}

          {/* Rodapé */}
          <div className={`flex items-center justify-between pt-3 border-t border-slate-100 ${historicoClinico.length === 0 ? "hidden" : ""}`}>
            <p className="text-xs text-slate-400">
              {repetirSelPrescricoes.size + repetirSelExames.size + repetirSelCids.size} item(s) selecionado(s)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setRepetirDialogOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRepetir}
                disabled={repetirSelPrescricoes.size + repetirSelExames.size + repetirSelCids.size === 0}
                className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition-all disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)" }}
              >
                Adicionar selecionados
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Box 2: Documentos ── */}
      <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm flex flex-col w-full min-w-0" style={{ backgroundColor: "#F5F8FF" }}>

        {/* Cabeçalho — mesmo estilo do box IA Clínica */}
        <div
          className="px-3 py-2.5 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, #1E40AF 0%, #1e3a8a 100%)" }}
        >
          <div className="flex items-center gap-2 text-white">
            <FileText className="w-4 h-4" />
            <span className="text-xs font-bold tracking-wider ">Documentos</span>
          </div>
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium border ${
              documentosGerados.length > 0
                ? "bg-emerald-400/20 border-emerald-300/40 text-emerald-100"
                : "bg-white/10 border-white/20 text-white/70"
            }`}
          >
            {documentosGerados.length > 0
              ? `${documentosGerados.length} gerado${documentosGerados.length !== 1 ? "s" : ""}`
              : "Vazio"}
          </span>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-[320px] max-h-[4800px]">

        {/* Picklist digitável */}
        <div className="px-3 pt-3 pb-2.5">
          <div className="relative">
            <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2 py-2 bg-white focus-within:border-[#1E40AF] transition-colors">
              <Search className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <input
                ref={docInputRef}
                type="text"
                value={docSearch}
                onChange={(e) => {
                  setDocSearch(e.target.value);
                  setDocDropdownOpen(true);
                }}
                onFocus={() => setDocDropdownOpen(true)}
                placeholder="Buscar documento..."
                className="flex-1 text-xs text-slate-700 bg-transparent outline-none placeholder:text-slate-400 min-w-0"
              />
              {loadingDoc && <Loader2 className="w-3 h-3 text-slate-400 animate-spin flex-shrink-0" />}
            </div>

            {/* Dropdown de resultados - posicionado fixo para não ser cortado */}
            {docDropdownOpen && filteredDocs.length > 0 && (
              <div
                ref={docDropdownRef}
                className="absolute z-[100] top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto"
              >
                {filteredDocs.slice(0, 12).map((doc) => {
                  const alreadyGenerated = documentosGerados.some(
                    (d) => d.tipoDocumento === doc.id
                  );
                  return (
                    <button
                      key={doc.id}
                      onClick={() => handleGenDoc(doc.id)}
                      disabled={loadingDoc === doc.id}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-50 text-left transition-colors"
                    >
                      {loadingDoc === doc.id ? (
                        <Loader2 className="w-3 h-3 text-slate-400 animate-spin flex-shrink-0" />
                      ) : alreadyGenerated ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <FileText className="w-3 h-3 text-slate-300 flex-shrink-0" />
                      )}
                      <span className="text-xs text-slate-700 truncate">{doc.nome}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Lista de documentos gerados */}
        {documentosGerados.length > 0 && (
          <div className="px-3 pb-3">
            <div className="space-y-1">
              {documentosGerados.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <FileText className="w-3 h-3 text-[#1E40AF] flex-shrink-0" />
                  <span className="text-xs text-slate-700 truncate flex-1">
                    {doc.nomeDocumento}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium border flex-shrink-0 ${
                      doc.assinado
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-amber-50 border-amber-200 text-amber-700"
                    }`}
                    title={doc.assinado ? "Assinado" : "Não assinado"}
                  >
                    {doc.assinado ? "Assinado" : "Não assinado"}
                  </span>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {doc.pdfBlob && (
                      <>
                        <button
                          onClick={() => openDoc(doc)}
                          title="Abrir"
                          className="p-0.5 rounded text-slate-400 hover:text-[#1E40AF] hover:bg-blue-50 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => printDoc(doc)}
                          title="Imprimir"
                          className={`p-0.5 rounded transition-colors ${
                            documentosImpressos.has(doc.id)
                              ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <Printer className="w-3 h-3" />
                        </button>
                      </>
                    )}
                    {doc.erroAssinatura && (
                      <span
                        title={doc.erroAssinatura}
                        className="p-0.5 rounded text-red-500 bg-red-50"
                      >
                        <AlertCircle className="w-3 h-3" />
                      </span>
                    )}
                    {onSignDocument && doc.pdfBlob && (
                      <button
                        onClick={() => onSignDocument(doc.id)}
                        title={
                          doc.assinando
                            ? "Assinando..."
                            : doc.assinado
                              ? "Documento já assinado"
                              : "Assinar digitalmente"
                        }
                        disabled={!!doc.assinado || !!doc.assinando}
                        className={`p-0.5 rounded transition-colors ${
                          doc.assinado
                            ? "text-emerald-600 bg-emerald-50"
                            : "text-slate-400 hover:text-[#1E40AF] hover:bg-blue-50"
                        } ${doc.assinando ? "opacity-70 cursor-not-allowed" : ""}`}
                      >
                        {doc.assinado ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : doc.assinando ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <FileCheck className="w-3 h-3" />
                        )}
                      </button>
                    )}
                    {onDeleteDocument && (
                      <button
                        onClick={() => onDeleteDocument(doc.id)}
                        title="Remover"
                        className="p-0.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {documentosGerados.length === 0 && (
          <div className="px-3 pb-3">
            <p className="text-xs text-slate-400 text-center">
              Busque e clique em um documento para gerá-lo
            </p>
          </div>
        )}

        </div>
      </div>

      {/* ── Rodapé branding ── */}
      <div className="pt-1 pb-0.5 flex items-center justify-center gap-1.5">
        
      </div>
    </div>
  );
}
