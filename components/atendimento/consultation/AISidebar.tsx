"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
  Check,
  Brain,
  ClipboardList,
  Paperclip,
  MessageSquare,
  Send,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface ExameAnexado {
  id: string;
  nome: string;
  isFromCurrentConsulta?: boolean;
}

interface AnalysisResults {
  anamnese: string;
  raciocinioClinico?: string;
  cidCodes: Array<{ code: string; description: string; score: number; validado?: boolean }>;
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
  orientacoesConduta: string | null;
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
  setCidsManuais: (cids: Array<{ code: string; description: string }>) => void;
  setCidDialogOpen: (v: boolean) => void;
  setCidSearchDialogOpen: (v: boolean) => void;
  // Exames AI
  selectedExamesAI: Set<number>;
  setSelectedExamesAI: (s: Set<number>) => void;
  examesManuais: Array<{ nome: string; tipo: string }>;
  setExamesManuais: (e: Array<{ nome: string; tipo: string }>) => void;
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
  // Orientações
  orientacoes: string;
  setOrientacoes: (v: string) => void;
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
  handleGenerateDocument: (modelId: string, extraDados?: Record<string, any>) => Promise<void>;
  onSignDocument?: (id: string) => void | Promise<void>;
  onDeleteDocument?: (id: string) => void;
  // Anexar exame
  onAttachExame?: () => void;
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
  // Chat de telemedicina (opcional)
  chatMessages?: Array<{ id: number; sender: string; text: string; time: string }>;
  onSendMessage?: (text: string) => void;
  isTelemedicina?: boolean;
  // Alerta visual de CID obrigatório
  cidAlertVisible?: boolean;
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
  setCidsManuais,
  setCidDialogOpen,
  setCidSearchDialogOpen,
  selectedExamesAI,
  setSelectedExamesAI,
  examesManuais,
  setExamesManuais,
  setExameDialogOpen,
  setExameSearchDialogOpen,
  prescricoes,
  setPrescricoes,
  selectedPrescricoesAI,
  setSelectedPrescricoesAI,
  setMedicamentoDialogOpen,
  selectedPrescricaoIndex,
  setSelectedPrescricaoIndex,
  orientacoes,
  setOrientacoes,
  allergies,
  documentModels,
  documentosGerados,
  handleGenerateDocument,
  onSignDocument,
  onDeleteDocument,
  onAttachExame,
  onGenerateSuggestions,
  historicoClinico = [],
  onRepetirItens,
  chatMessages,
  onSendMessage,
  isTelemedicina = false,
  cidAlertVisible = false,
}: AISidebarProps) {
  // ── Chat telemedicina ──────────────────────────────────────────────────────
  const [chatInput, setChatInput] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (chatMessages && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // ── Contexto da IA ─────────────────────────────────────────────────────────
  const [aiContext, setAiContext] = useState<AIContext>({
    anamnese: true,
    alergias: true,
    examesIds: [],
    medicamentos: true,
  });

  // Auto-selecionar novos exames da consulta atual para análise da IA
  const prevExamesRef = useRef<string[]>([]);
  useEffect(() => {
    const currentIds = examesAnexados.filter(e => e.isFromCurrentConsulta).map(e => e.id);
    const prevIds = prevExamesRef.current;
    const newIds = currentIds.filter(id => !prevIds.includes(id));
    if (newIds.length > 0) {
      setAiContext(prev => ({
        ...prev,
        examesIds: [...new Set([...prev.examesIds, ...newIds])],
      }));
    }
    prevExamesRef.current = currentIds;
  }, [examesAnexados]);

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
  const [docDropdownRect, setDocDropdownRect] = useState<DOMRect | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const docDropdownRef = useRef<HTMLDivElement>(null);
  const docInputWrapperRef = useRef<HTMLDivElement>(null);

  const openDocDropdown = useCallback(() => {
    if (docInputWrapperRef.current) {
      setDocDropdownRect(docInputWrapperRef.current.getBoundingClientRect());
    }
    setDocDropdownOpen(true);
  }, []);

  const [examAnalysisModalOpen, setExamAnalysisModalOpen] = useState(false);
  const [selectedExamForAnalysis, setSelectedExamForAnalysis] = useState<ExameAnexado | null>(null);


  const filteredDocs = documentModels.filter(
    (d) =>
      docSearch.trim() === "" ||
      d.nome.toLowerCase().includes(docSearch.toLowerCase())
  );

  // Fechar dropdown ao clicar fora e atualizar posição no scroll
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        docDropdownRef.current &&
        !docDropdownRef.current.contains(e.target as Node) &&
        docInputWrapperRef.current &&
        !docInputWrapperRef.current.contains(e.target as Node)
      ) {
        setDocDropdownOpen(false);
      }
    }
    function handleScroll() {
      if (docDropdownOpen && docInputWrapperRef.current) {
        setDocDropdownRect(docInputWrapperRef.current.getBoundingClientRect());
      }
    }
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [docDropdownOpen]);

  const handleGenDoc = (id: string) => {
    setDocSearch("");
    setDocDropdownOpen(false);
    runGenDoc(id);
  };

  const runGenDoc = async (id: string, extraDados?: Record<string, any>) => {
    setLoadingDoc(id);
    try {
      await handleGenerateDocument(id, extraDados);
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

  const togglePrescricaoAI = (i: number) => {
    const next = new Set(selectedPrescricoesAI);
    next.has(i) ? next.delete(i) : next.add(i);
    setSelectedPrescricoesAI(next);
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

  const selectedContextExams = examesAnexados.filter((exame) =>
    aiContext.examesIds.includes(exame.id)
  );

  const openExamFile = async (examId: string) => {
    try {
      const response = await fetch(`/api/medico/exames/url?exameId=${encodeURIComponent(examId)}`);
      if (!response.ok) return;
      const data = await response.json();
      if (data?.url) window.open(data.url, "_blank");
    } catch (error) {
      console.error("Erro ao abrir exame:", error);
    }
  };

  const resolveExamConclusion = (analysisText?: string): "Ótimo" | "Bom" | "Ruim" | "Muito Ruim" => {
    const text = (analysisText || "").toLowerCase();
    if (!text.trim()) return "Bom";

    if (/grave|cr[ií]tic|sever|urgente|alto risco|descompensa|importante altera/.test(text)) {
      return "Muito Ruim";
    }

    const hasBad =
      /alterad|fora da faixa|anormal|aten[çc][ãa]o|infe[cç][ãa]o|inflama[cç][ãa]o|reduzid|elevad/.test(text);
    const hasGood =
      /normal|normalidade|sem altera[cç][õo]es|dentro da faixa|dentro do esperado|aus[êe]ncia/.test(text);

    if (hasBad && hasGood) return "Bom";
    if (hasBad) return "Ruim";
    if (hasGood) return "Ótimo";
    return "Bom";
  };

  const getConclusionStyles = (conclusao: "Ótimo" | "Bom" | "Ruim" | "Muito Ruim") => {
    if (conclusao === "Ótimo") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (conclusao === "Bom") return "bg-blue-50 text-blue-700 border-blue-200";
    if (conclusao === "Ruim") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  const getConclusionReason = (analysisText?: string): string => {
    const text = (analysisText || "").trim();
    if (!text) return "A IA ainda não retornou detalhes analíticos para os exames selecionados.";
    const firstSentence = text.split(/(?<=[.!?])\s+/)[0];
    return firstSentence || text;
  };

  const hasExamAnalysisReady = !!(analysisResults?.raciocinioClinico && analysisResults.raciocinioClinico.trim());

  const FIXED_CONTEXT_ITEMS = [
    { key: "anamnese" as const,     label: "Anamnese da consulta" },
    { key: "medicamentos" as const, label: "Medicamentos em uso" },
  ];

  return (
    <>
    <div className="w-full min-w-0 overflow-x-hidden">
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

      {/* ── Box único: Assistente Clínico ── */}
      <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col w-full min-w-0 bg-white shadow-sm">

        {/* Cabeçalho premium — único no box */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-blue-900" style={{ background: "linear-gradient(135deg, #1E40AF 0%, #1e3a8a 100%)" }}>
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 flex-shrink-0 ai-icon-highlight" style={{ color: "#FBBF24" }} />
            <div>
              <span className="text-xs font-bold text-white tracking-wide">IA Clínica</span>
              <span className="text-[10px] text-blue-300 ml-1.5">Prontivus</span>
            </div>
          </div>
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border transition-all duration-300 ${
            isProcessing
              ? "bg-amber-400/20 border-amber-400/40 text-amber-300 animate-pulse"
              : hasAIData
              ? "bg-emerald-400/20 border-emerald-400/40 text-emerald-300"
              : "bg-amber-400/15 border-amber-400/30 text-amber-300"
          }`}>
            {isProcessing ? "Analisando..." : "✦ Ativa"}
          </span>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden max-h-[900px]">

        {/* Contexto da IA — não é colapsável */}
        <div className="px-3 pt-3 pb-2.5">
          <p className="text-[10px] font-semibold text-[#1E40AF] uppercase tracking-widest mb-2.5">
            Selecione para analisar com Inteligência Artificial:
          </p>
          <div className="space-y-2">
            {/* Itens fixos: anamnese e medicamentos */}
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
            {(examesAnexados.length > 0 || onAttachExame) && (
              <div className="pt-0.5">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                    Exames anexados
                  </p>
                  {onAttachExame && (
                    <button
                      type="button"
                      onClick={onAttachExame}
                      className="p-0.5 rounded hover:bg-slate-100 transition-colors text-slate-400 hover:text-blue-600"
                      title="Anexar exame"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {examesAnexados.length === 0 && (
                    <p className="text-[10px] text-slate-400 italic">Nenhum exame anexado</p>
                  )}
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

        {/* ── Análise de Exames ── */}
        <div className="border-t border-slate-100">
          <div className="px-3 py-2 flex items-center gap-2 bg-slate-50 border-b border-slate-100">
            <Brain className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide flex-1">Análise de Exames</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-white">✦ IA</span>
          </div>
          <div className="divide-y divide-slate-50">
            {selectedContextExams.length === 0 ? (
              <div className="px-3 py-2.5">
                <p className="text-[11px] text-slate-400 italic">
                  Selecione ao menos um exame no contexto da IA para ver a análise por exame.
                </p>
              </div>
            ) : (
              selectedContextExams.map((exame) => {
                const conclusao = hasExamAnalysisReady
                  ? resolveExamConclusion(analysisResults?.raciocinioClinico)
                  : null;
                return (
                  <div key={`exam-analysis-${exame.id}`} className="px-3 py-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!hasExamAnalysisReady) return;
                        setSelectedExamForAnalysis(exame);
                        setExamAnalysisModalOpen(true);
                      }}
                      className="flex-1 min-w-0 text-left"
                      title={hasExamAnalysisReady ? "Abrir análise completa" : "Aguardando análise da IA"}
                    >
                      <p className={`text-xs font-medium truncate ${hasExamAnalysisReady ? "text-slate-700 hover:text-blue-700 hover:underline cursor-pointer" : "text-slate-500"}`}>
                        {exame.nome}
                      </p>
                    </button>
                    {conclusao ? (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getConclusionStyles(conclusao)}`}>
                        {conclusao}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-50 text-slate-500 border-slate-200">
                        Aguardando IA
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── CID-10 ── */}
        <div className="border-t border-slate-100 relative">
          {cidAlertVisible && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-50 animate-bounce">
              <div className="bg-red-500 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                Selecione ao menos 1 CID-10
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-red-500" />
              </div>
            </div>
          )}
          <div className={`px-3 py-2 flex items-center gap-2 border-b border-slate-100 transition-colors ${cidAlertVisible ? "bg-red-50" : "bg-slate-50"}`}>
            <Stethoscope className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide flex-1">CID-10 Diagnóstico</span>
            <div className="flex items-center gap-1">
              {(analysisResults?.cidCodes?.length ?? 0) > 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-white">
                  {analysisResults!.cidCodes.length}
                </span>
              )}
              <button
                onClick={() => setCidSearchDialogOpen(true)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                title="Buscar CID"
              >
                <Search className="w-3 h-3" />
              </button>
            </div>
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
                      className="flex items-center gap-2.5 flex-1 text-left cursor-pointer"
                    >
                      {selectedCids.has(i) ? (
                        <div className="w-4 h-4 rounded border-2 bg-blue-600 border-blue-600 flex items-center justify-center flex-shrink-0">
                          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded border-2 border-slate-300 flex-shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium text-slate-600 leading-none">{cid.code}</p>
                          {/* Badge de confiança do diagnóstico */}
                          <span className={`text-[9px] font-semibold px-1 py-0.5 rounded border ${
                            cid.score >= 0.8
                              ? "bg-red-50 text-red-600 border-red-200"
                              : cid.score >= 0.5
                              ? "bg-amber-50 text-amber-600 border-amber-200"
                              : "bg-slate-50 text-slate-500 border-slate-200"
                          }`}>
                            {cid.score >= 0.8 ? "Alta" : cid.score >= 0.5 ? "Média" : "Diferencial"}
                          </span>
                          {/* CID não encontrado no catálogo oficial */}
                          {cid.validado === false && (
                            <span className="text-[9px] font-semibold px-1 py-0.5 rounded border bg-orange-50 text-orange-600 border-orange-200" title="Código não encontrado no catálogo CID-10 cadastrado. Verifique antes de usar.">
                              ⚠ Não catalogado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 leading-tight mt-0.5">{cid.description}</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-white flex-shrink-0">
                        ✦ IA
                      </span>
                    </div>
                  </div>
                ))}
                {cidsManuais.map((cid, i) => (
                  <div key={`m-${i}`} className="px-3 py-2.5 flex items-center gap-2.5 animate-in fade-in duration-300 bg-blue-50/40">
                    <div className="w-4 h-4 rounded border-2 bg-blue-600 border-blue-600 flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-600">{cid.code}</p>
                      <p className="text-xs text-slate-400">{cid.description}</p>
                    </div>
                    <button
                      onClick={() => setCidsManuais(cidsManuais.filter((_, idx) => idx !== i))}
                      className="p-0.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                      title="Remover CID"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* ── Exames ── */}
        <div className="border-t border-slate-100">
          <div className="px-3 py-2 flex items-center gap-2 bg-slate-50 border-b border-slate-100">
            <FlaskConical className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide flex-1">Exames</span>
            <div className="flex items-center gap-1">
              {(analysisResults?.exames?.length ?? 0) > 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-white">
                  {analysisResults!.exames.length}
                </span>
              )}
              <button
                onClick={() => handleOpenRepetirDialog("exames")}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                title="Histórico de exames anteriores"
              >
                <History className="w-3 h-3" />
              </button>
              <button
                onClick={() => setExameSearchDialogOpen(true)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                title="Buscar exame"
              >
                <Search className="w-3 h-3" />
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
                    className={`px-3 py-2 flex items-center gap-2 animate-in fade-in duration-300 ${
                      selectedExamesAI.has(i) ? "bg-blue-50/40" : "hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                      onClick={() => toggleExame(i)}
                    >
                      {selectedExamesAI.has(i) ? (
                        <div className="w-4 h-4 rounded border-2 bg-blue-600 border-blue-600 flex items-center justify-center flex-shrink-0">
                          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded border-2 border-slate-300 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-600 truncate">{exame.nome}</p>
                        {exame.justificativa && (
                          <p className="text-[10px] text-slate-400 leading-tight mt-0.5 line-clamp-2">{exame.justificativa}</p>
                        )}
                      </div>
                    </div>
                    <span
                      className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-white flex-shrink-0"
                    >
                      ✦ IA
                    </span>
                  </div>
                ))}
                {examesManuais.map((e, i) => (
                  <div key={`m-${i}`} className="px-3 py-2 flex items-center gap-2 animate-in fade-in duration-300 bg-blue-50/40">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-4 h-4 rounded border-2 bg-blue-600 border-blue-600 flex items-center justify-center flex-shrink-0">
                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      </div>
                      <span className="text-xs text-slate-600">{e.nome}</span>
                    </div>
                    <button
                      onClick={() => setExamesManuais(examesManuais.filter((_, idx) => idx !== i))}
                      className="p-0.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                      title="Remover exame"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* ── Prescrições ── */}
        <div className="border-t border-slate-100">
          <div className="px-3 py-2 flex items-center gap-2 bg-slate-50 border-b border-slate-100">
            <Pill className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide flex-1">Prescrições</span>
            <div className="flex items-center gap-1">
              {prescricoes.length > 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-white">
                  {prescricoes.length}
                </span>
              )}
              <button
                onClick={() => handleOpenRepetirDialog("prescricoes")}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                title="Histórico de prescrições anteriores"
              >
                <History className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  setSelectedPrescricaoIndex(null);
                  setMedicamentoDialogOpen(true);
                }}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                title="Buscar medicamento"
              >
                <Search className="w-3 h-3" />
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
                {/* Prescrições da IA — toggle igual Exames */}
                {analysisResults?.prescricoes?.map((rx, i) => {
                  const selected = selectedPrescricoesAI.has(i);
                  const conflict = hasAllergyConflict(rx.medicamento);
                  return (
                    <div
                      key={`ai-rx-${i}`}
                      className={`px-3 py-2 flex items-center gap-2 animate-in fade-in duration-300 ${
                        conflict ? "bg-red-50/60" : selected ? "bg-blue-50/40" : "hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                        onClick={() => !conflict && togglePrescricaoAI(i)}
                      >
                        {selected && !conflict ? (
                          <div className="w-4 h-4 rounded border-2 bg-blue-600 border-blue-600 flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                          </div>
                        ) : conflict ? (
                          <div className="w-4 h-4 rounded border-2 bg-red-100 border-red-300 flex items-center justify-center flex-shrink-0">
                            <X className="w-2.5 h-2.5 text-red-400" strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded border-2 border-slate-300 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-600 truncate">{rx.medicamento}</p>
                          <p className="text-xs text-slate-400">
                            {rx.dosagem}{rx.posologia ? ` · ${rx.posologia}` : ""}
                          </p>
                          {conflict && (
                            <p className="text-xs text-red-600 font-medium mt-0.5">Conflito de alergia</p>
                          )}
                        </div>
                      </div>
                      <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-white flex-shrink-0">
                        ✦ IA
                      </span>
                    </div>
                  );
                })}

                {/* Prescrições adicionadas manualmente */}
                {prescricoes.map((rx, i) => {
                  const conflict = hasAllergyConflict(rx.medicamento);
                  return (
                    <div key={`rx-${i}`} className={`px-3 py-2 flex items-center gap-2 animate-in fade-in duration-300 bg-blue-50/40 ${conflict ? "bg-red-50/60" : ""}`}>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${conflict ? "bg-red-100 border-red-300" : "bg-blue-600 border-blue-600"}`}>
                          {conflict
                            ? <X className="w-2.5 h-2.5 text-red-400" strokeWidth={3} />
                            : <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-600 truncate">{rx.medicamento}</p>
                          <p className="text-xs text-slate-400">
                            {rx.dosagem}{rx.posologia ? ` · ${rx.posologia}` : ""}
                          </p>
                          {conflict && (
                            <p className="text-xs text-red-600 font-medium mt-0.5">Conflito de alergia</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPrescricoes(prescricoes.filter((_, idx) => idx !== i))}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded p-0.5 transition-colors flex-shrink-0"
                        title="Remover prescrição"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* ── Orientações ── */}
        <div className="border-t border-slate-100">
          <div className="px-3 py-2 flex items-center gap-2 bg-slate-50 border-b border-slate-100">
            <ClipboardList className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide flex-1">Orientações</span>
          </div>
          <div className="px-3 py-2">
            <textarea
              value={orientacoes}
              onChange={(e) => setOrientacoes(e.target.value.slice(0, 255))}
              maxLength={255}
              rows={3}
              placeholder="Digite orientações ao paciente..."
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none text-slate-700 placeholder:text-slate-300"
            />
            <p className="text-[10px] text-slate-400 text-right mt-0.5">{orientacoes.length}/255</p>
          </div>
        </div>

        {/* ── Documentos ── */}
        <div className="border-t border-slate-100 flex flex-col min-h-[160px]">
          <div className="px-3 py-2 flex items-center gap-2 bg-slate-50 border-b border-slate-100">
            <FileText className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide flex-1">Documentos</span>
            {documentosGerados.length > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">
                {documentosGerados.length}
              </span>
            )}
          </div>

          {/* Picklist digitável */}
          <div className="px-3 pt-2 pb-2.5">
            <div ref={docInputWrapperRef} className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2 py-2 bg-white focus-within:border-blue-400 transition-colors">
              <Search className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <input
                ref={docInputRef}
                type="text"
                value={docSearch}
                onChange={(e) => {
                  setDocSearch(e.target.value);
                  openDocDropdown();
                }}
                onFocus={openDocDropdown}
                placeholder="Buscar documento..."
                className="flex-1 text-xs text-slate-700 bg-transparent outline-none placeholder:text-slate-400 min-w-0"
              />
              {loadingDoc && <Loader2 className="w-3 h-3 text-slate-400 animate-spin flex-shrink-0" />}
            </div>

            {/* Dropdown via portal para escapar do overflow-hidden */}
            {docDropdownOpen && filteredDocs.length > 0 && docDropdownRect && typeof document !== "undefined" && createPortal(
              <div
                ref={docDropdownRef}
                className="bg-white border border-slate-200 rounded-lg shadow-xl overflow-y-auto"
                style={{
                  position: "fixed",
                  top: docDropdownRect.bottom + 4,
                  left: docDropdownRect.left,
                  width: docDropdownRect.width,
                  maxHeight: 220,
                  zIndex: 9999,
                }}
              >
                {filteredDocs.slice(0, 14).map((doc) => {
                  const alreadyGenerated = documentosGerados.some((d) => d.tipoDocumento === doc.id);
                  return (
                    <button
                      key={doc.id}
                      onClick={() => handleGenDoc(doc.id)}
                      disabled={loadingDoc === doc.id}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left transition-colors border-b border-slate-50 last:border-0"
                    >
                      {loadingDoc === doc.id ? (
                        <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin flex-shrink-0" />
                      ) : alreadyGenerated ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                      )}
                      <span className="text-xs text-slate-700 truncate">{doc.nome}</span>
                    </button>
                  );
                })}
              </div>,
              document.body
            )}
          </div>

          {/* Lista de documentos gerados */}
          {documentosGerados.length > 0 && (
            <div className="px-3 pb-3">
              <div className="space-y-1.5">
                {documentosGerados.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <span className="text-xs font-semibold text-slate-700 truncate flex-1">{doc.nomeDocumento}</span>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {doc.pdfBlob && (
                        <>
                          <button
                            onClick={() => openDoc(doc)}
                            title="Abrir"
                            className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => printDoc(doc)}
                            title="Imprimir"
                            className={`p-1.5 rounded-md transition-colors ${
                              documentosImpressos.has(doc.id)
                                ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {doc.erroAssinatura && (
                        <span title={doc.erroAssinatura} className="p-1.5 rounded-md text-red-500 bg-red-50">
                          <AlertCircle className="w-4 h-4" />
                        </span>
                      )}
                      {onSignDocument && doc.pdfBlob && (
                        <button
                          onClick={() => onSignDocument(doc.id)}
                          title={doc.assinando ? "Assinando..." : doc.assinado ? "Documento já assinado" : "Assinar digitalmente"}
                          disabled={!!doc.assinado || !!doc.assinando}
                          className={`p-1.5 rounded-md transition-colors ${
                            doc.assinado ? "text-emerald-600 bg-emerald-50" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          } ${doc.assinando ? "opacity-70 cursor-not-allowed" : ""}`}
                        >
                          {doc.assinado ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : doc.assinando ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FileCheck className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      {onDeleteDocument && (
                        <button
                          onClick={() => onDeleteDocument(doc.id)}
                          title="Remover"
                          className="p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
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
              <p className="text-xs text-slate-400 text-center">Busque e clique para gerar</p>
            </div>
          )}
        </div>

        </div> {/* fim scroll wrapper */}
      </div>

      {/* ── Chat de Telemedicina ── */}
      {isTelemedicina && onSendMessage && (
        <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col bg-white shadow-sm mt-3">
          <div className="px-3 py-2.5 flex items-center gap-2 border-b border-slate-100 bg-slate-50">
            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-bold text-slate-700">Chat com Paciente</span>
            {chatMessages && chatMessages.length > 0 && (
              <span className="text-[9px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full ml-auto">
                {chatMessages.length}
              </span>
            )}
          </div>
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto max-h-[200px] min-h-[100px] p-2.5 space-y-1.5">
            {(!chatMessages || chatMessages.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <MessageSquare className="w-6 h-6 text-slate-300 mb-1.5" />
                <p className="text-[11px] text-slate-400">Nenhuma mensagem</p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === "doctor" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 ${
                    msg.sender === "doctor"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 border border-slate-200"
                  }`}>
                    {msg.sender !== "doctor" && (
                      <p className="text-[9px] font-semibold text-slate-500 mb-0.5">Paciente</p>
                    )}
                    <p className="text-[11px] leading-relaxed">{msg.text}</p>
                    <p className={`text-[9px] mt-0.5 ${msg.sender === "doctor" ? "text-blue-200" : "text-slate-400"}`}>{msg.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="px-2.5 py-2 border-t border-slate-100">
            <div className="flex gap-1.5">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && chatInput.trim()) {
                    onSendMessage(chatInput.trim());
                    setChatInput("");
                  }
                }}
                placeholder="Mensagem..."
                className="flex-1 bg-slate-50 text-slate-700 placeholder-slate-400 text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 transition-colors"
              />
              <button
                onClick={() => { if (chatInput.trim()) { onSendMessage(chatInput.trim()); setChatInput(""); } }}
                className="w-7 h-7 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center text-white transition-colors shrink-0"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

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
                              <p className="text-xs text-slate-400">{p.posologia}{p.duracao ? ` · Qtd: ${p.duracao}` : ""}</p>
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

    </div>

    <Dialog
      open={examAnalysisModalOpen && hasExamAnalysisReady}
      onOpenChange={(open) => {
        if (!open) setExamAnalysisModalOpen(false);
      }}
    >
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden border-slate-200">
        <DialogHeader>
          <div className="px-5 py-4 pr-14 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-blue-200 flex items-center justify-center flex-shrink-0">
                <Brain className="w-4 h-4 text-blue-700" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-sm font-semibold text-slate-800 truncate">
                  {selectedExamForAnalysis?.nome || "Análise do exame"}
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">Análise detalhada gerada por IA clínica</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getConclusionStyles(resolveExamConclusion(analysisResults?.raciocinioClinico))}`}>
                {resolveExamConclusion(analysisResults?.raciocinioClinico)}
              </span>
            </div>
          </div>
        </DialogHeader>
        <div className="p-5 space-y-4 bg-white">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1.5">Resumo da conclusão</p>
            <p className="text-sm text-slate-700 leading-relaxed">
              {getConclusionReason(analysisResults?.raciocinioClinico)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-2">Análise completa da IA</p>
            <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed max-h-[42vh] overflow-y-auto pr-1">
              {analysisResults?.raciocinioClinico?.trim()
                ? analysisResults.raciocinioClinico
                : "Ainda não há análise disponível para os exames selecionados."}
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => {
                if (selectedExamForAnalysis?.id) openExamFile(selectedExamForAnalysis.id);
              }}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Abrir exame
            </Button>
            <Button
              type="button"
              className="h-8 text-xs bg-[#1E40AF] hover:bg-[#1e3a8a] text-white"
              onClick={() => setExamAnalysisModalOpen(false)}
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
