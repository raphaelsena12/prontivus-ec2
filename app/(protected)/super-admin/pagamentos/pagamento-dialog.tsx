"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface Clinica {
  id: string;
  nome: string;
  plano: {
    id: string;
    preco: number;
  };
}

interface PagamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  clinicas: Clinica[];
}

const pagamentoSchema = z.object({
  tenantId: z.string().min(1, "Selecione uma clínica"),
  mesReferencia: z.string().min(1, "Selecione o mês de referência"),
  valor: z.number().min(0.01, "Valor deve ser maior que zero"),
  metodoPagamento: z.string().optional(),
  dataVencimento: z.string().optional(),
});

type PagamentoFormValues = z.infer<typeof pagamentoSchema>;

export function PagamentoDialog({
  open,
  onOpenChange,
  onSuccess,
  clinicas,
}: PagamentoDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PagamentoFormValues>({
    resolver: zodResolver(pagamentoSchema),
    defaultValues: {
      tenantId: "",
      mesReferencia: "",
      valor: 0,
      metodoPagamento: "BOLETO",
      dataVencimento: "",
    },
  });

  const selectedClinicaId = form.watch("tenantId");
  const selectedClinica = clinicas.find((c) => c.id === selectedClinicaId);

  // Atualizar valor quando clínica for selecionada
  useEffect(() => {
    if (selectedClinica) {
      form.setValue("valor", selectedClinica.plano.preco);
    }
  }, [selectedClinica, form]);

  // Gerar opções de meses (últimos 12 meses e próximos 3 meses)
  const getMesesOptions = () => {
    const meses = [];
    const hoje = new Date();
    
    // Últimos 12 meses
    for (let i = 12; i >= 1; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses.push({
        value: data.toISOString(),
        label: new Intl.DateTimeFormat("pt-BR", {
          month: "long",
          year: "numeric",
        }).format(data),
      });
    }
    
    // Mês atual e próximos 3 meses
    for (let i = 0; i <= 3; i++) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      meses.push({
        value: data.toISOString(),
        label: new Intl.DateTimeFormat("pt-BR", {
          month: "long",
          year: "numeric",
        }).format(data),
      });
    }
    
    return meses;
  };

  const mesesOptions = getMesesOptions();

  // Calcular data de vencimento padrão (7 dias a partir de hoje)
  const getDefaultVencimento = () => {
    const data = new Date();
    data.setDate(data.getDate() + 7);
    return data.toISOString().split("T")[0];
  };

  const onSubmit = async (data: PagamentoFormValues) => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/super-admin/pagamentos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantId: data.tenantId,
          mesReferencia: data.mesReferencia,
          valor: data.valor,
          metodoPagamento: data.metodoPagamento || "BOLETO",
          dataVencimento: data.dataVencimento || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao criar pagamento");
      }

      toast.success("Pagamento criado com sucesso!");
      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar pagamento");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Pagamento</DialogTitle>
          <DialogDescription>
            Crie um novo pagamento para uma clínica
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tenantId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clínica *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma clínica" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clinicas.map((clinica) => (
                        <SelectItem key={clinica.id} value={clinica.id}>
                          {clinica.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mesReferencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mês de Referência *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o mês" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mesesOptions.map((mes) => (
                        <SelectItem key={mes.value} value={mes.value}>
                          {mes.label}
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
                name="valor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          field.onChange(value);
                        }}
                        value={field.value || 0}
                      />
                    </FormControl>
                    {selectedClinica && (
                      <p className="text-xs text-muted-foreground">
                        Valor do plano: {formatCurrency(selectedClinica.plano.preco)}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="metodoPagamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método de Pagamento</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o método" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BOLETO">Boleto</SelectItem>
                        <SelectItem value="PIX">PIX</SelectItem>
                        <SelectItem value="CARTAO_CREDITO">Cartão de Crédito</SelectItem>
                        <SelectItem value="CARTAO_DEBITO">Cartão de Débito</SelectItem>
                        <SelectItem value="TRANSFERENCIA">Transferência Bancária</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="dataVencimento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Vencimento</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value || getDefaultVencimento()}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Se não informado, será definido como 7 dias a partir de hoje
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  onOpenChange(false);
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Criando..." : "Criar Pagamento"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

