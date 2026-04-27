"use client";

import { cn } from "@/lib/utils";
import { DateFilter } from "@/lib/timezone-utils";

interface DateFilterBadgesProps {
  selectedFilter: DateFilter;
  onFilterChange: (filter: DateFilter) => void;
}

const filters: { value: DateFilter; label: string }[] = [
  { value: "diario", label: "Diário" },
  { value: "semanal", label: "Semanal" },
  { value: "mensal", label: "Mensal" },
  { value: "anual", label: "Anual" },
];

export function DateFilterBadges({ selectedFilter, onFilterChange }: DateFilterBadgesProps) {
  return (
    <div className="flex items-center justify-end gap-2 pb-3">
      <span className="text-xs text-slate-600 font-medium">Filtros:</span>
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
            selectedFilter === filter.value
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
