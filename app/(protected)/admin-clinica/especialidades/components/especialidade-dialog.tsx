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

interface Especialidade {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

interface EspecialidadeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  especialidade: Especialidade | null;
  onSuccess: () => void;
}

const especialidadeSchema = z.object({
  codigo: z.string().min(1, "Código é obrigatório"),
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  descricao: z.string().optional(),
  ativo: z.boolean().optional(),
});

type EspecialidadeFormValues = z.infer<typeof especialidadeSchema>;

export function EspecialidadeDialog({
  open,
  onOpenChange,
  especialidade,
  onSuccess,
}: EspecialidadeDialogProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!especialidade;

  const form = useForm<EspecialidadeFormValues>({
    resolver: zodResolver(especialidadeSchema),
    defaultValues: {
      codigo: "",
      nome: "",
      descricao: "",
      ativo: true,
    },
  });

  useEffect(() => {
    if (especialidade) {
      form.reset({
        codigo: especialidade.codigo,
        nome: especialidade.nome,
        descricao: especialidade.descricao || "",
        ativo: especialidade.ativo,
      });
    } else {
      form.reset({
        codigo: "",
        nome: "",
        descricao: "",
        ativo: true,
      });
    }
  }, [especialidade, form]);

  const onSubmit = async (data: EspecialidadeFormValues) => {
    try {
      setLoading(true);

      const payload: any = {
        codigo: data.codigo,
        nome: data.nome,
        descricao: data.descricao || null,
      };

      // Incluir ativo apenas no modo de edição
      if (isEditing) {
        payload.ativo = data.ativo;
      }

      const url = isEditing
        ? `/api/admin-clinica/especialidades/${especialidade.id}`
        : `/api/admin-clinica/especialidades`;

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao salvar especialidade");
      }

      toast.success(
        isEditing ? "Especialidade atualizada com sucesso!" : "Especialidade criada com sucesso!"
      );

      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar especialidade"
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
            {isEditing ? "Editar Especialidade" : "Nova Especialidade"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações da especialidade"
              : "Preencha os dados para criar uma nova especialidade"}
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
                      placeholder="Digite o código da especialidade"
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
                      placeholder="Digite o nome da especialidade"
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
                      <FormLabel>Especialidade ativa</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Desmarque para desativar a especialidade no sistema
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










