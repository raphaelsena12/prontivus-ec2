"use client";

import { useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface Categoria {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
}

interface CategoriaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoria: Categoria | null;
  onSuccess: () => void;
  apiBasePath?: string;
}

const categoriaSchema = z.object({
  codigo: z.string().min(1, "Código é obrigatório"),
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  ativo: z.boolean().optional(),
});

type CategoriaFormValues = z.infer<typeof categoriaSchema>;

export function CategoriaDialog({
  open,
  onOpenChange,
  categoria,
  onSuccess,
  apiBasePath = "/api/super-admin/especialidades-categorias",
}: CategoriaDialogProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!categoria;

  const form = useForm<CategoriaFormValues>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: {
      codigo: "",
      nome: "",
      ativo: true,
    },
  });

  useEffect(() => {
    if (categoria) {
      form.reset({
        codigo: categoria.codigo,
        nome: categoria.nome,
        ativo: categoria.ativo,
      });
    } else {
      form.reset({
        codigo: "",
        nome: "",
        ativo: true,
      });
    }
  }, [categoria, form]);

  const onSubmit = async (data: CategoriaFormValues) => {
    try {
      setLoading(true);

      const payload: any = {
        codigo: data.codigo,
        nome: data.nome,
      };

      if (isEditing) {
        payload.ativo = data.ativo;
      }

      const url = isEditing ? `${apiBasePath}/${categoria.id}` : `${apiBasePath}`;

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao salvar categoria");
      }

      toast.success(isEditing ? "Categoria atualizada com sucesso!" : "Categoria criada com sucesso!");

      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar categoria");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Atualize as informações da categoria" : "Preencha os dados para criar uma nova categoria"}
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
                    <Input placeholder="Digite o código da categoria" {...field} disabled={loading || isEditing} />
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
                    <Input placeholder="Digite o nome da categoria" {...field} disabled={loading} />
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
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={loading} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Categoria ativa</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Desmarque para desativar a categoria no sistema
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
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

