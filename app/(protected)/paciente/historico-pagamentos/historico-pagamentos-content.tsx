"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { IconCircleCheckFilled, IconLoader, IconX } from "@tabler/icons-react";

interface Pagamento {
  id: string;
  valor: number;
  status: "PENDENTE" | "PAGO" | "CANCELADO" | "REEMBOLSADO";
  metodoPagamento: string | null;
  dataPagamento: Date | null;
  dataVencimento: Date | null;
  createdAt: Date;
  consulta: {
    id: string;
    dataHora: Date;
    medico: {
      usuario: {
        nome: string;
      };
    };
  } | null;
}

export function HistoricoPagamentosContent() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPagamentos();
  }, []);

  const loadPagamentos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/paciente/pagamentos`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Erro ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setPagamentos(data.pagamentos || []);
    } catch (error) {
      console.error("Erro ao carregar pagamentos:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao carregar pagamentos";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "PAGO") {
      return (
        <Badge variant="outline" className="bg-transparent border-green-500 text-green-700 dark:text-green-400 text-[10px] py-0.5 px-1.5 leading-tight">
          <IconCircleCheckFilled className="mr-1 h-3 w-3 fill-green-500 dark:fill-green-400" />
          Pago
        </Badge>
      );
    } else if (status === "PENDENTE") {
      return (
        <Badge variant="outline" className="bg-transparent border-yellow-500 text-yellow-700 dark:text-yellow-400 text-[10px] py-0.5 px-1.5 leading-tight">
          <IconLoader className="mr-1 h-3 w-3" />
          Pendente
        </Badge>
      );
    } else if (status === "CANCELADO") {
      return (
        <Badge variant="outline" className="bg-transparent border-red-500 text-red-700 dark:text-red-400 text-[10px] py-0.5 px-1.5 leading-tight">
          <IconX className="mr-1 h-3 w-3" />
          Cancelado
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-transparent border-gray-500 text-gray-700 dark:text-gray-400 text-[10px] py-0.5 px-1.5 leading-tight">
          {status}
        </Badge>
      );
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col">
        <div className="px-4 lg:px-6 pt-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : pagamentos.length === 0 ? (
            <Card className="p-3">
              <CardContent className="flex items-center justify-center py-8">
                <p className="text-xs text-muted-foreground">
                  Nenhum pagamento encontrado
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="p-3">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left text-xs font-semibold py-3 px-4">Data</th>
                        <th className="text-left text-xs font-semibold py-3 px-4">Valor</th>
                        <th className="text-left text-xs font-semibold py-3 px-4">Médico</th>
                        <th className="text-left text-xs font-semibold py-3 px-4">Consulta</th>
                        <th className="text-left text-xs font-semibold py-3 px-4">Status</th>
                        <th className="text-left text-xs font-semibold py-3 px-4">Método</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagamentos.map((pagamento) => (
                        <tr key={pagamento.id} className="border-b">
                          <td className="text-xs py-3 px-4">
                            {format(new Date(pagamento.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </td>
                          <td className="text-xs py-3 px-4 font-medium">
                            {formatCurrency(Number(pagamento.valor))}
                          </td>
                          <td className="text-xs py-3 px-4">
                            {pagamento.consulta?.medico?.usuario?.nome || "-"}
                          </td>
                          <td className="text-xs py-3 px-4">
                            {pagamento.consulta
                              ? format(new Date(pagamento.consulta.dataHora), "dd/MM/yyyy HH:mm", { locale: ptBR })
                              : "-"}
                          </td>
                          <td className="text-xs py-3 px-4">
                            {getStatusBadge(pagamento.status)}
                          </td>
                          <td className="text-xs py-3 px-4">
                            {pagamento.metodoPagamento || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
