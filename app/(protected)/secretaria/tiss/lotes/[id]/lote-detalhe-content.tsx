"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Layers, ArrowLeft, FileCode, Download } from "lucide-react";
import { toast } from "sonner";

interface Procedimento {
  id: string;
  quantidade: number;
  valorTotal: string;
  codigoTuss: { codigoTuss: string; descricao: string };
}

interface Guia {
  id: string;
  numeroGuia: string | null;
  tipoGuia: string;
  status: string;
  numeroCarteirinha: string;
  dataAtendimento: string;
  paciente: { nome: string; cpf: string };
  procedimentos: Procedimento[];
}

interface Lote {
  id: string;
  numeroLote: string;
  status: string;
  dataGeracao: string | null;
  createdAt: string;
  observacoes: string | null;
  operadora: { id: string; codigoAns: string; razaoSocial: string; cnpj: string | null };
  guias: Guia[];
}

const STATUS_CLASSES: Record<string, string> = {
  ABERTO:     "bg-transparent border-blue-500 text-blue-700 text-[10px] py-0.5 px-1.5 leading-tight",
  FECHADO:    "bg-transparent border-gray-500 text-gray-700 text-[10px] py-0.5 px-1.5 leading-tight",
  XML_GERADO: "bg-transparent border-green-500 text-green-700 text-[10px] py-0.5 px-1.5 leading-tight",
};
const STATUS_LABELS: Record<string, string> = { ABERTO: "Aberto", FECHADO: "Fechado", XML_GERADO: "XML Gerado" };

const TIPO_LABELS: Record<string, string> = {
  CONSULTA: "Consulta",
  SPSADT: "SP/SADT",
  INTERNACAO: "Internação",
  HONORARIO: "Honorário",
};

export function LoteDetalheContent({ id }: { id: string }) {
  const router = useRouter();
  const [lote, setLote] = useState<Lote | null>(null);
  const [loading, setLoading] = useState(true);
  const [gerandoXml, setGerandoXml] = useState(false);

  const fetchLote = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/secretaria/tiss/lotes/${id}`);
      if (!res.ok) { router.push("/secretaria/tiss/lotes"); return; }
      setLote(await res.json());
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchLote(); }, [fetchLote]);

  const handleGerarXml = async () => {
    setGerandoXml(true);
    try {
      const res = await fetch(`/api/secretaria/tiss/lotes/${id}/gerar-xml`, { method: "POST" });
      if (res.ok) { toast.success("XML gerado com sucesso"); fetchLote(); }
      else { const d = await res.json(); toast.error(d.error ?? "Erro ao gerar XML"); }
    } finally { setGerandoXml(false); }
  };

  const totalLote = lote
    ? lote.guias.reduce((acc, g) => acc + g.procedimentos.reduce((a, p) => a + parseFloat(p.valorTotal), 0), 0)
    : 0;

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={Layers}
        title={lote ? `Lote #${lote.numeroLote}` : "Lote"}
        subtitle={lote
          ? `${lote.operadora.razaoSocial} — criado em ${format(new Date(lote.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}`
          : "Carregando..."}
      >
        <Button variant="ghost" size="sm" className="text-xs h-8"
          onClick={() => router.push("/secretaria/tiss/lotes")}>
          <ArrowLeft className="mr-1 h-3 w-3" /> Voltar
        </Button>
        {lote && (
          <Badge variant="outline" className={STATUS_CLASSES[lote.status] ?? STATUS_CLASSES.ABERTO}>
            {STATUS_LABELS[lote.status] ?? lote.status}
          </Badge>
        )}
        {lote?.status === "ABERTO" && (
          <Button size="sm" className="h-8 text-xs gap-1" disabled={gerandoXml}
            onClick={handleGerarXml}>
            <FileCode className="h-3 w-3" />
            {gerandoXml ? "Gerando..." : "Gerar XML"}
          </Button>
        )}
        {lote?.status === "XML_GERADO" && (
          <Button size="sm" className="h-8 text-xs gap-1"
            onClick={() => window.open(`/api/secretaria/tiss/lotes/${id}/download-xml`, "_blank")}>
            <Download className="h-3 w-3" />
            Baixar XML
          </Button>
        )}
      </PageHeader>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground">Carregando lote...</span>
        </div>
      ) : !lote ? null : (
        <div className="flex flex-col gap-4">
          {/* Dados do Lote */}
          <div className="overflow-hidden rounded-lg border">
            <div className="bg-muted px-4 py-2 border-b">
              <span className="text-xs font-semibold">Dados do Lote</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y">
              <div className="px-4 py-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Operadora</p>
                <p className="text-xs font-medium">{lote.operadora.razaoSocial}</p>
                <p className="text-[10px] text-muted-foreground">ANS: {lote.operadora.codigoAns}</p>
                {lote.operadora.cnpj && (
                  <p className="text-[10px] text-muted-foreground">CNPJ: {lote.operadora.cnpj}</p>
                )}
              </div>
              <div className="px-4 py-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Total do Lote</p>
                <p className="text-xs font-bold text-primary">R$ {totalLote.toFixed(2)}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Guias no Lote</p>
                <p className="text-xs font-medium">{lote.guias.length} guia(s)</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">XML Gerado em</p>
                <p className="text-xs font-medium">
                  {lote.dataGeracao
                    ? format(new Date(lote.dataGeracao), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : "—"}
                </p>
              </div>
              {lote.observacoes && (
                <div className="col-span-2 md:col-span-4 px-4 py-3 border-t">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Observações</p>
                  <p className="text-xs">{lote.observacoes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Guias no Lote */}
          <div className="overflow-hidden rounded-lg border">
            <div className="bg-muted px-4 py-2 border-b">
              <span className="text-xs font-semibold">{lote.guias.length} Guia(s) no Lote</span>
            </div>
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="text-xs font-semibold py-3">Nº Guia</TableHead>
                  <TableHead className="text-xs font-semibold py-3">Tipo</TableHead>
                  <TableHead className="text-xs font-semibold py-3">Paciente</TableHead>
                  <TableHead className="text-xs font-semibold py-3">Data Atend.</TableHead>
                  <TableHead className="text-xs font-semibold py-3">Carteirinha</TableHead>
                  <TableHead className="text-xs font-semibold py-3 text-center">Procs.</TableHead>
                  <TableHead className="text-xs font-semibold py-3 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lote.guias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <span className="text-xs text-muted-foreground">Nenhuma guia neste lote</span>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {lote.guias.map((guia) => {
                      const total = guia.procedimentos.reduce((a, p) => a + parseFloat(p.valorTotal), 0);
                      return (
                        <TableRow key={guia.id} className="hover:bg-muted/50">
                          <TableCell className="text-xs py-3 font-mono font-semibold text-primary">
                            {guia.numeroGuia ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs py-3">
                            {TIPO_LABELS[guia.tipoGuia] ?? guia.tipoGuia}
                          </TableCell>
                          <TableCell className="text-xs py-3">
                            <div className="font-medium">{guia.paciente.nome}</div>
                            <div className="text-muted-foreground">{guia.paciente.cpf}</div>
                          </TableCell>
                          <TableCell className="text-xs py-3 text-muted-foreground">
                            {format(new Date(guia.dataAtendimento), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-xs py-3 font-mono">{guia.numeroCarteirinha}</TableCell>
                          <TableCell className="text-xs py-3 text-center">{guia.procedimentos.length}</TableCell>
                          <TableCell className="text-xs py-3 text-right font-medium">
                            R$ {total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={6} className="text-xs py-3 text-right font-semibold">
                        Total Geral:
                      </TableCell>
                      <TableCell className="text-xs py-3 text-right font-bold text-primary">
                        R$ {totalLote.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
