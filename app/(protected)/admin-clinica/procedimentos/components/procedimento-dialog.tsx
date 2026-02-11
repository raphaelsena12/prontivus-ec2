"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface Procedimento {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  valor: number | string;
  ativo: boolean;
}

interface ProcedimentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  procedimento: Procedimento | null;
  onSuccess: () => void;
}

const procedimentoSchema = z.object({
  codigo: z.string().min(1, "Código é obrigatório"),
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  valor: z.string().refine((val) => {
    const num = parseFloat(val.replace(",", "."));
    return !isNaN(num) && num >= 0;
  }, "Valor deve ser maior ou igual a zero"),
  ativo: z.boolean().optional(),
});

type ProcedimentoFormValues = z.infer<typeof procedimentoSchema>;

export function ProcedimentoDialog({
  open,
  onOpenChange,
  procedimento,
  onSuccess,
}: ProcedimentoDialogProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!procedimento;

  const form = useForm<ProcedimentoFormValues>({
    resolver: zodResolver(procedimentoSchema),
    defaultValues: {
      codigo: "",
      nome: "",
      descricao: "",
      valor: "0",
      ativo: true,
    },
  });

  useEffect(() => {
    if (procedimento) {
      const valor = typeof procedimento.valor === "string" 
        ? procedimento.valor 
        : procedimento.valor.toString();
      form.reset({
        codigo: procedimento.codigo,
        nome: procedimento.nome,
        descricao: procedimento.descricao || "",
        valor: valor,
        ativo: procedimento.ativo,
      });
    } else {
      form.reset({
        codigo: "",
        nome: "",
        descricao: "",
        valor: "0",
        ativo: true,
      });
    }
  }, [procedimento, form]);

  const onSubmit = async (data: ProcedimentoFormValues) => {
    try {
      setLoading(true);

      const payload: any = {
        codigo: data.codigo,
        nome: data.nome,
        descricao: data.descricao || null,
        valor: parseFloat(data.valor.replace(",", ".")) || 0,
      };

      if (isEditing) {
        payload.ativo = data.ativo;
      }

      const url = isEditing
        ? `/api/admin-clinica/procedimentos/${procedimento.id}`
        : `/api/admin-clinica/procedimentos`;

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao salvar procedimento");
      }

      toast.success(
        isEditing ? "Procedimento atualizado com sucesso!" : "Procedimento criado com sucesso!"
      );

      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar procedimento"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Procedimento" : "Novo Procedimento"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do procedimento"
              : "Preencha os dados para criar um novo procedimento"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="codigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Código <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Digite o código do procedimento"
                      {...field}
                      disabled={loading || isEditing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nome <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Digite o nome do procedimento"
                      {...field}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Digite uma descrição (opcional)"
                      rows={4}
                      {...field}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="valor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="0,00"
                      {...field}
                      disabled={loading}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d,]/g, "");
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditing && (
              <FormField
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={loading}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Procedimento ativo</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Desmarque para desativar o procedimento no sistema
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}

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
                {isEditing ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

