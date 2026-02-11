"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const movimentacaoSchema = z.object({
  estoqueId: z.string().uuid("Selecione um medicamento"),
  tipo: z.enum(["ENTRADA", "SAIDA", "AJUSTE"]),
  quantidade: z.number().int().min(1, "Quantidade deve ser maior que zero"),
  motivo: z.string().optional(),
  observacoes: z.string().optional(),
});

type MovimentacaoFormData = z.infer<typeof movimentacaoSchema>;

interface NovaMovimentacaoEstoqueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estoques: Array<{ id: string; medicamento: { nome: string } }>;
  onSuccess: () => void;
}

export function NovaMovimentacaoEstoqueDialog({ open, onOpenChange, estoques, onSuccess }: NovaMovimentacaoEstoqueDialogProps) {
  const [loading, setLoading] = useState(false);
  const form = useForm<MovimentacaoFormData>({
    resolver: zodResolver(movimentacaoSchema),
    defaultValues: { estoqueId: "", tipo: undefined, quantidade: 0, motivo: "", observacoes: "" },
  });

  const onSubmit = async (data: MovimentacaoFormData) => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin-clinica/estoque/movimentacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar movimentação");
      }
      toast.success("Movimentação criada com sucesso!");
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar movimentação");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Movimentação de Estoque</DialogTitle>
          <DialogDescription>Registre uma nova movimentação no estoque</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="estoqueId" render={({ field }) => (
              <FormItem>
                <FormLabel>Medicamento *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o medicamento" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {estoques.map((estoque) => (
                      <SelectItem key={estoque.id} value={estoque.id}>{estoque.medicamento.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="tipo" render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ENTRADA">Entrada</SelectItem>
                    <SelectItem value="SAIDA">Saída</SelectItem>
                    <SelectItem value="AJUSTE">Ajuste</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="quantidade" render={({ field }) => (
              <FormItem>
                <FormLabel>Quantidade *</FormLabel>
                <FormControl><Input {...field} type="number" min="1" onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} value={field.value || 0} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="motivo" render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo</FormLabel>
                <FormControl><Input {...field} placeholder="Motivo da movimentação" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="observacoes" render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl><Textarea {...field} rows={3} placeholder="Observações sobre a movimentação..." /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}















