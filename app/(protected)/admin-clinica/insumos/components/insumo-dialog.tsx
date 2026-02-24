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

interface Insumo {
  id: string;
  nome: string;
  descricao: string | null;
  unidade: string | null;
  ativo: boolean;
}

interface InsumoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insumo: Insumo | null;
  onSuccess: () => void;
}

const insumoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  unidade: z.string().optional(),
  ativo: z.boolean().optional(),
});

type InsumoFormValues = z.infer<typeof insumoSchema>;

export function InsumoDialog({
  open,
  onOpenChange,
  insumo,
  onSuccess,
}: InsumoDialogProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!insumo;

  const form = useForm<InsumoFormValues>({
    resolver: zodResolver(insumoSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      unidade: "",
      ativo: true,
    },
  });

  useEffect(() => {
    if (insumo) {
      form.reset({
        nome: insumo.nome,
        descricao: insumo.descricao || "",
        unidade: insumo.unidade || "",
        ativo: insumo.ativo,
      });
    } else {
      form.reset({
        nome: "",
        descricao: "",
        unidade: "",
        ativo: true,
      });
    }
  }, [insumo, form]);

  const onSubmit = async (data: InsumoFormValues) => {
    try {
      setLoading(true);

      const payload: any = {
        nome: data.nome,
        descricao: data.descricao || null,
        unidade: data.unidade || null,
      };

      if (isEditing) {
        payload.ativo = data.ativo;
      }

      const url = isEditing
        ? `/api/admin-clinica/insumos/${insumo.id}`
        : `/api/admin-clinica/insumos`;

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao salvar insumo");
      }

      toast.success(
        isEditing ? "Insumo atualizado com sucesso!" : "Insumo criado com sucesso!"
      );

      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar insumo"
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
            {isEditing ? "Editar Insumo" : "Novo Insumo"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do insumo"
              : "Preencha os dados para criar um novo insumo"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      placeholder="Digite o nome do insumo (ex: esparadrapo, gase, luvas)"
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
              name="unidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidade</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: UN, KG, M, etc."
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
                      <FormLabel>Insumo ativo</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Desmarque para desativar o insumo no sistema
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

