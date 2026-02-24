"use client";

import React from "react";
import { Sparkles, Pencil } from "lucide-react";

interface ModeToggleProps {
  mode: "manual" | "ai";
  onToggle: (mode: "manual" | "ai") => void;
}

export function ModeToggle({ mode, onToggle }: ModeToggleProps) {
  const isAI = mode === "ai";

  return (
    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm w-fit">
      <button
        onClick={() => onToggle("manual")}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          !isAI
            ? "bg-slate-900 text-white shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        <Pencil className="w-3.5 h-3.5" />
        Manual
      </button>

      <button
        onClick={() => onToggle("ai")}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          isAI
            ? "bg-[#1E40AF] text-white shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        Assistido por IA
      </button>
    </div>
  );
}
