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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface FormaPagamento {
  id: string;
  nome: string;
  tipo: "DINHEIRO" | "CARTAO_CREDITO" | "CARTAO_DEBITO" | "PIX" | "BOLETO" | "TRANSFERENCIA";
  ativo: boolean;
}

interface FormaPagamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formaPagamento: FormaPagamento | null;
  onSuccess: () => void;
  apiBasePath?: string;
}

const formaPagamentoSchema = z.object({
  nome: z.string().min(1, "Descrição é obrigatória"),
  tipo: z.enum(["DINHEIRO", "CARTAO_CREDITO", "CARTAO_DEBITO", "PIX", "BOLETO", "TRANSFERENCIA"]),
});

type FormaPagamentoFormValues = z.infer<typeof formaPagamentoSchema>;

export function FormaPagamentoDialog({
  open,
  onOpenChange,
  formaPagamento,
  onSuccess,
  apiBasePath = "/api/admin-clinica/formas-pagamento",
}: FormaPagamentoDialogProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!formaPagamento;

  const form = useForm<FormaPagamentoFormValues>({
    resolver: zodResolver(formaPagamentoSchema),
    defaultValues: {
      nome: "",
      tipo: "DINHEIRO",
    },
  });

  useEffect(() => {
    if (formaPagamento) {
      form.reset({
        nome: formaPagamento.nome,
        tipo: formaPagamento.tipo,
      });
    } else {
      form.reset({
        nome: "",
        tipo: "DINHEIRO",
      });
    }
  }, [formaPagamento, form]);

  const onSubmit = async (data: FormaPagamentoFormValues) => {
    try {
      setLoading(true);

      const payload = {
        nome: data.nome,
        tipo: data.tipo,
      };

      const url = isEditing
        ? `${apiBasePath}/${formaPagamento.id}`
        : `${apiBasePath}`;

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao salvar forma de pagamento");
      }

      toast.success(
        isEditing ? "Forma de pagamento atualizada com sucesso!" : "Forma de pagamento criada com sucesso!"
      );

      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar forma de pagamento"
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
            {isEditing ? "Editar Forma de Pagamento" : "Nova Forma de Pagamento"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações da forma de pagamento"
              : "Preencha os dados para criar uma nova forma de pagamento"}
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
                    Descrição <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Digite a descrição da forma de pagamento"
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
                  <FormLabel>
                    Tipo <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                      <SelectItem value="CARTAO_CREDITO">Cartão de Crédito</SelectItem>
                      <SelectItem value="CARTAO_DEBITO">Cartão de Débito</SelectItem>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="BOLETO">Boleto</SelectItem>
                      <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                    </SelectContent>
                  </Select>
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
                {isEditing ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}










