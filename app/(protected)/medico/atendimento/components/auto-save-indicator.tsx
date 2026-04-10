"use client";

import { CheckCircle2, AlertCircle, Loader2, CloudOff } from "lucide-react";

type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

interface AutoSaveIndicatorProps {
  status: AutoSaveStatus;
  lastSaveTime: Date | null;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function AutoSaveIndicator({ status, lastSaveTime }: AutoSaveIndicatorProps) {
  if (status === "idle" && !lastSaveTime) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs select-none">
      {status === "saving" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Salvando...</span>
        </>
      )}
      {status === "saved" && lastSaveTime && (
        <>
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          <span className="text-emerald-600">Salvo {formatTime(lastSaveTime)}</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="h-3 w-3 text-red-500" />
          <span className="text-red-500">Erro ao salvar</span>
        </>
      )}
      {status === "idle" && lastSaveTime && (
        <>
          <CloudOff className="h-3 w-3 text-muted-foreground/50" />
          <span className="text-muted-foreground/50">Salvo {formatTime(lastSaveTime)}</span>
        </>
      )}
    </div>
  );
}
