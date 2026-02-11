"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface FilterState {
  tipos: string[];
  status: "all" | "ativo" | "inativo";
  sortBy: "nome-asc" | "nome-desc" | "date-desc" | "date-asc";
}

interface ExamesFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

const TIPOS = [
  { value: "LABORATORIAL", label: "Laboratorial" },
  { value: "IMAGEM", label: "Imagem" },
  { value: "OUTROS", label: "Outros" },
];

export function ExamesFiltersSheet({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: ExamesFiltersSheetProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
    }
  }, [open, filters]);

  const handleTipoToggle = (tipo: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      tipos: prev.tipos.includes(tipo)
        ? prev.tipos.filter((t) => t !== tipo)
        : [...prev.tipos, tipo],
    }));
  };

  const handleClearFilters = () => {
    const defaultFilters: FilterState = {
      tipos: [],
      status: "all",
      sortBy: "date-desc",
    };
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
          <SheetDescription>
            Refine sua busca de exames
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Filtro por Tipo */}
          <div>
            <h4 className="font-medium mb-3">Tipo de Exame</h4>
            <div className="space-y-3">
              {TIPOS.map((tipo) => (
                <div key={tipo.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={tipo.value}
                    checked={localFilters.tipos.includes(tipo.value)}
                    onCheckedChange={() => handleTipoToggle(tipo.value)}
                  />
                  <Label
                    htmlFor={tipo.value}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {tipo.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Filtro por Status */}
          <div>
            <h4 className="font-medium mb-3">Status</h4>
            <Select
              value={localFilters.status}
              onValueChange={(value: any) =>
                setLocalFilters((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Ordenação */}
          <div>
            <h4 className="font-medium mb-3">Ordenar por</h4>
            <Select
              value={localFilters.sortBy}
              onValueChange={(value: any) =>
                setLocalFilters((prev) => ({ ...prev, sortBy: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nome-asc">Nome (A-Z)</SelectItem>
                <SelectItem value="nome-desc">Nome (Z-A)</SelectItem>
                <SelectItem value="date-desc">Mais recentes</SelectItem>
                <SelectItem value="date-asc">Mais antigos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={handleClearFilters} className="flex-1">
            Limpar
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Aplicar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
