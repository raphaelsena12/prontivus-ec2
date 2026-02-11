"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TipoUsuario } from "@/lib/generated/prisma";
import { formatCNPJ, formatCPF } from "@/lib/utils";
import { Plus, Loader2, ArrowLeft, X } from "lucide-react";
import { UsuariosTable } from "@/components/usuarios-table";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  telefone: string | null;
  tipo: TipoUsuario;
  ativo: boolean;
  primeiroAcesso: boolean;
  ultimoAcesso: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Clinica {
  id: string;
  nome: string;
  cnpj: string;
}

interface UsuariosContentProps {
  clinica: Clinica;
}

// Validação de telefone brasileiro
const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;

const formatPhone = (value: string) => {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 11) {
    if (cleaned.length <= 10) {
      return cleaned
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    } else {
      return cleaned
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2");
    }
  }
  return value;
};

const formatCPFInput = (value: string) => {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 11) {
    return cleaned
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return value;
};

const createUsuarioSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  cpf: z
    .string()
    .min(11, "CPF deve ter 11 dígitos")
    .refine((val) => val.replace(/\D/g, "").length === 11, {
      message: "CPF inválido",
    }),
  telefone: z
    .string()
    .optional()
    .refine(
      (val) => !val || phoneRegex.test(formatPhone(val)),
      { message: "Telefone inválido. Use o formato (XX) XXXXX-XXXX" }
    ),
  tipo: z.nativeEnum(TipoUsuario),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const updateUsuarioSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  cpf: z.string().optional(),
  telefone: z
    .string()
    .optional()
    .refine(
      (val) => !val || phoneRegex.test(formatPhone(val)),
      { message: "Telefone inválido. Use o formato (XX) XXXXX-XXXX" }
    ),
  tipo: z.nativeEnum(TipoUsuario),
  senha: z
    .union([z.string().min(6, "Senha deve ter no mínimo 6 caracteres"), z.literal(""), z.undefined()])
    .optional(),
});

type UsuarioFormValues = z.infer<typeof createUsuarioSchema>;


export function UsuariosContent({ clinica }: UsuariosContentProps) {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<UsuarioFormValues>({
    resolver: zodResolver(createUsuarioSchema),
    defaultValues: {
      nome: "",
      email: "",
      cpf: "",
      telefone: "",
      tipo: TipoUsuario.MEDICO,
      senha: "",
    },
  });

  // Carregar usuários ao montar o componente
  useEffect(() => {
    loadUsuarios();
  }, [clinica.id]);

  // Resetar formulário quando mostrar/esconder
  useEffect(() => {
    if (!showForm) {
      form.reset();
      setEditingUsuario(null);
      setIsEditing(false);
    }
  }, [showForm, form]);

  const loadUsuarios = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/super-admin/clinicas/${clinica.id}/usuarios`
      );
      if (!response.ok) {
        throw new Error("Erro ao carregar usuários");
      }
      const data = await response.json();
      setUsuarios(data.usuarios || []);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingUsuario(null);
    setIsEditing(false);
    form.reset({
      nome: "",
      email: "",
      cpf: "",
      telefone: "",
      tipo: TipoUsuario.MEDICO,
      senha: "",
    });
    setShowForm(true);
  };

  const handleEdit = (usuario: Usuario) => {
    setEditingUsuario(usuario);
    setIsEditing(true);
    form.reset({
      nome: usuario.nome,
      email: usuario.email,
      cpf: formatCPF(usuario.cpf),
      telefone: usuario.telefone ? formatPhone(usuario.telefone) : "",
      tipo: usuario.tipo,
      senha: "",
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingUsuario(null);
    setIsEditing(false);
    form.reset();
  };

  const handleToggleStatus = async (usuario: Usuario) => {
    try {
      const response = await fetch(
        `/api/super-admin/clinicas/${clinica.id}/usuarios/${usuario.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ativo: !usuario.ativo,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao alterar status");
      }

      toast.success(
        `Usuário ${!usuario.ativo ? "ativado" : "desativado"} com sucesso`
      );
      loadUsuarios();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao alterar status"
      );
    }
  };

  const onSubmit = async (data: UsuarioFormValues) => {
    setIsSubmitting(true);
    try {
      const cpfLimpo = data.cpf.replace(/\D/g, "");
      const telefoneLimpo = data.telefone?.replace(/\D/g, "") || null;

      if (editingUsuario) {
        // Limpar erro de senha se estiver vazia
        if (!data.senha || data.senha.trim() === "") {
          form.clearErrors("senha");
        }
        
        // Validar schema de atualização
        const updateValidation = updateUsuarioSchema.safeParse({
          nome: data.nome,
          email: data.email,
          telefone: data.telefone,
          tipo: data.tipo,
          senha: data.senha?.trim() || undefined,
        });

        if (!updateValidation.success) {
          updateValidation.error.issues.forEach((error) => {
            const field = error.path[0] as keyof UsuarioFormValues;
            if (field && field !== "cpf" && field !== "senha") {
              form.setError(field as any, { message: error.message });
            }
            // Validar senha apenas se foi fornecida
            if (field === "senha" && data.senha && data.senha.trim() !== "") {
              if (data.senha.trim().length < 6) {
                form.setError("senha", { message: "Senha deve ter no mínimo 6 caracteres" });
              }
            }
          });
          setIsSubmitting(false);
          return;
        }

        // Atualizar usuário
        const updateData: any = {
          nome: data.nome,
          email: data.email,
          telefone: telefoneLimpo,
          tipo: data.tipo,
        };

        // Só atualizar senha se foi fornecida
        if (data.senha && data.senha.trim() !== "") {
          updateData.senha = data.senha.trim();
        }

        const response = await fetch(
          `/api/super-admin/clinicas/${clinica.id}/usuarios/${editingUsuario.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updateData),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erro ao atualizar usuário");
        }

        toast.success("Usuário atualizado com sucesso!");
      } else {
        // Criar usuário
        const response = await fetch(
          `/api/super-admin/clinicas/${clinica.id}/usuarios`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nome: data.nome,
              email: data.email,
              cpf: cpfLimpo,
              telefone: telefoneLimpo,
              tipo: data.tipo,
              senha: data.senha,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          // Mostrar detalhes da validação se disponíveis
          if (errorData.details && Array.isArray(errorData.details)) {
            const messages = errorData.details.map((d: { path: string[]; message: string }) =>
              `${d.path.join('.')}: ${d.message}`
            ).join(', ');
            throw new Error(messages || errorData.error || "Erro ao criar usuário");
          }
          throw new Error(errorData.error || "Erro ao criar usuário");
        }

        toast.success("Usuário criado com sucesso!");
      }

      setShowForm(false);
      loadUsuarios();
    } catch (error) {
      console.error("Erro ao salvar usuário:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar usuário"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/super-admin/clinicas")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
              <p className="text-muted-foreground">
                {clinica.nome} - CNPJ: {formatCNPJ(clinica.cnpj)}
              </p>
            </div>
          </div>
          {!showForm && (
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          )}
        </div>

        {showForm ? (
          <Card className="mx-4 lg:mx-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {editingUsuario ? "Editar Usuário" : "Novo Usuário"}
                  </CardTitle>
                  <CardDescription>
                    {editingUsuario
                      ? "Atualize as informações do usuário"
                      : "Preencha os dados para criar um novo usuário"}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="email@exemplo.com"
                              {...field}
                            />
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
                          <FormLabel>CPF</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="000.000.000-00"
                              disabled={isEditing}
                              {...field}
                              onChange={(e) => {
                                const formatted = formatCPFInput(e.target.value);
                                field.onChange(formatted);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                          {isEditing && (
                            <p className="text-xs text-muted-foreground">
                              CPF não pode ser alterado
                            </p>
                          )}
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="telefone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone (Opcional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(00) 00000-0000"
                              {...field}
                              onChange={(e) => {
                                const formatted = formatPhone(e.target.value);
                                field.onChange(formatted);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tipo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Usuário</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={TipoUsuario.ADMIN_CLINICA}>
                                Admin Clínica
                              </SelectItem>
                              <SelectItem value={TipoUsuario.MEDICO}>
                                Médico
                              </SelectItem>
                              <SelectItem value={TipoUsuario.SECRETARIA}>
                                Secretária
                              </SelectItem>
                              <SelectItem value={TipoUsuario.PACIENTE}>
                                Paciente
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="senha"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {editingUsuario
                            ? "Nova Senha (Opcional)"
                            : "Senha"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder={
                              editingUsuario
                                ? "Deixe em branco para manter"
                                : "Mínimo 6 caracteres"
                            }
                            {...field}
                            onChange={(e) => {
                              // Limpar erro de validação quando estiver editando e campo estiver vazio
                              if (editingUsuario && e.target.value === "") {
                                form.clearErrors("senha");
                              }
                              field.onChange(e);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : editingUsuario ? (
                        "Atualizar"
                      ) : (
                        "Criar"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : null}

        {!showForm && (
          <div className="px-4 lg:px-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : usuarios.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">
                    Nenhum usuário encontrado
                  </p>
                </CardContent>
              </Card>
            ) : (
              <UsuariosTable
                data={usuarios}
                onEdit={handleEdit}
                onToggleStatus={handleToggleStatus}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

