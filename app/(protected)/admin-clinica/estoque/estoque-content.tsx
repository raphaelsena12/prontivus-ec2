"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Package, Upload, Filter, Box } from "lucide-react";
import { toast } from "sonner";
import { EstoqueTable } from "./components/estoque-table";
import { EstoqueDeleteDialog } from "./components/estoque-delete-dialog";
import { UploadExcelDialog } from "@/components/upload-excel-dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

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

interface EstoqueContentProps {
  clinicaId: string;
}

export function EstoqueContent({ clinicaId }: EstoqueContentProps) {
  const router = useRouter();
  const [estoques, setEstoques] = useState<Estoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [estoqueToDelete, setEstoqueToDelete] = useState<Estoque | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const fetchEstoques = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ 
        page: "1",
        limit: "1000", // Buscar muitos registros para paginação no cliente
      });
      const response = await fetch(`/api/admin-clinica/estoque?${params.toString()}`);
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

  const handleDeleteClick = (estoque: Estoque) => {
    setEstoqueToDelete(estoque);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    fetchEstoques();
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      {/* Título e Subtítulo */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Box className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Estoque</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-9">
          Gerencie o estoque de medicamentos da clínica
        </p>
      </div>

      {/* Card Branco com Tabela */}
      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de Estoque</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setUploadDialogOpen(true)} className="h-8 text-xs px-3">
              <Upload className="mr-1.5 h-3 w-3" />
              Upload em Massa
            </Button>
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
              <p className="text-muted-foreground text-center">Nenhum medicamento em estoque encontrado</p>
            </div>
          ) : (
            <EstoqueTable
            data={estoques}
            onDelete={handleDeleteClick}
            onUpload={() => setUploadDialogOpen(true)}
          />
          )}
        </CardContent>
      </Card>

      <EstoqueDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        estoque={estoqueToDelete}
        onSuccess={handleDeleteSuccess}
      />

      <UploadExcelDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        endpoint="/api/admin-clinica/upload/estoque"
        title="Upload de Estoque em Massa"
        description="Faça upload de um arquivo Excel (.xlsx) com os dados do estoque. O arquivo deve conter colunas: medicamento (nome), quantidade_atual, quantidade_minima, quantidade_maxima, unidade, localizacao, etc."
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}


