"use client";

import { FileSearch, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExamesEmptyStateProps {
  hasFilters: boolean;
  onClearFilters?: () => void;
  onCreate: () => void;
}

export function ExamesEmptyState({
  hasFilters,
  onClearFilters,
  onCreate,
}: ExamesEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-primary/10 p-4 mb-4">
        <FileSearch className="h-12 w-12 text-primary" />
      </div>

      <h3 className="text-lg font-semibold mb-2">
        {hasFilters ? "Nenhum resultado encontrado" : "Nenhum exame cadastrado"}
      </h3>

      <p className="text-muted-foreground mb-4 max-w-sm">
        {hasFilters
          ? "Tente ajustar seus filtros de busca ou limpar os filtros para ver todos os exames"
          : "Comece criando seu primeiro exame para gerenciar os exames da clínica"}
      </p>

      {hasFilters ? (
        <Button variant="outline" onClick={onClearFilters}>
          Limpar filtros
        </Button>
      ) : (
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Exame
        </Button>
      )}
    </div>
  );
}
