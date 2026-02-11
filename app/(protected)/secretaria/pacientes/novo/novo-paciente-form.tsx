"use client";

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
import { maskCPF, maskRG, maskTelefone, maskCelular, maskCEP, removeMask } from "@/lib/masks";

const pacienteSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(100, "Nome deve ter no máximo 100 caracteres"),
  cpf: z.string().min(11, "CPF inválido").max(14, "CPF inválido"),
  rg: z.string().max(12, "RG inválido").optional(),
  dataNascimento: z.string().min(1, "Data de nascimento é obrigatória"),
  sexo: z.enum(["M", "F", "OUTRO"]),
  email: z.string().email("Email inválido").max(100, "Email deve ter no máximo 100 caracteres").optional().or(z.literal("")),
  telefone: z.string().max(14, "Telefone inválido").optional(),
  celular: z.string().max(15, "Celular inválido").optional(),
  cep: z.string().max(9, "CEP inválido").optional(),
  endereco: z.string().max(200, "Endereço deve ter no máximo 200 caracteres").optional(),
  numero: z.string().max(10, "Número deve ter no máximo 10 caracteres").optional(),
  complemento: z.string().max(50, "Complemento deve ter no máximo 50 caracteres").optional(),
  bairro: z.string().max(100, "Bairro deve ter no máximo 100 caracteres").optional(),
  cidade: z.string().max(100, "Cidade deve ter no máximo 100 caracteres").optional(),
  estado: z.string().max(2, "Estado deve ter 2 caracteres").optional(),
  nomeMae: z.string().max(100, "Nome da mãe deve ter no máximo 100 caracteres").optional(),
  nomePai: z.string().max(100, "Nome do pai deve ter no máximo 100 caracteres").optional(),
  profissao: z.string().max(100, "Profissão deve ter no máximo 100 caracteres").optional(),
  estadoCivil: z.enum(["SOLTEIRO", "CASADO", "DIVORCIADO", "VIUVO"]).optional(),
  observacoes: z.string().max(1000, "Observações devem ter no máximo 1000 caracteres").optional(),
});

type PacienteFormData = z.infer<typeof pacienteSchema>;

interface NovoPacienteFormProps {
  clinicaId: string;
}

export function NovoPacienteForm({ clinicaId }: NovoPacienteFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<PacienteFormData>({
    resolver: zodResolver(pacienteSchema),
    defaultValues: {
      nome: "",
      cpf: "",
      rg: "",
      dataNascimento: "",
      sexo: undefined,
      email: "",
      telefone: "",
      celular: "",
      cep: "",
      endereco: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      nomeMae: "",
      nomePai: "",
      profissao: "",
      estadoCivil: undefined,
      observacoes: "",
    },
  });

  const onSubmit = async (data: PacienteFormData) => {
    try {
      setLoading(true);

      // Remove máscaras antes de enviar
      const payload = {
        ...data,
        cpf: removeMask(data.cpf),
        rg: data.rg ? removeMask(data.rg) : undefined,
        telefone: data.telefone ? removeMask(data.telefone) : undefined,
        celular: data.celular ? removeMask(data.celular) : undefined,
        cep: data.cep ? removeMask(data.cep) : undefined,
      };

      const response = await fetch("/api/admin-clinica/pacientes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let error;
        try {
          error = await response.json();
        } catch (e) {
          console.error("Erro ao processar JSON:", e);
          error = { error: "Erro ao processar resposta do servidor" };
        }
        
        console.log("Status da resposta:", response.status);
        console.log("Erro recebido:", error);
        
        // Tratamento específico para erro 409 (CPF já cadastrado)
        if (response.status === 409) {
          const errorMessage = error.error || "CPF já cadastrado";
          console.log("Status 409 detectado. Erro:", errorMessage);
          
          // Desativa loading
          setLoading(false);
          
          // Exibe toast de erro
          const toastId = toast.error("⚠️ CPF Duplicado", {
            description: `${errorMessage}. Este CPF já está cadastrado para outro paciente no sistema. Verifique se o paciente já existe antes de tentar cadastrar novamente.`,
            duration: 6000,
          });
          
          console.log("Toast exibido com ID:", toastId);
          
          // Retorna sem lançar erro para manter o formulário aberto
          return;
        }
        throw new Error(error.error || "Erro ao criar paciente");
      }

      toast.success("Paciente criado com sucesso!");
      router.push("/secretaria/pacientes");
    } catch (error: any) {
      // Só mostra toast genérico se não foi o erro 409 (que já foi tratado acima com toast específico)
      const errorMessage = error?.message || "Erro ao criar paciente";
      if (!errorMessage.includes("CPF já cadastrado")) {
        toast.error(errorMessage);
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center gap-4 px-4 lg:px-6">
          <Link href="/secretaria/pacientes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Novo Paciente</h1>
            <p className="text-muted-foreground">
              Cadastre um novo paciente na clínica
            </p>
          </div>
        </div>

        <div className="px-4 lg:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Paciente</CardTitle>
              <CardDescription>
                Preencha as informações do paciente
              </CardDescription>
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
                          <FormLabel>Nome Completo *</FormLabel>
                          <FormControl>
                            <Input {...field} maxLength={100} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cpf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="000.000.000-00"
                              maxLength={14}
                              value={field.value ? maskCPF(field.value) : ""}
                              onChange={(e) => {
                                const masked = maskCPF(e.target.value);
                                field.onChange(masked);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="rg"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>RG</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="00.000.000-0"
                              maxLength={12}
                              value={field.value ? maskRG(field.value) : ""}
                              onChange={(e) => {
                                const masked = maskRG(e.target.value);
                                field.onChange(masked);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dataNascimento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Nascimento *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sexo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sexo *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o sexo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="M">Masculino</SelectItem>
                              <SelectItem value="F">Feminino</SelectItem>
                              <SelectItem value="OUTRO">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="estadoCivil"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado Civil</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === "" ? undefined : value)}
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o estado civil" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="SOLTEIRO">Solteiro(a)</SelectItem>
                              <SelectItem value="CASADO">Casado(a)</SelectItem>
                              <SelectItem value="DIVORCIADO">
                                Divorciado(a)
                              </SelectItem>
                              <SelectItem value="VIUVO">Viúvo(a)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} maxLength={100} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="telefone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="(00) 0000-0000"
                              maxLength={14}
                              value={field.value ? maskTelefone(field.value) : ""}
                              onChange={(e) => {
                                const masked = maskTelefone(e.target.value);
                                field.onChange(masked);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="celular"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Celular</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="(00) 00000-0000"
                              maxLength={15}
                              value={field.value ? maskCelular(field.value) : ""}
                              onChange={(e) => {
                                const masked = maskCelular(e.target.value);
                                field.onChange(masked);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="profissao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profissão</FormLabel>
                          <FormControl>
                            <Input {...field} maxLength={100} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <h3 className="mb-4 text-lg font-semibold">Endereço</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="cep"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CEP</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="00000-000"
                                maxLength={9}
                                value={field.value ? maskCEP(field.value) : ""}
                                onChange={(e) => {
                                  const masked = maskCEP(e.target.value);
                                  field.onChange(masked);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="endereco"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Endereço</FormLabel>
                            <FormControl>
                              <Input {...field} maxLength={200} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="numero"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número</FormLabel>
                            <FormControl>
                              <Input {...field} maxLength={10} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="complemento"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Complemento</FormLabel>
                            <FormControl>
                              <Input {...field} maxLength={50} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="bairro"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bairro</FormLabel>
                            <FormControl>
                              <Input {...field} maxLength={100} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="cidade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cidade</FormLabel>
                            <FormControl>
                              <Input {...field} maxLength={100} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="estado"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="UF" maxLength={2} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-4 text-lg font-semibold">
                      Informações Adicionais
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="nomeMae"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome da Mãe</FormLabel>
                            <FormControl>
                              <Input {...field} maxLength={100} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="nomePai"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Pai</FormLabel>
                            <FormControl>
                              <Input {...field} maxLength={100} />
                            </FormControl>
                            <FormMessage />
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
                              <Textarea
                                {...field}
                                rows={4}
                                maxLength={1000}
                                placeholder="Observações sobre o paciente..."
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push("/secretaria/pacientes")}
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
    </div>
  );
}










