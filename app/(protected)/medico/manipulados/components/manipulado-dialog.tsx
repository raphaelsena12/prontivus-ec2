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

interface Manipulado {
  id: string;
  descricao: string;
  informacoes: string | null;
  ativo: boolean;
}

interface ManipuladoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manipulado: Manipulado | null;
  onSuccess: () => void;
}

const manipuladoSchema = z.object({
  descricao: z.string().min(3, "Descrição deve ter no mínimo 3 caracteres"),
  informacoes: z.string().optional(),
  ativo: z.boolean().optional(),
});

type ManipuladoFormValues = z.infer<typeof manipuladoSchema>;

export function ManipuladoDialog({
  open,
  onOpenChange,
  manipulado,
  onSuccess,
}: ManipuladoDialogProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!manipulado;

  const form = useForm<ManipuladoFormValues>({
    resolver: zodResolver(manipuladoSchema),
    defaultValues: {
      descricao: "",
      informacoes: "",
      ativo: true,
    },
  });

  useEffect(() => {
    if (manipulado) {
      form.reset({
        descricao: manipulado.descricao,
        informacoes: manipulado.informacoes || "",
        ativo: manipulado.ativo,
      });
    } else {
      form.reset({
        descricao: "",
        informacoes: "",
        ativo: true,
      });
    }
  }, [manipulado, form]);

  const onSubmit = async (data: ManipuladoFormValues) => {
    try {
      setLoading(true);

      const payload: any = {
        descricao: data.descricao,
        informacoes: data.informacoes || null,
      };

      // Incluir ativo apenas no modo de edição
      if (isEditing) {
        payload.ativo = data.ativo;
      }

      const url = isEditing
        ? `/api/medico/manipulados/${manipulado.id}`
        : `/api/medico/manipulados`;

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao salvar manipulado");
      }

      toast.success(
        isEditing ? "Manipulado atualizado com sucesso!" : "Manipulado criado com sucesso!"
      );

      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar manipulado"
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
            {isEditing ? "Editar Manipulado" : "Novo Manipulado"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do manipulado"
              : "Preencha os dados para criar um novo manipulado"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Descrição <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Digite a descrição do manipulado"
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
              name="informacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Informações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Digite informações adicionais (opcional)"
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
                      <FormLabel>Manipulado ativo</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Desmarque para desativar o manipulado no sistema
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
