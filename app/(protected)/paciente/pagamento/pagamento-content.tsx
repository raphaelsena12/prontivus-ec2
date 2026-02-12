"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CreditCard, QrCode, Check, ArrowLeft, Lock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MedicoInfo {
  id: string;
  nome: string;
  especialidade: string | null;
}

type MetodoPagamento = "CARTAO" | "PIX" | null;

export function PagamentoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [metodoSelecionado, setMetodoSelecionado] = useState<MetodoPagamento>(null);
  const [pagamentoProcessado, setPagamentoProcessado] = useState(false);
  const [qrCodePix, setQrCodePix] = useState<string | null>(null);
  const [copiarCodigoPix, setCopiarCodigoPix] = useState<string | null>(null);

  // Dados do agendamento vindos da URL
  const medicoId = searchParams.get("medicoId");
  const dataHora = searchParams.get("dataHora");
  const valor = parseFloat(searchParams.get("valor") || "150.0");
  const medicoNome = searchParams.get("medicoNome") || "Médico";
  const medicoEspecialidade = searchParams.get("medicoEspecialidade");

  useEffect(() => {
    // Verificar se todos os dados necessários estão presentes
    if (!medicoId || !dataHora) {
      toast.error("Dados do agendamento não encontrados");
      router.push("/paciente/novo-agendamento");
    }

    // Verificar se há session_id na URL (retorno do Stripe)
    const sessionId = searchParams.get("session_id");
    const success = searchParams.get("success");
    
    if (sessionId && success === "true" && medicoId && dataHora) {
      // Processar agendamento após pagamento confirmado
      processarAgendamentoAposPagamento(sessionId);
    }
  }, [searchParams, medicoId, dataHora, router]);

  const formatarDataHora = (dataHoraStr: string) => {
    try {
      const data = new Date(dataHoraStr);
      return format(data, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dataHoraStr;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const processarPagamentoCartao = async () => {
    if (!medicoId || !dataHora) {
      toast.error("Dados do agendamento incompletos");
      return;
    }

    try {
      setLoading(true);

      console.log("Criando checkout com dados:", { medicoId, dataHora, valor });

      // Criar checkout no Stripe
      const checkoutResponse = await fetch("/api/paciente/telemedicina/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          medicoId,
          dataHora,
          valor,
        }),
      });

      console.log("Resposta do checkout:", checkoutResponse.status, checkoutResponse.statusText);

      if (!checkoutResponse.ok) {
        let errorData: any = {};
        const contentType = checkoutResponse.headers.get("content-type");
        
        try {
          if (contentType && contentType.includes("application/json")) {
            errorData = await checkoutResponse.json();
          } else {
            const textResponse = await checkoutResponse.text();
            console.error("Resposta não-JSON:", textResponse);
            errorData = { 
              error: `Erro ${checkoutResponse.status}: ${checkoutResponse.statusText}`,
              details: textResponse || "Resposta vazia do servidor"
            };
          }
        } catch (e) {
          console.error("Erro ao parsear resposta:", e);
          errorData = { 
            error: `Erro ${checkoutResponse.status}: ${checkoutResponse.statusText}`,
            details: "Não foi possível processar a resposta do servidor"
          };
        }
        
        console.error("Erro ao criar checkout:", {
          status: checkoutResponse.status,
          statusText: checkoutResponse.statusText,
          contentType,
          errorData,
        });
        
        // Construir mensagem de erro mais detalhada
        let errorMessage = `Erro ${checkoutResponse.status}: ${checkoutResponse.statusText}`;
        
        if (errorData && typeof errorData === 'object') {
          if (errorData.error) {
            errorMessage = errorData.error;
            if (errorData.details) {
              errorMessage += ` - ${errorData.details}`;
            }
          } else if (errorData.details) {
            errorMessage = errorData.details;
          } else if (Object.keys(errorData).length > 0) {
            errorMessage = JSON.stringify(errorData);
          }
        } else if (typeof errorData === 'string' && errorData.length > 0) {
          errorMessage = errorData;
        }
        
        throw new Error(errorMessage);
      }

      const checkoutData = await checkoutResponse.json();
      console.log("Checkout criado com sucesso:", checkoutData);

      // Redirecionar para o Stripe Checkout
      if (checkoutData.url) {
        window.location.href = checkoutData.url;
      } else {
        throw new Error("URL de pagamento não encontrada na resposta");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao processar pagamento";
      toast.error(errorMessage);
      console.error("Erro completo:", error);
      setLoading(false);
    }
  };

  const processarPagamentoPix = async () => {
    if (!medicoId || !dataHora) return;

    try {
      setLoading(true);

      // TODO: Implementar geração de QR Code PIX
      // Por enquanto, simular criação de pagamento PIX
      toast.info("Pagamento via PIX será implementado em breve");
      
      // Simular QR Code (substituir por implementação real)
      setTimeout(() => {
        setQrCodePix("00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865405150.005802BR5925PRONTIVUS TELECONSULTA6009SAO PAULO62140510MP1234566304ABCD");
        setCopiarCodigoPix("00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865405150.005802BR5925PRONTIVUS TELECONSULTA6009SAO PAULO62140510MP1234566304ABCD");
        setPagamentoProcessado(true);
        setLoading(false);
      }, 1000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao processar pagamento PIX";
      toast.error(errorMessage);
      console.error(error);
      setLoading(false);
    }
  };

  const copiarCodigo = () => {
    if (copiarCodigoPix) {
      navigator.clipboard.writeText(copiarCodigoPix);
      toast.success("Código PIX copiado para a área de transferência!");
    }
  };

  const processarAgendamentoAposPagamento = async (sessionId: string) => {
    if (!medicoId || !dataHora) return;

    try {
      setLoading(true);

      // Criar agendamento com sessionId
      const response = await fetch("/api/paciente/agendamentos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          medicoId,
          dataHora,
          sessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao agendar consulta");
      }

      const result = await response.json();
      toast.success("Agendamento realizado com sucesso!");
      
      // Limpar URL
      router.replace("/paciente/pagamento");
      
      // Redirecionar para histórico de consultas após 1 segundo
      setTimeout(() => {
        router.push("/paciente/historico-consultas");
      }, 1000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao agendar consulta";
      toast.error(errorMessage);
      console.error(error);
      setLoading(false);
    }
  };

  const voltar = () => {
    router.push("/paciente/novo-agendamento");
  };

  if (!medicoId || !dataHora) {
    return null;
  }

  return (
    <div className="@container/main flex flex-1 flex-col bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex flex-col">
        <div className="px-4 lg:px-6 pt-4 pb-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={voltar}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold">Finalizar Pagamento</h1>
                  <p className="text-sm text-muted-foreground">
                    Complete o pagamento para confirmar seu agendamento
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Coluna Principal - Métodos de Pagamento */}
              <div className="lg:col-span-2">
                {!pagamentoProcessado ? (
                  <Card className="p-6 shadow-lg">
                    <CardContent className="p-0">
                      {/* Seleção de Método de Pagamento */}
                      <div className="mb-6">
                        <h2 className="text-base font-semibold mb-4">Escolha a forma de pagamento</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Cartão de Crédito */}
                      <Card
                        className={`cursor-pointer transition-all border-2 ${
                          metodoSelecionado === "CARTAO"
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-gray-200 dark:border-gray-700 hover:border-primary/50"
                        }`}
                        onClick={() => setMetodoSelecionado("CARTAO")}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start gap-4">
                            <div
                              className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                                metodoSelecionado === "CARTAO"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-gray-100 dark:bg-gray-800"
                              }`}
                            >
                              <CreditCard className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-sm font-semibold mb-1">Cartão de Crédito</h3>
                              <p className="text-xs text-muted-foreground mb-2">
                                Visa, Mastercard, Elo e outros
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <Lock className="h-3 w-3" />
                                <span>Pagamento seguro</span>
                              </div>
                            </div>
                            {metodoSelecionado === "CARTAO" && (
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Check className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* PIX */}
                      <Card
                        className={`cursor-pointer transition-all border-2 ${
                          metodoSelecionado === "PIX"
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-gray-200 dark:border-gray-700 hover:border-primary/50"
                        }`}
                        onClick={() => setMetodoSelecionado("PIX")}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start gap-4">
                            <div
                              className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                                metodoSelecionado === "PIX"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-gray-100 dark:bg-gray-800"
                              }`}
                            >
                              <QrCode className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-sm font-semibold mb-1">PIX</h3>
                              <p className="text-xs text-muted-foreground mb-2">
                                Aprovação imediata
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-green-600 dark:text-green-400">
                                <Check className="h-3 w-3" />
                                <span>Sem taxas adicionais</span>
                              </div>
                            </div>
                            {metodoSelecionado === "PIX" && (
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Check className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                        </div>
                      </div>

                      {/* Botão de Pagamento */}
                      <div className="space-y-3 mt-6">
                        <Button
                          onClick={() => {
                            if (metodoSelecionado === "CARTAO") {
                              processarPagamentoCartao();
                            } else if (metodoSelecionado === "PIX") {
                              processarPagamentoPix();
                            } else {
                              toast.error("Selecione uma forma de pagamento");
                            }
                          }}
                          disabled={loading || !metodoSelecionado}
                          className="w-full h-12 text-base font-semibold shadow-lg"
                          size="lg"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Processando...
                            </>
                          ) : (
                            <>
                              <Lock className="mr-2 h-5 w-5" />
                              Pagar {formatCurrency(valor)}
                            </>
                          )}
                        </Button>
                        <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                          <Lock className="h-3 w-3" />
                          <span>Seus dados estão protegidos e seguros</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="p-6 shadow-lg">
                    <CardContent className="p-0">
                      {/* Tela de QR Code PIX */}
                      <div className="space-y-6">
                        <div className="text-center">
                          <h2 className="text-base font-semibold mb-2">Escaneie o QR Code</h2>
                          <p className="text-sm text-muted-foreground mb-6">
                            Abra o app do seu banco e escaneie o código para pagar
                          </p>
                          {qrCodePix && (
                            <div className="bg-white p-6 rounded-lg inline-block mb-6 shadow-lg">
                              {/* Aqui você pode integrar uma biblioteca de QR Code */}
                              <div className="w-64 h-64 bg-gray-100 flex items-center justify-center rounded border-2 border-dashed border-gray-300">
                                <QrCode className="h-32 w-32 text-gray-400" />
                              </div>
                            </div>
                          )}
                        </div>
                        {copiarCodigoPix && (
                          <div className="space-y-3">
                            <Button
                              onClick={copiarCodigo}
                              variant="outline"
                              className="w-full h-11"
                            >
                              Copiar Código PIX
                            </Button>
                            <p className="text-xs text-center text-muted-foreground">
                              Ou copie o código e cole no app do seu banco
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Coluna Lateral - Resumo */}
              <div className="lg:col-span-1">
                <Card className="p-6 shadow-lg sticky top-4">
                  <CardContent className="p-0">
                    <h2 className="text-base font-semibold mb-4">Resumo do Agendamento</h2>
                    <div className="space-y-4">
                      <div className="pb-4 border-b">
                        <div className="text-xs text-muted-foreground mb-1">Médico</div>
                        <div className="text-sm font-semibold">{medicoNome}</div>
                        {medicoEspecialidade && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {medicoEspecialidade}
                          </div>
                        )}
                      </div>
                      <div className="pb-4 border-b">
                        <div className="text-xs text-muted-foreground mb-1">Data e Hora</div>
                        <div className="text-sm font-medium">{formatarDataHora(dataHora)}</div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-muted-foreground">Valor Total</span>
                          <span className="text-2xl font-bold text-primary">
                            {formatCurrency(valor)}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Pagamento único para esta consulta
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
