"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import {
  AlertTriangle, ArrowLeft, CheckCircle, XCircle, MessageSquare, FileText,
} from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface GlosaDetalhe {
  id: string;
  codigoGlosa: string;
  descricaoGlosa: string | null;
  valorGlosado: string;
  status: string;
  justificativaContestacao: string | null;
  dataGlosa: string;
  dataContestacao: string | null;
  dataResolucao: string | null;
  createdAt: string;
  guia: {
    id: string;
    numeroGuia: string | null;
    dataAtendimento: string;
    paciente: { nome: string; cpf: string };
    operadora: { id: string; razaoSocial: string; codigoAns: string };
  };
  procedimento: {
    id: string;
    quantidade: number;
    valorTotal: string;
    codigoTuss: { codigoTuss: string; descricao: string };
  } | null;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  GLOSADA:    { label: "Glosada",    className: "bg-transparent border-red-500 text-red-700 text-[10px] py-0.5 px-1.5 leading-tight" },
  CONTESTADA: { label: "Contestada", className: "bg-transparent border-blue-500 text-blue-700 text-[10px] py-0.5 px-1.5 leading-tight" },
  ACEITA:     { label: "Aceita",     className: "bg-transparent border-slate-500 text-slate-700 text-[10px] py-0.5 px-1.5 leading-tight" },
  REVERTIDA:  { label: "Revertida",  className: "bg-transparent border-green-500 text-green-700 text-[10px] py-0.5 px-1.5 leading-tight" },
  MANTIDA:    { label: "Mantida",    className: "bg-transparent border-orange-500 text-orange-700 text-[10px] py-0.5 px-1.5 leading-tight" },
};

const formatCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function GlosaDetalheContent({ glosaId }: { glosaId: string }) {
  const router = useRouter();

  const [glosa, setGlosa] = useState<GlosaDetalhe | null>(null);
  const [loading, setLoading] = useState(true);

  /* Contestar dialog */
  const [contestarOpen, setContestarOpen] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [submittingContestar, setSubmittingContestar] = useState(false);

  /* Aceitar */
  const [submittingAceitar, setSubmittingAceitar] = useState(false);

  /* ---- Fetch ---------------------------------------------------- */

  const fetchGlosa = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/secretaria/tiss/glosas/${glosaId}`);
      if (!res.ok) {
        router.push("/secretaria/tiss/glosas");
        return;
      }
      setGlosa(await res.json());
    } catch {
      toast.error("Erro ao carregar glosa");
      router.push("/secretaria/tiss/glosas");
    } finally {
      setLoading(false);
    }
  }, [glosaId, router]);

  useEffect(() => {
    fetchGlosa();
  }, [fetchGlosa]);

  /* ---- Actions -------------------------------------------------- */

  const handleContestar = async () => {
    if (!justificativa.trim()) return;
    setSubmittingContestar(true);
    try {
      const res = await fetch(`/api/secretaria/tiss/glosas/${glosaId}/contestar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ justificativa: justificativa.trim() }),
      });
      if (res.ok) {
        toast.success("Glosa contestada com sucesso");
        setContestarOpen(false);
        fetchGlosa();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Erro ao contestar glosa");
      }
    } catch {
      toast.error("Erro ao contestar glosa");
    } finally {
      setSubmittingContestar(false);
    }
  };

  const handleAceitar = async () => {
    setSubmittingAceitar(true);
    try {
      const res = await fetch(`/api/secretaria/tiss/glosas/${glosaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACEITA" }),
      });
      if (res.ok) {
        toast.success("Glosa aceita com sucesso");
        fetchGlosa();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Erro ao aceitar glosa");
      }
    } catch {
      toast.error("Erro ao aceitar glosa");
    } finally {
      setSubmittingAceitar(false);
    }
  };

  /* ---- Render --------------------------------------------------- */

  const cfg = glosa ? STATUS_CONFIG[glosa.status] ?? STATUS_CONFIG.GLOSADA : null;

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={AlertTriangle}
        title={glosa ? `Glosa #${glosa.codigoGlosa}` : "Glosa"}
        subtitle={
          glosa
            ? `${glosa.guia.paciente.nome} — ${glosa.guia.operadora.razaoSocial}`
            : "Carregando..."
        }
      >
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-8"
          onClick={() => router.push("/secretaria/tiss/glosas")}
        >
          <ArrowLeft className="mr-1 h-3 w-3" /> Voltar
        </Button>
        {glosa && cfg && (
          <Badge variant="outline" className={cfg.className}>
            {cfg.label}
          </Badge>
        )}
      </PageHeader>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground">Carregando glosa...</span>
        </div>
      ) : !glosa ? null : (
        <div className="flex flex-col gap-6">
          {/* Info cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Guia info */}
            <div className="overflow-hidden rounded-lg border">
              <div className="bg-muted px-4 py-2 border-b flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold">Dados da Guia</span>
              </div>
              <div className="grid grid-cols-2 divide-x divide-y">
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                    N. da Guia
                  </p>
                  <p className="text-xs font-mono font-semibold text-primary">
                    {glosa.guia.numeroGuia ?? "—"}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                    Paciente
                  </p>
                  <p className="text-xs font-medium">{glosa.guia.paciente.nome}</p>
                  <p className="text-[10px] text-muted-foreground">{glosa.guia.paciente.cpf}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                    Operadora
                  </p>
                  <p className="text-xs font-medium">{glosa.guia.operadora.razaoSocial}</p>
                  <p className="text-[10px] text-muted-foreground">
                    ANS: {glosa.guia.operadora.codigoAns}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                    Data Atendimento
                  </p>
                  <p className="text-xs font-medium">{formatDate(glosa.guia.dataAtendimento)}</p>
                </div>
              </div>
            </div>

            {/* Right: Glosa info */}
            <div className="overflow-hidden rounded-lg border">
              <div className="bg-muted px-4 py-2 border-b flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold">Dados da Glosa</span>
              </div>
              <div className="grid grid-cols-2 divide-x divide-y">
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                    Codigo da Glosa
                  </p>
                  <p className="text-xs font-mono font-semibold">{glosa.codigoGlosa}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                    Valor Glosado
                  </p>
                  <p className="text-xs font-bold text-red-600">
                    {formatCurrency.format(parseFloat(glosa.valorGlosado || "0"))}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                    Data da Glosa
                  </p>
                  <p className="text-xs font-medium">{formatDate(glosa.dataGlosa)}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                    Status
                  </p>
                  <Badge variant="outline" className={cfg!.className}>
                    {cfg!.label}
                  </Badge>
                </div>
                {glosa.descricaoGlosa && (
                  <div className="col-span-2 px-4 py-3 border-t">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                      Descricao
                    </p>
                    <p className="text-xs">{glosa.descricaoGlosa}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Procedimento details */}
          {glosa.procedimento && (
            <div className="overflow-hidden rounded-lg border">
              <div className="bg-muted px-4 py-2 border-b flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold">Procedimento Relacionado</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y">
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                    Codigo TUSS
                  </p>
                  <p className="text-xs font-mono font-semibold">
                    {glosa.procedimento.codigoTuss.codigoTuss}
                  </p>
                </div>
                <div className="px-4 py-3 md:col-span-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                    Descricao
                  </p>
                  <p className="text-xs font-medium">
                    {glosa.procedimento.codigoTuss.descricao}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                    Quantidade
                  </p>
                  <p className="text-xs font-medium">{glosa.procedimento.quantidade}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                    Valor Total
                  </p>
                  <p className="text-xs font-medium">
                    {formatCurrency.format(parseFloat(glosa.procedimento.valorTotal || "0"))}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status-specific sections */}

          {/* GLOSADA: Action buttons */}
          {glosa.status === "GLOSADA" && (
            <div className="overflow-hidden rounded-lg border border-yellow-200 bg-yellow-50/30">
              <div className="px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-yellow-800">Acao Necessaria</p>
                  <p className="text-[10px] text-yellow-600 mt-0.5">
                    Esta glosa esta pendente de resposta. Conteste ou aceite a glosa.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 text-blue-600 hover:text-blue-700 hover:border-blue-300"
                    onClick={() => {
                      setJustificativa("");
                      setContestarOpen(true);
                    }}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Contestar Glosa
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 text-slate-600 hover:text-slate-700 hover:border-slate-300"
                    disabled={submittingAceitar}
                    onClick={handleAceitar}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    {submittingAceitar ? "Processando..." : "Aceitar Glosa"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* CONTESTADA: Show justificativa */}
          {glosa.status === "CONTESTADA" && (
            <div className="overflow-hidden rounded-lg border border-blue-200 bg-blue-50/30">
              <div className="bg-blue-100/50 px-4 py-2 border-b border-blue-200 flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-xs font-semibold text-blue-800">Contestacao Enviada</span>
              </div>
              <div className="px-4 py-3 space-y-2">
                {glosa.dataContestacao && (
                  <p className="text-[10px] text-blue-600">
                    Contestada em {formatDate(glosa.dataContestacao)}
                  </p>
                )}
                {glosa.justificativaContestacao && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-blue-600/70 font-medium mb-1">
                      Justificativa
                    </p>
                    <p className="text-xs text-blue-900 bg-white/60 rounded-md p-3 border border-blue-100">
                      {glosa.justificativaContestacao}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ACEITA / REVERTIDA / MANTIDA: Resolution info */}
          {(glosa.status === "ACEITA" || glosa.status === "REVERTIDA" || glosa.status === "MANTIDA") && (
            <div
              className={`overflow-hidden rounded-lg border ${
                glosa.status === "REVERTIDA"
                  ? "border-green-200 bg-green-50/30"
                  : glosa.status === "MANTIDA"
                  ? "border-orange-200 bg-orange-50/30"
                  : "border-slate-200 bg-slate-50/30"
              }`}
            >
              <div
                className={`px-4 py-2 border-b flex items-center gap-2 ${
                  glosa.status === "REVERTIDA"
                    ? "bg-green-100/50 border-green-200"
                    : glosa.status === "MANTIDA"
                    ? "bg-orange-100/50 border-orange-200"
                    : "bg-slate-100/50 border-slate-200"
                }`}
              >
                {glosa.status === "REVERTIDA" ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                ) : glosa.status === "MANTIDA" ? (
                  <XCircle className="h-3.5 w-3.5 text-orange-600" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5 text-slate-600" />
                )}
                <span
                  className={`text-xs font-semibold ${
                    glosa.status === "REVERTIDA"
                      ? "text-green-800"
                      : glosa.status === "MANTIDA"
                      ? "text-orange-800"
                      : "text-slate-800"
                  }`}
                >
                  {glosa.status === "REVERTIDA"
                    ? "Glosa Revertida"
                    : glosa.status === "MANTIDA"
                    ? "Glosa Mantida pela Operadora"
                    : "Glosa Aceita"}
                </span>
              </div>
              <div className="px-4 py-3 space-y-2">
                {glosa.dataResolucao && (
                  <p className="text-[10px] text-muted-foreground">
                    Resolvida em {formatDate(glosa.dataResolucao)}
                  </p>
                )}
                {glosa.justificativaContestacao && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
                      Justificativa da Contestacao
                    </p>
                    <p className="text-xs bg-white/60 rounded-md p-3 border">
                      {glosa.justificativaContestacao}
                    </p>
                  </div>
                )}
                {glosa.status === "REVERTIDA" && (
                  <p className="text-xs text-green-700 font-medium">
                    O valor de {formatCurrency.format(parseFloat(glosa.valorGlosado || "0"))} foi revertido pela operadora.
                  </p>
                )}
                {glosa.status === "MANTIDA" && (
                  <p className="text-xs text-orange-700 font-medium">
                    A operadora manteve a glosa no valor de {formatCurrency.format(parseFloat(glosa.valorGlosado || "0"))}.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialog: Contestar Glosa */}
      <Dialog open={contestarOpen} onOpenChange={setContestarOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Contestar Glosa</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {glosa && (
                <>
                  Glosa <span className="font-mono font-semibold">{glosa.codigoGlosa}</span>
                  {" "}— {formatCurrency.format(parseFloat(glosa.valorGlosado || "0"))}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Justificativa da Contestacao *</Label>
              <Textarea
                className="text-xs min-h-[120px]"
                placeholder="Descreva a justificativa para contestar esta glosa..."
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => setContestarOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="text-xs h-8"
              disabled={!justificativa.trim() || submittingContestar}
              onClick={handleContestar}
            >
              {submittingContestar ? "Enviando..." : "Enviar Contestacao"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
