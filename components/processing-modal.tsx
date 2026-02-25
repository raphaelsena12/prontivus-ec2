"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Sparkles, Brain, FileText } from "lucide-react";

interface ProcessingModalProps {
  isOpen: boolean;
  stage: "processing" | "analyzing" | "generating";
  context?: "anamnese" | "suggestions";
  examesCount?: number;
  imagensCount?: number;
}

export function ProcessingModal({ isOpen, stage, context, examesCount = 0, imagensCount = 0 }: ProcessingModalProps) {
  // Contexto: geração de anamnese (passo 1)
  if (context === "anamnese") {
    return (
      <Dialog open={isOpen}>
        <DialogContent className="sm:max-w-md border-0 p-0 overflow-hidden" showCloseButton={false}>
          <DialogTitle className="sr-only">Gerando Anamnese</DialogTitle>
          <div className="bg-gradient-to-br from-slate-50 via-blue-50/50 to-blue-50/30 p-8">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-100/40 rounded-full blur-xl animate-pulse" />
                <div className="relative bg-blue-600 rounded-full p-6 shadow-lg shadow-blue-500/20">
                  <Sparkles className="w-12 h-12 text-white animate-spin" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-slate-800">Gerando Anamnese</h3>
                <p className="text-sm text-slate-600 max-w-xs">
                  Processando a transcrição e estruturando a anamnese clínica...
                </p>
              </div>
              <div className="w-full max-w-xs">
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" style={{ animation: 'shimmer 2s infinite' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Contexto: análise com IA (passo 2 — CID, exames, prescrições)
  if (context === "suggestions") {
    return (
      <Dialog open={isOpen}>
        <DialogContent className="sm:max-w-md border-0 p-0 overflow-hidden" showCloseButton={false}>
          <DialogTitle className="sr-only">Analisando com IA</DialogTitle>
          <div className="bg-gradient-to-br from-slate-50 via-blue-50/50 to-blue-50/30 p-8">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-100/40 rounded-full blur-xl animate-pulse" />
                <div className="relative bg-blue-600 rounded-full p-6 shadow-lg shadow-blue-500/20">
                  <Brain className="w-12 h-12 text-white animate-spin" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-slate-800">Analisando com IA</h3>
                <p className="text-sm text-slate-600 max-w-xs">
                  Identificando CID, sugerindo exames e gerando prescrições...
                </p>
              </div>
              <div className="w-full max-w-xs">
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" style={{ animation: 'shimmer 2s infinite' }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {["analyzing", "generating"].map((s, idx) => (
                  <div
                    key={s}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      stage === s ? "bg-blue-600 w-8" : idx < ["analyzing", "generating"].indexOf(stage) ? "bg-blue-400 w-2" : "bg-slate-300 w-2"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Fallback genérico (outros contextos)
  const getStageInfo = () => {
    switch (stage) {
      case "processing":
        return { title: "Processando Transcrição", description: "Analisando o conteúdo da consulta...", icon: FileText };
      case "analyzing":
        return { title: "Analisando com IA Médica", description: "Identificando condições, sintomas e medicamentos...", icon: Brain };
      case "generating":
        return { title: "Gerando Anamnese", description: "Criando anamnese, CID e sugestões de exames...", icon: Sparkles };
      default:
        return { title: "Processando", description: "Aguarde...", icon: Loader2 };
    }
  };

  const stageInfo = getStageInfo();
  const Icon = stageInfo.icon;

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md border-0 p-0 overflow-hidden" showCloseButton={false}>
        <DialogTitle className="sr-only">{stageInfo.title}</DialogTitle>
        <div className="bg-gradient-to-br from-slate-50 via-blue-50/50 to-blue-50/30 p-8">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-100/40 rounded-full blur-xl animate-pulse" />
              <div className="relative bg-blue-600 rounded-full p-6 shadow-lg shadow-blue-500/20">
                <Icon className="w-12 h-12 text-white animate-spin" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-slate-800">{stageInfo.title}</h3>
              <p className="text-sm text-slate-600 max-w-xs">{stageInfo.description}</p>
            </div>
            <div className="w-full max-w-xs">
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" style={{ animation: 'shimmer 2s infinite' }} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {["processing", "analyzing", "generating"].map((s, idx) => (
                <div
                  key={s}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    stage === s ? "bg-blue-600 w-8" : idx < ["processing", "analyzing", "generating"].indexOf(stage) ? "bg-blue-400 w-2" : "bg-slate-300 w-2"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

