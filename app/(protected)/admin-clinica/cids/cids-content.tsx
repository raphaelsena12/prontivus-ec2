"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Filter, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import { CidsTable } from "./components/cids-table";
import { CidDialog } from "./components/cid-dialog";
import { CidDeleteDialog } from "./components/cid-delete-dialog";

interface Cid {
  id: string;
  codigo: string;
  descricao: string;
  categoria: string | null;
  subcategoria: string | null;
  observacoes: string | null;
  ativo: boolean;
  createdAt: Date;
}

interface CidsContentProps {
  clinicaId: string;
}

export function CidsContent({ clinicaId }: CidsContentProps) {
  const [cids, setCids] = useState<Cid[]>([]);
  const [loading, setLoading] = useState(true);
  const [cidDialogOpen, setCidDialogOpen] = useState(false);
  const [editingCid, setEditingCid] = useState<Cid | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cidToDelete, setCidToDelete] = useState<Cid | null>(null);

  const fetchCids = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin-clinica/cids?limit=1000");
      if (!response.ok) throw new Error("Erro ao carregar CIDs");
      const data = await response.json();
      setCids(data.cids || []);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar CIDs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCids();
  }, [fetchCids, clinicaId]);

  const handleSuccess = () => {
    fetchCids();
    setCidDialogOpen(false);
    setDeleteDialogOpen(false);
    setEditingCid(null);
    setCidToDelete(null);
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={Stethoscope}
        title="CIDs"
        subtitle="Gerencie o catalogo de CIDs da clinica"
      />

      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 border-b px-6 pt-1.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Lista de CIDs</CardTitle>
          </div>
          <Button
            onClick={() => {
              setEditingCid(null);
              setCidDialogOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs px-3"
          >
            <Plus className="mr-1.5 h-3 w-3" />
            Novo CID
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando CIDs...</p>
              </div>
            </div>
          ) : cids.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <p className="text-muted-foreground text-center">Nenhum CID encontrado</p>
            </div>
          ) : (
            <CidsTable
              data={cids}
              onEdit={(cid) => {
                setEditingCid(cid);
                setCidDialogOpen(true);
              }}
              onDelete={(cid) => {
                setCidToDelete(cid);
                setDeleteDialogOpen(true);
              }}
            />
          )}
        </CardContent>
      </Card>

      <CidDialog
        open={cidDialogOpen}
        onOpenChange={setCidDialogOpen}
        cid={editingCid}
        onSuccess={handleSuccess}
      />

      <CidDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        cid={cidToDelete}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
