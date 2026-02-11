"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Building2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Operadora {
  id: string;
  codigoAns: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
  planos: Array<{ id: string; nome: string }>;
}

interface OperadorasContentProps {
  clinicaId: string;
}

export function OperadorasContent({ clinicaId }: OperadorasContentProps) {
  const router = useRouter();
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchOperadoras = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ 
        ...(search && { search }) 
      });
      const response = await fetch(`/api/admin-clinica/operadoras?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao carregar operadoras");
      const data = await response.json();
      setOperadoras(data.operadoras);
    } catch (error) {
      toast.error("Erro ao carregar operadoras");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchOperadoras();
  }, [fetchOperadoras]);

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center justify-between px-4 lg:px-6">
          <div>
            <h1 className="text-2xl font-bold">Operadoras</h1>
            <p className="text-muted-foreground">Gerencie as operadoras de saúde da clínica</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => router.push("/admin-clinica/operadoras/novo")}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Operadora
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 lg:px-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Buscar por código ANS, razão social ou nome fantasia..." 
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
                  <TableHead>Código ANS</TableHead>
                  <TableHead>Razão Social</TableHead>
                  <TableHead>Nome Fantasia</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Planos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : operadoras.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Nenhuma operadora encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  operadoras.map((operadora) => (
                    <TableRow key={operadora.id}>
                      <TableCell className="font-medium">{operadora.codigoAns}</TableCell>
                      <TableCell>{operadora.razaoSocial}</TableCell>
                      <TableCell>{operadora.nomeFantasia || "-"}</TableCell>
                      <TableCell>{operadora.cnpj || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{operadora.planos.length} plano(s)</Badge>
                      </TableCell>
                      <TableCell>
                        {operadora.ativo ? (
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
                            onClick={() => router.push(`/admin-clinica/operadoras/editar/${operadora.id}`)}
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
