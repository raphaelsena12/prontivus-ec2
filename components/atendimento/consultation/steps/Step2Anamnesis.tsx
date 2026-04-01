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

const ANTECEDENTES_HABITOS_SOCIAL_LABEL =
  "ANTECEDENTES PESSOAIS / HÁBITOS DE VIDA / HISTÓRIA SOCIAL";

const ANAMNESE_SECTIONS = [
  { key: "queixaPrincipal", label: "QUEIXA PRINCIPAL", placeholder: "Descreva o motivo principal da consulta (2-3 palavras)..." },
  { key: "hda", label: "HISTÓRIA DA DOENÇA ATUAL", placeholder: "Início, evolução, localização, intensidade, fatores de melhora e piora, sintomas associados..." },
  {
    key: "antecedentesHabitosSocial",
    label: ANTECEDENTES_HABITOS_SOCIAL_LABEL,
    placeholder:
      "Doenças prévias, internações, cirurgias, traumas, alergias, vacinação, medicamentos crônicos; tabagismo, etilismo, alimentação, atividade física, sono, ocupação e história social...",
  },
  { key: "antecedentesFamiliares", label: "ANTECEDENTES FAMILIARES", placeholder: "Doenças hereditárias, neoplasias, cardiopatias, hepatopatias, doenças autoimunes..." },
  { key: "medicamentosUso", label: "MEDICAMENTOS EM USO ATUAL", placeholder: "Nome, dose, frequência, tempo de uso..." },
  { key: "examesFisicos", label: "EXAMES FÍSICOS", placeholder: "Achados do exame físico realizado na consulta (inspeção, palpação, percussão, ausculta, sinais vitais, etc.)..." },
];

const knownTitles = [
  "ANAMNESE",
  "QUEIXA PRINCIPAL",
  "HISTÓRIA DA DOENÇA ATUAL",
  ANTECEDENTES_HABITOS_SOCIAL_LABEL,
  "ANTECEDENTES PESSOAIS PATOLÓGICOS",
  "ANTECEDENTES FAMILIARES",
  "HÁBITOS DE VIDA / HISTÓRIA SOCIAL",
  "HÁBITOS DE VIDA",
  "HISTÓRIA SOCIAL",
  "MEDICAMENTOS EM USO ATUAL",
  "EXAMES FÍSICOS",
  "EXAMES REALIZADOS",
];

// Insere \n antes de cada título de seção quando estão inline (sem quebra de linha)
function normalizeInlineSections(text: string): string {
  let result = text;
  for (const title of knownTitles) {
    // Insere newline antes do título se não estiver já no início de uma linha
    const pattern = new RegExp(`(?<!\n)(${title.toUpperCase()}:)`, "g");
    result = result.replace(pattern, "\n$1");
  }
  return result;
}

function parseAnamneseSection(anamnese: string, sectionTitle: string): string {
  const trimmed = normalizeInlineSections(anamnese.trim());
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
    
    // Verificar se é o título da seção que estamos procurando
    if (
      upper === upperTitle ||
      upper.startsWith(upperTitle + ":") ||
      upper.startsWith(upperTitle + " -")
    ) {
      capturing = true;
      const afterColon = t.includes(":") ? t.slice(t.indexOf(":") + 1).trim() : "";
      if (afterColon && afterColon.toUpperCase() !== "N/A") {
        result.push(afterColon);
      }
      continue;
    }
    
    if (capturing) {
      // Verificar se encontramos uma nova seção conhecida
      let isNewSection = false;
      
      // Verificar se a linha contém um título conhecido (com ou sem dois pontos)
      for (const knownTitle of knownTitles) {
        const upperKnownTitle = knownTitle.toUpperCase();
        // Verificar se a linha é exatamente o título ou começa com o título seguido de ":"
        if (
          upper === upperKnownTitle ||
          upper.startsWith(upperKnownTitle + ":") ||
          (upper.includes(":") && upper.substring(0, upper.indexOf(":")).trim() === upperKnownTitle)
        ) {
          // Se não for a seção atual, é uma nova seção
          if (upperKnownTitle !== upperTitle) {
            isNewSection = true;
            break;
          }
        }
      }
      
      // Também verificar padrão genérico de título (tudo maiúsculas, sem dois pontos no meio do texto)
      if (!isNewSection && t.length > 0 && t === t.toUpperCase() && t.length < 80 && !t.includes(":") && !t.match(/^[a-z]/)) {
        // Verificar se parece um título conhecido
        const looksLikeTitle = knownTitles.some(title => 
          upper.includes(title.toUpperCase()) || title.toUpperCase().includes(upper)
        );
        if (looksLikeTitle && upper !== upperTitle) {
          isNewSection = true;
        }
      }
      
      if (isNewSection) {
        break;
      }
      
      // Adicionar linha ao resultado, mas filtrar "N/A" se já houver conteúdo
      if (t) {
        // Se a linha contém apenas "N/A" e já temos conteúdo, não adicionar
        if (t.toUpperCase() === "N/A" && result.length > 0) {
          continue;
        }
        result.push(t);
      }
    }
  }
  
  const content = result.join("\n").trim();
  // Se o conteúdo for apenas "N/A", retornar string vazia
  if (content.toUpperCase() === "N/A" || content.toUpperCase() === "N/A\n") {
    return "";
  }
  return content;
}

/** Une blocos legados (IA/prontuários antigos) num único campo do modo manual. */
function parseAntecedentesHabitosSocialMerged(anamnese: string): string {
  const fromNew = parseAnamneseSection(anamnese, ANTECEDENTES_HABITOS_SOCIAL_LABEL).trim();
  if (fromNew) return fromNew;

  const ap = parseAnamneseSection(anamnese, "ANTECEDENTES PESSOAIS PATOLÓGICOS").trim();
  const hvHs = parseAnamneseSection(anamnese, "HÁBITOS DE VIDA / HISTÓRIA SOCIAL").trim();
  let habitosBlock = hvHs;
  if (!habitosBlock) {
    const h = parseAnamneseSection(anamnese, "HÁBITOS DE VIDA").trim();
    const s = parseAnamneseSection(anamnese, "HISTÓRIA SOCIAL").trim();
    habitosBlock = [h, s].filter(Boolean).join("\n\n");
  }
  return [ap, habitosBlock].filter(Boolean).join("\n\n");
}

function sectionValueFromAnamnese(base: string, sectionKey: string, sectionLabel: string): string {
  if (sectionKey === "antecedentesHabitosSocial") {
    return parseAntecedentesHabitosSocialMerged(base);
  }
  return parseAnamneseSection(base, sectionLabel);
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
      let value =
        parsed[section.label] ??
        Object.entries(parsed).find(
          ([k]) => k.toUpperCase() === section.label.toUpperCase()
        )?.[1] ??
        "";
      if (section.key === "antecedentesHabitosSocial" && !(value || "").trim()) {
        const ap =
          parsed["ANTECEDENTES PESSOAIS PATOLÓGICOS"] ??
          Object.entries(parsed).find(
            ([k]) => k.toUpperCase() === "ANTECEDENTES PESSOAIS PATOLÓGICOS"
          )?.[1] ??
          "";
        const hv =
          parsed["HÁBITOS DE VIDA / HISTÓRIA SOCIAL"] ??
          Object.entries(parsed).find(
            ([k]) => k.toUpperCase() === "HÁBITOS DE VIDA / HISTÓRIA SOCIAL"
          )?.[1] ??
          "";
        const parts = [ap, hv].map((x) => (x || "").trim()).filter((x) => x && x.toUpperCase() !== "N/A");
        value = parts.join("\n\n");
      }
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
      result.push({ title: section.label, content: "" });
    }
  }
  // Reordena para seguir a ordem de ANAMNESE_SECTIONS
  return ANAMNESE_SECTIONS.map((s) => {
    const found = result.find(
      (r) => r.title.toUpperCase() === s.label.toUpperCase()
    );
    if (found) {
      // Limpar conteúdo que é apenas "N/A"
      const content = found.content.trim();
      if (content.toUpperCase() === "N/A") {
        return { title: found.title, content: "" };
      }
      return found;
    }
    return { title: s.label, content: "" };
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

    // Verificar se a linha contém um título conhecido
    if (trimmed.includes(":")) {
      const colonIndex = trimmed.indexOf(":");
      const beforeColon = trimmed.substring(0, colonIndex).trim();
      const afterColon = trimmed.substring(colonIndex + 1).trim();
      const upperBefore = beforeColon.toUpperCase();

      const isKnownTitle = knownTitles.some(title => {
        const upperTitle = title.toUpperCase();
        return (
          upperBefore === upperTitle ||
          upperBefore.startsWith(upperTitle) ||
          upperTitle.startsWith(upperBefore) ||
          upperBefore.includes(upperTitle) ||
          upperTitle.includes(upperBefore)
        );
      });

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

    // Verificar se a linha inteira é um título conhecido (sem dois pontos)
    if (!titleMatch) {
      const upperTrimmed = trimmed.toUpperCase();
      const isKnownTitle = knownTitles.some(title => {
        const upperTitle = title.toUpperCase();
        return (
          upperTrimmed === upperTitle ||
          upperTrimmed.startsWith(upperTitle + " ") ||
          upperTitle.startsWith(upperTrimmed) ||
          (trimmed === upperTrimmed && trimmed.length < 80)
        );
      });

      if (isKnownTitle && trimmed === upperTrimmed && trimmed.length < 80) {
        titleMatch = {
          title: trimmed,
          content: ""
        };
      }
    }

    if (titleMatch) {
      // Salvar a seção anterior antes de começar uma nova
      if (currentTitle || currentContent.length > 0) {
        let content = currentContent.join("\n").trim();
        
        // Limpar "N/A" se for o único conteúdo
        if (content.toUpperCase() === "N/A") {
          content = "";
        }
        
        // Remover linhas que são títulos de outras seções do conteúdo
        const cleanedContent: string[] = [];
        const contentLines = content.split("\n");
        for (const contentLine of contentLines) {
          const contentTrimmed = contentLine.trim();
          const contentUpper = contentTrimmed.toUpperCase();
          
          // Verificar se esta linha é um título conhecido de outra seção
          let isOtherSectionTitle = false;
          if (currentTitle) {
            for (const knownTitle of knownTitles) {
              const upperKnownTitle = knownTitle.toUpperCase();
              const currentTitleUpper = currentTitle.toUpperCase();
              
              // Se não for o título atual e for um título conhecido
              if (
                upperKnownTitle !== currentTitleUpper &&
                (contentUpper === upperKnownTitle ||
                 contentUpper.startsWith(upperKnownTitle + ":") ||
                 (contentTrimmed.includes(":") && 
                  contentTrimmed.substring(0, contentTrimmed.indexOf(":")).trim().toUpperCase() === upperKnownTitle))
              ) {
                isOtherSectionTitle = true;
                break;
              }
            }
          }
          
          if (!isOtherSectionTitle) {
            cleanedContent.push(contentLine);
          }
        }
        
        content = cleanedContent.join("\n").trim();
        
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
      // Verificar se a linha atual é um título conhecido que não foi detectado antes
      const upperTrimmed = trimmed.toUpperCase();
      let isOtherSectionTitle = false;
      
      if (currentTitle) {
        for (const knownTitle of knownTitles) {
          const upperKnownTitle = knownTitle.toUpperCase();
          const currentTitleUpper = currentTitle.toUpperCase();
          
          if (
            upperKnownTitle !== currentTitleUpper &&
            (upperTrimmed === upperKnownTitle ||
             upperTrimmed.startsWith(upperKnownTitle + ":") ||
             (trimmed.includes(":") && 
              trimmed.substring(0, trimmed.indexOf(":")).trim().toUpperCase() === upperKnownTitle))
          ) {
            isOtherSectionTitle = true;
            break;
          }
        }
      }
      
      if (isOtherSectionTitle) {
        // Esta linha é um título de outra seção, parar de capturar
        if (currentTitle || currentContent.length > 0) {
          let content = currentContent.join("\n").trim();
          if (content.toUpperCase() === "N/A") {
            content = "";
          }
          if (currentTitle || content) {
            sections.push({
              title: currentTitle,
              content: content,
            });
          }
        }
        // Processar esta linha como um novo título na próxima iteração
        // Mas primeiro, vamos processá-la agora
        const colonIndex = trimmed.indexOf(":");
        if (colonIndex > 0) {
          const beforeColon = trimmed.substring(0, colonIndex).trim();
          const afterColon = trimmed.substring(colonIndex + 1).trim();
          currentTitle = beforeColon;
          currentContent = afterColon ? [afterColon] : [];
        } else {
          currentTitle = trimmed;
          currentContent = [];
        }
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
  }

  if (currentTitle || currentContent.length > 0) {
    let content = currentContent.join("\n").trim();
    if (content.toUpperCase() === "N/A") {
      content = "";
    }
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
      ANAMNESE_SECTIONS.map((s: { key: string; label: string; placeholder: string }) => [
        s.key,
        sectionValueFromAnamnese(base, s.key, s.label),
      ])
    );
  });

  // Quando a IA gera (ou atualiza) a anamnese, repopula os campos do modo manual
  useEffect(() => {
    const base = analysisResults?.anamnese || "";
    if (!base) return;
    setSectionValues(
      Object.fromEntries(
        ANAMNESE_SECTIONS.map((s) => [s.key, sectionValueFromAnamnese(base, s.key, s.label)])
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
            /* ── Mostrar transcrição durante gravação (aba IA) ── */
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
          ) : (
            /* ── Aba IA: sempre mostra botão Iniciar Gravação ── */
            /* A anamnese gerada é exibida apenas nos inputs da aba Manual */
            <div className="flex flex-col items-center justify-center py-10 px-6 text-center select-none">
              <div className="relative mb-5">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center">
                    <Mic className="w-5 h-5 text-[#1E40AF]" />
                  </div>
                </div>
              </div>
              {anamneseText ? (
                <>
                  <p className="text-base font-semibold text-slate-700 mb-2">Anamnese gerada</p>
                  <p className="text-sm text-slate-400 max-w-xs leading-relaxed mb-5">
                    Os campos foram preenchidos na aba <strong>Manual</strong>. Você pode gravar novamente para atualizar.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base font-semibold text-slate-700 mb-2">Pronto para começar</p>
                  <p className="text-sm text-slate-400 max-w-xs leading-relaxed mb-5">
                    Inicie a gravação para gerar automaticamente a anamnese estruturada com inteligência artificial.
                  </p>
                </>
              )}
              {startTranscription && (
                <Button
                  onClick={startTranscription}
                  className="h-10 px-6 text-sm gap-2 bg-[#1E40AF] hover:bg-[#1e3a8a] text-white shadow-md shadow-blue-200 font-semibold rounded-xl"
                >
                  <Mic className="w-4 h-4" />
                  {anamneseText ? "Gravar Novamente" : "Iniciar Gravação"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
