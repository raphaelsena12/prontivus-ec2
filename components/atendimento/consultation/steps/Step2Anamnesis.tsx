"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  Loader2,
  Mic,
  Radio,
} from "lucide-react";

interface AnalysisResults {
  anamnese: string;
  cidCodes: Array<{ code: string; description: string; score: number }>;
  exames: Array<{ nome: string; tipo: string; justificativa: string }>;
  prescricoes: Array<{ medicamento: string; dosagem: string; posologia: string; duracao: string }>;
}

interface Prontuario {
  id: string;
  anamnese: string | null;
  exameFisico: string | null;
  diagnostico: string | null;
  conduta: string | null;
  evolucao: string | null;
}

interface Step2AnamnesisProps {
  isProcessing: boolean;
  analysisResults: AnalysisResults | null;
  prontuario: Prontuario | null;
  setProntuario: (p: Prontuario | null) => void;
  editedAnamnese: string;
  setEditedAnamnese: (v: string) => void;
  isAnamneseEdited: boolean;
  setIsAnamneseEdited: (v: boolean) => void;
  isEditingAnamnese: boolean;
  setIsEditingAnamnese: (v: boolean) => void;
  anamneseConfirmed: boolean;
  onConfirmAnamnese: () => void;
  onAdvance: () => void;
  consultationMode?: "manual" | "ai";
  onToggleMode?: (mode: "manual" | "ai") => void;
  isTranscribing?: boolean;
  startTranscription?: () => Promise<void>;
  transcriptionText?: string;
}

const ANAMNESE_SECTIONS = [
  { key: "queixaPrincipal", label: "Queixa Principal", placeholder: "Descreva o motivo principal da consulta..." },
  { key: "hda",             label: "História da Doença Atual (HDA)", placeholder: "Início, evolução, fatores de melhora e piora, sintomas associados..." },
  { key: "antecedentes",    label: "Antecedentes Pessoais", placeholder: "Doenças pregressas, cirurgias, internações, alergias conhecidas..." },
  { key: "revisaoSistemas", label: "Revisão de Sistemas", placeholder: "Sintomas em cada sistema (cardiovascular, respiratório, digestivo...)" },
];

const EXAME_FISICO_TITLES = ["EXAME FÍSICO", "EXAME FISICO", "EXAME FÍSICO GERAL"];

function parseAnamneseSection(anamnese: string, sectionTitle: string): string {
  const lines = anamnese.split("\n");
  let capturing = false;
  const result: string[] = [];
  const upperTitle = sectionTitle.toUpperCase();

  for (const line of lines) {
    const trimmed = line.trim();
    const upperLine = trimmed.toUpperCase();
    if (
      upperLine === upperTitle ||
      upperLine.startsWith(upperTitle + ":") ||
      upperLine.startsWith(upperTitle + " -")
    ) {
      capturing = true;
      continue;
    }
    if (capturing) {
      const isNewSection =
        trimmed.length > 0 && trimmed === trimmed.toUpperCase() && trimmed.length < 60;
      if (isNewSection && result.length > 0) break;
      if (trimmed) result.push(trimmed);
    }
  }
  return result.join("\n") || "";
}

function formatAnamneseWithTitles(text: string): Array<{ title: string; content: string }> {
  const sections: Array<{ title: string; content: string }> = [];
  const lines = text.split("\n");
  let currentTitle = "";
  let currentContent: string[] = [];

  const knownTitles = [
    "ANAMNESE",
    "QUEIXA PRINCIPAL",
    "HISTÓRIA DA DOENÇA ATUAL",
    "ANTECEDENTES PESSOAIS PATOLÓGICOS",
    "ANTECEDENTES FAMILIARES",
    "HÁBITOS DE VIDA",
    "HISTÓRIA SOCIAL",
    "MEDICAMENTOS EM USO ATUAL",
    "EXAMES REALIZADOS",
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      if (currentContent.length > 0) {
        currentContent.push("");
      }
      continue;
    }

    let titleMatch: { title: string; content: string } | null = null;

    if (trimmed.includes(":")) {
      const colonIndex = trimmed.indexOf(":");
      const beforeColon = trimmed.substring(0, colonIndex).trim();
      const afterColon = trimmed.substring(colonIndex + 1).trim();
      const upperBefore = beforeColon.toUpperCase();

      const isKnownTitle = knownTitles.some(title =>
        upperBefore === title ||
        upperBefore.startsWith(title) ||
        title.startsWith(upperBefore)
      );

      const looksLikeTitle =
        beforeColon === upperBefore &&
        beforeColon.length < 80 &&
        beforeColon.match(/^[A-Z\s\-\/ÉÁÍÓÚÇÃÕÊÔ]+$/);

      if (isKnownTitle || looksLikeTitle) {
        titleMatch = {
          title: beforeColon,
          content: afterColon
        };
      }
    }

    if (!titleMatch) {
      const upperTrimmed = trimmed.toUpperCase();
      const isKnownTitle = knownTitles.some(title =>
        upperTrimmed === title ||
        upperTrimmed.startsWith(title + " ") ||
        title.startsWith(upperTrimmed)
      );

      if (isKnownTitle && trimmed === upperTrimmed && trimmed.length < 80) {
        titleMatch = {
          title: trimmed,
          content: ""
        };
      }
    }

    if (!titleMatch && trimmed.startsWith("**") && trimmed.endsWith("**")) {
      titleMatch = {
        title: trimmed.replace(/^\*\*/g, "").replace(/\*\*$/g, "").trim(),
        content: ""
      };
    }

    if (titleMatch) {
      if (currentTitle || currentContent.length > 0) {
        const content = currentContent.join("\n").trim();
        if (currentTitle || content) {
          sections.push({
            title: currentTitle,
            content: content,
          });
        }
      }
      currentTitle = titleMatch.title;
      currentContent = titleMatch.content ? [titleMatch.content] : [];
    } else {
      if (currentTitle || currentContent.length > 0) {
        currentContent.push(trimmed);
      } else {
        if (sections.length === 0) {
          currentContent.push(trimmed);
        }
      }
    }
  }

  if (currentTitle || currentContent.length > 0) {
    const content = currentContent.join("\n").trim();
    if (currentTitle || content) {
      sections.push({
        title: currentTitle,
        content: content,
      });
    }
  }

  if (sections.length === 0) {
    return [{ title: "", content: text }];
  }

  return sections;
}

function combineSections(values: Record<string, string>): string {
  return ANAMNESE_SECTIONS.filter((s) => values[s.key]?.trim())
    .map((s) => `${s.label.toUpperCase()}\n${values[s.key].trim()}`)
    .join("\n\n");
}

export function Step2Anamnesis({
  isProcessing,
  analysisResults,
  prontuario,
  setProntuario,
  editedAnamnese,
  setEditedAnamnese,
  isAnamneseEdited,
  setIsAnamneseEdited,
  isEditingAnamnese,
  setIsEditingAnamnese,
  anamneseConfirmed,
  onConfirmAnamnese,
  onAdvance,
  consultationMode = "ai",
  onToggleMode,
  isTranscribing,
  startTranscription,
  transcriptionText = "",
}: Step2AnamnesisProps) {
  const rawAnamnese = isAnamneseEdited
    ? editedAnamnese
    : analysisResults?.anamnese || prontuario?.anamnese || "";
  let anamneseText = rawAnamnese.replace(/\\n/g, '\n').replace(/\\r/g, '');

  if (transcriptionText && transcriptionText.trim()) {
    const trimmedTranscription = transcriptionText.trim();
    const upperAnamnese = anamneseText.toUpperCase().trim();

    if (upperAnamnese.startsWith("ANAMNESE:")) {
      const lines = anamneseText.split('\n');
      const firstLine = lines[0]?.trim() || '';
      const afterColon = firstLine.substring(firstLine.indexOf(':') + 1).trim();
      if (!afterColon) {
        const secondLine = lines[1]?.trim() || '';
        if (!secondLine) {
          anamneseText = `ANAMNESE:\n${trimmedTranscription}\n\n${lines.slice(1).join('\n')}`;
        }
      }
    } else if (upperAnamnese.startsWith("ANAMNESE")) {
      const lines = anamneseText.split('\n');
      if (lines[0]?.trim().toUpperCase() === "ANAMNESE") {
        anamneseText = `ANAMNESE:\n${trimmedTranscription}\n\n${lines.slice(1).join('\n')}`;
      }
    } else {
      anamneseText = `ANAMNESE:\n${trimmedTranscription}\n\n${anamneseText}`;
    }
  }

  const [sectionEdits, setSectionEdits] = useState<Record<number, string>>({});

  useEffect(() => {
    setSectionEdits({});
  }, [anamneseText]);

  const [sectionValues, setSectionValues] = useState<Record<string, string>>(() => {
    const base = analysisResults?.anamnese || prontuario?.anamnese || "";
    if (!base) return {};
    return Object.fromEntries(
      ANAMNESE_SECTIONS.map((s) => [s.key, parseAnamneseSection(base, s.label)])
    );
  });

  function handleSectionChange(key: string, value: string) {
    const updated = { ...sectionValues, [key]: value };
    setSectionValues(updated);
    const combined = combineSections(updated);
    setEditedAnamnese(combined);
    setIsAnamneseEdited(true);
    if (prontuario) {
      setProntuario({ ...prontuario, anamnese: combined });
    }
  }

  return (
    <div className="h-full overflow-x-hidden">
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm flex flex-col h-full overflow-x-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#1E40AF]" />
            <span className="text-base font-semibold text-slate-800">Anamnese</span>
            {analysisResults && (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-1.5 py-0.5">
                Gerada por IA
              </span>
            )}
          </div>

          {/* Toggle Manual / Assistido por IA */}
          {onToggleMode && (
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => onToggleMode("manual")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  consultationMode === "manual"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Manual
              </button>
              <button
                onClick={() => onToggleMode("ai")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  consultationMode === "ai"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Sparkles className="w-3 h-3" />
                Assistido por IA
              </button>
            </div>
          )}
        </div>

        {/* ── Corpo ── */}
        <div className="p-3 overflow-x-hidden flex-1 overflow-y-auto">
          {isProcessing ? (
            /* Loading IA */
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 mb-3">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1E40AF]" />
                <span className="text-xs text-slate-600">Gerando anamnese com IA...</span>
              </div>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-2.5 w-20 bg-slate-100" />
                  <Skeleton className="h-12 w-full bg-slate-100" />
                </div>
              ))}
            </div>

          ) : consultationMode === "manual" ? (
            /* ── Modo Manual: inputs por tópico ── */
            <div className="divide-y divide-slate-100">
              {ANAMNESE_SECTIONS.map((section) => (
                <div key={section.key} className="space-y-1.5 pt-4 first:pt-0">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {section.label}
                  </label>
                  <Textarea
                    value={sectionValues[section.key] || ""}
                    onChange={(e) => handleSectionChange(section.key, e.target.value)}
                    placeholder={section.placeholder}
                    className="text-sm min-h-[72px] resize-none bg-slate-50 border-slate-200 focus-visible:ring-1 focus-visible:ring-[#1E40AF] focus-visible:bg-white transition-colors"
                  />
                </div>
              ))}
              <div className="space-y-1.5 pt-4">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Exames Físicos
                </label>
                <Textarea
                  value={prontuario?.exameFisico || ""}
                  onChange={(e) => prontuario && setProntuario({ ...prontuario, exameFisico: e.target.value })}
                  placeholder="Dados vitais, aspecto geral, achados por sistema..."
                  className="text-sm min-h-[72px] resize-none bg-slate-50 border-slate-200 focus-visible:ring-1 focus-visible:ring-[#1E40AF] focus-visible:bg-white transition-colors"
                />
              </div>
            </div>

          ) : !anamneseText ? (
            /* ── Empty state (modo IA) ── */
            <div className="flex flex-col items-center justify-center py-10 px-6 text-center select-none">
              <div className="relative mb-5">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center">
                    {isTranscribing ? (
                      <Radio className="w-5 h-5 text-red-500 animate-pulse" />
                    ) : (
                      <Mic className="w-5 h-5 text-[#1E40AF]" />
                    )}
                  </div>
                </div>
                {isTranscribing && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-red-400/10 animate-ping" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    </span>
                  </>
                )}
              </div>

              {isTranscribing ? (
                <>
                  <p className="text-base font-semibold text-slate-700 mb-1">Gravando consulta...</p>
                  <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
                    A anamnese será gerada automaticamente ao encerrar a gravação.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base font-semibold text-slate-700 mb-2">Pronto para começar</p>
                  <p className="text-sm text-slate-400 max-w-xs leading-relaxed mb-5">
                    Inicie a gravação para gerar automaticamente a anamnese estruturada com inteligência artificial.
                  </p>
                  {startTranscription && (
                    <Button
                      onClick={startTranscription}
                      className="h-10 px-6 text-sm gap-2 bg-[#1E40AF] hover:bg-[#1e3a8a] text-white shadow-md shadow-blue-200 font-semibold rounded-xl"
                    >
                      <Mic className="w-4 h-4" />
                      Iniciar Gravação
                    </Button>
                  )}
                </>
              )}
            </div>

          ) : (
            /* ── Anamnese formatada com títulos — sempre editável ── */
            <div className="divide-y divide-slate-100">
              {formatAnamneseWithTitles(anamneseText)
                .filter((s) => !EXAME_FISICO_TITLES.includes(s.title.toUpperCase()) && s.title.toUpperCase() !== "ANAMNESE")
                .map((section, index) => {
                const displayContent = section.content || "";
                const currentContent = sectionEdits[index] !== undefined ? sectionEdits[index] : displayContent;

                const handleContentChange = (newContent: string) => {
                  setSectionEdits((prev) => ({ ...prev, [index]: newContent }));

                  const allSections = formatAnamneseWithTitles(anamneseText);
                  allSections[index].content = newContent;

                  Object.keys(sectionEdits).forEach((key) => {
                    const editIndex = parseInt(key);
                    if (editIndex !== index && allSections[editIndex]) {
                      allSections[editIndex].content = sectionEdits[editIndex];
                    }
                  });

                  const newAnamnese = allSections
                    .map((s) => {
                      if (s.title) {
                        return `${s.title}:\n${s.content}`;
                      }
                      return s.content;
                    })
                    .join("\n\n");

                  setEditedAnamnese(newAnamnese);
                  setIsAnamneseEdited(true);
                  if (prontuario) {
                    setProntuario({ ...prontuario, anamnese: newAnamnese } as Prontuario);
                  }
                };

                return (
                  <div key={index} className="space-y-1.5 pt-4 first:pt-0">
                    {section.title && (
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        {section.title}
                      </h3>
                    )}
                    <Textarea
                      value={currentContent}
                      onChange={(e) => handleContentChange(e.target.value)}
                      placeholder={displayContent ? undefined : "Sem informações"}
                      className="text-xs min-h-[60px] resize-none bg-white border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed w-full overflow-x-hidden p-0"
                      style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        overflowX: 'hidden',
                        overflowY: 'visible'
                      }}
                    />
                  </div>
                );
              })}

              <div className="space-y-1.5 pt-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Exames Físicos
                </h3>
                <Textarea
                  value={prontuario?.exameFisico || ""}
                  onChange={(e) => prontuario && setProntuario({ ...prontuario, exameFisico: e.target.value })}
                  placeholder="Preencha após o exame físico..."
                  className="text-xs min-h-[60px] resize-none bg-white border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed w-full overflow-x-hidden p-0"
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowX: 'hidden', overflowY: 'visible' }}
                />
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
