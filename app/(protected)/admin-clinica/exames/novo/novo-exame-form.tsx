"use client";

import { useState, useEffect } from "react";
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

const exameSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  tipo: z.enum(["LABORATORIAL", "IMAGEM", "OUTROS"]).optional(),
  codigoTussId: z.string().uuid("Código TUSS é obrigatório"),
});

type ExameFormData = z.infer<typeof exameSchema>;

interface CodigoTuss {
  id: string;
  codigoTuss: string;
  descricao: string;
  tipoProcedimento: string;
}

interface NovoExameFormProps {
  clinicaId: string;
}

export function NovoExameForm({ clinicaId }: NovoExameFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingCodigosTuss, setLoadingCodigosTuss] = useState(true);
  const [codigosTuss, setCodigosTuss] = useState<CodigoTuss[]>([]);

  const form = useForm<ExameFormData>({
    resolver: zodResolver(exameSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      tipo: undefined,
      codigoTussId: "",
    },
  });

  // Carregar códigos TUSS do tipo EXAME
  useEffect(() => {
    const fetchCodigosTuss = async () => {
      try {
        setLoadingCodigosTuss(true);
        const response = await fetch(
          "/api/admin-clinica/codigos-tuss?tipoProcedimento=EXAME&ativo=true"
        );
        if (response.ok) {
          const data = await response.json();
          setCodigosTuss(data.codigosTuss || []);
        } else {
          toast.error("Erro ao carregar códigos TUSS");
        }
      } catch (error) {
        console.error("Erro ao buscar códigos TUSS:", error);
        toast.error("Erro ao carregar códigos TUSS");
      } finally {
        setLoadingCodigosTuss(false);
      }
    };

    fetchCodigosTuss();
  }, []);

  const onSubmit = async (data: ExameFormData) => {
    try {
      setLoading(true);

      const response = await fetch("/api/admin-clinica/exames", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar exame");
      }

      toast.success("Exame criado com sucesso!");
      router.push("/admin-clinica/exames");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar exame");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center gap-4">
          <Link href="/admin-clinica/exames">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Novo Exame</h1>
            <p className="text-muted-foreground">
              Cadastre um novo exame na clínica
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados do Exame</CardTitle>
            <CardDescription>Preencha as informações do exame</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome do exame" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="codigoTussId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código TUSS *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={loadingCodigosTuss}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o código TUSS" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {loadingCodigosTuss ? (
                              <SelectItem value="loading" disabled>
                                Carregando...
                              </SelectItem>
                            ) : codigosTuss.length === 0 ? (
                              <SelectItem value="empty" disabled>
                                Nenhum código TUSS encontrado
                              </SelectItem>
                            ) : (
                              codigosTuss.map((codigo) => (
                                <SelectItem key={codigo.id} value={codigo.id}>
                                  {codigo.codigoTuss} - {codigo.descricao}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tipo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo</FormLabel>
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
                            <SelectItem value="LABORATORIAL">
                              Laboratorial
                            </SelectItem>
                            <SelectItem value="IMAGEM">Imagem</SelectItem>
                            <SelectItem value="OUTROS">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="descricao"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={4}
                            placeholder="Descrição do exame..."
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
                    onClick={() => router.push("/admin-clinica/exames")}
                  >
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















