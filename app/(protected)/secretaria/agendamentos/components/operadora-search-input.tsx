"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, Search, X } from "lucide-react";

type Operadora = {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
};

function formatOperadora(o: Operadora) {
  return o.nomeFantasia || o.razaoSocial;
}

export function OperadoraSearchInput({
  operadoraId,
  onSelectOperadoraId,
  error,
  placeholder = "Digite para pesquisar",
  disabled,
}: {
  operadoraId: string | null;
  onSelectOperadoraId: (id: string | null) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [term, setTerm] = useState("");
  const [selected, setSelected] = useState<Operadora | null>(null);
  const [results, setResults] = useState<Operadora[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);

  const canSearch = useMemo(() => term.trim().length >= 2, [term]);

  const select = useCallback(
    (o: Operadora) => {
      setSelected(o);
      setTerm(formatOperadora(o));
      setResults([]);
      setOpen(false);
      setActiveIndex(-1);
      onSelectOperadoraId(o.id);
    },
    [onSelectOperadoraId]
  );

  const clear = useCallback(() => {
    setSelected(null);
    setTerm("");
    setResults([]);
    setOpen(false);
    setActiveIndex(-1);
    onSelectOperadoraId(null);
  }, [onSelectOperadoraId]);

  // Hydrate quando recebe um id inicial (editar agendamento)
  useEffect(() => {
    if (!operadoraId) {
      if (selected) clear();
      return;
    }
    if (selected?.id === operadoraId) return;

    const hydrate = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin-clinica/operadoras/${operadoraId}`);
        if (!res.ok) return;
        const data = await res.json();
        const o = data.operadora;
        if (o?.id) select({ id: o.id, razaoSocial: o.razaoSocial, nomeFantasia: o.nomeFantasia });
      } catch {
        // noop
      } finally {
        setLoading(false);
      }
    };

    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operadoraId]);

  // Buscar sugestões com debounce
  useEffect(() => {
    const t = term.trim();

    if (!t) {
      setResults([]);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (selected && t === formatOperadora(selected)) return;

    if (!canSearch) {
      setResults([]);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();

    const run = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/admin-clinica/operadoras?ativo=true&search=${encodeURIComponent(t)}&limit=20`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = await res.json();
        const list: Operadora[] = (data.operadoras || []).map((o: any) => ({
          id: o.id,
          razaoSocial: o.razaoSocial,
          nomeFantasia: o.nomeFantasia,
        }));
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
    if (selected && v !== formatOperadora(selected)) {
      setSelected(null);
      onSelectOperadoraId(null);
    }
    setTerm(v);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          type="text"
          value={term}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
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
          {results.map((o, idx) => (
            <button
              key={o.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(o)}
              className={cn(
                "w-full text-left px-3 py-2 text-xs transition-colors border-b border-border last:border-b-0",
                idx === activeIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <div className="font-medium">{o.nomeFantasia || o.razaoSocial}</div>
              {o.nomeFantasia && (
                <div className="text-muted-foreground text-[10px]">{o.razaoSocial}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
