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
  FlaskConical,
  AlertTriangle,
  Pill,
  Stethoscope,
  ExternalLink,
  Printer,
  X,
  RefreshCw,
  Search,
  Trash2,
  ClipboardList,
} from "lucide-react";

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
  // Protocolos AI
  selectedProtocolosAI: Set<number>;
  setSelectedProtocolosAI: (s: Set<number>) => void;
  protocolosManuais: Array<{ nome: string; descricao: string }>;
  setProtocoloDialogOpen: (v: boolean) => void;
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
  }>;
  handleGenerateDocument: (modelId: string) => Promise<void>;
  onDeleteDocument?: (id: string) => void;
  // Action
  onGenerateSuggestions: (context: AIContext) => void;
  consultationMode: "manual" | "ai";
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
  selectedProtocolosAI,
  setSelectedProtocolosAI,
  protocolosManuais,
  setProtocoloDialogOpen,
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
  onDeleteDocument,
  onGenerateSuggestions,
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

  const toggleProtocolo = (i: number) => {
    const next = new Set(selectedProtocolosAI);
    next.has(i) ? next.delete(i) : next.add(i);
    setSelectedProtocolosAI(next);
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

  const hasProtocolos =
    hasAIData &&
    ((analysisResults!.protocolos?.length ?? 0) > 0 || protocolosManuais.length > 0);

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
          <div className="flex items-center gap-2 text-white">
            <Sparkles className={`w-4 h-4 ${isProcessing ? "animate-pulse" : ""}`} />
            <span className="text-xs font-bold tracking-wider ">IA Prontivus</span>
            {/* <span className="text-[10px] text-blue-200 font-normal">· Prontivus</span> */}
          </div>
          <span
            className={`text-[9px] px-2 py-0.5 rounded-full font-semibold border ${
              isProcessing
                ? "bg-blue-400/20 border-blue-300/40 text-blue-100 animate-pulse"
                : hasAIData
                ? "bg-emerald-400/20 border-emerald-300/40 text-emerald-100"
                : "bg-white/10 border-white/20 text-white/60"
            }`}
          >
            {isProcessing ? "⏳ Processando..." : hasAIData ? "✦ Ativa" : "Aguardando"}
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
            {FIXED_CONTEXT_ITEMS.map((item) => (
              <label
                key={item.key}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={aiContext[item.key] as boolean}
                  onChange={(e) =>
                    setAiContext((prev) => ({ ...prev, [item.key]: e.target.checked }))
                  }
                  className="w-3 h-3 rounded border-slate-300 accent-[#1E40AF] cursor-pointer"
                />
                <span className="text-xs text-slate-700 group-hover:text-slate-900 transition-colors">
                  {item.label}
                </span>
              </label>
            ))}

            {/* Exames individuais */}
            {examesAnexados.length > 0 && (
              <div className="pt-0.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                  Exames anexados
                </p>
                <div className="space-y-1.5">
                  {examesAnexados.map((exame) => (
                    <label
                      key={exame.id}
                      className="flex items-center gap-2 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={aiContext.examesIds.includes(exame.id)}
                        onChange={() => toggleExameContexto(exame.id)}
                        className="w-3 h-3 rounded border-slate-300 accent-[#1E40AF] cursor-pointer flex-shrink-0"
                      />
                      <span className="text-xs text-slate-700 group-hover:text-slate-900 transition-colors truncate">
                        {exame.nome}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botão Gerar */}
        <div className="px-3 pb-3 border-t border-slate-100">
          <Button
            onClick={() => onGenerateSuggestions(aiContext)}
            disabled={isProcessing || !hasAnamnese}
            className={`w-full gap-1.5 h-8 text-xs ${
              hasAIData
                ? "bg-white border border-[#1E40AF] text-[#1E40AF] hover:bg-blue-50"
                : "bg-transparent border border-[#1E40AF] text-[#1E40AF] hover:bg-blue-50"
            } ${!hasAnamnese ? "opacity-50 cursor-not-allowed" : ""}`}
            variant="outline"
          >
            {isProcessing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : hasAIData ? (
              <RefreshCw className="w-3.5 h-3.5" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {isProcessing
              ? "Analisando..."
              : hasAIData
              ? "Regenerar Sugestões"
              : "Analisar com IA"}
          </Button>
        </div>

        {/* ── CID Sugerido ── */}
        <div className="border-t border-slate-100">
          <div className="px-3 py-2 border-b border-slate-200 flex items-center gap-1.5" style={{ background: "linear-gradient(135deg, #1E40AF 0%, #1e3a8a 100%)" }}>
            <Stethoscope className="w-3.5 h-3.5 text-white" />
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

        {/* ── Protocolo Clínico ── */}
        <div className="border-t border-slate-100">
          <div className="px-3 py-2 border-b border-slate-200 flex items-center gap-1.5" style={{ background: "linear-gradient(135deg, #1E40AF 0%, #1e3a8a 100%)" }}>
            <ClipboardList className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-semibold text-white">Protocolos Sugeridos por IA</span>
            {(analysisResults?.protocolos?.length ?? 0) > 0 && (
              <span className="ml-auto text-[10px] bg-white/20 text-white border border-white/30 px-1.5 py-0.5 rounded-full font-medium">
                {analysisResults!.protocolos.length}
              </span>
            )}
          </div>
          <div className="divide-y divide-slate-50">
            {isProcessing ? (
              <div className="px-3 py-3 space-y-2">
                <Skeleton className="h-4 rounded bg-blue-50/80" style={{ width: "75%" }} />
                <Skeleton className="h-3 rounded bg-blue-50/60" style={{ width: "55%" }} />
              </div>
            ) : (analysisResults?.protocolos?.length ?? 0) === 0 && protocolosManuais.length === 0 ? (
              <div className="px-3 py-2 flex items-center gap-2">
                <ClipboardList className="w-3 h-3 text-slate-300" />
                <p className="text-[11px] text-slate-300">Aguardando análise da IA</p>
              </div>
            ) : (
              <>
                {analysisResults?.protocolos?.map((protocolo, i) => (
                  <div
                    key={i}
                    className={`px-3 py-2.5 flex items-center justify-between gap-2 transition-colors animate-in fade-in duration-300 ${
                      selectedProtocolosAI.has(i) ? "bg-blue-50/40" : "hover:bg-slate-50"
                    }`}
                  >
                    <button
                      onClick={() => toggleProtocolo(i)}
                      className="flex items-center gap-2.5 flex-1 text-left"
                    >
                      {selectedProtocolosAI.has(i) ? (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded border-2 border-slate-300 flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-xs font-medium text-slate-600 leading-none">{protocolo.nome}</p>
                        {protocolo.descricao && (
                          <p className="text-xs text-slate-400 leading-tight mt-0.5">{protocolo.descricao}</p>
                        )}
                      </div>
                    </button>
                    {!selectedProtocolosAI.has(i) && (
                      <button
                        onClick={() => toggleProtocolo(i)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded flex-shrink-0 transition-colors"
                      >
                        Aceitar
                      </button>
                    )}
                  </div>
                ))}
                {protocolosManuais.map((protocolo, i) => (
                  <div key={`m-${i}`} className="px-3 py-2.5 flex items-center gap-2.5 animate-in fade-in duration-300">
                    <CheckCircle2 className="w-4 h-4 text-blue-300 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-slate-600">{protocolo.nome}</p>
                      {protocolo.descricao && (
                        <p className="text-xs text-slate-400">{protocolo.descricao}</p>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
            <div className="px-3 py-2">
              <button
                onClick={() => setProtocoloDialogOpen(true)}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Adicionar protocolo manualmente
              </button>
            </div>
          </div>
        </div>

        {/* ── Exames Recomendados ── */}
        <div className="border-t border-slate-100">
          <div className="px-3 py-2 border-b border-slate-200 flex items-center gap-1.5" style={{ background: "linear-gradient(135deg, #1E40AF 0%, #1e3a8a 100%)" }}>
            <FlaskConical className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-semibold text-white">Exames Sugeridos por IA</span>
            <div className="ml-auto flex items-center gap-2">
              {(analysisResults?.exames?.length ?? 0) > 0 && (
                <span className="text-[10px] bg-white/20 text-white border border-white/30 px-1.5 py-0.5 rounded-full font-medium">
                  {analysisResults!.exames.length}
                </span>
              )}
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
            <Pill className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-semibold text-white">Prescrições Sugeridas por IA</span>
            <div className="ml-auto flex items-center gap-2">
              {prescricoes.length > 0 && (
                <span className="text-[10px] bg-white/20 text-white border border-white/30 px-1.5 py-0.5 rounded-full font-medium">
                  {prescricoes.length}
                </span>
              )}
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

      {/* ── Box 2: Documentos ── */}
      <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm flex flex-col w-full min-w-0" style={{ backgroundColor: "#F5F8FF" }}>

        {/* Cabeçalho — mesmo estilo do box IA Clínica */}
        <div
          className="px-3 py-2.5 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, #1E40AF 0%, #1e3a8a 100%)" }}
        >
          <div className="flex items-center gap-2 text-white">
            <FileText className="w-4 h-4" />
            <span className="text-xs font-bold tracking-wider uppercase">Documentos</span>
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
