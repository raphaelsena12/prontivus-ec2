"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

const movimentacaoSchema = z.object({
  tipo: z.enum(["ENTRADA", "SAIDA"]),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  valor: z.number().min(0, "Valor deve ser maior ou igual a zero"),
  data: z.string().min(1, "Data é obrigatória"),
  formaPagamentoId: z.string().uuid().optional(),
  observacoes: z.string().optional(),
});

type MovimentacaoFormData = z.infer<typeof movimentacaoSchema>;

interface NovaMovimentacaoFormProps {
  clinicaId: string;
  formasPagamento: Array<{ id: string; nome: string }>;
}

export function NovaMovimentacaoForm({ clinicaId, formasPagamento }: NovaMovimentacaoFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [defaultDate, setDefaultDate] = useState<string>("");
  
  useEffect(() => {
    // Define a data apenas no cliente para evitar problemas de hidratação
    setDefaultDate(new Date().toISOString().split("T")[0]);
  }, []);

  const form = useForm<MovimentacaoFormData>({
    resolver: zodResolver(movimentacaoSchema),
    defaultValues: { tipo: undefined, descricao: "", valor: 0, data: defaultDate, formaPagamentoId: undefined, observacoes: "" },
  });

  // Atualiza o valor da data quando defaultDate for definido
  useEffect(() => {
    if (defaultDate) {
      form.setValue("data", defaultDate);
    }
  }, [defaultDate, form]);

  const onSubmit = async (data: MovimentacaoFormData) => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin-clinica/fluxo-caixa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar movimentação");
      }
      toast.success("Movimentação criada com sucesso!");
      router.push("/admin-clinica/fluxo-caixa");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar movimentação");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center gap-4">
          <Link href="/admin-clinica/fluxo-caixa">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Nova Movimentação</h1>
            <p className="text-muted-foreground">Cadastre uma nova movimentação no fluxo de caixa</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados da Movimentação</CardTitle>
            <CardDescription>Preencha as informações da movimentação</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
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
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="data" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data *</FormLabel>
                      <FormControl><Input {...field} type="date" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="descricao" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição *</FormLabel>
                      <FormControl><Input {...field} placeholder="Descrição da movimentação" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="valor" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor *</FormLabel>
                      <FormControl><Input {...field} type="number" step="0.01" placeholder="0.00" onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} value={field.value || 0} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="formaPagamentoId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forma de Pagamento</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a forma de pagamento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma</SelectItem>
                          {formasPagamento.map((forma) => (
                            <SelectItem key={forma.id} value={forma.id}>{forma.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="observacoes" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Observações</FormLabel>
                      <FormControl><Textarea {...field} rows={4} placeholder="Observações sobre a movimentação..." /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => router.push("/admin-clinica/fluxo-caixa")}>Cancelar</Button>
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


