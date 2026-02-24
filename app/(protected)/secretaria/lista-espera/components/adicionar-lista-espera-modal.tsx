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
import { Loader2, Search, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { maskCPF, removeMask } from "@/lib/masks";

const adicionarListaEsperaSchema = z.object({
  pacienteId: z.string().uuid("Paciente é obrigatório"),
  medicoId: z.string().uuid("Médico é obrigatório"),
  observacoes: z.string().optional(),
  prioridade: z.number().int().min(0).max(2),
});

type AdicionarListaEsperaFormData = z.infer<typeof adicionarListaEsperaSchema>;

interface Paciente {
  id: string;
  nome: string;
  cpf: string;
  email?: string;
  telefone?: string;
  celular?: string;
}

interface Medico {
  id: string;
  usuario: {
    nome: string;
  };
}

interface AdicionarListaEsperaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (medicoId?: string) => void;
  medicos: Medico[];
}

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
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelectPaciente = useCallback((paciente: Paciente) => {
    if (!paciente.id) return;
    
    setSelectedPaciente(paciente);
    const cpfFormatado = maskCPF(paciente.cpf);
    setSearchTerm(cpfFormatado);
    setShowResults(false);
    setPacientes([]);
    onChange(cpfFormatado);
    onSelect(paciente);
  }, [onChange, onSelect]);

  useEffect(() => {
    const searchPacientes = async () => {
      const term = searchTerm.trim();
      
      if (selectedPaciente && term === maskCPF(selectedPaciente.cpf)) {
        return;
      }

      const cpfLimpo = removeMask(term);
      const isCPF = cpfLimpo.length === 11 && /^\d+$/.test(cpfLimpo);
      const isNome = term.length >= 3 && !/^\d+$/.test(term);

      if (!isCPF && !isNome) {
        setPacientes([]);
        setShowResults(false);
        return;
      }

      try {
        setLoading(true);
        const searchQuery = isCPF ? cpfLimpo : term;
        const response = await fetch(`/api/secretaria/pacientes?search=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setPacientes(data.pacientes || []);
          setShowResults(true);
          
          if (isCPF && data.pacientes?.length === 1) {
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

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => {
            const newValue = e.target.value;
            setSearchTerm(newValue);
            if (!newValue) {
              handleClear();
            }
          }}
          placeholder="Buscar por CPF ou nome..."
          className={`pl-9 pr-9 ${error ? "border-red-500" : ""}`}
        />
        {searchTerm && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      {showResults && pacientes.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <ScrollArea className="h-[200px]">
            <div className="p-1">
              {pacientes.map((paciente) => (
                <button
                  key={paciente.id}
                  onClick={() => handleSelectPaciente(paciente)}
                  className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <div className="font-medium">{paciente.nome}</div>
                  <div className="text-xs text-muted-foreground">{maskCPF(paciente.cpf)}</div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

export function AdicionarListaEsperaModal({
  open,
  onOpenChange,
  onSuccess,
  medicos,
}: AdicionarListaEsperaModalProps) {
  const [loading, setLoading] = useState(false);
  const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | null>(null);
  const [pacienteSearchValue, setPacienteSearchValue] = useState("");

  const form = useForm<AdicionarListaEsperaFormData>({
    resolver: zodResolver(adicionarListaEsperaSchema),
    defaultValues: {
      pacienteId: "",
      medicoId: "",
      observacoes: "",
      prioridade: 0,
    },
  });

  const handlePacienteSelect = (paciente: Paciente) => {
    setPacienteSelecionado(paciente);
    form.setValue("pacienteId", paciente.id);
  };

  const onSubmit = async (data: AdicionarListaEsperaFormData) => {
    try {
      setLoading(true);
      const response = await fetch("/api/secretaria/lista-espera", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao adicionar à lista de espera");
      }

      toast.success("Paciente adicionado à lista de espera com sucesso");
      const medicoIdAdicionado = data.medicoId;
      form.reset();
      setPacienteSelecionado(null);
      setPacienteSearchValue("");
      onSuccess?.(medicoIdAdicionado);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao adicionar à lista de espera");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar à Lista de Espera</DialogTitle>
          <DialogDescription>
            Adicione um paciente à lista de espera de um médico
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="pacienteId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paciente</FormLabel>
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
                  {pacienteSelecionado && (
                    <div className="text-sm text-muted-foreground">
                      {pacienteSelecionado.nome}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="medicoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Médico</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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
              name="prioridade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridade</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">Normal</SelectItem>
                      <SelectItem value="1">Alta</SelectItem>
                      <SelectItem value="2">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Observações sobre o paciente..."
                      rows={3}
                    />
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
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

