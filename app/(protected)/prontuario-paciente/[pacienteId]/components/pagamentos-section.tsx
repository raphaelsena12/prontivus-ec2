"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronUp, CreditCard, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface PagamentosSectionProps {
  pagamentos: Array<{
    id: string;
    valor: number | string;
    status: string;
    metodoPagamento: string | null;
    dataPagamento: string | null;
    dataVencimento: string | null;
    consulta: {
      id: string;
      dataHora: string;
    } | null;
    createdAt: string;
  }>;
  expanded: boolean;
  onToggle?: () => void;
}

export function PagamentosSection({ pagamentos, expanded, onToggle }: PagamentosSectionProps) {
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      PENDENTE: { label: "Pendente", variant: "outline" },
      PAGO: { label: "Pago", variant: "default" },
      CANCELADO: { label: "Cancelado", variant: "destructive" },
      REEMBOLSADO: { label: "Reembolsado", variant: "secondary" },
    };
    return statusMap[status] || { label: status, variant: "outline" };
  };

  const totalPago = pagamentos
    .filter(p => p.status === 'PAGO')
    .reduce((sum, p) => sum + Number(p.valor), 0);

  const totalPendente = pagamentos
    .filter(p => p.status === 'PENDENTE')
    .reduce((sum, p) => sum + Number(p.valor), 0);

  return (
    <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
      <CardHeader className="border-b border-slate-200 flex flex-row items-center justify-between py-3 px-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-slate-800">Pagamentos</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              {pagamentos.length} pagamento(s) • Total pago: R$ {totalPago.toFixed(2).replace('.', ',')}
              {totalPendente > 0 && ` • Pendente: R$ ${totalPendente.toFixed(2).replace('.', ',')}`}
            </p>
          </div>
        </div>
      {onToggle && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="h-8 w-8 p-0"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      )}
      </CardHeader>
      {expanded && (
        <CardContent className="p-5">
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {pagamentos.map((pagamento) => {
                const statusInfo = getStatusBadge(pagamento.status);

                return (
                  <div
                    key={pagamento.id}
                    className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-slate-800">
                            R$ {Number(pagamento.valor).toFixed(2).replace('.', ',')}
                          </h4>
                          <Badge variant={statusInfo.variant} className="text-xs">
                            {statusInfo.label}
                          </Badge>
                        </div>

                        <div className="space-y-1">
                          {pagamento.consulta && (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span className="text-slate-600">
                                Consulta em {formatDate(pagamento.consulta.dataHora ? new Date(pagamento.consulta.dataHora) : null)}
                              </span>
                            </div>
                          )}

                          {pagamento.metodoPagamento && (
                            <div className="text-sm text-slate-600">
                              Método: {pagamento.metodoPagamento}
                            </div>
                          )}

                          {pagamento.dataVencimento && (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span className="text-slate-600">
                                Vencimento: {formatDate(pagamento.dataVencimento ? new Date(pagamento.dataVencimento) : null)}
                              </span>
                            </div>
                          )}

                          {pagamento.dataPagamento && (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span className="text-slate-600">
                                Pago em {formatDate(pagamento.dataPagamento ? new Date(pagamento.dataPagamento) : null)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}
