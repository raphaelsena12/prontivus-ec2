"use client";
import { getApiErrorMessage } from "@/lib/zod-validation-error";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

const novoCodigoTussSchema = z.object({
  codigoTuss: z.string().min(1, "Código TUSS é obrigatório"),
  descricao: z.string().min(1, "Descrição é obrigatória").max(500),
  descricaoDetalhada: z.string().optional(),
  tipoProcedimento: z.enum([
    "CONSULTA",
    "EXAME",
    "PROCEDIMENTO_AMBULATORIAL",
    "CIRURGIA",
    "OUTROS",
  ]),
  categoriaExame: z
    .enum([
      "LABORATORIAL",
      "IMAGEM",
      "ANATOMOPATOLOGICO",
      "FUNCIONAL",
      "GENETICO",
      "OUTROS",
    ])
    .optional()
    .nullable(),
  dataVigenciaInicio: z.string().min(1, "Data de vigência é obrigatória"),
  dataVigenciaFim: z.string().optional(),
  observacoes: z.string().optional(),
});

type NovoCodigoTussFormData = z.infer<typeof novoCodigoTussSchema>;

export function NovoCodigoTussForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<NovoCodigoTussFormData>({
    resolver: zodResolver(novoCodigoTussSchema),
    defaultValues: {
      codigoTuss: "",
      descricao: "",
      descricaoDetalhada: "",
      tipoProcedimento: "EXAME",
      categoriaExame: null,
      dataVigenciaInicio: "",
      dataVigenciaFim: "",
      observacoes: "",
    },
  });

  const tipoProcedimento = form.watch("tipoProcedimento");

  const onSubmit = async (data: NovoCodigoTussFormData) => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin-clinica/codigos-tuss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          categoriaExame: tipoProcedimento === "EXAME" ? data.categoriaExame : null,
          dataVigenciaFim: data.dataVigenciaFim || null,
          ativo: true,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(getApiErrorMessage(error) || "Erro ao criar código TUSS");
      }
      toast.success("Código TUSS criado com sucesso!");
      router.push("/admin-clinica/codigos-tuss");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar código TUSS");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center gap-4 px-4 lg:px-6">
          <Link href="/admin-clinica/codigos-tuss">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Novo Código TUSS</h1>
            <p className="text-muted-foreground text-sm">
              Cadastre um novo código TUSS na clínica
            </p>
          </div>
        </div>

        <div className="px-4 lg:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Código TUSS</CardTitle>
              <CardDescription>
                Preencha as informações do novo código TUSS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Código TUSS */}
                    <FormField
                      control={form.control}
                      name="codigoTuss"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código TUSS *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Ex: 40304361"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Tipo de Procedimento */}
                    <FormField
                      control={form.control}
                      name="tipoProcedimento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Procedimento *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="CONSULTA">Consulta</SelectItem>
                              <SelectItem value="EXAME">Exame</SelectItem>
                              <SelectItem value="PROCEDIMENTO_AMBULATORIAL">
                                Procedimento Ambulatorial
                              </SelectItem>
                              <SelectItem value="CIRURGIA">Cirurgia</SelectItem>
                              <SelectItem value="OUTROS">Outros</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Categoria do Exame (condicional) */}
                    {tipoProcedimento === "EXAME" && (
                      <FormField
                        control={form.control}
                        name="categoriaExame"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categoria do Exame</FormLabel>
                            <Select
                              onValueChange={(value) =>
                                field.onChange(value === "none" ? null : value)
                              }
                              value={field.value ?? "none"}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione a categoria" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">
                                  Não definida
                                </SelectItem>
                                <SelectItem value="LABORATORIAL">
                                  Laboratorial
                                </SelectItem>
                                <SelectItem value="IMAGEM">Imagem</SelectItem>
                                <SelectItem value="ANATOMOPATOLOGICO">
                                  Anatomopatológico
                                </SelectItem>
                                <SelectItem value="FUNCIONAL">
                                  Funcional
                                </SelectItem>
                                <SelectItem value="GENETICO">
                                  Genético
                                </SelectItem>
                                <SelectItem value="OUTROS">Outros</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Descrição */}
                    <FormField
                      control={form.control}
                      name="descricao"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Descrição *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Descrição do procedimento"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Descrição Detalhada */}
                    <FormField
                      control={form.control}
                      name="descricaoDetalhada"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Descrição Detalhada</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={3}
                              placeholder="Descrição detalhada (opcional)"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Data Vigência Início */}
                    <FormField
                      control={form.control}
                      name="dataVigenciaInicio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vigência Início *</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Data Vigência Fim */}
                    <FormField
                      control={form.control}
                      name="dataVigenciaFim"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vigência Fim</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Observações */}
                    <FormField
                      control={form.control}
                      name="observacoes"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Observações</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={3}
                              placeholder="Observações (opcional)"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push("/admin-clinica/codigos-tuss")}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Criar Código TUSS
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
