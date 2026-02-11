"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Exame {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: string | null;
  ativo: boolean;
}

export function ExamesContent() {
  const [exames, setExames] = useState<Exame[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchExames = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(search && { search }),
      });

      const response = await fetch(
        `/api/secretaria/exames?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Erro ao carregar exames");
      }

      const data = await response.json();
      setExames(data.exames || []);
    } catch (error) {
      toast.error("Erro ao carregar exames");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExames();
  }, [search]);

  const getTipoBadge = (tipo: string | null) => {
    if (!tipo) return null;
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      LABORATORIAL: "default",
      IMAGEM: "secondary",
      OUTROS: "outline",
    };
    return (
      <Badge variant={variants[tipo] || "outline"}>
        {tipo}
      </Badge>
    );
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <h1 className="text-2xl font-bold">Exames</h1>
          <p className="text-muted-foreground">
            Visualize os exames disponíveis na clínica
          </p>
        </div>

        <div className="flex items-center gap-2 px-4 lg:px-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou descrição..."
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
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : exames.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      Nenhum exame encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  exames.map((exame) => (
                    <TableRow key={exame.id}>
                      <TableCell className="font-medium">{exame.nome}</TableCell>
                      <TableCell>{getTipoBadge(exame.tipo)}</TableCell>
                      <TableCell className="max-w-md truncate">
                        {exame.descricao || "-"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            exame.ativo
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {exame.ativo ? "Ativo" : "Inativo"}
                        </span>
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




