"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, Search, X } from "lucide-react";

type CodigoTuss = {
  id: string;
  codigoTuss: string;
  descricao: string;
};

function formatCodigoTuss(c: CodigoTuss) {
  return `${c.codigoTuss} - ${c.descricao}`;
}

export function CodigoTussSearchInput({
  codigoTussId,
  onSelectCodigoTussId,
  error,
  placeholder = "Digite para pesquisar",
  disabled,
}: {
  codigoTussId: string;
  onSelectCodigoTussId: (id: string) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [term, setTerm] = useState("");
  const [selected, setSelected] = useState<CodigoTuss | null>(null);
  const [results, setResults] = useState<CodigoTuss[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canSearch = useMemo(() => term.trim().length >= 3, [term]);

  const select = useCallback(
    (c: CodigoTuss) => {
      setSelected(c);
      setTerm(formatCodigoTuss(c));
      setResults([]);
      setOpen(false);
      setActiveIndex(-1);
      onSelectCodigoTussId(c.id);
    },
    [onSelectCodigoTussId]
  );

  const clear = useCallback(() => {
    setSelected(null);
    setTerm("");
    setResults([]);
    setOpen(false);
    setActiveIndex(-1);
    onSelectCodigoTussId("");
  }, [onSelectCodigoTussId]);

  // Se vier um id inicial (editar agendamento), buscar o item para preencher o texto exibido
  useEffect(() => {
    const hydrateSelected = async () => {
      if (!codigoTussId) {
        if (selected) clear();
        return;
      }
      if (selected?.id === codigoTussId) return;

      try {
        setLoading(true);
        const res = await fetch(`/api/admin-clinica/codigos-tuss/${codigoTussId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.codigoTuss?.id) {
          select({
            id: data.codigoTuss.id,
            codigoTuss: data.codigoTuss.codigoTuss,
            descricao: data.codigoTuss.descricao,
          });
        }
      } catch {
        // noop
      } finally {
        setLoading(false);
      }
    };

    hydrateSelected();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoTussId]);

  // Buscar sugestões (debounce) apenas quando tiver 3+ chars e quando o termo não for exatamente o selecionado
  useEffect(() => {
    const t = term.trim();

    if (!t) {
      setResults([]);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    // Se o usuário está vendo exatamente o valor selecionado, não buscar
    if (selected && t === formatCodigoTuss(selected)) {
      return;
    }

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
          `/api/admin-clinica/codigos-tuss?ativo=true&search=${encodeURIComponent(t)}&limit=20`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = await res.json();
        const list: CodigoTuss[] = (data.codigosTuss || []).map((c: any) => ({
          id: c.id,
          codigoTuss: c.codigoTuss,
          descricao: c.descricao,
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
    // se tinha selecionado e o usuário começou a editar, limpa o id do form
    if (selected && v !== formatCodigoTuss(selected)) {
      setSelected(null);
      onSelectCodigoTussId("");
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
          {results.map((c, idx) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()} // evita blur antes do click
              onClick={() => select(c)}
              className={cn(
                "w-full text-left px-3 py-2 text-xs transition-colors border-b border-border last:border-b-0",
                idx === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <div className="font-medium">{c.codigoTuss}</div>
              <div className="text-muted-foreground text-[10px] line-clamp-2">{c.descricao}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

