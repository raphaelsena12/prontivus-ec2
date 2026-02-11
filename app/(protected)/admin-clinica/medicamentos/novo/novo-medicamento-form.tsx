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
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

const medicamentoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  principioAtivo: z.string().optional(),
  laboratorio: z.string().optional(),
  apresentacao: z.string().optional(),
  concentracao: z.string().optional(),
  unidade: z.string().optional(),
});

type MedicamentoFormData = z.infer<typeof medicamentoSchema>;

interface NovoMedicamentoFormProps {
  clinicaId: string;
}

export function NovoMedicamentoForm({ clinicaId }: NovoMedicamentoFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const form = useForm<MedicamentoFormData>({
    resolver: zodResolver(medicamentoSchema),
    defaultValues: { nome: "", principioAtivo: "", laboratorio: "", apresentacao: "", concentracao: "", unidade: "" },
  });

  const onSubmit = async (data: MedicamentoFormData) => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin-clinica/medicamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar medicamento");
      }
      toast.success("Medicamento criado com sucesso!");
      router.push("/admin-clinica/medicamentos");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar medicamento");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center gap-4">
          <Link href="/admin-clinica/medicamentos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Novo Medicamento</h1>
            <p className="text-muted-foreground">Cadastre um novo medicamento na clínica</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados do Medicamento</CardTitle>
            <CardDescription>Preencha as informações do medicamento</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField control={form.control} name="nome" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl><Input {...field} placeholder="Nome do medicamento" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="principioAtivo" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Princípio Ativo</FormLabel>
                      <FormControl><Input {...field} placeholder="Princípio ativo" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="laboratorio" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Laboratório</FormLabel>
                      <FormControl><Input {...field} placeholder="Laboratório" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="apresentacao" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apresentação</FormLabel>
                      <FormControl><Input {...field} placeholder="Ex: Comprimido, Cápsula, Xarope" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="concentracao" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Concentração</FormLabel>
                      <FormControl><Input {...field} placeholder="Ex: 500mg" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="unidade" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade</FormLabel>
                      <FormControl><Input {...field} placeholder="Ex: mg, ml" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => router.push("/admin-clinica/medicamentos")}>
                    Cancelar
                  </Button>
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















