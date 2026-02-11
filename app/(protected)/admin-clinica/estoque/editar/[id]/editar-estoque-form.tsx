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

const estoqueSchema = z.object({
  quantidadeAtual: z.number().int().min(0, "Quantidade deve ser maior ou igual a zero"),
  quantidadeMinima: z.number().int().min(0, "Quantidade mínima deve ser maior ou igual a zero"),
  quantidadeMaxima: z.number().int().min(0, "Quantidade máxima deve ser maior ou igual a zero").optional().or(z.null()),
  localizacao: z.string().optional(),
});

type EstoqueFormData = z.infer<typeof estoqueSchema>;

interface EditarEstoqueFormProps {
  estoque: any;
  clinicaId: string;
}

export function EditarEstoqueForm({ estoque, clinicaId }: EditarEstoqueFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const form = useForm<EstoqueFormData>({
    resolver: zodResolver(estoqueSchema),
    defaultValues: {
      quantidadeAtual: estoque.quantidadeAtual || 0,
      quantidadeMinima: estoque.quantidadeMinima || 0,
      quantidadeMaxima: estoque.quantidadeMaxima || null,
      localizacao: estoque.localizacao || "",
    },
  });

  const onSubmit = async (data: EstoqueFormData) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin-clinica/estoque/${estoque.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao atualizar estoque");
      }
      toast.success("Estoque atualizado com sucesso!");
      router.push("/admin-clinica/estoque");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar estoque");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center gap-4">
          <Link href="/admin-clinica/estoque">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Editar Estoque</h1>
            <p className="text-muted-foreground">Medicamento: {estoque.medicamento.nome}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados do Estoque</CardTitle>
            <CardDescription>Atualize as informações do estoque do medicamento</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField control={form.control} name="quantidadeAtual" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade Atual *</FormLabel>
                      <FormControl><Input {...field} type="number" min="0" onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} value={field.value || 0} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="quantidadeMinima" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade Mínima *</FormLabel>
                      <FormControl><Input {...field} type="number" min="0" onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} value={field.value || 0} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="quantidadeMaxima" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade Máxima</FormLabel>
                      <FormControl><Input {...field} type="number" min="0" onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)} value={field.value || ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="localizacao" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Localização</FormLabel>
                      <FormControl><Input {...field} placeholder="Localização física no estoque" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => router.push("/admin-clinica/estoque")}>Cancelar</Button>
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















