"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  Loader2,
  Play,
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
  { key: "exameFisico",     label: "Exame Físico", placeholder: "Dados vitais, aspecto geral, achados por sistema..." },
];

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

  // Títulos conhecidos da anamnese
  const knownTitles = [
    "ANAMNESE",
    "QUEIXA PRINCIPAL",
    "HISTÓRIA DA DOENÇA ATUAL",
    "ANTECEDENTES PESSOAIS PATOLÓGICOS",
    "ANTECEDENTES FAMILIARES",
    "HÁBITOS DE VIDA",
    "HISTÓRIA SOCIAL",
    "HISTÓRIA GINECO-OBSTÉTRICA",
    "MEDICAMENTOS EM USO ATUAL",
    "EXAMES REALIZADOS",
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed) {
      // Linha vazia - se já temos conteúdo, mantém para espaçamento
      if (currentContent.length > 0) {
        currentContent.push("");
      }
      continue;
    }
    
    // Verifica se a linha contém um título (pode ter conteúdo na mesma linha)
    let titleMatch: { title: string; content: string } | null = null;
    
    // Padrão 1: Linha que termina com ":" e começa com maiúscula
    if (trimmed.includes(":")) {
      const colonIndex = trimmed.indexOf(":");
      const beforeColon = trimmed.substring(0, colonIndex).trim();
      const afterColon = trimmed.substring(colonIndex + 1).trim();
      const upperBefore = beforeColon.toUpperCase();
      
      // Verifica se é um título conhecido ou parece um título (tudo maiúscula)
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
    
    // Padrão 2: Linha toda em maiúscula sem ":" mas é um título conhecido
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
    
    // Padrão 3: Linha com "**" no início e fim
    if (!titleMatch && trimmed.startsWith("**") && trimmed.endsWith("**")) {
      titleMatch = {
        title: trimmed.replace(/^\*\*/g, "").replace(/\*\*$/g, "").trim(),
        content: ""
      };
    }

    if (titleMatch) {
      // Salva a seção anterior
      if (currentTitle || currentContent.length > 0) {
        const content = currentContent.join("\n").trim();
        if (currentTitle || content) {
          sections.push({
            title: currentTitle,
            content: content,
          });
        }
      }
      // Inicia nova seção
      currentTitle = titleMatch.title;
      currentContent = titleMatch.content ? [titleMatch.content] : [];
    } else {
      // Adiciona ao conteúdo da seção atual
      if (currentTitle || currentContent.length > 0) {
        currentContent.push(trimmed);
      } else {
        // Se não há título ainda, pode ser que o texto comece sem título
        if (sections.length === 0) {
          currentContent.push(trimmed);
        }
      }
    }
  }

  // Adiciona a última seção
  if (currentTitle || currentContent.length > 0) {
    const content = currentContent.join("\n").trim();
    if (currentTitle || content) {
      sections.push({
        title: currentTitle,
        content: content,
      });
    }
  }

  // Se não encontrou nenhuma seção formatada, retorna tudo como uma seção
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
  consultationMode,
  onToggleMode,
  isTranscribing,
  startTranscription,
  transcriptionText = "",
}: Step2AnamnesisProps) {
  // Garantir que as quebras de linha sejam preservadas
  const rawAnamnese = isAnamneseEdited
    ? editedAnamnese
    : analysisResults?.anamnese || prontuario?.anamnese || "";
  let anamneseText = rawAnamnese.replace(/\\n/g, '\n').replace(/\\r/g, '');
  
  // Garantir que sempre tenha o primeiro tópico "ANAMNESE" com o texto da transcrição
  if (transcriptionText && transcriptionText.trim()) {
    const trimmedTranscription = transcriptionText.trim();
    const upperAnamnese = anamneseText.toUpperCase().trim();
    
    // Verifica se já começa com "ANAMNESE:"
    if (upperAnamnese.startsWith("ANAMNESE:")) {
      // Se já tem o título, verifica se tem conteúdo após "ANAMNESE:"
      const lines = anamneseText.split('\n');
      const firstLine = lines[0]?.trim() || '';
      const afterColon = firstLine.substring(firstLine.indexOf(':') + 1).trim();
      
      // Se não tem conteúdo na mesma linha ou na próxima linha, adiciona a transcrição
      if (!afterColon) {
        const secondLine = lines[1]?.trim() || '';
        if (!secondLine) {
          // Se não tem conteúdo após "ANAMNESE:", adiciona a transcrição
          anamneseText = `ANAMNESE:\n${trimmedTranscription}\n\n${lines.slice(1).join('\n')}`;
        }
      }
    } else if (upperAnamnese.startsWith("ANAMNESE")) {
      // Se começa com "ANAMNESE" mas sem ":", adiciona ":" e a transcrição
      const lines = anamneseText.split('\n');
      if (lines[0]?.trim().toUpperCase() === "ANAMNESE") {
        anamneseText = `ANAMNESE:\n${trimmedTranscription}\n\n${lines.slice(1).join('\n')}`;
      }
    } else {
      // Se não tem o título "ANAMNESE", adiciona no início
      anamneseText = `ANAMNESE:\n${trimmedTranscription}\n\n${anamneseText}`;
    }
  }

  // Estado para armazenar edições das seções
  const [sectionEdits, setSectionEdits] = useState<Record<number, string>>({});

  // Resetar edições quando a anamnese mudar
  useEffect(() => {
    setSectionEdits({});
  }, [anamneseText]);

  // ── Estado de seções para modo manual ──────────────────────────────────────
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
    <div className="space-y-2 overflow-x-hidden">
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm flex flex-col overflow-x-hidden">

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
          {/* Botão Iniciar Gravação - somente quando não há anamnese gerada */}
          {!isTranscribing && !anamneseText && startTranscription && (
            <Button
              onClick={startTranscription}
              size="sm"
              className="h-9 px-4 text-sm gap-2 bg-[#1E40AF] hover:bg-[#1e3a8a] text-white"
            >
              <Play className="w-4 h-4" fill="currentColor" />
              Iniciar Gravação
            </Button>
          )}
        </div>

        {/* ── Corpo ── */}
        <div className="p-3 overflow-x-hidden">
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

          ) : !anamneseText ? (
            /* Vazio */
            <div className="text-center py-6 text-slate-400">
              <Sparkles className="w-6 h-6 text-slate-200 mx-auto mb-1.5" />
              <p className="text-xs">A anamnese será preenchida automaticamente após processar a transcrição.</p>
            </div>

          ) : (
            /* Anamnese formatada com títulos - sempre editável */
            <div className="space-y-4">
              {formatAnamneseWithTitles(anamneseText).map((section, index) => {
                const displayContent = section.content || "";
                const currentContent = sectionEdits[index] !== undefined ? sectionEdits[index] : displayContent;

                const handleContentChange = (newContent: string) => {
                  // Atualiza o estado local da seção
                  setSectionEdits((prev) => ({ ...prev, [index]: newContent }));
                  
                  // Reconstrói a anamnese completa com todas as seções
                  const allSections = formatAnamneseWithTitles(anamneseText);
                  allSections[index].content = newContent;
                  
                  // Aplica outras edições pendentes
                  Object.keys(sectionEdits).forEach((key) => {
                    const editIndex = parseInt(key);
                    if (editIndex !== index && allSections[editIndex]) {
                      allSections[editIndex].content = sectionEdits[editIndex];
                    }
                  });
                  
                  // Reconstrói a anamnese completa
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
                  <div key={index} className="space-y-1.5">
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
