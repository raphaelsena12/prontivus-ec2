"use client";

import { useState } from "react";
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

const contaPagarSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória"),
  fornecedor: z.string().optional(),
  valor: z.number().min(0, "Valor deve ser maior ou igual a zero"),
  dataVencimento: z.string().min(1, "Data de vencimento é obrigatória"),
  formaPagamentoId: z.string().uuid().optional(),
  observacoes: z.string().optional(),
});

type ContaPagarFormData = z.infer<typeof contaPagarSchema>;

interface NovaContaPagarFormProps {
  clinicaId: string;
  formasPagamento: Array<{ id: string; nome: string }>;
}

export function NovaContaPagarForm({ clinicaId, formasPagamento }: NovaContaPagarFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const form = useForm<ContaPagarFormData>({
    resolver: zodResolver(contaPagarSchema),
    defaultValues: { descricao: "", fornecedor: "", valor: 0, dataVencimento: "", formaPagamentoId: undefined, observacoes: "" },
  });

  const onSubmit = async (data: ContaPagarFormData) => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin-clinica/contas-pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar conta a pagar");
      }
      toast.success("Conta a pagar criada com sucesso!");
      router.push("/admin-clinica/contas-pagar");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar conta a pagar");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center gap-4">
          <Link href="/admin-clinica/contas-pagar">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Nova Conta a Pagar</h1>
            <p className="text-muted-foreground">Cadastre uma nova conta a pagar</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados da Conta a Pagar</CardTitle>
            <CardDescription>Preencha as informações da conta a pagar</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField control={form.control} name="descricao" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição *</FormLabel>
                      <FormControl><Input {...field} placeholder="Descrição da conta" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="fornecedor" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fornecedor</FormLabel>
                      <FormControl><Input {...field} placeholder="Nome do fornecedor" /></FormControl>
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
                  <FormField control={form.control} name="dataVencimento" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Vencimento *</FormLabel>
                      <FormControl><Input {...field} type="date" /></FormControl>
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
                      <FormControl><Textarea {...field} rows={4} placeholder="Observações sobre a conta..." /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => router.push("/admin-clinica/contas-pagar")}>Cancelar</Button>
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


