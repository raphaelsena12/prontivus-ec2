"use client";

import { formatDateToInput } from "@/lib/utils";
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
  sipGrupo: z.string().optional(),
  categoriaProntivus: z.string().optional(),
  categoriaSadt: z.string().optional(),
  usaGuiaSadt: z.boolean().optional(),
  subgrupoTuss: z.string().optional(),
  grupoTuss: z.string().optional(),
  capituloTuss: z.string().optional(),
  fonteAnsTabela22: z.string().optional(),
  observacoes: z.string().optional(),
});

type EditarCodigoTussFormData = z.infer<typeof editarCodigoTussSchema>;

interface EditarCodigoTussFormProps {
  codigoTuss: any;
}

export function EditarCodigoTussSuperAdminForm({ codigoTuss }: EditarCodigoTussFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<EditarCodigoTussFormData>({
    resolver: zodResolver(editarCodigoTussSchema),
    defaultValues: {
      descricao: codigoTuss.descricao || "",
      descricaoDetalhada: codigoTuss.descricaoDetalhada || "",
      tipoProcedimento: codigoTuss.tipoProcedimento,
      categoriaExame: codigoTuss.categoriaExame || null,
      sipGrupo: codigoTuss.sipGrupo || "",
      categoriaProntivus: codigoTuss.categoriaProntivus || "",
      categoriaSadt: codigoTuss.categoriaSadt || "",
      usaGuiaSadt: !!codigoTuss.usaGuiaSadt,
      subgrupoTuss: codigoTuss.subgrupoTuss || "",
      grupoTuss: codigoTuss.grupoTuss || "",
      capituloTuss: codigoTuss.capituloTuss || "",
      fonteAnsTabela22: codigoTuss.fonteAnsTabela22 || "",
      dataVigenciaInicio: codigoTuss.dataVigenciaInicio
        ? formatDateToInput(codigoTuss.dataVigenciaInicio)
        : "",
      dataVigenciaFim: codigoTuss.dataVigenciaFim
        ? formatDateToInput(codigoTuss.dataVigenciaFim)
        : "",
      ativo: codigoTuss.ativo,
      observacoes: codigoTuss.observacoes || "",
    },
  });

  const tipoProcedimento = form.watch("tipoProcedimento");

  const onSubmit = async (data: EditarCodigoTussFormData) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/super-admin/codigos-tuss/${codigoTuss.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          categoriaExame: tipoProcedimento === "EXAME" ? data.categoriaExame : null,
          dataVigenciaFim: data.dataVigenciaFim || null,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao atualizar código TUSS");
      }
      toast.success("Código TUSS atualizado com sucesso!");
      router.push("/super-admin/codigos-tuss");
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
          <Link href="/super-admin/codigos-tuss">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Editar Código TUSS</h1>
            <p className="text-muted-foreground text-sm">
              Atualize as informações do código TUSS no catálogo global
            </p>
          </div>
        </div>

        <div className="px-4 lg:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Código TUSS</CardTitle>
              <CardDescription>Edite os dados do código TUSS</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1 md:col-span-2">
                      <p className="text-xs text-muted-foreground">
                        Código TUSS: <span className="font-semibold">{codigoTuss.codigoTuss}</span>
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name="tipoProcedimento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Procedimento *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
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
                                <SelectItem value="none">Não definida</SelectItem>
                                <SelectItem value="LABORATORIAL">Laboratorial</SelectItem>
                                <SelectItem value="IMAGEM">Imagem</SelectItem>
                                <SelectItem value="ANATOMOPATOLOGICO">Anatomopatológico</SelectItem>
                                <SelectItem value="FUNCIONAL">Funcional</SelectItem>
                                <SelectItem value="GENETICO">Genético</SelectItem>
                                <SelectItem value="OUTROS">Outros</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="descricao"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Descrição *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Descrição do procedimento" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="descricaoDetalhada"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Descrição Detalhada</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} placeholder="Descrição detalhada (opcional)" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sipGrupo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SIP Grupo</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: A. CONSULTAS MÉDICAS" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="categoriaProntivus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria Prontivus</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: CONSULTA" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="categoriaSadt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria SADT</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: NAO_SADT" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="usaGuiaSadt"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3 md:col-span-2">
                          <div className="space-y-0.5">
                            <FormLabel>Usa guia SADT</FormLabel>
                            <p className="text-xs text-muted-foreground">
                              {field.value ? "SIM" : "NÃO"}
                            </p>
                          </div>
                          <FormControl>
                            <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subgrupoTuss"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Subgrupo TUSS</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: CONSULTAS, VISITAS HOSPITALARES..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="grupoTuss"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grupo TUSS</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: PROCEDIMENTOS GERAIS" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="capituloTuss"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Capítulo TUSS</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: PROCEDIMENTOS GERAIS" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fonteAnsTabela22"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Fonte ANS (Tabela 22)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: ANS TUSS Tabela 22 versão 202501" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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

                    <FormField
                      control={form.control}
                      name="ativo"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3 md:col-span-2">
                          <div className="space-y-0.5">
                            <FormLabel>Status</FormLabel>
                            <p className="text-xs text-muted-foreground">
                              {field.value ? "Ativo" : "Inativo"}
                            </p>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="observacoes"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Observações</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} placeholder="Observações (opcional)" />
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
                      onClick={() => router.push("/super-admin/codigos-tuss")}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar Alterações
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

