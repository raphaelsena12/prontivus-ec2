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

const bloqueioAgendaSchema = z.object({
  medicoId: z.string().uuid("Médico é obrigatório"),
  dataInicio: z.string().min(1, "Data início é obrigatória"),
  horaInicio: z.string().min(1, "Horário início é obrigatório").refine(
    (val) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val),
    "Horário início inválido (formato: HH:mm)"
  ),
  dataFim: z.string().min(1, "Data fim é obrigatória"),
  horaFim: z.string().min(1, "Horário fim é obrigatório").refine(
    (val) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val),
    "Horário fim inválido (formato: HH:mm)"
  ),
  observacoes: z.string().optional(),
}).refine((data) => {
  const dataInicio = new Date(`${data.dataInicio}T${data.horaInicio}:00`);
  const dataFim = new Date(`${data.dataFim}T${data.horaFim}:00`);
  return dataFim > dataInicio;
}, {
  message: "Data/hora fim deve ser posterior à data/hora início",
  path: ["dataFim"],
});

type BloqueioAgendaFormData = z.infer<typeof bloqueioAgendaSchema>;

interface Medico {
  id: string;
  usuario: {
    nome: string;
  };
}

interface BloqueioAgendaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BloqueioAgendaModal({
  open,
  onOpenChange,
  onSuccess,
}: BloqueioAgendaModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [medicos, setMedicos] = useState<Medico[]>([]);

  const form = useForm<BloqueioAgendaFormData>({
    resolver: zodResolver(bloqueioAgendaSchema),
    defaultValues: {
      medicoId: "",
      dataInicio: "",
      horaInicio: "",
      dataFim: "",
      horaFim: "",
      observacoes: "",
    },
  });

  // Carregar médicos quando o modal abrir
  useEffect(() => {
    if (open) {
      fetchMedicos();
    } else {
      // Resetar formulário quando fechar
      form.reset();
    }
  }, [open]);

  const fetchMedicos = async () => {
    try {
      setLoadingData(true);
      const response = await fetch("/api/admin-clinica/medicos");

      if (!response.ok) {
        throw new Error("Erro ao carregar médicos");
      }

      const data = await response.json();
      setMedicos(data.medicos || []);
    } catch (error) {
      toast.error("Erro ao carregar médicos");
      console.error(error);
    } finally {
      setLoadingData(false);
    }
  };

  const onSubmit = async (data: BloqueioAgendaFormData) => {
    try {
      setLoading(true);

      // Garantir que o horário está no formato correto (HH:mm)
      const horaInicio = data.horaInicio.length === 5 ? data.horaInicio : data.horaInicio.padStart(5, '0');
      const horaFim = data.horaFim.length === 5 ? data.horaFim : data.horaFim.padStart(5, '0');

      const payload = {
        ...data,
        horaInicio,
        horaFim,
      };

      const response = await fetch("/api/secretaria/bloqueios-agenda", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || "Erro ao criar bloqueio de agenda";
        const errorDetails = errorData.details ? `\nDetalhes: ${JSON.stringify(errorData.details)}` : '';
        throw new Error(errorMessage + errorDetails);
      }

      toast.success("Bloqueio de agenda criado com sucesso");
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao criar bloqueio de agenda";
      toast.error(errorMessage);
      console.error("Erro ao criar bloqueio:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bloqueio de Agenda</DialogTitle>
          <DialogDescription>
            Crie um bloqueio na agenda do médico para impedir agendamentos no período especificado
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
                    onValueChange={field.onChange}
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dataInicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Início *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dataFim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Fim *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                      placeholder="Observações sobre o bloqueio (opcional)"
                      {...field}
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
                Criar Bloqueio
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
