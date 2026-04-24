"use client";

import { formatDateToInput } from "@/lib/utils";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, AlertTriangle, Search, X, FileCheck, UserPlus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { maskCPF, maskCelular, removeMask, maskMoeda, parseMoeda } from "@/lib/masks";
import { cn } from "@/lib/utils";
import { CodigoTussSearchInput } from "./codigo-tuss-search-input";
import { OperadoraSearchInput } from "./operadora-search-input";
import { ProcedimentoSearchInput } from "./procedimento-search-input";

const agendamentoSchema = z.object({
  pacienteId: z.string().uuid("Paciente é obrigatório"),
  medicoId: z.string().uuid("Médico é obrigatório"),
  data: z.string().min(1, "Data é obrigatória"),
  hora: z.string().min(1, "Hora início é obrigatória"),
  horaFim: z.string().min(1, "Hora fim é obrigatória"),
  codigoTussId: z.string().uuid().optional().nullable(),
  tipoConsultaId: z.string().uuid().optional(),
  procedimentoId: z.string().uuid().optional().nullable(),
  formaPagamentoId: z.string().uuid().optional().nullable(),
  operadoraId: z.string().uuid().optional().nullable(),
  numeroCarteirinha: z.string().optional(),
  valorCobrado: z.number().nullable().optional(),
  desconto: z.number().nullable().optional(),
  valorFinal: z.number().nullable().optional(),
  observacoes: z.string().optional(),
  alergias: z.string().optional(),
  medicamentosEmUso: z.string().optional(),
  anexos: z.array(z.instanceof(File)).optional(),
  encaixe: z.boolean(),
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
  alergias?: string | null;
  medicamentosEmUso?: string | null;
}

interface Medico {
  id: string;
  usuario: {
    nome: string;
  };
}

interface TipoConsulta {
  id: string;
  nome: string;
  codigo: string;
}

interface Procedimento {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  valor: number;
}

interface FormaPagamento {
  id: string;
  nome: string;
  tipo: string;
}

interface NovoAgendamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialData?: {
    data?: string;
    hora?: string;
    horaFim?: string;
    medicoId?: string;
    pacienteId?: string;
  };
}

// Componente de criação rápida de paciente
function NovoPacienteQuickDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (paciente: Paciente) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [sexo, setSexo] = useState("");
  const [celular, setCelular] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleClose = () => {
    setNome("");
    setCpf("");
    setDataNascimento("");
    setSexo("");
    setCelular("");
    setErrors({});
    onOpenChange(false);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!nome.trim() || nome.trim().length < 3) newErrors.nome = "Nome deve ter pelo menos 3 caracteres";
    const cpfLimpo = removeMask(cpf);
    if (!cpfLimpo || cpfLimpo.length !== 11) newErrors.cpf = "CPF deve ter 11 dígitos";
    if (!dataNascimento) newErrors.dataNascimento = "Data de nascimento é obrigatória";
    if (!sexo) newErrors.sexo = "Sexo é obrigatório";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setLoading(true);
      const response = await fetch("/api/admin-clinica/pacientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          cpf: removeMask(cpf),
          dataNascimento,
          sexo,
          celular: celular ? removeMask(celular) : null,
        }),
      });

      if (response.ok) {
        const paciente = await response.json();
        toast.success(`Paciente ${paciente.nome} cadastrado com sucesso`);
        onSuccess({
          id: paciente.id,
          nome: paciente.nome,
          cpf: paciente.cpf,
          email: paciente.email,
          celular: paciente.celular,
          dataNascimento: paciente.dataNascimento,
        });
        handleClose();
      } else {
        const data = await response.json();
        if (response.status === 409) {
          setErrors({ cpf: data.error || "CPF já cadastrado" });
        } else if (data.details) {
          const fieldErrors: Record<string, string> = {};
          data.details.forEach((d: { field: string; message: string }) => {
            fieldErrors[d.field] = d.message;
          });
          setErrors(fieldErrors);
        } else {
          toast.error(data.error || "Erro ao cadastrar paciente");
        }
      }
    } catch {
      toast.error("Erro ao cadastrar paciente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            Cadastro Rápido de Paciente
          </DialogTitle>
          <DialogDescription className="text-xs">
            Preencha os dados essenciais. Você pode completar o cadastro depois em Pacientes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 py-1">
          <div className="space-y-1">
            <label className="text-xs font-medium">Nome completo *</label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do paciente"
              className="h-8 text-xs"
              maxLength={100}
            />
            {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">CPF *</label>
              <Input
                value={cpf}
                onChange={(e) => {
                  const v = removeMask(e.target.value);
                  if (/^\d*$/.test(v)) setCpf(maskCPF(v));
                }}
                placeholder="000.000.000-00"
                className="h-8 text-xs"
                maxLength={14}
              />
              {errors.cpf && <p className="text-xs text-destructive">{errors.cpf}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Celular</label>
              <Input
                value={celular}
                onChange={(e) => {
                  const v = removeMask(e.target.value);
                  if (/^\d*$/.test(v)) setCelular(maskCelular(v));
                }}
                placeholder="(00) 00000-0000"
                className="h-8 text-xs"
                maxLength={16}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Data de nascimento *</label>
              <Input
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="h-8 text-xs"
              />
              {errors.dataNascimento && <p className="text-xs text-destructive">{errors.dataNascimento}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Sexo *</label>
              <Select value={sexo} onValueChange={setSexo}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-60">
                  <SelectItem value="M" className="text-xs">Masculino</SelectItem>
                  <SelectItem value="F" className="text-xs">Feminino</SelectItem>
                  <SelectItem value="OUTRO" className="text-xs">Outro</SelectItem>
                </SelectContent>
              </Select>
              {errors.sexo && <p className="text-xs text-destructive">{errors.sexo}</p>}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={handleClose} className="text-xs h-8">
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={loading} className="text-xs h-8">
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Cadastrar Paciente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Componente de busca de paciente
function PacienteSearchInput({
  value,
  onChange,
  onSelect,
  error,
  selectedPaciente: externalSelectedPaciente,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (paciente: Paciente) => void;
  error?: string;
  selectedPaciente?: Paciente | null;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSelectPaciente = useCallback((paciente: Paciente) => {
    if (!paciente.id) return;

    setSelectedPaciente(paciente);
    setSearchTerm("");
    setShowResults(false);
    setPacientes([]);
    onChange(paciente.nome);
    onSelect(paciente);
  }, [onChange, onSelect]);

  // Sincronizar com paciente selecionado externamente
  useEffect(() => {
    if (externalSelectedPaciente) {
      setSelectedPaciente(externalSelectedPaciente);
      setSearchTerm("");
    }
  }, [externalSelectedPaciente]);

  // Limpar quando value é resetado externamente (ex: modal reaberto)
  useEffect(() => {
    if (!value && !externalSelectedPaciente) {
      setSearchTerm("");
      setSelectedPaciente(null);
    }
  }, [value, externalSelectedPaciente]);

  // Buscar pacientes quando o termo de busca mudar
  useEffect(() => {
    // Não buscar se tem paciente selecionado
    if (selectedPaciente) return;

    const term = searchTerm.trim();

    const cpfLimpo = removeMask(term);
    const isCPF = cpfLimpo.length >= 3 && /^\d+$/.test(cpfLimpo);
    const isNome = term.length >= 3 && !/^\d+$/.test(term);

    if (!isCPF && !isNome) {
      setPacientes([]);
      setShowResults(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        setLoading(true);
        const searchQuery = isCPF ? cpfLimpo : term;
        const response = await fetch(
          `/api/secretaria/pacientes?search=${encodeURIComponent(searchQuery)}`,
          { signal: controller.signal }
        );
        if (response.ok) {
          const data = await response.json();
          setPacientes(data.pacientes || []);
          setShowResults(true);

          if (isCPF && cpfLimpo.length === 11 && data.pacientes?.length === 1) {
            handleSelectPaciente(data.pacientes[0]);
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Erro ao buscar pacientes:", err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
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
    setLoading(false);
    onChange("");
    onSelect({ id: "", nome: "", cpf: "" } as Paciente);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    if (!val) {
      handleClear();
      return;
    }

    const cpfLimpo = removeMask(val);
    const contemApenasNumeros = /^\d+$/.test(cpfLimpo);

    const maskedValue = contemApenasNumeros && cpfLimpo.length > 0
      ? maskCPF(val)
      : val;

    setSearchTerm(maskedValue);
    onChange(maskedValue);
  };

  // Modo selecionado: mostra o paciente como um "chip"
  if (selectedPaciente) {
    return (
      <div ref={containerRef} className="relative">
        <div
          className={cn(
            "flex items-center gap-2 h-8 px-2 border rounded-md bg-background text-xs",
            error ? "border-destructive" : "border-input"
          )}
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary shrink-0">
              <span className="text-[10px] font-semibold">
                {selectedPaciente.nome.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="font-medium truncate">{selectedPaciente.nome}</span>
            <span className="text-muted-foreground shrink-0">
              · CPF: {maskCPF(selectedPaciente.cpf)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground shrink-0 p-0.5 rounded hover:bg-accent transition-colors"
            title="Alterar paciente"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Modo busca: input com dropdown
  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Buscar por nome ou CPF..."
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => {
            if (pacientes.length > 0) setShowResults(true);
          }}
          className={cn(
            "h-8 text-xs pl-8 pr-8",
            error && "border-destructive"
          )}
          maxLength={50}
        />
        {loading && (
          <Loader2 className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
        {!loading && searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
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
                {paciente.email && ` · ${paciente.email}`}
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults && pacientes.length === 0 && !loading && searchTerm.trim().length >= 3 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg">
          <div className="px-3 py-3 text-xs text-muted-foreground text-center">
            Nenhum paciente encontrado
          </div>
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
  const [tiposConsulta, setTiposConsulta] = useState<TipoConsulta[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
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
  const [novoPacienteOpen, setNovoPacienteOpen] = useState(false);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [isEncaixe, setIsEncaixe] = useState(false);

  const form = useForm<AgendamentoFormData>({
    resolver: zodResolver(agendamentoSchema),
    defaultValues: {
      pacienteId: initialData?.pacienteId || "",
      medicoId: initialData?.medicoId || "",
      data: initialData?.data || "",
      hora: initialData?.hora || "",
      horaFim: initialData?.horaFim || "",
      codigoTussId: null,
      tipoConsultaId: "",
      procedimentoId: null,
      formaPagamentoId: null,
      operadoraId: null,
      numeroCarteirinha: "",
      valorCobrado: null,
      observacoes: "",
      alergias: "",
      medicamentosEmUso: "",
      anexos: [],
      encaixe: false,
    },
  });

  const operadoraId = form.watch("operadoraId");
  const pacienteId = form.watch("pacienteId");
  const medicoId = form.watch("medicoId");
  const tipoConsultaId = form.watch("tipoConsultaId");
  const data = form.watch("data");
  const hora = form.watch("hora");
  const horaFim = form.watch("horaFim");

  // Carregar dados quando o modal abrir
  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        try {
          setLoadingData(true);
          const [medicosRes, tiposConsultaRes, procedimentosRes, formasPagamentoRes] = await Promise.all([
            // Somente médicos ativos devem aparecer para seleção no agendamento
            fetch("/api/admin-clinica/medicos?ativo=true"),
            fetch("/api/admin-clinica/tipos-consulta"),
            fetch("/api/secretaria/procedimentos?limit=1000"),
            fetch("/api/admin-clinica/formas-pagamento?limit=100"),
          ]);

          if (medicosRes.ok) {
            const data = await medicosRes.json();
            setMedicos(data.medicos || []);
          }

          if (tiposConsultaRes.ok) {
            const data = await tiposConsultaRes.json();
            setTiposConsulta(data.tiposConsulta || []);
          }

          if (procedimentosRes.ok) {
            const data = await procedimentosRes.json();
            setProcedimentos(data.procedimentos || []);
          }

          if (formasPagamentoRes.ok) {
            const data = await formasPagamentoRes.json();
            setFormasPagamento(data.formasPagamento || []);
          }

          // Definir data se fornecida no initialData
          if (initialData?.data) {
            form.setValue("data", initialData.data);
          }

          // Definir hora se fornecida no initialData
          if (initialData?.hora) {
            form.setValue("hora", initialData.hora);
          }
          if (initialData?.horaFim) {
            form.setValue("horaFim", initialData.horaFim);
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
                    dataNascimento: paciente.dataNascimento ? formatDateToInput(paciente.dataNascimento) : undefined,
                    alergias: paciente.alergias ?? null,
                    medicamentosEmUso: paciente.medicamentosEmUso ?? null,
                  };
                  setPacienteSelecionado(pacienteFormatted);
                  setPacienteSearchValue(paciente.nome);
                  form.setValue("pacienteId", paciente.id);
                  form.setValue("alergias", paciente.alergias ?? "");
                  form.setValue("medicamentosEmUso", paciente.medicamentosEmUso ?? "");
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
      setConsultasRetorno(null);
      setLimiteRetornos(null);
      setSugestaoDataRetorno(null);
      setPacienteSelecionado(null);
      setPacienteSearchValue("");
      setAnexos([]);
      setIsEncaixe(false);
    }
  }, [open, form, initialData]);

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

  useEffect(() => {
    const carregarHorarios = async () => {
      if (!medicoId || !data) {
        setHorariosDisponiveis([]);
        return;
      }

      try {
        setLoadingHorarios(true);
        const response = await fetch(
          `/api/secretaria/horarios-disponiveis?medicoId=${medicoId}&data=${data}&intervaloMin=10`
        );
        if (!response.ok) throw new Error();
        const responseData = await response.json();
        const horarios = responseData.horarios || [];
        setHorariosDisponiveis(horarios);

        const horaAtual = form.getValues("hora");
        if (!isEncaixe && horaAtual && !horarios.includes(horaAtual)) {
          form.setValue("hora", "");
          form.setValue("horaFim", "");
        }
      } catch (error) {
        console.error("Erro ao carregar horários disponíveis:", error);
        setHorariosDisponiveis([]);
      } finally {
        setLoadingHorarios(false);
      }
    };

    carregarHorarios();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicoId, data]);

  useEffect(() => {
    if (!hora) {
      form.setValue("horaFim", "");
      return;
    }
    if (horaFim && horaFim <= hora) {
      form.setValue("horaFim", "");
    }
  }, [hora, horaFim, form]);

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
      form.setValue("alergias", paciente.alergias ?? "");
      form.setValue("medicamentosEmUso", paciente.medicamentosEmUso ?? "");
    }
  };

  const handleNovoPacienteCriado = (paciente: Paciente) => {
    setPacienteSearchValue(paciente.nome);
    handlePacienteSelect(paciente);
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

      const dataHora = new Date(`${data.data}T${data.hora}:00`).toISOString();
      const dataHoraFim = new Date(`${data.data}T${data.horaFim}:00`).toISOString();

      let response: Response;

      if (anexos.length > 0) {
        const formData = new FormData();
        formData.append("pacienteId", data.pacienteId);
        formData.append("medicoId", data.medicoId);
        formData.append("dataHora", dataHora);
        formData.append("dataHoraFim", dataHoraFim);
        if (data.codigoTussId) formData.append("codigoTussId", data.codigoTussId);
        if (data.tipoConsultaId) formData.append("tipoConsultaId", data.tipoConsultaId);
        if (data.procedimentoId) formData.append("procedimentoId", data.procedimentoId);
        if (data.formaPagamentoId) formData.append("formaPagamentoId", data.formaPagamentoId);
        if (data.operadoraId) formData.append("operadoraId", data.operadoraId);
        if (data.numeroCarteirinha) formData.append("numeroCarteirinha", data.numeroCarteirinha);
        if (data.valorCobrado != null) formData.append("valorCobrado", String(data.valorCobrado));
        if (data.desconto != null) formData.append("desconto", String(data.desconto));
        if (data.valorFinal != null) formData.append("valorFinal", String(data.valorFinal));
        if (data.observacoes) formData.append("observacoes", data.observacoes);
        formData.append("encaixe", String(data.encaixe ?? false));
        anexos.forEach((file) => formData.append("anexos", file));

        response = await fetch("/api/secretaria/agendamentos", {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch("/api/secretaria/agendamentos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...data,
            dataHora,
            dataHoraFim,
            codigoTussId: data.codigoTussId || null,
            procedimentoId: data.procedimentoId || null,
            operadoraId: data.operadoraId || null,
            valorCobrado: data.valorCobrado || null,
            desconto: data.desconto || null,
            valorFinal: data.valorFinal || null,
            encaixe: data.encaixe ?? false,
          }),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        // Mostrar mensagem detalhada se disponível, senão mostrar erro genérico
        const errorMessage = error.detalhes?.mensagem || error.error || "Erro ao criar agendamento";
        throw new Error(errorMessage);
      }

      // Atualiza dados de saúde do paciente (alergias / medicamentos em uso)
      // somente se houve alteração em relação ao snapshot carregado ao selecionar.
      try {
        const alergiasAtuais = (pacienteSelecionado?.alergias ?? "") || "";
        const medicamentosAtuais = (pacienteSelecionado?.medicamentosEmUso ?? "") || "";
        const alergiasNovas = (data.alergias ?? "").trim();
        const medicamentosNovos = (data.medicamentosEmUso ?? "").trim();

        if (
          alergiasNovas !== alergiasAtuais.trim() ||
          medicamentosNovos !== medicamentosAtuais.trim()
        ) {
          await fetch(`/api/admin-clinica/pacientes/${data.pacienteId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              alergias: alergiasNovas || null,
              medicamentosEmUso: medicamentosNovos || null,
            }),
          });
        }
      } catch {
        // Não bloqueia o sucesso do agendamento
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
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-6xl sm:!max-w-6xl max-h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            Novo Agendamento
            {isEncaixe && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold border border-blue-300">
                Encaixe
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEncaixe
              ? "Modo encaixe: o horário é livre e não valida conflitos de agenda."
              : "Preencha os dados para criar um novo agendamento"}
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

                  {/* Row 1: Médico */}
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
                            <SelectContent position="popper" className="max-h-60">
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
                  </div>

                  {/* Row 2: Paciente (CPF ou Nome), Data, Hora */}
                  <div className="flex flex-wrap items-start gap-2.5">
                    <FormField
                      control={form.control}
                      name="pacienteId"
                      render={({ field }) => (
                        <FormItem className="min-w-[400px] flex-1">
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-xs font-medium">Paciente (CPF ou Nome) *</FormLabel>
                            <button
                              type="button"
                              onClick={() => setNovoPacienteOpen(true)}
                              className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-medium transition-colors"
                            >
                              <UserPlus className="h-3 w-3" />
                              Novo paciente
                            </button>
                          </div>
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
                              selectedPaciente={pacienteSelecionado}
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
                          <FormLabel className="text-xs font-medium">Hora Início *</FormLabel>
                          {isEncaixe ? (
                            <FormControl>
                              <Input
                                type="time"
                                {...field}
                                value={field.value || ""}
                                className="h-8 text-xs"
                                disabled={!medicoId || !data}
                              />
                            </FormControl>
                          ) : (
                            <Select onValueChange={field.onChange} value={field.value || ""} disabled={!medicoId || !data || loadingHorarios}>
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder={loadingHorarios ? "Carregando..." : "Selecione"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent position="popper" className="max-h-60">
                                {horariosDisponiveis.map((horario) => (
                                  <SelectItem key={horario} value={horario} className="text-xs">
                                    {horario}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="horaFim"
                      render={({ field }) => (
                        <FormItem className="min-w-[120px]">
                          <FormLabel className="text-xs font-medium">Hora Fim *</FormLabel>
                          {isEncaixe ? (
                            <FormControl>
                              <Input
                                type="time"
                                {...field}
                                value={field.value || ""}
                                className="h-8 text-xs"
                                disabled={!hora}
                              />
                            </FormControl>
                          ) : (
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || ""}
                              disabled={!hora || loadingHorarios}
                            >
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent position="popper" className="max-h-60">
                                {horariosDisponiveis
                                  .filter((horario) => horario > (hora || ""))
                                  .map((horario) => (
                                    <SelectItem key={horario} value={horario} className="text-xs">
                                      {horario}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          )}
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    {/* Checkbox Encaixe */}
                    <FormItem className="flex flex-col justify-end min-w-[110px]">
                      <FormLabel className="text-xs font-medium text-transparent select-none">.</FormLabel>
                      <label
                        className={cn(
                          "h-8 px-3 flex items-center gap-2 rounded-md border text-xs font-medium cursor-pointer transition-colors select-none",
                          isEncaixe
                            ? "bg-blue-50 border-blue-400 text-blue-700"
                            : "bg-background border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isEncaixe}
                          onChange={(e) => {
                            const next = e.target.checked;
                            setIsEncaixe(next);
                            form.setValue("encaixe", next);
                            form.setValue("hora", "");
                            form.setValue("horaFim", "");
                          }}
                          className="accent-blue-600 h-3.5 w-3.5"
                        />
                        Encaixe
                      </label>
                    </FormItem>
                  </div>

                  {/* Row 3: Tipo Consulta, Procedimento, Convênio e Carteirinha */}
                  <div className="flex flex-wrap items-start gap-2.5">
                    <FormField
                      control={form.control}
                      name="tipoConsultaId"
                      render={({ field }) => (
                        <FormItem className="flex-1 min-w-[200px]">
                          <FormLabel className="text-xs font-medium">Tipo de Consulta *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs w-full">
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent position="popper" className="max-h-60">
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
                      name="formaPagamentoId"
                      render={({ field }) => (
                        <FormItem className="flex-1 min-w-[200px]">
                          <FormLabel className="text-xs font-medium">Forma de Pagamento</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === "null" ? null : value)}
                            value={field.value === null ? "null" : field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs w-full">
                                <SelectValue placeholder="Selecionar o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent position="popper" className="max-h-60">
                              <SelectItem value="null" className="text-xs">Não informado</SelectItem>
                              {formasPagamento.map((fp) => (
                                <SelectItem key={fp.id} value={fp.id} className="text-xs">
                                  {fp.nome}
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
                          <FormControl>
                            <ProcedimentoSearchInput
                              procedimentoId={field.value}
                              onSelect={(item) => {
                                if (!item) {
                                  field.onChange(null);
                                } else if (item.origem === "CLINICA") {
                                  field.onChange(item.id);
                                  form.setValue("codigoTussId", null);
                                } else {
                                  field.onChange(null);
                                  form.setValue("codigoTussId", item.id);
                                }
                              }}
                              error={form.formState.errors.procedimentoId?.message}
                            />
                          </FormControl>
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
                          <FormControl>
                            <OperadoraSearchInput
                              operadoraId={field.value ?? null}
                              onSelectOperadoraId={(id) => {
                                field.onChange(id);
                              }}
                              error={form.formState.errors.operadoraId?.message}
                            />
                          </FormControl>
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

                  {/* Código TUSS (aparece apenas quando há convênio) */}
                  {operadoraId && operadoraId !== "null" && (
                    <div className="flex flex-wrap items-start gap-2.5">
                      <FormField
                        control={form.control}
                        name="codigoTussId"
                        render={({ field }) => (
                          <FormItem className="flex-1 min-w-[200px]">
                            <FormLabel className="text-xs font-medium">Código TUSS</FormLabel>
                              <FormControl>
                                <CodigoTussSearchInput
                                  codigoTussId={field.value || ""}
                                  onSelectCodigoTussId={field.onChange}
                                  error={form.formState.errors.codigoTussId?.message}
                                />
                              </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Dados de Saúde do Paciente */}
                  {pacienteSelecionado && (
                    <div className="flex flex-wrap items-start gap-2.5">
                      <FormField
                        control={form.control}
                        name="alergias"
                        render={({ field }) => (
                          <FormItem className="flex-1 min-w-[200px]">
                            <FormLabel className="text-xs font-medium">Alergias</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || ""}
                                className="h-8 text-xs w-full"
                                maxLength={500}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="medicamentosEmUso"
                        render={({ field }) => (
                          <FormItem className="flex-1 min-w-[200px]">
                            <FormLabel className="text-xs font-medium">Medicamentos em uso</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || ""}
                                className="h-8 text-xs w-full"
                                maxLength={1000}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Observações */}
                  <FormField
                    control={form.control}
                    name="observacoes"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel className="text-xs font-medium">Observações</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value || ""}
                            placeholder="Observações (opcional)"
                            className="min-h-16 text-xs"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Anexos */}
                  <div className="w-full">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                    {anexos.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center gap-2 py-2 px-3 text-left border border-slate-200 rounded-md hover:border-slate-300 hover:bg-slate-50/50 transition-colors cursor-pointer"
                      >
                        <FileCheck className="w-4 h-4 text-slate-300 flex-shrink-0" />
                        <span className="text-xs text-slate-400">Anexar documentos (opcional)</span>
                      </button>
                    ) : (
                      <div className="border border-slate-200 rounded-md p-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[11px] text-slate-500">{anexos.length} documento(s)</p>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[10px] text-blue-500 hover:text-blue-700"
                          >
                            + Adicionar
                          </button>
                        </div>
                        <div className="space-y-0.5">
                          {anexos.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-slate-50 rounded px-2 py-0.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <FileCheck className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                <span className="text-[11px] text-slate-500 truncate">{file.name}</span>
                                <span className="text-[10px] text-slate-400 flex-shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(index)}
                                className="p-0.5 hover:bg-slate-200 rounded flex-shrink-0 ml-1"
                              >
                                <X className="w-3 h-3 text-slate-400" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Row 6: Valor / Desconto / Valor Final */}
                  <div className="flex flex-wrap items-start gap-2.5 justify-end">
                    <FormField
                      control={form.control}
                      name="valorCobrado"
                      render={({ field }) => (
                        <FormItem className="min-w-[160px]">
                          <FormLabel className="text-xs font-medium">Valor</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="numeric"
                              placeholder="R$ 0,00"
                              {...field}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, "");
                                if (!digits) {
                                  field.onChange(null);
                                  form.setValue("valorFinal", null);
                                  e.target.value = "";
                                } else {
                                  const masked = maskMoeda(e.target.value);
                                  const valor = parseMoeda(masked);
                                  field.onChange(valor);
                                  const desconto = form.getValues("desconto") || 0;
                                  form.setValue("valorFinal", Math.max(0, valor - desconto));
                                  e.target.value = masked;
                                }
                              }}
                              value={field.value != null && !isNaN(field.value) ? maskMoeda(String(Math.round(field.value * 100))) : ""}
                              className="h-10 text-base font-semibold text-right"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="desconto"
                      render={({ field }) => (
                        <FormItem className="min-w-[160px]">
                          <FormLabel className="text-xs font-medium">Desconto</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="numeric"
                              placeholder="R$ 0,00"
                              {...field}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, "");
                                if (!digits) {
                                  field.onChange(null);
                                  const valor = form.getValues("valorCobrado") || 0;
                                  form.setValue("valorFinal", valor > 0 ? valor : null);
                                  e.target.value = "";
                                } else {
                                  const masked = maskMoeda(e.target.value);
                                  const desconto = parseMoeda(masked);
                                  field.onChange(desconto);
                                  const valor = form.getValues("valorCobrado") || 0;
                                  form.setValue("valorFinal", Math.max(0, valor - desconto));
                                  e.target.value = masked;
                                }
                              }}
                              value={field.value != null && !isNaN(field.value) ? maskMoeda(String(Math.round(field.value * 100))) : ""}
                              className="h-10 text-base font-semibold text-right"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="valorFinal"
                      render={({ field }) => (
                        <FormItem className="min-w-[160px]">
                          <FormLabel className="text-xs font-medium">Valor Final</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="R$ 0,00"
                              readOnly
                              value={field.value != null && !isNaN(field.value) ? maskMoeda(String(Math.round(field.value * 100))) : ""}
                              className="h-10 text-base font-semibold text-right bg-muted cursor-default"
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

    <NovoPacienteQuickDialog
      open={novoPacienteOpen}
      onOpenChange={setNovoPacienteOpen}
      onSuccess={handleNovoPacienteCriado}
    />
    </>
  );
}
