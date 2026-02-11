"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Calendar } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface TipoConsulta {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

interface TiposConsultaContentProps {
  clinicaId: string;
}

export function TiposConsultaContent({ clinicaId }: TiposConsultaContentProps) {
  const router = useRouter();
  const [tiposConsulta, setTiposConsulta] = useState<TipoConsulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchTiposConsulta = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ 
        ...(search && { search }) 
      });
      const response = await fetch(`/api/admin-clinica/tipos-consulta?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao carregar tipos de consulta");
      const data = await response.json();
      setTiposConsulta(data.tiposConsulta);
    } catch (error) {
      toast.error("Erro ao carregar tipos de consulta");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchTiposConsulta();
  }, [fetchTiposConsulta]);

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center justify-between px-4 lg:px-6">
          <div>
            <h1 className="text-2xl font-bold">Tipos de Consulta</h1>
            <p className="text-muted-foreground">Gerencie os tipos de consulta da clínica</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => router.push("/admin-clinica/tipos-consulta/novo")}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Tipo
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 lg:px-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Buscar por código ou nome..." 
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
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : tiposConsulta.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Nenhum tipo de consulta encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  tiposConsulta.map((tipo) => (
                    <TableRow key={tipo.id}>
                      <TableCell className="font-medium">{tipo.codigo}</TableCell>
                      <TableCell>{tipo.nome}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {tipo.descricao || "-"}
                      </TableCell>
                      <TableCell>
                        {tipo.ativo ? (
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
                            onClick={() => router.push(`/admin-clinica/tipos-consulta/editar/${tipo.id}`)}
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
