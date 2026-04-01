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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

const editarCodigoTussSchema = z.object({
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
  ativo: z.boolean(),
  observacoes: z.string().optional(),
});

type EditarCodigoTussFormData = z.infer<typeof editarCodigoTussSchema>;

interface EditarCodigoTussFormProps {
  codigoTuss: any;
}

export function EditarCodigoTussForm({ codigoTuss }: EditarCodigoTussFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<EditarCodigoTussFormData>({
    resolver: zodResolver(editarCodigoTussSchema),
    defaultValues: {
      descricao: codigoTuss.descricao || "",
      descricaoDetalhada: codigoTuss.descricaoDetalhada || "",
      tipoProcedimento: codigoTuss.tipoProcedimento,
      categoriaExame: codigoTuss.categoriaExame || null,
      dataVigenciaInicio: codigoTuss.dataVigenciaInicio
        ? new Date(codigoTuss.dataVigenciaInicio).toISOString().split("T")[0]
        : "",
      dataVigenciaFim: codigoTuss.dataVigenciaFim
        ? new Date(codigoTuss.dataVigenciaFim).toISOString().split("T")[0]
        : "",
      ativo: codigoTuss.ativo,
      observacoes: codigoTuss.observacoes || "",
    },
  });

  const tipoProcedimento = form.watch("tipoProcedimento");

  const onSubmit = async (data: EditarCodigoTussFormData) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin-clinica/codigos-tuss/${codigoTuss.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            categoriaExame: tipoProcedimento === "EXAME" ? data.categoriaExame : null,
            dataVigenciaFim: data.dataVigenciaFim || null,
          }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(getApiErrorMessage(error) || "Erro ao atualizar código TUSS");
      }
      toast.success("Código TUSS atualizado com sucesso!");
      router.push("/admin-clinica/codigos-tuss");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar código TUSS");
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
            <h1 className="text-2xl font-bold">Editar Código TUSS</h1>
            <p className="text-muted-foreground text-sm">
              {codigoTuss.codigoTuss} — {codigoTuss.descricao}
            </p>
          </div>
        </div>

        <div className="px-4 lg:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Código TUSS</CardTitle>
              <CardDescription>
                Atualize as informações do código TUSS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Código TUSS (somente leitura) */}
                    <FormItem>
                      <FormLabel>Código TUSS</FormLabel>
                      <Input value={codigoTuss.codigoTuss} disabled />
                    </FormItem>

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

                    {/* Ativo */}
                    <FormField
                      control={form.control}
                      name="ativo"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormLabel className="mt-0">Ativo</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
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
                      Salvar
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
