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
  descricao: string | null;
  tipo: "DINHEIRO" | "CARTAO_CREDITO" | "CARTAO_DEBITO" | "PIX" | "BOLETO" | "TRANSFERENCIA";
  bandeiraCartao: string | null;
  ativo: boolean;
}

interface FormaPagamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formaPagamento: FormaPagamento | null;
  onSuccess: () => void;
}

const formaPagamentoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  tipo: z.enum(["DINHEIRO", "CARTAO_CREDITO", "CARTAO_DEBITO", "PIX", "BOLETO", "TRANSFERENCIA"]),
  bandeiraCartao: z.string().optional(),
  ativo: z.boolean().optional(),
});

type FormaPagamentoFormValues = z.infer<typeof formaPagamentoSchema>;

export function FormaPagamentoDialog({
  open,
  onOpenChange,
  formaPagamento,
  onSuccess,
}: FormaPagamentoDialogProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!formaPagamento;

  const form = useForm<FormaPagamentoFormValues>({
    resolver: zodResolver(formaPagamentoSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      tipo: "DINHEIRO",
      bandeiraCartao: "",
      ativo: true,
    },
  });

  const tipoSelecionado = form.watch("tipo");
  const isCartao = tipoSelecionado === "CARTAO_CREDITO" || tipoSelecionado === "CARTAO_DEBITO";

  useEffect(() => {
    if (formaPagamento) {
      form.reset({
        nome: formaPagamento.nome,
        descricao: formaPagamento.descricao || "",
        tipo: formaPagamento.tipo,
        bandeiraCartao: formaPagamento.bandeiraCartao || "",
        ativo: formaPagamento.ativo,
      });
    } else {
      form.reset({
        nome: "",
        descricao: "",
        tipo: "DINHEIRO",
        bandeiraCartao: "",
        ativo: true,
      });
    }
  }, [formaPagamento, form]);

  const onSubmit = async (data: FormaPagamentoFormValues) => {
    try {
      setLoading(true);

      const payload: any = {
        nome: data.nome,
        descricao: data.descricao || null,
        tipo: data.tipo,
        bandeiraCartao: data.bandeiraCartao || null,
      };

      if (isEditing) {
        payload.ativo = data.ativo;
      }

      const url = isEditing
        ? `/api/admin-clinica/formas-pagamento/${formaPagamento.id}`
        : `/api/admin-clinica/formas-pagamento`;

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
                    Nome <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Digite o nome da forma de pagamento"
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
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value !== "CARTAO_CREDITO" && value !== "CARTAO_DEBITO") {
                        form.setValue("bandeiraCartao", "");
                      }
                    }}
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

            {isCartao && (
              <FormField
                control={form.control}
                name="bandeiraCartao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bandeira do Cartão</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={loading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a bandeira" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="VISA">Visa</SelectItem>
                        <SelectItem value="MASTERCARD">Mastercard</SelectItem>
                        <SelectItem value="ELO">Elo</SelectItem>
                        <SelectItem value="AMEX">American Express</SelectItem>
                        <SelectItem value="HIPERCARD">Hipercard</SelectItem>
                        <SelectItem value="DINERS">Diners Club</SelectItem>
                        <SelectItem value="OUTROS">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                      <FormLabel>Forma de pagamento ativa</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Desmarque para desativar a forma de pagamento no sistema
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










