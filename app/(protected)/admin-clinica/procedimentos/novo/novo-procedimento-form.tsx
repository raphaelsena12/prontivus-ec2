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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

const procedimentoSchema = z.object({
  codigo: z.string().min(1, "Código é obrigatório"),
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  valor: z.number().min(0, "Valor deve ser maior ou igual a zero"),
});

type ProcedimentoFormData = z.infer<typeof procedimentoSchema>;

interface NovoProcedimentoFormProps {
  clinicaId: string;
}

export function NovoProcedimentoForm({ clinicaId }: NovoProcedimentoFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const form = useForm<ProcedimentoFormData>({
    resolver: zodResolver(procedimentoSchema),
    defaultValues: { codigo: "", nome: "", descricao: "", valor: 0 },
  });

  const onSubmit = async (data: ProcedimentoFormData) => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin-clinica/procedimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar procedimento");
      }
      toast.success("Procedimento criado com sucesso!");
      router.push("/admin-clinica/procedimentos");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar procedimento");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center gap-4">
          <Link href="/admin-clinica/procedimentos">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Novo Procedimento</h1>
            <p className="text-muted-foreground">Cadastre um novo procedimento na clínica</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados do Procedimento</CardTitle>
            <CardDescription>Preencha as informações do procedimento</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField control={form.control} name="codigo" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código *</FormLabel>
                      <FormControl><Input {...field} placeholder="Código TUSS ou interno" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="nome" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl><Input {...field} placeholder="Nome do procedimento" /></FormControl>
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
                  <FormField control={form.control} name="descricao" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Descrição</FormLabel>
                      <FormControl><Textarea {...field} rows={4} placeholder="Descrição do procedimento..." /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => router.push("/admin-clinica/procedimentos")}>Cancelar</Button>
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

