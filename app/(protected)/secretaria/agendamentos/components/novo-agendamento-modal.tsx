"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { toast } from "sonner";
import { Loader2, AlertTriangle, Search, X, FileCheck, Monitor, Video } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { maskCPF, removeMask } from "@/lib/masks";
import { cn } from "@/lib/utils";

const agendamentoSchema = z.object({
  pacienteId: z.string().uuid("Paciente é obrigatório"),
  medicoId: z.string().uuid("Médico é obrigatório"),
  data: z.string().min(1, "Data é obrigatória"),
  hora: z.string().min(1, "Hora é obrigatória"),
  modalidade: z.enum(["PRESENCIAL", "TELEMEDICINA"]),
  codigoTussId: z.string().uuid("Código TUSS é obrigatório"),
  tipoConsultaId: z.string().uuid().optional(),
  procedimentoId: z.string().uuid().optional().nullable(),
  operadoraId: z.string().uuid().optional().nullable(),
  planoSaudeId: z.string().uuid().optional().nullable(),
  numeroCarteirinha: z.string().optional(),
  valorCobrado: z.number().min(0).optional().nullable(),
  anexos: z.array(z.instanceof(File)).optional(),
});

type AgendamentoFormData = z.infer<typeof agendamentoSchema>;

interface Paciente {
  id: string;
  nome: string;
  cpf: string;
  email?: string;
  telefone?: string;
  celular?: string;
  dataNascimento?: string;
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

interface NovoAgendamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialData?: {
    data?: string;
    hora?: string;
    medicoId?: string;
    pacienteId?: string;
  };
}

// Componente de busca de paciente
function PacienteSearchInput({
  value,
  onChange,
  onSelect,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (paciente: Paciente) => void;
  error?: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelectPaciente = useCallback((paciente: Paciente) => {
    if (!paciente.id) return;
    
    setSelectedPaciente(paciente);
    // Mostrar o nome do paciente no campo, mas ainda permitir editar
    setSearchTerm(paciente.nome);
    setShowResults(false);
    setPacientes([]);
    onChange(paciente.nome);
    onSelect(paciente);
  }, [onChange, onSelect]);

  // Buscar pacientes quando o termo de busca mudar
  useEffect(() => {
    const searchPacientes = async () => {
      const term = searchTerm.trim();
      
      // Se já tem um paciente selecionado e o termo não mudou, não buscar
      if (selectedPaciente && term === selectedPaciente.nome) {
        return;
      }

      // Buscar por CPF (3+ dígitos) ou por nome (3+ caracteres)
      const cpfLimpo = removeMask(term);
      // Se contém apenas números e tem 3+ caracteres, pode ser busca por CPF
      const isCPF = cpfLimpo.length >= 3 && /^\d+$/.test(cpfLimpo);
      // Se contém letras ou não é apenas números, é busca por nome
      const isNome = term.length >= 3 && !/^\d+$/.test(term);

      if (!isCPF && !isNome) {
        setPacientes([]);
        setShowResults(false);
        return;
      }

      try {
        setLoading(true);
        // Buscar pelo CPF limpo se for CPF, senão buscar pelo termo original
        const searchQuery = isCPF ? cpfLimpo : term;
        const response = await fetch(`/api/secretaria/pacientes?search=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setPacientes(data.pacientes || []);
          setShowResults(true);
          
          // Se buscar por CPF completo (11 dígitos) e encontrar exatamente um resultado, selecionar automaticamente
          if (isCPF && cpfLimpo.length === 11 && data.pacientes?.length === 1) {
            handleSelectPaciente(data.pacientes[0]);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar pacientes:", error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchPacientes, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedPaciente, handleSelectPaciente]);

  // Fechar resultados ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClear = () => {
    setSearchTerm("");
    setSelectedPaciente(null);
    setPacientes([]);
    setShowResults(false);
    onChange("");
    onSelect({ id: "", nome: "", cpf: "" } as Paciente);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Se o campo foi limpo, limpar seleção
    if (!value) {
      handleClear();
      return;
    }
    
    // Se há um paciente selecionado e o usuário começou a digitar, limpar seleção imediatamente
    if (selectedPaciente) {
      const nomeSelecionado = selectedPaciente.nome;
      if (value !== nomeSelecionado) {
        setSelectedPaciente(null);
        setPacientes([]);
        setShowResults(false);
        onSelect({ id: "", nome: "", cpf: "" } as Paciente);
      }
    }
    
    // Verificar se contém apenas números (sem letras ou caracteres especiais além da máscara)
    const cpfLimpo = removeMask(value);
    const contemApenasNumeros = /^\d+$/.test(cpfLimpo);
    
    // Se contém apenas números, aplicar máscara de CPF
    // Se contém letras ou outros caracteres, permitir digitação livre (busca por nome)
    const maskedValue = contemApenasNumeros && cpfLimpo.length > 0
      ? maskCPF(value) 
      : value;
    
    setSearchTerm(maskedValue);
    onChange(maskedValue);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Digite o CPF ou nome do paciente"
          value={searchTerm}
          onChange={handleInputChange}
          className={cn(
            "h-8 text-xs pl-8 pr-8",
            error && "border-destructive"
          )}
          maxLength={50}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {loading && (
          <Loader2 className="absolute right-8 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>
      
      {showResults && pacientes.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {pacientes.map((paciente) => (
            <button
              key={paciente.id}
              type="button"
              onClick={() => handleSelectPaciente(paciente)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border last:border-b-0"
            >
              <div className="font-medium">{paciente.nome}</div>
              <div className="text-muted-foreground text-[10px]">
                CPF: {maskCPF(paciente.cpf)}
                {paciente.email && ` • ${paciente.email}`}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function NovoAgendamentoModal({
  open,
  onOpenChange,
  onSuccess,
  initialData,
}: NovoAgendamentoModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [codigosTuss, setCodigosTuss] = useState<CodigoTuss[]>([]);
  const [tiposConsulta, setTiposConsulta] = useState<TipoConsulta[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [planosSaude, setPlanosSaude] = useState<PlanoSaude[]>([]);
  const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | null>(null);
  const [pacienteSearchValue, setPacienteSearchValue] = useState("");
  const [consultasRetorno, setConsultasRetorno] = useState<{
    temRetorno: boolean;
    consultas: Array<{ id: string; dataHora: string; medico: string }>;
  } | null>(null);
  const [limiteRetornos, setLimiteRetornos] = useState<{
    limiteMaximoRetornosPorDia: number | null;
    retornosNoDia: number;
    limiteAtingido: boolean;
    mensagem: string | null;
  } | null>(null);
  const [sugestaoDataRetorno, setSugestaoDataRetorno] = useState<{
    temRetorno30Dias: boolean;
    dataSugerida: string | null;
    ultimaConsulta: { id: string; dataHora: string; medico: string } | null;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [anexos, setAnexos] = useState<File[]>([]);

  const form = useForm<AgendamentoFormData>({
    resolver: zodResolver(agendamentoSchema),
    defaultValues: {
      pacienteId: initialData?.pacienteId || "",
      medicoId: initialData?.medicoId || "",
      data: initialData?.data || "",
      hora: initialData?.hora || "",
      modalidade: "PRESENCIAL" as const,
      codigoTussId: "",
      tipoConsultaId: "",
      procedimentoId: null,
      operadoraId: null,
      planoSaudeId: null,
      numeroCarteirinha: "",
      valorCobrado: null,
      anexos: [],
    },
  });

  const operadoraId = form.watch("operadoraId");
  const pacienteId = form.watch("pacienteId");
  const medicoId = form.watch("medicoId");
  const tipoConsultaId = form.watch("tipoConsultaId");
  const data = form.watch("data");
  const hora = form.watch("hora");

  // Carregar dados quando o modal abrir
  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        try {
          setLoadingData(true);
          const [medicosRes, codigosTussRes, tiposConsultaRes, procedimentosRes, operadorasRes] = await Promise.all([
            fetch("/api/admin-clinica/medicos"),
            fetch("/api/admin-clinica/codigos-tuss"),
            fetch("/api/admin-clinica/tipos-consulta"),
            fetch("/api/secretaria/procedimentos?limit=1000"),
            fetch("/api/admin-clinica/operadoras"),
          ]);

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

          // Carregar paciente se pacienteId foi fornecido
          if (initialData?.pacienteId) {
            try {
              const pacienteRes = await fetch(`/api/admin-clinica/pacientes/${initialData.pacienteId}`);
              if (pacienteRes.ok) {
                const pacienteData = await pacienteRes.json();
                const paciente = pacienteData.paciente;
                if (paciente) {
                  const pacienteFormatted: Paciente = {
                    id: paciente.id,
                    nome: paciente.nome,
                    cpf: paciente.cpf,
                    email: paciente.email || undefined,
                    telefone: paciente.telefone || undefined,
                    celular: paciente.celular || undefined,
                    dataNascimento: paciente.dataNascimento ? new Date(paciente.dataNascimento).toISOString().split('T')[0] : undefined,
                  };
                  setPacienteSelecionado(pacienteFormatted);
                  setPacienteSearchValue(paciente.nome);
                  form.setValue("pacienteId", paciente.id);
                }
              }
            } catch (error) {
              console.error("Erro ao carregar paciente:", error);
            }
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
      // Resetar formulário quando fechar
      form.reset();
      setPlanosSaude([]);
      setConsultasRetorno(null);
      setLimiteRetornos(null);
      setSugestaoDataRetorno(null);
      setPacienteSelecionado(null);
      setPacienteSearchValue("");
      setAnexos([]);
    }
  }, [open, form, initialData]);

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

  // Verificar consultas de retorno
  useEffect(() => {
    const verificarRetorno = async () => {
      const tipoRetorno = tiposConsulta.find((tipo) => tipo.codigo === "RETORNO");
      const isTipoRetorno = tipoRetorno && tipoConsultaId === tipoRetorno.id;

      if (!pacienteId || !medicoId || !data || !hora || !isTipoRetorno) {
        setConsultasRetorno(null);
        return;
      }

      try {
        const dataHora = `${data}T${hora}`;
        const response = await fetch(`/api/secretaria/pacientes/${pacienteId}/consultas-retorno`);
        if (response.ok) {
          const data = await response.json();
          setConsultasRetorno(data);
        } else {
          setConsultasRetorno(null);
        }
      } catch (error) {
        console.error("Erro ao verificar consultas de retorno:", error);
        setConsultasRetorno(null);
      }
    };

    verificarRetorno();
  }, [pacienteId, medicoId, data, hora, tipoConsultaId, tiposConsulta]);

  // Verificar limite de retornos
  useEffect(() => {
    const verificarLimiteRetornos = async () => {
      const tipoRetorno = tiposConsulta.find((tipo) => tipo.codigo === "RETORNO");
      const isTipoRetorno = tipoRetorno && tipoConsultaId === tipoRetorno.id;

      if (!medicoId || !isTipoRetorno || !data) {
        setLimiteRetornos(null);
        return;
      }

      try {
        const response = await fetch(`/api/secretaria/medicos/${medicoId}/limite-retornos?data=${data}`);
        if (response.ok) {
          const responseData = await response.json();
          setLimiteRetornos(responseData);
        } else {
          setLimiteRetornos(null);
        }
      } catch (error) {
        console.error("Erro ao verificar limite de retornos:", error);
        setLimiteRetornos(null);
      }
    };

    verificarLimiteRetornos();
  }, [medicoId, tipoConsultaId, data, tiposConsulta]);

  // Verificar sugestão de data de retorno (30 dias após última consulta)
  useEffect(() => {
    const verificarSugestaoDataRetorno = async () => {
      const tipoRetorno = tiposConsulta.find((tipo) => tipo.codigo === "RETORNO");
      const isTipoRetorno = tipoRetorno && tipoConsultaId === tipoRetorno.id;

      if (!pacienteId || !medicoId || !isTipoRetorno) {
        setSugestaoDataRetorno(null);
        return;
      }

      try {
        const response = await fetch(
          `/api/secretaria/pacientes/${pacienteId}/sugestao-data-retorno?medicoId=${medicoId}`
        );
        if (response.ok) {
          const data = await response.json();
          setSugestaoDataRetorno(data);
        } else {
          setSugestaoDataRetorno(null);
        }
      } catch (error) {
        console.error("Erro ao verificar sugestão de data de retorno:", error);
        setSugestaoDataRetorno(null);
      }
    };

    verificarSugestaoDataRetorno();
  }, [pacienteId, medicoId, tipoConsultaId, tiposConsulta]);

  const handleAplicarDataSugerida = () => {
    if (sugestaoDataRetorno?.dataSugerida) {
      form.setValue("data", sugestaoDataRetorno.dataSugerida);
      setSugestaoDataRetorno(null); // Ocultar alerta após aplicar
    }
  };

  const handlePacienteSelect = (paciente: Paciente) => {
    if (paciente.id) {
      setPacienteSelecionado(paciente);
      form.setValue("pacienteId", paciente.id);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAnexos((prev) => [...prev, ...files]);
    form.setValue("anexos", [...anexos, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    const newAnexos = anexos.filter((_, i) => i !== index);
    setAnexos(newAnexos);
    form.setValue("anexos", newAnexos);
  };

  const onSubmit = async (data: AgendamentoFormData) => {
    try {
      setLoading(true);

      const dataHora = `${data.data}T${data.hora}`;

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
          anexos: undefined, // Por enquanto não enviar anexos, será implementado depois
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        // Mostrar mensagem detalhada se disponível, senão mostrar erro genérico
        const errorMessage = error.detalhes?.mensagem || error.error || "Erro ao criar agendamento";
        throw new Error(errorMessage);
      }

      toast.success("Agendamento criado com sucesso");
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar agendamento");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-6xl sm:!max-w-6xl max-h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-base font-semibold">Novo Agendamento</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Preencha os dados para criar um novo agendamento
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 min-h-0">
          <div className="py-4 pr-2">
            {loadingData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-2">
                  {/* Alertas */}
                  {limiteRetornos && limiteRetornos.limiteMaximoRetornosPorDia !== null && limiteRetornos.mensagem && (
                    <Alert 
                      variant={limiteRetornos.limiteAtingido ? "destructive" : "default"} 
                      className={`text-xs py-2 ${limiteRetornos.limiteAtingido 
                        ? "border-red-500 bg-red-50 dark:bg-red-950" 
                        : "border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
                      }`}
                    >
                      <AlertTriangle className={`h-3.5 w-3.5 ${limiteRetornos.limiteAtingido ? "text-red-600 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400"}`} />
                      <AlertTitle className={`text-xs ${limiteRetornos.limiteAtingido ? "text-red-800 dark:text-red-200" : "text-yellow-800 dark:text-yellow-200"}`}>
                        {limiteRetornos.limiteAtingido ? "Limite de Retornos Atingido!" : "Atenção: Limite de Retornos"}
                      </AlertTitle>
                      <AlertDescription className={`text-xs ${limiteRetornos.limiteAtingido ? "text-red-700 dark:text-red-300" : "text-yellow-700 dark:text-yellow-300"}`}>
                        {limiteRetornos.mensagem}
                      </AlertDescription>
                    </Alert>
                  )}

                  {consultasRetorno?.temRetorno && (
                    <Alert variant="default" className="text-xs py-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
                      <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
                      <AlertTitle className="text-xs text-yellow-800 dark:text-yellow-200">
                        Atenção: Consulta de Retorno Recente
                      </AlertTitle>
                      <AlertDescription className="text-xs text-yellow-700 dark:text-yellow-300">
                        Este paciente já possui {consultasRetorno.consultas.length} consulta(s) do tipo Retorno agendada(s)
                      </AlertDescription>
                    </Alert>
                  )}

                  {sugestaoDataRetorno?.temRetorno30Dias && sugestaoDataRetorno.dataSugerida && (
                    <Alert variant="default" className="text-xs py-3 border-orange-500 bg-orange-50 dark:bg-orange-950">
                      <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      <AlertTitle className="text-xs font-semibold text-orange-800 dark:text-orange-200">
                        ⚠️ Atenção: Regra de Retorno (30 dias)
                      </AlertTitle>
                      <AlertDescription className="text-xs text-orange-700 dark:text-orange-300 mt-2">
                        <div className="space-y-2">
                          <p>
                            Este paciente teve uma consulta de retorno nos últimos 30 dias com este médico.
                            <br />
                            <strong>Última consulta:</strong> {new Date(sugestaoDataRetorno.ultimaConsulta?.dataHora || '').toLocaleDateString('pt-BR')}
                            <br />
                            <strong>Data mínima recomendada:</strong> {new Date(sugestaoDataRetorno.dataSugerida).toLocaleDateString('pt-BR')} (30 dias após a última consulta)
                          </p>
                          <p className="font-semibold text-orange-800 dark:text-orange-200">
                            ⚠️ O sistema solicitará autorização para o médico
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleAplicarDataSugerida}
                            className="h-7 text-xs px-3 mt-1 bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            Aplicar Data Sugerida
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Row 1: Médico e Código TUSS */}
                  <div className="flex flex-wrap items-start gap-2.5">
                    <FormField
                      control={form.control}
                      name="medicoId"
                      render={({ field }) => (
                        <FormItem className="flex-1 min-w-[200px]">
                          <FormLabel className="text-xs font-medium">Médico *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs w-full">
                                <SelectValue placeholder="Selecione o médico" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {medicos.map((medico) => (
                                <SelectItem key={medico.id} value={medico.id} className="text-xs">
                                  {medico.usuario.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="codigoTussId"
                      render={({ field }) => (
                        <FormItem className="flex-1 min-w-[200px]">
                          <FormLabel className="text-xs font-medium">Código TUSS *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs w-full">
                                <SelectValue placeholder="Selecione o código TUSS" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {codigosTuss.map((codigo) => (
                                <SelectItem key={codigo.id} value={codigo.id} className="text-xs">
                                  {codigo.codigoTuss} - {codigo.descricao}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Row 2: Paciente (CPF ou Nome), Data, Hora */}
                  <div className="flex flex-wrap items-start gap-2.5">
                    <FormField
                      control={form.control}
                      name="pacienteId"
                      render={({ field }) => (
                        <FormItem className="min-w-[400px] flex-1">
                          <FormLabel className="text-xs font-medium">Paciente (CPF ou Nome) *</FormLabel>
                          <FormControl>
                            <PacienteSearchInput
                              value={pacienteSearchValue}
                              onChange={(value) => {
                                setPacienteSearchValue(value);
                                if (!value) {
                                  field.onChange("");
                                  setPacienteSelecionado(null);
                                }
                              }}
                              onSelect={handlePacienteSelect}
                              error={form.formState.errors.pacienteId?.message}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="data"
                      render={({ field }) => (
                        <FormItem className="min-w-[150px]">
                          <FormLabel className="text-xs font-medium">Data *</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              value={field.value || ""}
                              className="h-8 text-xs"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hora"
                      render={({ field }) => (
                        <FormItem className="min-w-[120px]">
                          <FormLabel className="text-xs font-medium">Hora *</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              {...field} 
                              value={field.value || ""}
                              className="h-8 text-xs"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Modalidade: Presencial / Telemedicina */}
                  <FormField
                    control={form.control}
                    name="modalidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">Modalidade</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => field.onChange("PRESENCIAL")}
                              className={`flex-1 flex items-center justify-center gap-2 h-8 rounded-md border text-xs font-medium transition-all ${
                                field.value === "PRESENCIAL"
                                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                  : "border-input bg-background text-muted-foreground hover:bg-accent"
                              }`}
                            >
                              <Monitor className="w-3.5 h-3.5" />
                              Presencial
                            </button>
                            <button
                              type="button"
                              onClick={() => field.onChange("TELEMEDICINA")}
                              className={`flex-1 flex items-center justify-center gap-2 h-8 rounded-md border text-xs font-medium transition-all ${
                                field.value === "TELEMEDICINA"
                                  ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                                  : "border-input bg-background text-muted-foreground hover:bg-accent"
                              }`}
                            >
                              <Video className="w-3.5 h-3.5" />
                              Telemedicina
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Row 3: Tipo Consulta, Procedimento, Convênio e Carteirinha */}
                  <div className="flex flex-wrap items-start gap-2.5">
                    <FormField
                      control={form.control}
                      name="tipoConsultaId"
                      render={({ field }) => (
                        <FormItem className="flex-1 min-w-[200px]">
                          <FormLabel className="text-xs font-medium">Tipo de Consulta</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs w-full">
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tiposConsulta.map((tipo) => (
                                <SelectItem key={tipo.id} value={tipo.id} className="text-xs">
                                  {tipo.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="procedimentoId"
                      render={({ field }) => (
                        <FormItem className="flex-1 min-w-[200px]">
                          <FormLabel className="text-xs font-medium">Procedimento</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value === "null" ? null : value);
                            }}
                            value={field.value === null ? "null" : field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs w-full">
                                <SelectValue placeholder="Selecione o procedimento" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="null" className="text-xs">Nenhum</SelectItem>
                              {procedimentos.map((procedimento) => (
                                <SelectItem key={procedimento.id} value={procedimento.id} className="text-xs">
                                  {procedimento.codigo} - {procedimento.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="operadoraId"
                      render={({ field }) => (
                        <FormItem className="flex-1 min-w-[200px]">
                          <FormLabel className="text-xs font-medium">Convênio</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value === "null" ? null : value);
                              form.setValue("planoSaudeId", null);
                            }}
                            value={field.value === null ? "null" : field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs w-full">
                                <SelectValue placeholder="Selecione o convênio" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="null" className="text-xs">Particular</SelectItem>
                              {operadoras.map((operadora) => (
                                <SelectItem key={operadora.id} value={operadora.id} className="text-xs">
                                  {operadora.nomeFantasia || operadora.razaoSocial}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="numeroCarteirinha"
                      render={({ field }) => (
                        <FormItem className="flex-1 min-w-[200px]">
                          <FormLabel className="text-xs font-medium">Número da Carteirinha</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value || ""}
                              placeholder="Número da carteirinha"
                              className="h-8 text-xs w-full"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Plano de Saúde (aparece apenas quando há convênio) */}
                  {operadoraId && operadoraId !== "null" && (
                    <div className="flex flex-wrap items-start gap-2.5">
                      <FormField
                        control={form.control}
                        name="planoSaudeId"
                        render={({ field }) => (
                          <FormItem className="min-w-[200px]">
                            <FormLabel className="text-xs font-medium">Plano de Saúde</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Selecione o plano" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {planosSaude.map((plano) => (
                                  <SelectItem key={plano.id} value={plano.id} className="text-xs">
                                    {plano.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Row 5: Anexo de Documentos */}
                  <div className="w-full">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex flex-col items-center justify-center py-3 text-center border border-dashed border-slate-200 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <FileCheck className="w-8 h-8 text-slate-300 mb-1.5" />
                      <p className="text-xs text-slate-500 font-medium">Nenhum documento anexado</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Clique aqui para adicionar documentos</p>
                    </button>
                  </div>

                  {/* Row 6: Valor */}
                  <div className="flex flex-wrap items-start gap-2.5 justify-end">
                    <FormField
                      control={form.control}
                      name="valorCobrado"
                      render={({ field }) => (
                        <FormItem className="min-w-[200px]">
                          <FormLabel className="text-xs font-medium">Valor Cobrado</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              value={field.value || ""}
                              className="h-10 text-base font-semibold text-right"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                </form>
              </Form>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t gap-2 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            onClick={form.handleSubmit(onSubmit)}
            disabled={loading || (limiteRetornos?.limiteAtingido ?? false)}
            className="text-xs h-8"
          >
            {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Criar Agendamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
