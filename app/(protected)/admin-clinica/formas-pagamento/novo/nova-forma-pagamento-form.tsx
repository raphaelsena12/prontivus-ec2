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

const formaPagamentoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  tipo: z.enum(["DINHEIRO", "CARTAO_CREDITO", "CARTAO_DEBITO", "PIX", "BOLETO", "TRANSFERENCIA"]),
  bandeiraCartao: z.string().optional(),
});

type FormaPagamentoFormData = z.infer<typeof formaPagamentoSchema>;

interface NovaFormaPagamentoFormProps {
  clinicaId: string;
}

export function NovaFormaPagamentoForm({ clinicaId }: NovaFormaPagamentoFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const form = useForm<FormaPagamentoFormData>({
    resolver: zodResolver(formaPagamentoSchema),
    defaultValues: { nome: "", descricao: "", tipo: undefined, bandeiraCartao: "" },
  });

  const tipoSelecionado = form.watch("tipo");
  const isCartao = tipoSelecionado === "CARTAO_CREDITO" || tipoSelecionado === "CARTAO_DEBITO";

  const onSubmit = async (data: FormaPagamentoFormData) => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin-clinica/formas-pagamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar forma de pagamento");
      }
      toast.success("Forma de pagamento criada com sucesso!");
      router.push("/admin-clinica/formas-pagamento");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar forma de pagamento");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center gap-4">
          <Link href="/admin-clinica/formas-pagamento">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Nova Forma de Pagamento</h1>
            <p className="text-muted-foreground">Cadastre uma nova forma de pagamento na clínica</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados da Forma de Pagamento</CardTitle>
            <CardDescription>Preencha as informações da forma de pagamento</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField control={form.control} name="nome" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl><Input {...field} placeholder="Nome da forma de pagamento" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="tipo" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        if (value !== "CARTAO_CREDITO" && value !== "CARTAO_DEBITO") {
                          form.setValue("bandeiraCartao", "");
                        }
                      }} defaultValue={field.value}>
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
                  )} />
                  {isCartao && (
                    <FormField control={form.control} name="bandeiraCartao" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bandeira do Cartão</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    )} />
                  )}
                  <FormField control={form.control} name="descricao" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Descrição</FormLabel>
                      <FormControl><Textarea {...field} rows={4} placeholder="Descrição da forma de pagamento..." /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => router.push("/admin-clinica/formas-pagamento")}>Cancelar</Button>
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















