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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, AlertTriangle, Search, X, FileCheck, Ban } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { maskCPF, removeMask, maskMoeda, parseMoeda } from "@/lib/masks";
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

interface DocumentoExistente {
  id: string;
  nomeDocumento: string;
  tipoDocumento: string;
  dados: any;
  createdAt: string;
}

interface Agendamento {
  id: string;
  pacienteId: string;
  paciente?: {
    id: string;
    nome: string;
    cpf: string;
  };
  medicoId: string;
  dataHora: Date | string;
  codigoTussId: string;
  tipoConsultaId: string | null;
  procedimentoId: string | null;
  formaPagamentoId: string | null;
  operadoraId: string | null;
  numeroCarteirinha: string | null;
  valorCobrado: number | string | null;
  desconto: number | string | null;
  valorFinal: number | string | null;
  documentos?: DocumentoExistente[];
  encaixe?: boolean;
}

interface EditarAgendamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendamentoId: string | null;
  onSuccess?: () => void;
}

// Componente de busca de paciente
function PacienteSearchInput({
  value,
  onChange,
  onSelect,
  error,
  initialPaciente,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (paciente: Paciente) => void;
  error?: string;
  initialPaciente?: Paciente | null;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(initialPaciente || null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sincronizar com initialPaciente quando mudar
  useEffect(() => {
    if (initialPaciente) {
      setSelectedPaciente(initialPaciente);
      setSearchTerm("");
    }
  }, [initialPaciente]);

  const handleSelectPaciente = useCallback((paciente: Paciente) => {
    if (!paciente.id) return;

    setSelectedPaciente(paciente);
    setSearchTerm("");
    setShowResults(false);
    setPacientes([]);
    onChange(paciente.nome);
    onSelect(paciente);
  }, [onChange, onSelect]);

  // Buscar pacientes quando o termo de busca mudar
  useEffect(() => {
    // Não buscar se tem paciente selecionado
    if (selectedPaciente) return;

    const term = searchTerm.trim();

    // Buscar por CPF (3+ dígitos) ou por nome (3+ caracteres)
    const cpfLimpo = removeMask(term);
    const isCPF = cpfLimpo.length >= 3 && /^\d+$/.test(cpfLimpo);
    const isNome = term.length >= 3 && !/^\d+$/.test(term);

    if (!isCPF && !isNome) {
      setPacientes([]);
      setShowResults(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      // Cancelar busca anterior
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

          // Se buscar por CPF completo (11 dígitos) e encontrar exatamente um resultado, selecionar automaticamente
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
    // Focar no input após limpar
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    if (!val) {
      handleClear();
      return;
    }

    // Verificar se contém apenas números
    const cpfLimpo = removeMask(val);
    const contemApenasNumeros = /^\d+$/.test(cpfLimpo);

    // Se contém apenas números, aplicar máscara de CPF
    const maskedValue = contemApenasNumeros && cpfLimpo.length > 0
      ? maskCPF(val)
      : val;

    setSearchTerm(maskedValue);
    onChange(maskedValue);
  };

  // Modo selecionado: mostra o paciente como um "chip" clicável
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

  // Modo busca: input com dropdown de resultados
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
          autoFocus
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

export function EditarAgendamentoModal({
  open,
  onOpenChange,
  agendamentoId,
  onSuccess,
}: EditarAgendamentoModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [tiposConsulta, setTiposConsulta] = useState<TipoConsulta[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [agendamento, setAgendamento] = useState<Agendamento | null>(null);
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
  const [documentosExistentes, setDocumentosExistentes] = useState<DocumentoExistente[]>([]);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [loadingCancel, setLoadingCancel] = useState(false);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [isEncaixe, setIsEncaixe] = useState(false);
  const horarioOriginalRef = useRef<{ hora: string; horaFim: string } | null>(null);
  const medicoDataCarregadoRef = useRef<string | null>(null);
  const [agendamentoCarregado, setAgendamentoCarregado] = useState(false);

  const form = useForm<AgendamentoFormData>({
    resolver: zodResolver(agendamentoSchema),
    defaultValues: {
      pacienteId: "",
      medicoId: "",
      data: "",
      hora: "",
      horaFim: "",
      codigoTussId: null,
      tipoConsultaId: "",
      procedimentoId: null,
      formaPagamentoId: null,
      operadoraId: null,
      numeroCarteirinha: "",
      valorCobrado: null,
      desconto: null,
      valorFinal: null,
      observacoes: "",
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

  // Carregar horários disponíveis para um médico/data
  const carregarHorarios = useCallback(async (medicoIdParam: string, dataParam: string) => {
    try {
      setLoadingHorarios(true);
      const excludeParam = agendamentoId ? `&excludeConsultaId=${agendamentoId}` : "";
      const response = await fetch(
        `/api/secretaria/horarios-disponiveis?medicoId=${medicoIdParam}&data=${dataParam}&intervaloMin=10${excludeParam}`
      );
      if (!response.ok) throw new Error();
      const responseData = await response.json();
      let horarios: string[] = responseData.horarios || [];

      // Garantir que os horários originais do agendamento estejam sempre disponíveis
      if (horarioOriginalRef.current) {
        if (horarioOriginalRef.current.hora && !horarios.includes(horarioOriginalRef.current.hora)) {
          horarios = [...horarios, horarioOriginalRef.current.hora].sort();
        }
        if (horarioOriginalRef.current.horaFim && !horarios.includes(horarioOriginalRef.current.horaFim)) {
          horarios = [...horarios, horarioOriginalRef.current.horaFim].sort();
        }
      }

      setHorariosDisponiveis(horarios);
    } catch (error) {
      console.error("Erro ao carregar horários disponíveis:", error);
      setHorariosDisponiveis([]);
    } finally {
      setLoadingHorarios(false);
    }
  }, [agendamentoId]);

  // Carregar TUDO de uma vez quando o modal abrir (dados + agendamento + horários)
  useEffect(() => {
    if (!open) {
      form.reset();
      setConsultasRetorno(null);
      setLimiteRetornos(null);
      setPacienteSelecionado(null);
      setPacienteSearchValue("");
      setAnexos([]);
      setDocumentosExistentes([]);
      setAgendamento(null);
      setHorariosDisponiveis([]);
      horarioOriginalRef.current = null;
      medicoDataCarregadoRef.current = null;
      setAgendamentoCarregado(false);
      setIsEncaixe(false);
      return;
    }

    if (!agendamentoId) return;

    let cancelado = false;

    const carregarTudo = async () => {
      try {
        setLoadingData(true);

        // 1. Carregar dados de referência + agendamento em paralelo
        const [medicosRes, tiposConsultaRes, procedimentosRes, formasPagamentoRes, agendamentoRes] = await Promise.all([
          fetch("/api/admin-clinica/medicos?ativo=true"),
          fetch("/api/admin-clinica/tipos-consulta"),
          fetch("/api/secretaria/procedimentos?limit=1000"),
          fetch("/api/admin-clinica/formas-pagamento?limit=100"),
          fetch(`/api/secretaria/agendamentos/${agendamentoId}`),
        ]);

        if (cancelado) return;

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

        if (!agendamentoRes.ok) {
          throw new Error("Erro ao carregar agendamento");
        }

        const agendamentoData = await agendamentoRes.json();
        const consulta = agendamentoData.consulta;

        if (cancelado) return;

        setAgendamento(consulta);

        // 2. Formatar data e hora
        const dataHora = new Date(consulta.dataHora);
        const dataFormatada = `${dataHora.getFullYear()}-${String(dataHora.getMonth() + 1).padStart(2, "0")}-${String(dataHora.getDate()).padStart(2, "0")}`;
        const horaFormatada = `${String(dataHora.getHours()).padStart(2, "0")}:${String(dataHora.getMinutes()).padStart(2, "0")}`;

        let horaFimFormatada = "";
        if (consulta.dataHoraFim) {
          const dataHoraFim = new Date(consulta.dataHoraFim);
          horaFimFormatada = `${String(dataHoraFim.getHours()).padStart(2, "0")}:${String(dataHoraFim.getMinutes()).padStart(2, "0")}`;
        }

        // 3. Paciente
        if (consulta.paciente) {
          setPacienteSelecionado({
            id: consulta.paciente.id,
            nome: consulta.paciente.nome,
            cpf: consulta.paciente.cpf,
            email: consulta.paciente.email || undefined,
            telefone: consulta.paciente.telefone || undefined,
            celular: consulta.paciente.celular || undefined,
          });
          setPacienteSearchValue(maskCPF(consulta.paciente.cpf));
        }

        // 4. Guardar horários originais ANTES do form.reset
        horarioOriginalRef.current = { hora: horaFormatada, horaFim: horaFimFormatada };

        // 5. Carregar horários disponíveis ANTES de preencher o form
        await carregarHorarios(consulta.medicoId, dataFormatada);

        if (cancelado) return;

        // 6. Preencher formulário por último (horários já carregados, sem race condition)
        const encaixeValue = !!consulta.encaixe;
        setIsEncaixe(encaixeValue);

        form.reset({
          pacienteId: consulta.pacienteId,
          medicoId: consulta.medicoId,
          data: dataFormatada,
          hora: horaFormatada,
          horaFim: horaFimFormatada,
          codigoTussId: consulta.codigoTussId,
          tipoConsultaId: consulta.tipoConsultaId || "",
          procedimentoId: consulta.procedimentoId || null,
          formaPagamentoId: consulta.formaPagamentoId || null,
          operadoraId: consulta.operadoraId,
          numeroCarteirinha: consulta.numeroCarteirinha || "",
          valorCobrado: consulta.valorCobrado ? Number(consulta.valorCobrado) : null,
          desconto: consulta.desconto ? Number(consulta.desconto) : null,
          valorFinal: consulta.valorFinal
            ? Number(consulta.valorFinal)
            : consulta.valorCobrado
            ? Math.max(0, Number(consulta.valorCobrado) - (consulta.desconto ? Number(consulta.desconto) : 0))
            : null,
          observacoes: consulta.observacoes || "",
          anexos: [],
          encaixe: encaixeValue,
        });

        setDocumentosExistentes(consulta.documentos || []);
        setAgendamentoCarregado(true);
      } catch (error: any) {
        if (!cancelado) {
          const msg = error?.message || "Erro desconhecido ao carregar agendamento";
          toast.error(msg);
          console.error("[editar-modal] erro ao carregar:", error);
          onOpenChange(false);
        }
      } finally {
        if (!cancelado) {
          setLoadingData(false);
        }
      }
    };

    carregarTudo();

    return () => { cancelado = true; };
  }, [open, agendamentoId, form, onOpenChange, carregarHorarios]);


  // Verificar consultas de retorno
  useEffect(() => {
    const verificarRetorno = async () => {
      const tipoRetorno = tiposConsulta.find((tipo) => tipo.codigo === "RETORNO");
      const isTipoRetorno = tipoRetorno && tipoConsultaId === tipoRetorno.id;

      if (!pacienteId || !medicoId || !data || !hora || !isTipoRetorno || !open) {
        setConsultasRetorno(null);
        return;
      }

      try {
        let url = `/api/secretaria/pacientes/${pacienteId}/consultas-retorno`;
        if (agendamentoId) {
          url += `?excludeConsultaId=${agendamentoId}`;
        }
        const response = await fetch(url);

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
  }, [pacienteId, medicoId, data, hora, tipoConsultaId, tiposConsulta, open, agendamentoId]);

  // Verificar limite de retornos
  useEffect(() => {
    const verificarLimiteRetornos = async () => {
      const tipoRetorno = tiposConsulta.find((tipo) => tipo.codigo === "RETORNO");
      const isTipoRetorno = tipoRetorno && tipoConsultaId === tipoRetorno.id;

      if (!medicoId || !isTipoRetorno || !data || !open) {
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
  }, [medicoId, tipoConsultaId, data, tiposConsulta, open]);

  // Verificar sugestão de data de retorno (30 dias após última consulta)
  useEffect(() => {
    const verificarSugestaoDataRetorno = async () => {
      const tipoRetorno = tiposConsulta.find((tipo) => tipo.codigo === "RETORNO");
      const isTipoRetorno = tipoRetorno && tipoConsultaId === tipoRetorno.id;

      if (!pacienteId || !medicoId || !isTipoRetorno || !open) {
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
  }, [pacienteId, medicoId, tipoConsultaId, tiposConsulta, open]);

  // Recarregar horários quando o usuário mudar médico ou data (não na carga inicial)
  useEffect(() => {
    if (!agendamentoCarregado || !medicoId || !data) return;
    const chave = `${medicoId}_${data}`;
    // Pular a primeira execução (carga inicial já carregou os horários)
    if (medicoDataCarregadoRef.current === null) {
      medicoDataCarregadoRef.current = chave;
      return;
    }
    // Só recarregar se o médico ou data realmente mudaram
    if (medicoDataCarregadoRef.current === chave) return;
    medicoDataCarregadoRef.current = chave;
    carregarHorarios(medicoId, data);
  }, [medicoId, data, agendamentoCarregado, carregarHorarios]);

  useEffect(() => {
    if (!agendamentoCarregado) return;
    if (!hora) {
      form.setValue("horaFim", "");
      return;
    }
    if (horaFim && horaFim <= hora) {
      form.setValue("horaFim", "");
    }
  }, [hora, horaFim, form, agendamentoCarregado]);

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

  const handleRemoveDocumentoExistente = async (documentoId: string) => {
    try {
      const response = await fetch(`/api/secretaria/documentos/${documentoId}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setDocumentosExistentes((prev) => prev.filter((d) => d.id !== documentoId));
      toast.success("Documento removido");
    } catch {
      toast.error("Erro ao remover documento");
    }
  };

  const onSubmit = async (data: AgendamentoFormData) => {
    if (!agendamentoId) return;

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
        if (data.formaPagamentoId) formData.append("formaPagamentoId", data.formaPagamentoId);
        if (data.operadoraId) formData.append("operadoraId", data.operadoraId);
        if (data.numeroCarteirinha) formData.append("numeroCarteirinha", data.numeroCarteirinha);
        if (data.valorCobrado != null) formData.append("valorCobrado", String(data.valorCobrado));
        if (data.desconto != null) formData.append("desconto", String(data.desconto));
        if (data.valorFinal != null) formData.append("valorFinal", String(data.valorFinal));
        if (data.observacoes) formData.append("observacoes", data.observacoes);
        formData.append("encaixe", String(data.encaixe ?? false));
        anexos.forEach((file) => formData.append("anexos", file));

        response = await fetch(`/api/secretaria/agendamentos/${agendamentoId}`, {
          method: "PATCH",
          body: formData,
        });
      } else {
        response = await fetch(`/api/secretaria/agendamentos/${agendamentoId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...data,
            dataHora,
            dataHoraFim,
            codigoTussId: data.codigoTussId || null,
            procedimentoId: data.procedimentoId || null,
            formaPagamentoId: data.formaPagamentoId || null,
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
        throw new Error(error.error || "Erro ao atualizar agendamento");
      }

      toast.success("Agendamento atualizado com sucesso");
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar agendamento");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelarAgendamento = async () => {
    if (!agendamentoId) return;
    try {
      setLoadingCancel(true);
      const response = await fetch(`/api/secretaria/agendamentos/${agendamentoId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao cancelar agendamento");
      }

      toast.success("Agendamento cancelado com sucesso");
      setCancelDialogOpen(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao cancelar agendamento");
    } finally {
      setLoadingCancel(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-6xl sm:!max-w-6xl max-h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-base font-semibold">Editar Agendamento</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Atualize as informações do agendamento
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

                  {/* Row 2: CPF, Paciente, Data, Hora */}
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
                              initialPaciente={pacienteSelecionado}
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
                                {(() => {
                                  const opcoes = [...horariosDisponiveis];
                                  if (field.value && !opcoes.includes(field.value)) {
                                    opcoes.push(field.value);
                                    opcoes.sort();
                                  }
                                  return opcoes.map((horario) => (
                                    <SelectItem key={horario} value={horario} className="text-xs">
                                      {horario}
                                    </SelectItem>
                                  ));
                                })()}
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
                                {(() => {
                                  const opcoes = horariosDisponiveis.filter((horario) => horario > (hora || ""));
                                  if (field.value && !opcoes.includes(field.value) && field.value > (hora || "")) {
                                    opcoes.push(field.value);
                                    opcoes.sort();
                                  }
                                  return opcoes.map((horario) => (
                                    <SelectItem key={horario} value={horario} className="text-xs">
                                      {horario}
                                    </SelectItem>
                                  ));
                                })()}
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
                            if (!next) {
                              form.setValue("hora", "");
                              form.setValue("horaFim", "");
                            }
                          }}
                          className="accent-blue-600 h-3.5 w-3.5"
                        />
                        Encaixe
                      </label>
                    </FormItem>
                  </div>

                  {/* Row 3: Tipo Consulta, Forma Pagamento, Procedimento, Convênio e Carteirinha */}
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
                    {documentosExistentes.length === 0 && anexos.length === 0 ? (
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
                          <p className="text-[11px] text-slate-500">
                            {documentosExistentes.length + anexos.length} documento(s)
                          </p>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[10px] text-blue-500 hover:text-blue-700"
                          >
                            + Adicionar
                          </button>
                        </div>
                        <div className="space-y-0.5">
                          {documentosExistentes.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between bg-slate-50 rounded px-2 py-0.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <FileCheck className="w-3 h-3 text-green-500 flex-shrink-0" />
                                <span className="text-[11px] text-slate-500 truncate">{doc.nomeDocumento}</span>
                                <span className="text-[10px] text-slate-400 flex-shrink-0">
                                  {doc.dados?.fileSize ? `(${(doc.dados.fileSize / 1024).toFixed(0)} KB)` : ""}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveDocumentoExistente(doc.id)}
                                className="p-0.5 hover:bg-slate-200 rounded flex-shrink-0 ml-1"
                              >
                                <X className="w-3 h-3 text-slate-400" />
                              </button>
                            </div>
                          ))}
                          {anexos.map((file, index) => (
                            <div key={`new-${index}`} className="flex items-center justify-between bg-blue-50 rounded px-2 py-0.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <FileCheck className="w-3 h-3 text-blue-400 flex-shrink-0" />
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
            onClick={() => setCancelDialogOpen(true)}
            disabled={loading || loadingCancel}
            className="text-xs h-8 mr-auto border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive/60 hover:text-destructive"
          >
            <Ban className="mr-1.5 h-3.5 w-3.5" />
            Cancelar Agendamento
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8"
          >
            Fechar
          </Button>
          <Button
            type="submit"
            onClick={form.handleSubmit(onSubmit)}
            disabled={loading || (limiteRetornos?.limiteAtingido ?? false)}
            className="text-xs h-8"
          >
            {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">Cancelar agendamento</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground/80">
              Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="text-xs h-8" disabled={loadingCancel}>
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelarAgendamento}
              disabled={loadingCancel}
              className="text-xs h-8 bg-destructive hover:bg-destructive/90"
            >
              {loadingCancel && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Confirmar cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
