"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Plus, Search, Eye, CheckCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Guia {
  id: string;
  numeroGuia: string | null;
  tipoGuia: string;
  status: string;
  dataAtendimento: string;
  numeroCarteirinha: string;
  paciente: { id: string; nome: string; cpf: string };
  operadora: { id: string; codigoAns: string; razaoSocial: string };
  procedimentos: { id: string }[];
}

const STATUS_LABELS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  VALIDADA: "Validada",
  LOTE: "Em Lote",
  GERADA: "XML Gerado",
  ENVIADA: "Enviada",
};

const STATUS_CLASSES: Record<string, string> = {
  RASCUNHO:  "bg-transparent border-yellow-500 text-yellow-700 text-[10px] py-0.5 px-1.5 leading-tight",
  VALIDADA:  "bg-transparent border-green-500 text-green-700 text-[10px] py-0.5 px-1.5 leading-tight",
  LOTE:      "bg-transparent border-blue-500 text-blue-700 text-[10px] py-0.5 px-1.5 leading-tight",
  GERADA:    "bg-transparent border-purple-500 text-purple-700 text-[10px] py-0.5 px-1.5 leading-tight",
  ENVIADA:   "bg-transparent border-gray-500 text-gray-700 text-[10px] py-0.5 px-1.5 leading-tight",
};

const TIPO_LABELS: Record<string, string> = {
  CONSULTA:   "Consulta",
  SPSADT:     "SP/SADT",
  INTERNACAO: "Internação",
  HONORARIO:  "Honorário",
};

export function GuiasContent() {
  const router = useRouter();
  const [guias, setGuias] = useState<Guia[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [validating, setValidating] = useState<string | null>(null);

  const fetchGuias = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (tipoFilter !== "all") params.set("tipoGuia", tipoFilter);
      const res = await fetch(`/api/secretaria/tiss/guias?${params}&limit=100`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setGuias(data.guias ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Erro ao carregar guias");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, tipoFilter]);

  useEffect(() => {
    fetchGuias();
  }, [fetchGuias]);

  const filtered = guias.filter((g) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      g.paciente.nome.toLowerCase().includes(q) ||
      g.paciente.cpf.includes(q) ||
      (g.numeroGuia ?? "").toLowerCase().includes(q)
    );
  });

  const handleValidar = async (id: string) => {
    setValidating(id);
    try {
      const res = await fetch(`/api/secretaria/tiss/guias/${id}/validar`, { method: "POST" });
      const data = await res.json();
      if (data.valida) {
        toast.success("Guia validada com sucesso");
        fetchGuias();
      } else {
        toast.error("Erros: " + (data.erros ?? []).join(", "));
      }
    } finally {
      setValidating(null);
    }
  };

  const handleExcluir = async (id: string) => {
    if (!confirm("Deseja excluir esta guia?")) return;
    const res = await fetch(`/api/secretaria/tiss/guias/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Guia excluída");
      fetchGuias();
    } else {
      toast.error("Erro ao excluir guia");
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={FileText}
        title="Guias TISS"
        subtitle="Gerencie as guias de atendimento para envio às operadoras de saúde"
      />

      <div className="flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-end gap-2 pb-4">
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(TIPO_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Paciente, CPF ou nº guia..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <Button className="h-9" onClick={() => router.push("/secretaria/tiss/nova-guia")}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Guia
          </Button>
        </div>

        {/* Tabela */}
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="text-xs font-semibold py-3">Nº Guia</TableHead>
                <TableHead className="text-xs font-semibold py-3">Tipo</TableHead>
                <TableHead className="text-xs font-semibold py-3">Paciente</TableHead>
                <TableHead className="text-xs font-semibold py-3">Operadora</TableHead>
                <TableHead className="text-xs font-semibold py-3">Data Atend.</TableHead>
                <TableHead className="text-xs font-semibold py-3 text-center">Procs.</TableHead>
                <TableHead className="text-xs font-semibold py-3">Status</TableHead>
                <TableHead className="text-xs font-semibold py-3 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      <span className="text-xs text-muted-foreground">Carregando guias...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-12 w-12 text-muted-foreground opacity-50" />
                      <span className="text-xs text-muted-foreground">Nenhuma guia encontrada</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((guia) => (
                  <TableRow key={guia.id} className="hover:bg-muted/50">
                    <TableCell className="text-xs py-3 font-semibold text-primary font-mono">
                      {guia.numeroGuia ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs py-3">
                      {TIPO_LABELS[guia.tipoGuia] ?? guia.tipoGuia}
                    </TableCell>
                    <TableCell className="text-xs py-3">
                      <div className="font-medium">{guia.paciente.nome}</div>
                      <div className="text-muted-foreground">{guia.paciente.cpf}</div>
                    </TableCell>
                    <TableCell className="text-xs py-3">
                      <div>{guia.operadora.razaoSocial}</div>
                      <div className="text-muted-foreground">ANS: {guia.operadora.codigoAns}</div>
                    </TableCell>
                    <TableCell className="text-xs py-3">
                      {format(new Date(guia.dataAtendimento), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-xs py-3 text-center">
                      {guia.procedimentos.length}
                    </TableCell>
                    <TableCell className="text-xs py-3">
                      <Badge variant="outline" className={STATUS_CLASSES[guia.status] ?? STATUS_CLASSES.RASCUNHO}>
                        {STATUS_LABELS[guia.status] ?? guia.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => router.push(`/secretaria/tiss/guias/${guia.id}`)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {guia.status === "RASCUNHO" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 gap-1 text-green-600 hover:text-green-700 hover:border-green-300"
                            disabled={validating === guia.id}
                            onClick={() => handleValidar(guia.id)}
                          >
                            <CheckCircle className="h-3 w-3" />
                            {validating === guia.id ? "..." : "Validar"}
                          </Button>
                        )}
                        {guia.status === "RASCUNHO" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 text-red-500 hover:text-red-600 hover:border-red-300"
                            onClick={() => handleExcluir(guia.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!loading && total > 0 && (
          <p className="text-xs text-muted-foreground mt-2 text-right">
            {filtered.length} de {total} guia(s)
          </p>
        )}
      </div>
    </div>
  );
}
