"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, User, Video, Paperclip, X, CreditCard } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarioHorarios } from "./components/calendario-horarios";
import { format } from "date-fns";

const agendamentoSchema = z.object({
  medicoId: z.string().uuid("Médico é obrigatório"),
  data: z.string().min(1, "Data é obrigatória"),
  hora: z.string().min(1, "Hora é obrigatória"),
  anexos: z.array(z.instanceof(File)).optional(),
});

type AgendamentoFormData = z.infer<typeof agendamentoSchema>;

interface Medico {
  id: string;
  crm: string;
  especialidade: string | null;
  usuario: {
    id: string;
    nome: string;
    email: string;
    avatar: string | null;
  };
}

export function NovoAgendamentoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMedicos, setLoadingMedicos] = useState(true);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [loadingPagamento, setLoadingPagamento] = useState(false);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [dataSelecionadaCalendario, setDataSelecionadaCalendario] = useState<Date | null>(null);
  const [datasComDisponibilidade, setDatasComDisponibilidade] = useState<Set<string>>(new Set());
  const [anexos, setAnexos] = useState<File[]>([]);
  const [valorConsulta, setValorConsulta] = useState<number>(150.0); // Valor padrão da consulta

  const form = useForm<AgendamentoFormData>({
    resolver: zodResolver(agendamentoSchema),
    defaultValues: {
      medicoId: "",
      data: "",
      hora: "",
      anexos: [],
    },
    mode: "onChange",
  });

  const medicoId = form.watch("medicoId");
  const data = form.watch("data");

  // Buscar médicos disponíveis
  useEffect(() => {
    const fetchMedicos = async () => {
      try {
        setLoadingMedicos(true);
        const response = await fetch("/api/paciente/medicos");
        if (!response.ok) throw new Error("Erro ao carregar médicos");
        const data = await response.json();
        setMedicos(data.medicos || []);
      } catch (error) {
        toast.error("Erro ao carregar médicos");
        console.error(error);
      } finally {
        setLoadingMedicos(false);
      }
    };

    fetchMedicos();
  }, []);

  // Buscar disponibilidade de datas quando médico é selecionado
  useEffect(() => {
    const fetchDisponibilidadeDatas = async () => {
      if (!medicoId) {
        setDatasComDisponibilidade(new Set());
        return;
      }

      try {
        // Buscar disponibilidade para os próximos 30 dias
        const hoje = new Date();
        const datasComDisponibilidadeSet = new Set<string>();
        
        // Buscar disponibilidade para algumas datas (otimização: não buscar todas de uma vez)
        const datasParaVerificar: string[] = [];
        for (let i = 0; i < 30; i++) {
          const data = new Date(hoje);
          data.setDate(data.getDate() + i);
          datasParaVerificar.push(format(data, "yyyy-MM-dd"));
        }

        // Buscar disponibilidade em paralelo (limitado a 10 por vez para não sobrecarregar)
        const promises = datasParaVerificar.slice(0, 10).map(async (dataStr) => {
          try {
            const params = new URLSearchParams({ medicoId, data: dataStr });
            const response = await fetch(`/api/paciente/horarios-disponiveis?${params.toString()}`);
            if (response.ok) {
              const data = await response.json();
              if (data.horarios && data.horarios.length > 0) {
                return dataStr;
              }
            }
          } catch (error) {
            console.error(`Erro ao verificar disponibilidade para ${dataStr}:`, error);
          }
          return null;
        });

        const resultados = await Promise.all(promises);
        resultados.forEach((dataStr) => {
          if (dataStr) {
            datasComDisponibilidadeSet.add(dataStr);
          }
        });

        setDatasComDisponibilidade(datasComDisponibilidadeSet);
      } catch (error) {
        console.error("Erro ao buscar disponibilidade de datas:", error);
      }
    };

    fetchDisponibilidadeDatas();
  }, [medicoId]);

  // Buscar horários disponíveis quando médico e data são selecionados
  useEffect(() => {
    const fetchHorarios = async () => {
      if (!medicoId || !dataSelecionadaCalendario) {
        setHorariosDisponiveis([]);
        form.setValue("hora", "");
        return;
      }

      try {
        setLoadingHorarios(true);
        const dataStr = format(dataSelecionadaCalendario, "yyyy-MM-dd");
        const params = new URLSearchParams({
          medicoId,
          data: dataStr,
        });
        const response = await fetch(`/api/paciente/horarios-disponiveis?${params.toString()}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Erro ao carregar horários");
        }
        
        const responseData = await response.json();
        console.log("Horários disponíveis recebidos:", responseData);
        setHorariosDisponiveis(responseData.horarios || []);
        
        // Atualizar disponibilidade da data
        if (responseData.horarios && responseData.horarios.length > 0) {
          setDatasComDisponibilidade((prev) => {
            const novo = new Set(prev);
            novo.add(dataStr);
            return novo;
          });
        }
        
        // Limpar hora selecionada se não estiver mais disponível
        const horaAtual = form.getValues("hora");
        if (horaAtual && !responseData.horarios.includes(horaAtual)) {
          form.setValue("hora", "");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erro ao carregar horários disponíveis";
        toast.error(errorMessage);
        console.error("Erro ao buscar horários:", error);
        setHorariosDisponiveis([]);
      } finally {
        setLoadingHorarios(false);
      }
    };

    fetchHorarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicoId, dataSelecionadaCalendario]);

  // Definir data mínima como hoje (usar useState para evitar problemas de hidratação)
  const [dataMinima, setDataMinima] = useState("");
  const [dataMaximaStr, setDataMaximaStr] = useState("");

  useEffect(() => {
    // Marcar como montado no cliente
    setMounted(true);
    
    // Calcular datas apenas no cliente
    const hoje = new Date();
    const dataMin = hoje.toISOString().split("T")[0];
    setDataMinima(dataMin);

    const dataMax = new Date();
    dataMax.setDate(dataMax.getDate() + 30);
    const dataMaxStr = dataMax.toISOString().split("T")[0];
    setDataMaximaStr(dataMaxStr);

    // Verificar se há session_id na URL (retorno do pagamento)
    const sessionId = searchParams.get("session_id");
    const success = searchParams.get("success");
    
    if (sessionId && success === "true") {
      // Processar agendamento após pagamento confirmado
      processarAgendamentoAposPagamento(sessionId);
    }
  }, [searchParams]);

  const processarAgendamentoAposPagamento = async (sessionId: string) => {
    try {
      setLoading(true);
      
      // Buscar dados do formulário
      const medicoId = form.getValues("medicoId");
      const data = form.getValues("data");
      const hora = form.getValues("hora");
      
      if (!medicoId || !data || !hora) {
        toast.error("Dados do agendamento não encontrados. Por favor, preencha novamente.");
        return;
      }

      const dataHora = `${data}T${hora}:00`;

      // Criar agendamento com sessionId
      let response: Response;
      
      if (anexos.length > 0) {
        const formData = new FormData();
        formData.append("medicoId", medicoId);
        formData.append("dataHora", dataHora);
        formData.append("sessionId", sessionId);
        
        anexos.forEach((arquivo) => {
          formData.append("anexos", arquivo);
        });

        response = await fetch("/api/paciente/agendamentos", {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch("/api/paciente/agendamentos", {
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
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao agendar consulta");
      }

      const result = await response.json();
      toast.success("Agendamento realizado com sucesso!");
      
      // Limpar URL
      router.replace("/paciente/novo-agendamento");
      
      // Redirecionar para histórico de consultas após 1 segundo
      setTimeout(() => {
        router.push("/paciente/historico-consultas");
      }, 1000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao agendar consulta";
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: AgendamentoFormData) => {
    try {
      // Validar se médico foi selecionado
      if (!data.medicoId) {
        toast.error("Selecione um médico");
        return;
      }

      // Validar se data foi selecionada
      if (!data.data || !data.hora) {
        toast.error("Selecione uma data e horário");
        return;
      }

      // Buscar informações do médico
      const medico = medicos.find((m) => m.id === data.medicoId);
      if (!medico) {
        toast.error("Médico não encontrado");
        return;
      }

      // Combinar data e hora
      const dataHora = `${data.data}T${data.hora}:00`;

      // Redirecionar para tela de pagamento
      const params = new URLSearchParams({
        medicoId: data.medicoId,
        dataHora: dataHora,
        valor: valorConsulta.toString(),
        medicoNome: medico.usuario.nome,
        medicoEspecialidade: medico.especialidade || "",
      });

      router.push(`/paciente/pagamento?${params.toString()}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao processar agendamento";
      toast.error(errorMessage);
      console.error(error);
    }
  };

  // Evitar problemas de hidratação renderizando apenas no cliente
  if (!mounted) {
    return (
      <div className="@container/main flex flex-1 flex-col">
        <div className="flex flex-col">
          <div className="px-4 lg:px-6 pt-2">
            <Card className="p-3">
              <CardContent className="p-0">
                <div className="flex items-center justify-center py-8">
                  <p className="text-xs text-muted-foreground">
                    Carregando...
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col">
        <div className="px-4 lg:px-6 pt-2">
          <Card className="p-3">
            <CardContent className="p-0">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Coluna Esquerda - Campos */}
                    <div className="space-y-4">
                      {/* Seleção de Médico */}
                      <FormField
                        control={form.control}
                        name="medicoId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2 text-xs">
                              <User className="h-3 w-3" />
                              Médico
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={loadingMedicos}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o médico" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {loadingMedicos ? (
                                  <div className="flex items-center justify-center p-4">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  </div>
                                ) : medicos.length === 0 ? (
                                  <div className="p-4 text-xs text-muted-foreground text-center">
                                    Nenhum médico disponível
                                  </div>
                                ) : (
                                  medicos.map((medico) => (
                                    <SelectItem key={medico.id} value={medico.id}>
                                      <div className="flex flex-col">
                                        <span className="text-xs font-medium">{medico.usuario.nome}</span>
                                        {medico.especialidade && (
                                          <span className="text-[10px] text-muted-foreground">
                                            {medico.especialidade} - CRM: {medico.crm}
                                          </span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Anexar Documentos */}
                      <FormField
                        control={form.control}
                        name="anexos"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2 text-xs">
                              <Paperclip className="h-3 w-3" />
                              Anexar Documentos (opcional)
                            </FormLabel>
                            <FormControl>
                              <div className="space-y-2">
                                <Input
                                  type="file"
                                  multiple
                                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                  onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    setAnexos(files);
                                    field.onChange(files);
                                  }}
                                  className="cursor-pointer text-xs"
                                />
                                {anexos.length > 0 && (
                                  <div className="space-y-1.5 mt-2">
                                    {anexos.map((arquivo, index) => (
                                      <div
                                        key={index}
                                        className="flex items-center justify-between p-1.5 bg-gray-50 dark:bg-gray-800 rounded-md"
                                      >
                                        <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">
                                          {arquivo.name}
                                        </span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-5 w-5 ml-2"
                                          onClick={() => {
                                            const novosAnexos = anexos.filter((_, i) => i !== index);
                                            setAnexos(novosAnexos);
                                            field.onChange(novosAnexos);
                                          }}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Botões de Ação */}
                      <div className="flex justify-end gap-2 pt-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => router.back()}
                          disabled={loading}
                          className="text-xs h-7"
                        >
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={loading} className="text-xs h-7">
                          {loading ? (
                            <>
                              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                              Processando...
                            </>
                          ) : (
                            <>
                              <Video className="mr-1.5 h-3 w-3" />
                              Continuar para Pagamento
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Coluna Direita - Calendário */}
                    <div className="lg:sticky lg:top-4 lg:self-start">
                      <FormField
                        control={form.control}
                        name="data"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <CalendarioHorarios
                                dataSelecionada={dataSelecionadaCalendario}
                                onDataSelecionada={(data) => {
                                  setDataSelecionadaCalendario(data);
                                  field.onChange(format(data, "yyyy-MM-dd"));
                                }}
                                horariosDisponiveis={horariosDisponiveis}
                                onHorarioSelecionado={(horario) => {
                                  form.setValue("hora", horario);
                                }}
                                horarioSelecionado={form.watch("hora")}
                                datasComDisponibilidade={datasComDisponibilidade}
                              />
                            </FormControl>
                            <FormMessage />
                            {!medicoId && (
                              <Alert className="mt-3">
                                <AlertDescription className="text-xs">
                                  Selecione um médico primeiro para ver as datas disponíveis
                                </AlertDescription>
                              </Alert>
                            )}
                          </FormItem>
                        )}
                      />
                    </div>
              </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
