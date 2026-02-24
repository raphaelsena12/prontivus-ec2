"use client";

import { useState, useEffect, useCallback } from "react";
import { Package, Filter, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EstoqueTable } from "./components/estoque-table";
import { PageHeader } from "@/components/page-header";

interface Estoque {
  id: string;
  medicamento: {
    id: string;
    nome: string;
    principioAtivo: string | null;
  };
  quantidadeAtual: number;
  quantidadeMinima: number;
  quantidadeMaxima: number | null;
  unidade: string;
  localizacao: string | null;
}

export function EstoqueContent() {
  const [estoques, setEstoques] = useState<Estoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");

  const fetchEstoques = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ 
        page: "1",
        limit: "1000", // Buscar muitos registros para paginação no cliente
      });
      const response = await fetch(`/api/medico/estoque?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao carregar estoque");
      const data = await response.json();
      setEstoques(data.estoques || []);
    } catch (error) {
      toast.error("Erro ao carregar estoque");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEstoques();
  }, [fetchEstoques]);

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={Package}
        title="Estoque"
        subtitle="Gerencie o estoque de medicamentos"
      />

      {/* Card Branco com Tabela */}
      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de Medicamentos em Estoque</CardTitle>
          </div>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
            <Input 
              type="search"
              placeholder="Buscar por nome ou princípio ativo..." 
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9 h-8 text-xs bg-background w-64" 
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando estoque...</p>
              </div>
            </div>
          ) : estoques.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
                  <Package className="h-7 w-7 text-muted-foreground/50" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">
                    Nenhum medicamento em estoque encontrado
                  </p>
                  <p className="text-[10px] text-muted-foreground/70">
                    Não há medicamentos cadastrados no momento
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <EstoqueTable 
              data={estoques} 
              globalFilter={globalFilter}
              onGlobalFilterChange={setGlobalFilter}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
