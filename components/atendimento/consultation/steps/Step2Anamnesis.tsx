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
  { key: "queixaPrincipal", label: "QUEIXA PRINCIPAL", placeholder: "Descreva o motivo principal da consulta (2-3 palavras)..." },
  { key: "hda", label: "HISTÓRIA DA DOENÇA ATUAL", placeholder: "Início, evolução, localização, intensidade, fatores de melhora e piora, sintomas associados..." },
  { key: "antecedentesPessoais", label: "ANTECEDENTES PESSOAIS PATOLÓGICOS", placeholder: "Doenças prévias, internações, cirurgias, traumas, alergias, transfusões, vacinação, uso crônico de medicamentos..." },
  { key: "antecedentesFamiliares", label: "ANTECEDENTES FAMILIARES", placeholder: "Doenças hereditárias, neoplasias, cardiopatias, hepatopatias, doenças autoimunes..." },
  { key: "habitosVida", label: "HÁBITOS DE VIDA / HISTÓRIA SOCIAL", placeholder: "Tabagismo, etilismo, drogas ilícitas, alimentação, atividade física, sono, ocupação e exposição ocupacional..." },
  { key: "medicamentosUso", label: "MEDICAMENTOS EM USO ATUAL", placeholder: "Nome, dose, frequência, tempo de uso..." },
  { key: "examesFisicos", label: "EXAMES FÍSICOS", placeholder: "Achados do exame físico realizado na consulta (inspeção, palpação, percussão, ausculta, sinais vitais, etc.)..." },
];

const knownTitles = [
  "ANAMNESE",
  "QUEIXA PRINCIPAL",
  "HISTÓRIA DA DOENÇA ATUAL",
  "ANTECEDENTES PESSOAIS PATOLÓGICOS",
  "ANTECEDENTES FAMILIARES",
  "HÁBITOS DE VIDA",
  "HISTÓRIA SOCIAL",
  "MEDICAMENTOS EM USO ATUAL",
  "EXAMES FÍSICOS",
  "EXAMES REALIZADOS",
];

function parseAnamneseSection(anamnese: string, sectionTitle: string): string {
  const trimmed = anamnese.trim();
  const upperTitle = sectionTitle.toUpperCase();

  // ── Formato JSON ──────────────────────────────────────
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, string>;
      for (const [key, value] of Object.entries(parsed)) {
        if (key.toUpperCase() === upperTitle) {
          const v = (value || "").trim();
          return v === "N/A" || v === "n/a" ? "" : v;
        }
      }
      return "";
    } catch {
      // fall through to text parsing
    }
  }

  // ── Formato texto (linhas) ─────────────────────────────
  const lines = anamnese.split("\n");
  let capturing = false;
  const result: string[] = [];

  for (const line of lines) {
    const t = line.trim();
    const upper = t.toUpperCase();
    if (
      upper === upperTitle ||
      upper.startsWith(upperTitle + ":") ||
      upper.startsWith(upperTitle + " -")
    ) {
      capturing = true;
      const afterColon = t.includes(":") ? t.slice(t.indexOf(":") + 1).trim() : "";
      if (afterColon) result.push(afterColon);
      continue;
    }
    if (capturing) {
      const isNewSection =
        t.length > 0 && t === t.toUpperCase() && t.length < 80;
      if (isNewSection && result.length > 0) break;
      if (t) result.push(t);
    }
  }
  return result.join("\n") || "";
}

function combineSections(values: Record<string, string>): string {
  return ANAMNESE_SECTIONS.filter((s) => values[s.key]?.trim())
    .map((s) => `${s.label.toUpperCase()}\n${values[s.key].trim()}`)
    .join("\n\n");
}

// Converte JSON de anamnese para texto formatado com seções (sempre todas as seções)
function normalizeAnamneseText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) return text;
  try {
    const parsed = JSON.parse(trimmed) as Record<string, string>;
    const lines: string[] = [];
    for (const section of ANAMNESE_SECTIONS) {
      const value =
        parsed[section.label] ??
        Object.entries(parsed).find(
          ([k]) => k.toUpperCase() === section.label.toUpperCase()
        )?.[1] ??
        "";
      const v = (value || "").trim();
      lines.push(`${section.label}:\n${v && v.toUpperCase() !== "N/A" ? v : "N/A"}`);
    }
    return lines.join("\n\n");
  } catch {
    return text;
  }
}

// Garante que todas as seções apareçam no array final, adicionando as ausentes com N/A
function ensureAllSections(
  sections: Array<{ title: string; content: string }>
): Array<{ title: string; content: string }> {
  const result = [...sections];
  for (const section of ANAMNESE_SECTIONS) {
    const exists = result.some(
      (s) => s.title.toUpperCase() === section.label.toUpperCase()
    );
    if (!exists) {
      result.push({ title: section.label, content: "N/A" });
    }
  }
  // Reordena para seguir a ordem de ANAMNESE_SECTIONS
  return ANAMNESE_SECTIONS.map((s) => {
    const found = result.find(
      (r) => r.title.toUpperCase() === s.label.toUpperCase()
    );
    return found ?? { title: s.label, content: "N/A" };
  });
}

// Função para formatar anamnese em seções com títulos
function formatAnamneseWithTitles(text: string): Array<{ title: string; content: string }> {
  const sections: Array<{ title: string; content: string }> = [];
  const lines = text.split("\n");
  let currentTitle = "";
  let currentContent: string[] = [];

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
  // Determinar o texto da anamnese
  const rawAnamnese = isAnamneseEdited
    ? editedAnamnese
    : analysisResults?.anamnese || prontuario?.anamnese || "";
  
  // Converter para string de forma robusta
  let rawAnamneseStr = '';
  if (typeof rawAnamnese === 'string') {
    rawAnamneseStr = rawAnamnese;
  } else if (rawAnamnese && typeof rawAnamnese === 'object') {
    // Se for um objeto, tentar extrair a propriedade 'anamnese' ou converter para JSON
    const anamneseObj = rawAnamnese as any;
    if ('anamnese' in anamneseObj && typeof anamneseObj.anamnese === 'string') {
      rawAnamneseStr = anamneseObj.anamnese;
    } else {
      rawAnamneseStr = JSON.stringify(rawAnamnese);
    }
  } else if (rawAnamnese) {
    rawAnamneseStr = String(rawAnamnese);
  }
  
  let anamneseText = rawAnamneseStr.replace(/\\n/g, '\n').replace(/\\r/g, '');
  
  // Debug: verificar o tipo e conteúdo
  useEffect(() => {
    if (analysisResults?.anamnese) {
      console.log("🔍 Step2Anamnesis - analysisResults.anamnese:", {
        type: typeof analysisResults.anamnese,
        isString: typeof analysisResults.anamnese === 'string',
        length: typeof analysisResults.anamnese === 'string' ? analysisResults.anamnese.length : 'N/A',
        preview: typeof analysisResults.anamnese === 'string' ? analysisResults.anamnese.substring(0, 100) : String(analysisResults.anamnese).substring(0, 100)
      });
    }
    if (anamneseText) {
      console.log("📝 Step2Anamnesis - anamneseText:", {
        length: anamneseText.length,
        preview: anamneseText.substring(0, 100)
      });
    }
  }, [analysisResults?.anamnese, anamneseText]);
  
  // Se estiver transcrevendo, adicionar transcrição ao texto
  if (isTranscribing && transcriptionText && transcriptionText.trim()) {
    if (!anamneseText) {
      anamneseText = transcriptionText;
    }
  }

  const [sectionEdits, setSectionEdits] = useState<Record<number, string>>({});
  const [sectionValues, setSectionValues] = useState<Record<string, string>>(() => {
    const base = analysisResults?.anamnese || prontuario?.anamnese || "";
    if (!base) return {};
    return Object.fromEntries(
      ANAMNESE_SECTIONS.map((s: { key: string; label: string; placeholder: string }) => [s.key, parseAnamneseSection(base, s.label)])
    );
  });

  // Quando a IA gera (ou atualiza) a anamnese, repopula os campos do modo manual
  useEffect(() => {
    const base = analysisResults?.anamnese || "";
    if (!base) return;
    setSectionValues(
      Object.fromEntries(
        ANAMNESE_SECTIONS.map((s) => [s.key, parseAnamneseSection(base, s.label)])
      )
    );
    setSectionEdits({});
  }, [analysisResults?.anamnese]);

  useEffect(() => {
    setSectionEdits({});
  }, [anamneseText]);

  function handleSectionChange(key: string, value: string) {
    const updated = { ...sectionValues, [key]: value };
    setSectionValues(updated);
    const combined = combineSections(updated);
    setEditedAnamnese(combined);
    setIsAnamneseEdited(true);
    if (prontuario) {
      setProntuario({ ...prontuario, anamnese: combined } as Prontuario);
    }
  }

  return (
    <div className="h-full overflow-x-hidden w-full min-w-0">
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm flex flex-col h-full overflow-x-hidden w-full min-w-0">
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
            {isTranscribing && (
              <div className="flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-red-500 animate-pulse" />
                <span className="text-xs text-red-600 font-medium">Gravando...</span>
              </div>
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
              {ANAMNESE_SECTIONS.map((section: { key: string; label: string; placeholder: string }) => (
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
            </div>
          ) : isTranscribing && transcriptionText ? (
            /* ── Mostrar transcrição durante gravação ── */
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                <span className="text-sm font-semibold text-slate-700">Gravando consulta...</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <Textarea
                  value={transcriptionText}
                  readOnly
                  className="text-sm min-h-[300px] resize-none bg-white border-slate-200 focus-visible:ring-1 focus-visible:ring-[#1E40AF] leading-relaxed"
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                  placeholder="Aguardando transcrição..."
                />
              </div>
              <p className="text-xs text-slate-400 text-center">
                A anamnese será gerada automaticamente ao encerrar a gravação.
              </p>
            </div>
          ) : !anamneseText ? (
            /* ── Empty state ── */
            <div className="flex flex-col items-center justify-center py-10 px-6 text-center select-none">
              <div className="relative mb-5">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center">
                    <Mic className="w-5 h-5 text-[#1E40AF]" />
                  </div>
                </div>
              </div>
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
            </div>
          ) : (
            /* ── Anamnese formatada com títulos — sempre editável ── */
            <div className="divide-y divide-slate-100">
              {ensureAllSections(
                formatAnamneseWithTitles(normalizeAnamneseText(anamneseText))
                  .filter((s) => s.title.toUpperCase() !== "ANAMNESE")
              )
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
