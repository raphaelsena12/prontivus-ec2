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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface Medicamento {
  id: string;
  nome: string;
  principioAtivo: string | null;
  laboratorio: string | null;
  apresentacao: string | null;
  concentracao: string | null;
  unidade: string | null;
  ativo: boolean;
}

interface MedicamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicamento: Medicamento | null;
  onSuccess: () => void;
}

const medicamentoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  principioAtivo: z.string().optional(),
  laboratorio: z.string().optional(),
  apresentacao: z.string().optional(),
  concentracao: z.string().optional(),
  unidade: z.string().optional(),
  ativo: z.boolean().optional(),
});

type MedicamentoFormValues = z.infer<typeof medicamentoSchema>;

export function MedicamentoDialog({
  open,
  onOpenChange,
  medicamento,
  onSuccess,
}: MedicamentoDialogProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!medicamento;

  const form = useForm<MedicamentoFormValues>({
    resolver: zodResolver(medicamentoSchema),
    defaultValues: {
      nome: "",
      principioAtivo: "",
      laboratorio: "",
      apresentacao: "",
      concentracao: "",
      unidade: "",
      ativo: true,
    },
  });

  useEffect(() => {
    if (medicamento) {
      form.reset({
        nome: medicamento.nome,
        principioAtivo: medicamento.principioAtivo || "",
        laboratorio: medicamento.laboratorio || "",
        apresentacao: medicamento.apresentacao || "",
        concentracao: medicamento.concentracao || "",
        unidade: medicamento.unidade || "",
        ativo: medicamento.ativo,
      });
    } else {
      form.reset({
        nome: "",
        principioAtivo: "",
        laboratorio: "",
        apresentacao: "",
        concentracao: "",
        unidade: "",
        ativo: true,
      });
    }
  }, [medicamento, form]);

  const onSubmit = async (data: MedicamentoFormValues) => {
    try {
      setLoading(true);

      const payload: any = {
        nome: data.nome,
        principioAtivo: data.principioAtivo || null,
        laboratorio: data.laboratorio || null,
        apresentacao: data.apresentacao || null,
        concentracao: data.concentracao || null,
        unidade: data.unidade || null,
      };

      if (isEditing) {
        payload.ativo = data.ativo;
      }

      const url = isEditing
        ? `/api/admin-clinica/medicamentos/${medicamento.id}`
        : `/api/admin-clinica/medicamentos`;

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao salvar medicamento");
      }

      toast.success(
        isEditing ? "Medicamento atualizado com sucesso!" : "Medicamento criado com sucesso!"
      );

      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar medicamento"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Medicamento" : "Novo Medicamento"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do medicamento"
              : "Preencha os dados para criar um novo medicamento"}
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
                      placeholder="Digite o nome do medicamento"
                      {...field}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="principioAtivo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Princípio Ativo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Princípio ativo"
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
                name="laboratorio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Laboratório</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Laboratório"
                        {...field}
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="apresentacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apresentação</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Apresentação"
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
                name="concentracao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Concentração</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Concentração"
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
                        placeholder="Unidade"
                        {...field}
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                      <FormLabel>Medicamento ativo</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Desmarque para desativar o medicamento no sistema
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










