"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CreditCard,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  Calendar,
  DollarSign,
  AlertCircle,
  Zap,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusPagamento, TipoPlano } from "@/lib/generated/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PagamentosPlanosContentProps {
  data: {
    clinica: {
      id: string;
      nome: string;
      planoAtual: {
        id: string;
        nome: TipoPlano;
        preco: number;
        tokensMensais: number;
        telemedicineHabilitada: boolean;
        descricao: string | null;
      };
      dataExpiracao: Date | null;
      status: string;
    };
    pagamentos: Array<{
      id: string;
      valor: number;
      mesReferencia: Date;
      status: StatusPagamento;
      metodoPagamento: string | null;
      dataVencimento: Date;
      dataPagamento: Date | null;
      transacaoId: string | null;
      observacoes: string | null;
      createdAt: Date;
    }>;
    planos: Array<{
      id: string;
      nome: TipoPlano;
      preco: number;
      tokensMensais: number;
      telemedicineHabilitada: boolean;
      descricao: string | null;
    }>;
    pagamentoPendente: {
      id: string;
      valor: number;
      mesReferencia: Date;
      dataVencimento: Date;
    } | null;
    estatisticas: {
      pagamentosPagos: number;
      pagamentosPendentes: number;
      pagamentosVencidos: number;
      total: number;
    };
  };
}

export function PagamentosPlanosContent({ data }: PagamentosPlanosContentProps) {
  const [planos, setPlanos] = useState(data.planos);
  const [pagamentos, setPagamentos] = useState(data.pagamentos);
  const [dialogAlterarPlanoOpen, setDialogAlterarPlanoOpen] = useState(false);
  const [planoSelecionado, setPlanoSelecionado] = useState<
    typeof data.planos[0] | null
  >(null);
  const [isAlterando, setIsAlterando] = useState(false);
  const [dialogGerarPagamentoOpen, setDialogGerarPagamentoOpen] = useState(false);
  const [isGerandoPagamento, setIsGerandoPagamento] = useState(false);
  const [metodoPagamento, setMetodoPagamento] = useState<string>("PIX");
  const [dadosCartao, setDadosCartao] = useState({
    numero: "",
    nome: "",
    validade: "",
    cvv: "",
  });

  const getPlanoLabel = (plano: TipoPlano) => {
    switch (plano) {
      case TipoPlano.BASICO:
        return "Básico";
      case TipoPlano.INTERMEDIARIO:
        return "Intermediário";
      case TipoPlano.PROFISSIONAL:
        return "Profissional";
      default:
        return plano;
    }
  };

  const getStatusBadge = (status: StatusPagamento) => {
    switch (status) {
      case StatusPagamento.PAGO:
        return (
          <Badge variant="default" className="bg-green-500">
            Pago
          </Badge>
        );
      case StatusPagamento.PENDENTE:
        return <Badge variant="secondary">Pendente</Badge>;
      case StatusPagamento.CANCELADO:
        return <Badge variant="outline">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isUpgrade = (planoId: string) => {
    const planoIndex = planos.findIndex((p) => p.id === planoId);
    const planoAtualIndex = planos.findIndex(
      (p) => p.id === data.clinica.planoAtual.id
    );
    return planoIndex > planoAtualIndex;
  };

  const handleAlterarPlano = async (planoId: string) => {
    const plano = planos.find((p) => p.id === planoId);
    if (!plano) return;

    setPlanoSelecionado(plano);
    setDialogAlterarPlanoOpen(true);
  };

  const confirmarAlterarPlano = async () => {
    if (!planoSelecionado) return;

    setIsAlterando(true);

    try {
      const response = await fetch("/api/admin-clinica/planos/alterar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planoId: planoSelecionado.id,
          gerarPagamento: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao alterar plano");
      }

      toast.success(
        `Plano alterado para ${getPlanoLabel(planoSelecionado.nome)} com sucesso!`
      );
      setDialogAlterarPlanoOpen(false);
      setPlanoSelecionado(null);

      // Recarregar página para atualizar dados
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar plano");
    } finally {
      setIsAlterando(false);
    }
  };

  const handleGerarPagamento = async () => {
    // Validar dados do cartão se necessário
    if (metodoPagamento === "CARTAO_CREDITO" || metodoPagamento === "CARTAO_DEBITO") {
      if (!dadosCartao.numero || !dadosCartao.nome || !dadosCartao.validade || !dadosCartao.cvv) {
        toast.error("Por favor, preencha todos os dados do cartão");
        return;
      }
    }

    setIsGerandoPagamento(true);

    try {
      const response = await fetch("/api/admin-clinica/pagamentos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metodoPagamento: metodoPagamento,
          dadosCartao: (metodoPagamento === "CARTAO_CREDITO" || metodoPagamento === "CARTAO_DEBITO") ? dadosCartao : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao gerar pagamento");
      }

      toast.success("Pagamento gerado com sucesso!");
      setDialogGerarPagamentoOpen(false);
      setMetodoPagamento("PIX");
      setDadosCartao({ numero: "", nome: "", validade: "", cvv: "" });

      // Recarregar página para atualizar dados
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar pagamento");
    } finally {
      setIsGerandoPagamento(false);
    }
  };

  const planoAtualIndex = planos.findIndex(
    (p) => p.id === data.clinica.planoAtual.id
  );

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="space-y-6 px-4 lg:px-6">
          <div>
            <h1 className="text-3xl font-bold">Pagamentos e Planos</h1>
            <p className="text-muted-foreground">
              Gerencie seu plano e acompanhe seus pagamentos
            </p>
          </div>

      {/* Alerta de Pagamento Pendente */}
      {data.pagamentoPendente && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <CardTitle className="text-orange-900 dark:text-orange-100">
                Pagamento Pendente
              </CardTitle>
            </div>
            <CardDescription className="text-orange-800 dark:text-orange-200">
              Você tem um pagamento pendente para este mês
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                  Valor: {formatCurrency(data.pagamentoPendente.valor)}
                </p>
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  Vencimento: {formatDate(data.pagamentoPendente.dataVencimento)}
                </p>
              </div>
              <Button
                variant="outline"
                className="border-orange-300 text-orange-900 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-100 dark:hover:bg-orange-900"
              >
                Ver Detalhes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plano Atual */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Plano Atual</CardTitle>
              <CardDescription>
                {getPlanoLabel(data.clinica.planoAtual.nome)}
              </CardDescription>
            </div>
            <Badge variant="default" className="text-lg px-4 py-1">
              {formatCurrency(data.clinica.planoAtual.preco)}/mês
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Tokens Mensais</p>
                <p className="text-2xl font-bold">
                  {data.clinica.planoAtual.tokensMensais.toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Próxima Renovação</p>
                <p className="text-sm">
                  {data.clinica.dataExpiracao
                    ? formatDate(data.clinica.dataExpiracao)
                    : "Não definida"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {data.clinica.planoAtual.telemedicineHabilitada ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">Telemedicina</p>
                <p className="text-sm">
                  {data.clinica.planoAtual.telemedicineHabilitada
                    ? "Habilitada"
                    : "Desabilitada"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Planos Disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle>Planos Disponíveis</CardTitle>
          <CardDescription>
            Escolha o plano que melhor se adequa às suas necessidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {planos.map((plano, index) => {
              const isAtual = plano.id === data.clinica.planoAtual.id;
              const isUpgradePlano = index > planoAtualIndex;
              const isDowngradePlano = index < planoAtualIndex;

              return (
                <Card
                  key={plano.id}
                  className={
                    isAtual
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{getPlanoLabel(plano.nome)}</CardTitle>
                      {isAtual && (
                        <Badge variant="default">Plano Atual</Badge>
                      )}
                    </div>
                    <div className="mt-2">
                      <span className="text-3xl font-bold">
                        {formatCurrency(plano.preco)}
                      </span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">
                          {plano.tokensMensais.toLocaleString("pt-BR")} tokens
                          /mês
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {plano.telemedicineHabilitada ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm">Telemedicina</span>
                      </div>
                    </div>
                    {plano.descricao && (
                      <p className="text-sm text-muted-foreground">
                        {plano.descricao}
                      </p>
                    )}
                    {!isAtual && (
                      <Button
                        className="w-full"
                        variant={isUpgradePlano ? "default" : "outline"}
                        onClick={() => handleAlterarPlano(plano.id)}
                      >
                        {isUpgradePlano ? (
                          <>
                            <ArrowUp className="mr-2 h-4 w-4" />
                            Fazer Upgrade
                          </>
                        ) : (
                          <>
                            <ArrowDown className="mr-2 h-4 w-4" />
                            Fazer Downgrade
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Pagamentos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Histórico de Pagamentos</CardTitle>
              <CardDescription>
                Acompanhe todos os seus pagamentos
              </CardDescription>
            </div>
            <Button
              onClick={() => setDialogGerarPagamentoOpen(true)}
              disabled={!!data.pagamentoPendente}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Gerar Pagamento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pagamentos.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Nenhum pagamento encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês Referência</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagamentos.map((pagamento) => (
                  <TableRow key={pagamento.id}>
                    <TableCell>
                      {new Intl.DateTimeFormat("pt-BR", {
                        month: "long",
                        year: "numeric",
                      }).format(new Date(pagamento.mesReferencia))}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(pagamento.valor)}
                    </TableCell>
                    <TableCell>
                      {formatDate(pagamento.dataVencimento)}
                    </TableCell>
                    <TableCell>{getStatusBadge(pagamento.status)}</TableCell>
                    <TableCell>
                      {pagamento.metodoPagamento || "Não informado"}
                    </TableCell>
                    <TableCell>
                      {pagamento.dataPagamento
                        ? formatDate(pagamento.dataPagamento)
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>


      {/* Dialog Alterar Plano */}
      <Dialog
        open={dialogAlterarPlanoOpen}
        onOpenChange={setDialogAlterarPlanoOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Plano</DialogTitle>
            <DialogDescription>
              {planoSelecionado &&
                (isUpgrade(planoSelecionado.id)
                  ? `Você está fazendo upgrade para o plano ${getPlanoLabel(planoSelecionado.nome)}. A diferença de preço será cobrada proporcionalmente ao restante do mês.`
                  : `Você está fazendo downgrade para o plano ${getPlanoLabel(planoSelecionado.nome)}. Seus tokens serão ajustados conforme o novo plano.`)}
            </DialogDescription>
          </DialogHeader>
          {planoSelecionado && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Plano Atual
                  </p>
                  <p className="text-sm font-medium">
                    {getPlanoLabel(data.clinica.planoAtual.nome)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(data.clinica.planoAtual.preco)}/mês
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Novo Plano
                  </p>
                  <p className="text-sm font-medium">
                    {getPlanoLabel(planoSelecionado.nome)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(planoSelecionado.preco)}/mês
                  </p>
                </div>
              </div>
              <div className="rounded-md bg-muted p-3">
                <p className="text-sm">
                  <strong>Diferença:</strong>{" "}
                  {formatCurrency(
                    planoSelecionado.preco - data.clinica.planoAtual.preco
                  )}
                  /mês
                </p>
                {isUpgrade(planoSelecionado.id) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Um pagamento proporcional será gerado para o restante do
                    mês.
                  </p>
                )}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDialogAlterarPlanoOpen(false);
                setPlanoSelecionado(null);
              }}
              disabled={isAlterando}
            >
              Cancelar
            </Button>
            <Button onClick={confirmarAlterarPlano} disabled={isAlterando}>
              {isAlterando ? "Alterando..." : "Confirmar Alteração"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Gerar Pagamento */}
      <Dialog
        open={dialogGerarPagamentoOpen}
        onOpenChange={(open) => {
          setDialogGerarPagamentoOpen(open);
          if (!open) {
            setMetodoPagamento("PIX");
            setDadosCartao({ numero: "", nome: "", validade: "", cvv: "" });
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerar Novo Pagamento</DialogTitle>
            <DialogDescription>
              Um novo pagamento será gerado para o mês atual com base no seu
              plano atual. Escolha o método de pagamento desejado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm font-medium">Valor do Pagamento</p>
              <p className="text-2xl font-bold">
                {formatCurrency(data.clinica.planoAtual.preco)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Baseado no plano {getPlanoLabel(data.clinica.planoAtual.nome)}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="metodo-pagamento">Método de Pagamento *</Label>
                <Select
                  value={metodoPagamento}
                  onValueChange={setMetodoPagamento}
                >
                  <SelectTrigger id="metodo-pagamento" className="w-full">
                    <SelectValue placeholder="Selecione o método de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="BOLETO">Boleto Bancário</SelectItem>
                    <SelectItem value="CARTAO_CREDITO">Cartão de Crédito</SelectItem>
                    <SelectItem value="CARTAO_DEBITO">Cartão de Débito</SelectItem>
                    <SelectItem value="TRANSFERENCIA">Transferência Bancária</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Campos do Cartão */}
              {(metodoPagamento === "CARTAO_CREDITO" || metodoPagamento === "CARTAO_DEBITO") && (
                <div className="space-y-4 rounded-md border p-4">
                  <h3 className="text-sm font-medium">Informações do Cartão</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="numero-cartao">Número do Cartão *</Label>
                    <Input
                      id="numero-cartao"
                      type="text"
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      value={dadosCartao.numero}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\s/g, "").replace(/\D/g, "");
                        const formatted = value.match(/.{1,4}/g)?.join(" ") || value;
                        setDadosCartao({ ...dadosCartao, numero: formatted });
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nome-cartao">Nome no Cartão *</Label>
                    <Input
                      id="nome-cartao"
                      type="text"
                      placeholder="Nome completo"
                      value={dadosCartao.nome}
                      onChange={(e) =>
                        setDadosCartao({ ...dadosCartao, nome: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="validade-cartao">Validade (MM/AA) *</Label>
                      <Input
                        id="validade-cartao"
                        type="text"
                        placeholder="MM/AA"
                        maxLength={5}
                        value={dadosCartao.validade}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          const formatted = value.length >= 2
                            ? `${value.slice(0, 2)}/${value.slice(2, 4)}`
                            : value;
                          setDadosCartao({ ...dadosCartao, validade: formatted });
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cvv-cartao">CVV *</Label>
                      <Input
                        id="cvv-cartao"
                        type="text"
                        placeholder="000"
                        maxLength={4}
                        value={dadosCartao.cvv}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          setDadosCartao({ ...dadosCartao, cvv: value });
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDialogGerarPagamentoOpen(false);
                setMetodoPagamento("PIX");
                setDadosCartao({ numero: "", nome: "", validade: "", cvv: "" });
              }}
              disabled={isGerandoPagamento}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGerarPagamento}
              disabled={isGerandoPagamento}
            >
              {isGerandoPagamento ? "Gerando..." : "Gerar Pagamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </div>
  );
}

