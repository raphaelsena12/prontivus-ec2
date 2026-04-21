"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, Search, X } from "lucide-react";

export type ProcedimentoItem = {
  id: string;
  codigo: string;
  nome: string;
  origem: "CLINICA" | "GLOBAL";
};

function formatProcedimento(p: ProcedimentoItem) {
  return `${p.codigo} - ${p.nome}`;
}

export function ProcedimentoSearchInput({
  procedimentoId,
  onSelect,
  error,
  placeholder = "Digite 3 letras para pesquisar",
  disabled,
}: {
  procedimentoId: string | null | undefined;
  /** Chamado ao selecionar qualquer item — clínica ou global */
  onSelect: (item: ProcedimentoItem | null) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [term, setTerm] = useState("");
  const [selected, setSelected] = useState<ProcedimentoItem | null>(null);
  const [results, setResults] = useState<ProcedimentoItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canSearch = useMemo(() => term.trim().length >= 3, [term]);

  const select = useCallback(
    (p: ProcedimentoItem) => {
      setSelected(p);
      setTerm(formatProcedimento(p));
      setResults([]);
      setOpen(false);
      setActiveIndex(-1);
      onSelect(p);
    },
    [onSelect]
  );

  const clear = useCallback(() => {
    setSelected(null);
    setTerm("");
    setResults([]);
    setOpen(false);
    setActiveIndex(-1);
    onSelect(null);
  }, [onSelect]);

  // Hidratar seleção ao abrir em modo edição (quando vem um id pré-preenchido)
  useEffect(() => {
    if (!procedimentoId) {
      if (selected) clear();
      return;
    }
    if (selected?.id === procedimentoId) return;

    let cancelled = false;

    const hydrate = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/secretaria/procedimentos/busca-global?id=${encodeURIComponent(procedimentoId)}`
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const found: ProcedimentoItem | undefined = data.items?.[0];
        if (found && !cancelled) {
          setSelected(found);
          setTerm(formatProcedimento(found));
        }
      } catch {
        // noop
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    hydrate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procedimentoId]);

  // Busca com debounce a partir de 3 chars — clínica + global
  useEffect(() => {
    const t = term.trim();

    if (!t || !canSearch) {
      setResults([]);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (selected && t === formatProcedimento(selected)) return;

    const controller = new AbortController();

    const run = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/secretaria/procedimentos/busca-global?search=${encodeURIComponent(t)}&limit=30`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = await res.json();
        const list: ProcedimentoItem[] = data.items || [];
        setResults(list);
        setOpen(true);
        setActiveIndex(list.length ? 0 : -1);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          // noop
        }
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(run, 300);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [term, canSearch, selected]);

  // Fechar ao clicar fora
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[activeIndex];
      if (item) select(item);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  const onChange = (v: string) => {
    if (!v) {
      clear();
      return;
    }
    if (selected && v !== formatProcedimento(selected)) {
      setSelected(null);
      onSelect(null);
    }
    setTerm(v);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={term}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("h-8 text-xs pl-8 pr-8", error && "border-destructive")}
        />
        {!!term && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            disabled={disabled}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {loading && (
          <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {results.map((p, idx) => (
            <button
              key={`${p.origem}:${p.id}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(p)}
              className={cn(
                "w-full text-left px-3 py-2 text-xs transition-colors border-b border-border last:border-b-0",
                idx === activeIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <div className="font-medium">
                {p.codigo} - {p.nome}
              </div>
              <div className="text-muted-foreground text-[10px]">
                {p.origem === "CLINICA" ? "Clínica" : "Global"}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
