"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const chamarPacienteSchema = z.object({
  dataHora: z.string().min(1, "Data e hora são obrigatórias"),
  codigoTussId: z.string().uuid("Código TUSS é obrigatório"),
  tipoConsultaId: z.string().uuid().optional(),
  procedimentoId: z.string().uuid().optional().nullable(),
  operadoraId: z.string().uuid().optional().nullable(),
  planoSaudeId: z.string().uuid().optional().nullable(),
  numeroCarteirinha: z.string().optional(),
  valorCobrado: z.number().min(0).optional().nullable(),
  observacoes: z.string().optional(),
});

type ChamarPacienteFormData = z.infer<typeof chamarPacienteSchema>;

interface ListaEspera {
  id: string;
  paciente: {
    id: string;
    nome: string;
    cpf: string;
  };
  medico: {
    id: string;
    usuario: {
      nome: string;
    };
  };
  observacoes: string | null;
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
}

interface ChamarPacienteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listaEspera: ListaEspera;
  onSuccess?: () => void;
}

export function ChamarPacienteModal({
  open,
  onOpenChange,
  listaEspera,
  onSuccess,
}: ChamarPacienteModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [codigosTuss, setCodigosTuss] = useState<CodigoTuss[]>([]);
  const [tiposConsulta, setTiposConsulta] = useState<TipoConsulta[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [planosSaude, setPlanosSaude] = useState<PlanoSaude[]>([]);

  const form = useForm<ChamarPacienteFormData>({
    resolver: zodResolver(chamarPacienteSchema),
    defaultValues: {
      dataHora: "",
      codigoTussId: "",
      tipoConsultaId: "",
      procedimentoId: null,
      operadoraId: null,
      planoSaudeId: null,
      numeroCarteirinha: "",
      valorCobrado: null,
      observacoes: listaEspera.observacoes || "",
    },
  });

  const operadoraId = form.watch("operadoraId");

  // Carregar dados quando o modal abrir
  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        try {
          setLoadingData(true);
          const [codigosTussRes, tiposConsultaRes, procedimentosRes, operadorasRes] = await Promise.all([
            fetch("/api/admin-clinica/codigos-tuss"),
            fetch("/api/admin-clinica/tipos-consulta"),
            fetch("/api/secretaria/procedimentos?limit=1000"),
            fetch("/api/admin-clinica/operadoras"),
          ]);

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
    } else {
      form.reset({
        dataHora: "",
        codigoTussId: "",
        tipoConsultaId: "",
        procedimentoId: null,
        operadoraId: null,
        planoSaudeId: null,
        numeroCarteirinha: "",
        valorCobrado: null,
        observacoes: listaEspera.observacoes || "",
      });
      setPlanosSaude([]);
    }
  }, [open, form, listaEspera]);

  // Carregar planos quando operadora mudar
  useEffect(() => {
    const fetchPlanos = async () => {
      if (!operadoraId || operadoraId === "null") {
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

  const onSubmit = async (data: ChamarPacienteFormData) => {
    try {
      setLoading(true);
      
      // Converter data e hora para formato ISO
      const dataHoraISO = new Date(data.dataHora).toISOString();

      const response = await fetch(`/api/secretaria/lista-espera/${listaEspera.id}/chamar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          dataHora: dataHoraISO,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao chamar paciente");
      }

      toast.success("Paciente chamado da lista de espera e agendamento criado com sucesso");
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao chamar paciente");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Obter data e hora atuais para o campo datetime-local
  const getNowDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chamar Paciente da Lista de Espera</DialogTitle>
          <DialogDescription>
            Criar agendamento para {listaEspera.paciente.nome} com {listaEspera.medico.usuario.nome}
          </DialogDescription>
        </DialogHeader>
        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dataHora"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data e Hora</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          min={getNowDateTime()}
                          className="h-9"
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
                      <FormLabel>Código TUSS</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9">
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tipoConsultaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Consulta</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="h-9">
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
                        onValueChange={(value) => field.onChange(value === "null" ? null : value)}
                        value={field.value || "null"}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Selecione o procedimento" />
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="operadoraId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Operadora</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "null" ? null : value)}
                        value={field.value || "null"}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Selecione a operadora" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="null">Nenhuma</SelectItem>
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

                <FormField
                  control={form.control}
                  name="planoSaudeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plano de Saúde</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "null" ? null : value)}
                        value={field.value || "null"}
                        disabled={!operadoraId || operadoraId === "null"}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Selecione o plano" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="null">Nenhum</SelectItem>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="numeroCarteirinha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número da Carteirinha</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-9" />
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
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                          value={field.value || ""}
                          className="h-9"
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
                      <Textarea {...field} placeholder="Observações sobre o agendamento..." rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar Agendamento
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

