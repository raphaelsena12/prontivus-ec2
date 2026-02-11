"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const agendamentoSchema = z.object({
  pacienteId: z.string().uuid("Paciente é obrigatório"),
  medicoId: z.string().uuid("Médico é obrigatório"),
  dataHora: z.string().min(1, "Data e hora são obrigatórias"),
  codigoTussId: z.string().uuid("Código TUSS é obrigatório"),
  tipoConsultaId: z.string().uuid().optional(),
  procedimentoId: z.string().uuid().optional().nullable(),
  operadoraId: z.string().uuid().optional().nullable(),
  planoSaudeId: z.string().uuid().optional().nullable(),
  numeroCarteirinha: z.string().optional(),
  valorCobrado: z.number().min(0).optional().nullable(),
  observacoes: z.string().max(1000, "Observações devem ter no máximo 1000 caracteres").optional(),
});

type AgendamentoFormData = z.infer<typeof agendamentoSchema>;

interface NovoAgendamentoFormProps {
  clinicaId: string;
}

interface Paciente {
  id: string;
  nome: string;
  cpf: string;
}

interface Medico {
  id: string;
  usuario: {
    nome: string;
  };
}

interface CodigoTuss {
  id: string;
  codigoTuss: string;
  descricao: string;
}

interface TipoConsulta {
  id: string;
  nome: string;
  codigo: string;
}

interface Operadora {
  id: string;
  nomeFantasia: string | null;
  razaoSocial: string;
}

interface PlanoSaude {
  id: string;
  nome: string;
}

interface Procedimento {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  valor: number;
}

export function NovoAgendamentoForm({ clinicaId }: NovoAgendamentoFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [codigosTuss, setCodigosTuss] = useState<CodigoTuss[]>([]);
  const [tiposConsulta, setTiposConsulta] = useState<TipoConsulta[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [planosSaude, setPlanosSaude] = useState<PlanoSaude[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [consultasRetorno, setConsultasRetorno] = useState<{
    temRetorno: boolean;
    consultas: Array<{ id: string; dataHora: string; medico: string }>;
  } | null>(null);
  const [verificandoRetorno, setVerificandoRetorno] = useState(false);
  const [limiteRetornos, setLimiteRetornos] = useState<{
    limiteMaximoRetornosPorDia: number | null;
    retornosNoDia: number;
    limiteAtingido: boolean;
    mensagem: string | null;
  } | null>(null);
  const [verificandoLimite, setVerificandoLimite] = useState(false);

  const form = useForm<AgendamentoFormData>({
    resolver: zodResolver(agendamentoSchema),
    defaultValues: {
      pacienteId: "",
      medicoId: "",
      dataHora: "",
      codigoTussId: "",
      tipoConsultaId: "",
      procedimentoId: null,
      operadoraId: null,
      planoSaudeId: null,
      numeroCarteirinha: "",
      valorCobrado: null,
      observacoes: "",
    },
  });

  const operadoraId = form.watch("operadoraId");
  const pacienteId = form.watch("pacienteId");
  const medicoId = form.watch("medicoId");
  const tipoConsultaId = form.watch("tipoConsultaId");
  const dataHora = form.watch("dataHora");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [pacientesRes, medicosRes, codigosTussRes, tiposConsultaRes, procedimentosRes, operadorasRes] = await Promise.all([
          fetch("/api/secretaria/pacientes"),
          fetch("/api/admin-clinica/medicos"),
          fetch("/api/admin-clinica/codigos-tuss"),
          fetch("/api/admin-clinica/tipos-consulta"),
          fetch("/api/secretaria/procedimentos?limit=1000"),
          fetch("/api/admin-clinica/operadoras"),
        ]);

        if (pacientesRes.ok) {
          const data = await pacientesRes.json();
          setPacientes(data.pacientes || []);
        }

        if (medicosRes.ok) {
          const data = await medicosRes.json();
          setMedicos(data.medicos || []);
        }

        if (codigosTussRes.ok) {
          const data = await codigosTussRes.json();
          setCodigosTuss(data.codigosTuss || []);
        }

        if (tiposConsultaRes.ok) {
          const data = await tiposConsultaRes.json();
          setTiposConsulta(data.tiposConsulta || []);
        }

        if (procedimentosRes.ok) {
          const data = await procedimentosRes.json();
          setProcedimentos(data.procedimentos || []);
        }

        if (operadorasRes.ok) {
          const data = await operadorasRes.json();
          setOperadoras(data.operadoras || []);
        }
      } catch (error) {
        toast.error("Erro ao carregar dados");
        console.error(error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchPlanos = async () => {
      if (!operadoraId) {
        setPlanosSaude([]);
                                form.setValue("planoSaudeId", null);
        return;
      }

      try {
        const response = await fetch(`/api/admin-clinica/planos-saude?operadoraId=${operadoraId}`);
        if (response.ok) {
          const data = await response.json();
          setPlanosSaude(data.planosSaude || []);
        }
      } catch (error) {
        console.error("Erro ao carregar planos de saúde:", error);
      }
    };

    fetchPlanos();
  }, [operadoraId, form]);

  // Verificar consultas de retorno quando paciente + médico + data + tipo "Retorno" forem selecionados
  useEffect(() => {
    const verificarRetorno = async () => {
      // Verificar se o tipo de consulta selecionado é "Retorno"
      const tipoRetorno = tiposConsulta.find((tipo) => tipo.codigo === "RETORNO");
      const isTipoRetorno = tipoRetorno && tipoConsultaId === tipoRetorno.id;

      // Só verifica se TODAS as condições estiverem atendidas:
      // - Paciente selecionado
      // - Médico selecionado
      // - Data preenchida
      // - Tipo de consulta "Retorno" selecionado
      if (!pacienteId || !medicoId || !dataHora || dataHora.trim() === "" || !isTipoRetorno) {
        setConsultasRetorno(null);
        return;
      }

      try {
        setVerificandoRetorno(true);
        // Buscar todos os retornos do paciente (independente do médico)
        const response = await fetch(
          `/api/secretaria/pacientes/${pacienteId}/consultas-retorno`
        );

        if (response.ok) {
          const data = await response.json();
          console.log("[DEBUG RETORNO] Resposta da API:", data);
          setConsultasRetorno(data);
        } else {
          const errorData = await response.json();
          console.error("[DEBUG RETORNO] Erro na API:", errorData);
          setConsultasRetorno(null);
        }
      } catch (error) {
        console.error("[DEBUG RETORNO] Erro ao verificar consultas de retorno:", error);
        setConsultasRetorno(null);
      } finally {
        setVerificandoRetorno(false);
      }
    };

    verificarRetorno();
  }, [pacienteId, medicoId, dataHora, tipoConsultaId, tiposConsulta]);

  // Verificar limite de retornos diários quando médico e tipo "Retorno" forem selecionados
  useEffect(() => {
    const verificarLimiteRetornos = async () => {
      // Verificar se o tipo de consulta selecionado é "Retorno"
      const tipoRetorno = tiposConsulta.find((tipo) => tipo.codigo === "RETORNO");
      const isTipoRetorno = tipoRetorno && tipoConsultaId === tipoRetorno.id;

      console.log("[DEBUG] Verificando limite:", { medicoId, isTipoRetorno, dataHora, tipoConsultaId });

      // Só verifica se médico e tipo "Retorno" estiverem selecionados E tiver data
      if (!medicoId || !isTipoRetorno || !dataHora || dataHora.trim() === "") {
        console.log("[DEBUG] Condições não atendidas, limpando limite");
        setLimiteRetornos(null);
        return;
      }

      try {
        setVerificandoLimite(true);
        // Extrair apenas a data (sem hora) do campo dataHora
        // O formato é "YYYY-MM-DDTHH:mm" para datetime-local
        const data = dataHora.includes("T") ? dataHora.split("T")[0] : dataHora.split(" ")[0];
        console.log("[DEBUG] Chamando API com:", { medicoId, data });
        
        const response = await fetch(
          `/api/secretaria/medicos/${medicoId}/limite-retornos?data=${data}`
        );

        if (response.ok) {
          const responseData = await response.json();
          console.log("[DEBUG] Resposta da API:", responseData);
          setLimiteRetornos(responseData);
        } else {
          const errorData = await response.json();
          console.error("[DEBUG] Erro na API:", errorData);
          setLimiteRetornos(null);
        }
      } catch (error) {
        console.error("[DEBUG] Erro ao verificar limite de retornos:", error);
        setLimiteRetornos(null);
      } finally {
        setVerificandoLimite(false);
      }
    };

    verificarLimiteRetornos();
  }, [medicoId, tipoConsultaId, dataHora, tiposConsulta]);

  const onSubmit = async (data: AgendamentoFormData) => {
    try {
      setLoading(true);

      // Combinar data e hora
      const [date, time] = data.dataHora.split("T");
      const dataHora = `${date}T${time || "00:00"}`;

      const response = await fetch("/api/secretaria/agendamentos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          dataHora,
          procedimentoId: data.procedimentoId || null,
          operadoraId: data.operadoraId || null,
          planoSaudeId: data.planoSaudeId || null,
          valorCobrado: data.valorCobrado || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar agendamento");
      }

      toast.success("Agendamento criado com sucesso");
      router.push("/secretaria/agendamentos");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar agendamento");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center gap-4 px-4 lg:px-6">
          <Link href="/secretaria/agendamentos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Novo Agendamento</h1>
            <p className="text-muted-foreground">
              Crie um novo agendamento para um paciente
            </p>
          </div>
        </div>

        <div className="px-4 lg:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Agendamento</CardTitle>
              <CardDescription>
                Preencha os dados para criar um novo agendamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {limiteRetornos && limiteRetornos.limiteMaximoRetornosPorDia !== null && limiteRetornos.mensagem && (
                      <Alert 
                        variant={limiteRetornos.limiteAtingido ? "destructive" : "default"} 
                        className={limiteRetornos.limiteAtingido 
                          ? "border-red-500 bg-red-50 dark:bg-red-950" 
                          : "border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
                        }
                      >
                        <AlertTriangle className={`h-4 w-4 ${limiteRetornos.limiteAtingido ? "text-red-600 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400"}`} />
                        <AlertTitle className={limiteRetornos.limiteAtingido ? "text-red-800 dark:text-red-200" : "text-yellow-800 dark:text-yellow-200"}>
                          {limiteRetornos.limiteAtingido ? "Limite de Retornos Atingido!" : "Atenção: Limite de Retornos"}
                        </AlertTitle>
                        <AlertDescription className={limiteRetornos.limiteAtingido ? "text-red-700 dark:text-red-300" : "text-yellow-700 dark:text-yellow-300"}>
                          {limiteRetornos.mensagem}
                        </AlertDescription>
                      </Alert>
                    )}

                    {consultasRetorno?.temRetorno && (
                      <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        <AlertTitle className="text-yellow-800 dark:text-yellow-200">
                          Atenção: Consulta de Retorno Recente
                        </AlertTitle>
                        <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                          Este paciente já possui {consultasRetorno.consultas.length} consulta(s) do tipo Retorno agendada(s):
                          <ul className="mt-2 list-disc list-inside space-y-1">
                            {consultasRetorno.consultas.map((consulta) => {
                              const data = new Date(consulta.dataHora);
                              const dataFormatada = data.toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              });
                              return (
                                <li key={consulta.id}>
                                  {dataFormatada} - Dr(a). {consulta.medico}
                                </li>
                              );
                            })}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="pacienteId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Paciente *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o paciente" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {pacientes.map((paciente) => (
                                  <SelectItem key={paciente.id} value={paciente.id}>
                                    {paciente.nome} - {paciente.cpf}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="medicoId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Médico *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o médico" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {medicos.map((medico) => (
                                  <SelectItem key={medico.id} value={medico.id}>
                                    {medico.usuario.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dataHora"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data e Hora *</FormLabel>
                            <FormControl>
                              <Input 
                                type="datetime-local" 
                                {...field} 
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="codigoTussId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Código TUSS *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o código TUSS" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {codigosTuss.map((codigo) => (
                                  <SelectItem key={codigo.id} value={codigo.id}>
                                    {codigo.codigoTuss} - {codigo.descricao}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tipoConsultaId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Consulta</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {tiposConsulta.map((tipo) => (
                                  <SelectItem key={tipo.id} value={tipo.id}>
                                    {tipo.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="procedimentoId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Procedimento</FormLabel>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value === "null" ? null : value);
                              }}
                              value={field.value === null ? "null" : field.value || ""}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o procedimento (opcional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="null">Nenhum</SelectItem>
                                {procedimentos.map((procedimento) => (
                                  <SelectItem key={procedimento.id} value={procedimento.id}>
                                    {procedimento.codigo} - {procedimento.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="operadoraId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Operadora</FormLabel>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value === "null" ? null : value);
                                form.setValue("planoSaudeId", null);
                              }}
                              value={field.value === null ? "null" : field.value || ""}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione a operadora (opcional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="null">Particular</SelectItem>
                                {operadoras.map((operadora) => (
                                  <SelectItem key={operadora.id} value={operadora.id}>
                                    {operadora.nomeFantasia || operadora.razaoSocial}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {operadoraId && operadoraId !== "null" && (
                        <FormField
                          control={form.control}
                          name="planoSaudeId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Plano de Saúde</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o plano" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {planosSaude.map((plano) => (
                                    <SelectItem key={plano.id} value={plano.id}>
                                      {plano.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <FormField
                        control={form.control}
                        name="numeroCarteirinha"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número da Carteirinha</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                value={field.value || ""}
                                placeholder="Número da carteirinha" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="valorCobrado"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor Cobrado</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="observacoes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              value={field.value || ""}
                              placeholder="Observações sobre o agendamento" 
                              rows={4}
                              maxLength={1000}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-4">
                      <Link href="/secretaria/agendamentos">
                        <Button type="button" variant="outline">
                          Cancelar
                        </Button>
                      </Link>
                      <Button 
                        type="submit" 
                        disabled={loading || (limiteRetornos?.limiteAtingido ?? false)}
                      >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Criar Agendamento
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
