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

const contaReceberSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória"),
  pacienteId: z.string().uuid().optional(),
  valor: z.number().min(0, "Valor deve ser maior ou igual a zero"),
  dataVencimento: z.string().min(1, "Data de vencimento é obrigatória"),
  dataRecebimento: z.string().optional(),
  status: z.enum(["PENDENTE", "RECEBIDO", "VENCIDO", "CANCELADO"]),
  formaPagamentoId: z.string().uuid().optional(),
  observacoes: z.string().optional(),
});

type ContaReceberFormData = z.infer<typeof contaReceberSchema>;

interface EditarContaReceberFormProps {
  conta: any;
  clinicaId: string;
  formasPagamento: Array<{ id: string; nome: string }>;
  pacientes: Array<{ id: string; nome: string }>;
}

export function EditarContaReceberForm({ conta, clinicaId, formasPagamento, pacientes }: EditarContaReceberFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const form = useForm<ContaReceberFormData>({
    resolver: zodResolver(contaReceberSchema),
    defaultValues: {
      descricao: conta.descricao || "",
      pacienteId: conta.pacienteId || undefined,
      valor: conta.valor ? Number(conta.valor) : 0,
      dataVencimento: conta.dataVencimento ? new Date(conta.dataVencimento).toISOString().split("T")[0] : "",
      dataRecebimento: conta.dataRecebimento ? new Date(conta.dataRecebimento).toISOString().split("T")[0] : "",
      status: conta.status || "PENDENTE",
      formaPagamentoId: conta.formaPagamentoId || undefined,
      observacoes: conta.observacoes || "",
    },
  });

  const onSubmit = async (data: ContaReceberFormData) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin-clinica/contas-receber/${conta.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao atualizar conta a receber");
      }
      toast.success("Conta a receber atualizada com sucesso!");
      router.push("/admin-clinica/contas-receber");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar conta a receber");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center gap-4">
          <Link href="/admin-clinica/contas-receber">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Editar Conta a Receber</h1>
            <p className="text-muted-foreground">Edite as informações da conta a receber</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados da Conta a Receber</CardTitle>
            <CardDescription>Atualize as informações da conta a receber</CardDescription>
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
                  <FormField control={form.control} name="pacienteId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paciente</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o paciente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {pacientes.map((paciente) => (
                            <SelectItem key={paciente.id} value={paciente.id}>{paciente.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                  <FormField control={form.control} name="dataRecebimento" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Recebimento</FormLabel>
                      <FormControl><Input {...field} type="date" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PENDENTE">Pendente</SelectItem>
                          <SelectItem value="RECEBIDO">Recebido</SelectItem>
                          <SelectItem value="VENCIDO">Vencido</SelectItem>
                          <SelectItem value="CANCELADO">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
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
                  <Button type="button" variant="outline" onClick={() => router.push("/admin-clinica/contas-receber")}>Cancelar</Button>
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


