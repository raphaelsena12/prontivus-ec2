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
import { Loader2, Trash2, CalendarPlus } from "lucide-react";
import { formatDate } from "@/lib/utils";

const horarioExtraSchema = z.object({
  medicoId: z.string().uuid("Médico é obrigatório"),
  data: z.string().min(1, "Data é obrigatória"),
  horaInicio: z.string().min(1, "Horário início é obrigatório").refine(
    (val) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val),
    "Horário inválido (formato: HH:mm)"
  ),
  horaFim: z.string().min(1, "Horário fim é obrigatório").refine(
    (val) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val),
    "Horário inválido (formato: HH:mm)"
  ),
  observacoes: z.string().optional(),
});

type HorarioExtraFormData = z.infer<typeof horarioExtraSchema>;

interface Medico {
  id: string;
  usuario: {
    nome: string;
  };
}

interface Excecao {
  id: string;
  data: string;
  horaInicio: string | null;
  horaFim: string | null;
  observacoes: string | null;
}

interface HorarioExtraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function HorarioExtraModal({
  open,
  onOpenChange,
  onSuccess,
}: HorarioExtraModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingExcecoes, setLoadingExcecoes] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [excecoes, setExcecoes] = useState<Excecao[]>([]);
  const [medicoSelecionado, setMedicoSelecionado] = useState("");

  const form = useForm<HorarioExtraFormData>({
    resolver: zodResolver(horarioExtraSchema),
    defaultValues: {
      medicoId: "",
      data: "",
      horaInicio: "08:00",
      horaFim: "18:00",
      observacoes: "",
    },
  });

  useEffect(() => {
    if (open) {
      fetchMedicos();
    } else {
      form.reset();
      setExcecoes([]);
      setMedicoSelecionado("");
    }
  }, [open]);

  useEffect(() => {
    if (medicoSelecionado) {
      fetchExcecoes(medicoSelecionado);
    } else {
      setExcecoes([]);
    }
  }, [medicoSelecionado]);

  const fetchMedicos = async () => {
    try {
      setLoadingData(true);
      const response = await fetch("/api/admin-clinica/medicos?ativo=true");
      if (!response.ok) throw new Error("Erro ao carregar médicos");
      const data = await response.json();
      setMedicos(data.medicos || []);
    } catch {
      toast.error("Erro ao carregar médicos");
    } finally {
      setLoadingData(false);
    }
  };

  const fetchExcecoes = async (medicoId: string) => {
    try {
      setLoadingExcecoes(true);
      const response = await fetch(`/api/secretaria/excecoes-escala?medicoId=${medicoId}`);
      if (!response.ok) throw new Error("Erro ao carregar horários extras");
      const data = await response.json();
      setExcecoes(data.excecoes || []);
    } catch {
      toast.error("Erro ao carregar horários extras");
    } finally {
      setLoadingExcecoes(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      const response = await fetch(`/api/secretaria/excecoes-escala?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Erro ao excluir horário extra");
      toast.success("Horário extra removido");
      setExcecoes((prev) => prev.filter((e) => e.id !== id));
      onSuccess?.();
    } catch {
      toast.error("Erro ao excluir horário extra");
    } finally {
      setDeletingId(null);
    }
  };

  const onSubmit = async (data: HorarioExtraFormData) => {
    try {
      setLoading(true);
      const response = await fetch("/api/secretaria/excecoes-escala", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao criar horário extra");
      }

      toast.success("Horário extra criado com sucesso");
      form.reset({
        medicoId: medicoSelecionado,
        data: "",
        horaInicio: "08:00",
        horaFim: "18:00",
        observacoes: "",
      });
      fetchExcecoes(medicoSelecionado);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar horário extra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            Horário Extra
          </DialogTitle>
          <DialogDescription>
            Libere um dia fora da escala regular para atendimento. Ex: se a escala é de segunda a quinta, libere uma sexta específica.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="medicoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Médico *</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setMedicoSelecionado(value);
                    }}
                    value={field.value}
                    disabled={loadingData}
                  >
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
              name="data"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="horaInicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário Início *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="horaFim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário Fim *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
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
                      placeholder="Ex: Atendimento extra para compensar feriado (opcional)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar Horário Extra
            </Button>
          </form>
        </Form>

        {/* Lista de horários extras já cadastrados */}
        {medicoSelecionado && (
          <div className="border-t pt-4 mt-2">
            <h4 className="text-sm font-medium mb-3">Horários extras cadastrados</h4>
            {loadingExcecoes ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : excecoes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum horário extra cadastrado para este médico.
              </p>
            ) : (
              <div className="space-y-2">
                {excecoes.map((excecao) => (
                  <div
                    key={excecao.id}
                    className="flex items-center justify-between border rounded-md p-3 text-sm"
                  >
                    <div>
                      <span className="font-medium">
                        {formatDate(new Date(excecao.data))}
                      </span>
                      {excecao.horaInicio && excecao.horaFim && (
                        <span className="text-muted-foreground ml-2">
                          {excecao.horaInicio} - {excecao.horaFim}
                        </span>
                      )}
                      {excecao.observacoes && (
                        <p className="text-muted-foreground text-xs mt-0.5">{excecao.observacoes}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(excecao.id)}
                      disabled={deletingId === excecao.id}
                    >
                      {deletingId === excecao.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
