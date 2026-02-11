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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface Exame {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: string | null;
  ativo: boolean;
}

interface ExameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exame: Exame | null;
  onSuccess: () => void;
}

const exameSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  tipo: z.string().optional(),
  descricao: z.string().optional(),
  ativo: z.boolean().optional(),
});

type ExameFormValues = z.infer<typeof exameSchema>;

export function ExameDialog({
  open,
  onOpenChange,
  exame,
  onSuccess,
}: ExameDialogProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!exame;

  const form = useForm<ExameFormValues>({
    resolver: zodResolver(exameSchema),
    defaultValues: {
      nome: "",
      tipo: undefined,
      descricao: "",
      ativo: true,
    },
  });

  useEffect(() => {
    if (exame) {
      form.reset({
        nome: exame.nome,
        tipo: exame.tipo || undefined,
        descricao: exame.descricao || "",
        ativo: exame.ativo,
      });
    } else {
      form.reset({
        nome: "",
        tipo: undefined,
        descricao: "",
        ativo: true,
      });
    }
  }, [exame, form]);

  const onSubmit = async (data: ExameFormValues) => {
    try {
      setLoading(true);

      const payload: any = {
        nome: data.nome,
        descricao: data.descricao || null,
        tipo: data.tipo || null,
      };

      // Incluir ativo apenas no modo de edição
      if (isEditing) {
        payload.ativo = data.ativo;
      }

      const url = isEditing
        ? `/api/admin-clinica/exames/${exame.id}`
        : `/api/admin-clinica/exames`;

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao salvar exame");
      }

      toast.success(
        isEditing ? "Exame atualizado com sucesso!" : "Exame criado com sucesso!"
      );

      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar exame"
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
            {isEditing ? "Editar Exame" : "Novo Exame"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do exame"
              : "Preencha os dados para criar um novo exame"}
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
                      placeholder="Digite o nome do exame"
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
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value || undefined)}
                    value={field.value || undefined}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo (opcional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="LABORATORIAL">Laboratorial</SelectItem>
                      <SelectItem value="IMAGEM">Imagem</SelectItem>
                      <SelectItem value="OUTROS">Outros</SelectItem>
                    </SelectContent>
                  </Select>
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
                      <FormLabel>Exame ativo</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Desmarque para desativar o exame no sistema
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
