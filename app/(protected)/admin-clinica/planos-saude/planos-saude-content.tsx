"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Heart } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface PlanoSaude {
  id: string;
  nome: string;
  operadora: {
    id: string;
    razaoSocial: string;
  };
  ativo: boolean;
}

interface PlanosSaudeContentProps {
  clinicaId: string;
}

export function PlanosSaudeContent({ clinicaId }: PlanosSaudeContentProps) {
  const router = useRouter();
  const [planos, setPlanos] = useState<PlanoSaude[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchPlanos = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ 
        ...(search && { search }) 
      });
      const response = await fetch(`/api/admin-clinica/planos-saude?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao carregar planos de saúde");
      const data = await response.json();
      setPlanos(data.planos);
    } catch (error) {
      toast.error("Erro ao carregar planos de saúde");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchPlanos();
  }, [fetchPlanos]);

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center justify-between px-4 lg:px-6">
          <div>
            <h1 className="text-2xl font-bold">Planos de Saúde</h1>
            <p className="text-muted-foreground">Gerencie os planos de saúde da clínica</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => router.push("/admin-clinica/planos-saude/novo")}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Plano
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 lg:px-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome ou operadora..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-9" 
            />
          </div>
        </div>

        <div className="px-4 lg:px-6">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Operadora</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : planos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      Nenhum plano de saúde encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  planos.map((plano) => (
                    <TableRow key={plano.id}>
                      <TableCell className="font-medium">{plano.nome}</TableCell>
                      <TableCell>{plano.operadora.razaoSocial}</TableCell>
                      <TableCell>
                        {plano.ativo ? (
                          <Badge variant="default">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => router.push(`/admin-clinica/planos-saude/editar/${plano.id}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
