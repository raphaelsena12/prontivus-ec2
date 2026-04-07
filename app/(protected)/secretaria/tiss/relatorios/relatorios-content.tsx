"use client";

import { brazilToday } from "@/lib/timezone-utils";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart3 } from "lucide-react";

interface Guia {
  id: string;
  numeroGuia: string | null;
  tipoGuia: string;
  status: string;
  dataAtendimento: string;
  paciente: { nome: string };
  operadora: { razaoSocial: string };
  procedimentos: { valorTotal: string }[];
}

interface Stats {
  total: number;
  rascunho: number;
  validada: number;
  emLote: number;
  gerada: number;
  enviada: number;
  totalValue: number;
}

const TIPO_LABELS: Record<string, string> = {
  CONSULTA: "Consulta",
  SPSADT: "SP/SADT",
  INTERNACAO: "Internação",
  HONORARIO: "Honorário",
};

const STATUS_CLASSES: Record<string, string> = {
  RASCUNHO: "bg-transparent border-yellow-500 text-yellow-700 text-[10px] py-0.5 px-1.5 leading-tight",
  VALIDADA:  "bg-transparent border-green-500 text-green-700 text-[10px] py-0.5 px-1.5 leading-tight",
  LOTE:      "bg-transparent border-blue-500 text-blue-700 text-[10px] py-0.5 px-1.5 leading-tight",
  GERADA:    "bg-transparent border-purple-500 text-purple-700 text-[10px] py-0.5 px-1.5 leading-tight",
  ENVIADA:   "bg-transparent border-gray-500 text-gray-700 text-[10px] py-0.5 px-1.5 leading-tight",
};
const STATUS_LABELS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  VALIDADA: "Validada",
  LOTE: "Em Lote",
  GERADA: "XML Gerado",
  ENVIADA: "Enviada",
};

export function RelatoriosContent() {
  const [guias, setGuias] = useState<Guia[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState(() => {
    const [y, m] = brazilToday().split("-");
    return `${y}-${m}-01`;
  });
  const [dataFim, setDataFim] = useState(brazilToday());
  const [stats, setStats] = useState<Stats>({
    total: 0, rascunho: 0, validada: 0, emLote: 0, gerada: 0, enviada: 0, totalValue: 0,
  });

  useEffect(() => {
    setLoading(true);
    fetch("/api/secretaria/tiss/guias?limit=200")
      .then((r) => r.json())
      .then((data) => {
        const all: Guia[] = data.guias ?? [];
        const filtered = all.filter((g) => {
          const d = g.dataAtendimento.split("T")[0];
          return d >= dataInicio && d <= dataFim;
        });
        setGuias(filtered);
        setStats({
          total: filtered.length,
          rascunho: filtered.filter((g) => g.status === "RASCUNHO").length,
          validada: filtered.filter((g) => g.status === "VALIDADA").length,
          emLote: filtered.filter((g) => g.status === "LOTE").length,
          gerada: filtered.filter((g) => g.status === "GERADA").length,
          enviada: filtered.filter((g) => g.status === "ENVIADA").length,
          totalValue: filtered.reduce(
            (acc, g) => acc + g.procedimentos.reduce((a, p) => a + parseFloat(p.valorTotal), 0),
            0,
          ),
        });
      })
      .finally(() => setLoading(false));
  }, [dataInicio, dataFim]);

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={BarChart3}
        title="Relatórios TISS"
        subtitle="Resumo das guias por período"
      />

      <div className="flex flex-col gap-4">
        {/* Filtros */}
        <div className="flex items-end gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Data Início</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="h-9 text-xs w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Data Fim</Label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="h-9 text-xs w-40"
            />
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          <Card className="col-span-2 md:col-span-2">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-[10px] uppercase tracking-wide text-muted-foreground">Total de Guias</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-4">
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="col-span-2 md:col-span-2">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-[10px] uppercase tracking-wide text-muted-foreground">Valor Total</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-4">
              <p className="text-2xl font-bold text-primary">R$ {stats.totalValue.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-[10px] uppercase tracking-wide text-muted-foreground">Rascunho</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-4">
              <p className="text-2xl font-bold text-yellow-600">{stats.rascunho}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-[10px] uppercase tracking-wide text-muted-foreground">Validadas</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-4">
              <p className="text-2xl font-bold text-green-600">{stats.validada}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-[10px] uppercase tracking-wide text-muted-foreground">Em Lote</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-4">
              <p className="text-2xl font-bold text-blue-600">{stats.emLote}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-[10px] uppercase tracking-wide text-muted-foreground">XML Gerado</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-4">
              <p className="text-2xl font-bold text-purple-600">{stats.gerada}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de guias */}
        <div className="overflow-hidden rounded-lg border">
          <div className="bg-muted px-4 py-2 border-b">
            <span className="text-xs font-semibold">Detalhamento por Guia</span>
          </div>
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="text-xs font-semibold py-3">Número</TableHead>
                <TableHead className="text-xs font-semibold py-3">Tipo</TableHead>
                <TableHead className="text-xs font-semibold py-3">Paciente</TableHead>
                <TableHead className="text-xs font-semibold py-3">Operadora</TableHead>
                <TableHead className="text-xs font-semibold py-3">Data Atend.</TableHead>
                <TableHead className="text-xs font-semibold py-3">Status</TableHead>
                <TableHead className="text-xs font-semibold py-3 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      <span className="text-xs text-muted-foreground">Carregando guias...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : guias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <BarChart3 className="h-12 w-12 text-muted-foreground opacity-50" />
                      <span className="text-xs text-muted-foreground">Nenhuma guia no período selecionado</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                guias.map((guia) => {
                  const total = guia.procedimentos.reduce((a, p) => a + parseFloat(p.valorTotal), 0);
                  return (
                    <TableRow key={guia.id} className="hover:bg-muted/50">
                      <TableCell className="text-xs py-3 font-mono font-semibold text-primary">
                        {guia.numeroGuia ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        {TIPO_LABELS[guia.tipoGuia] ?? guia.tipoGuia}
                      </TableCell>
                      <TableCell className="text-xs py-3 font-medium">{guia.paciente.nome}</TableCell>
                      <TableCell className="text-xs py-3 text-muted-foreground">{guia.operadora.razaoSocial}</TableCell>
                      <TableCell className="text-xs py-3 text-muted-foreground">
                        {format(new Date(guia.dataAtendimento), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        <Badge variant="outline" className={STATUS_CLASSES[guia.status] ?? STATUS_CLASSES.RASCUNHO}>
                          {STATUS_LABELS[guia.status] ?? guia.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs py-3 text-right font-medium">
                        R$ {total.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {!loading && stats.total > 0 && (
          <p className="text-xs text-muted-foreground text-right">{stats.total} guia(s) no período</p>
        )}
      </div>
    </div>
  );
}
