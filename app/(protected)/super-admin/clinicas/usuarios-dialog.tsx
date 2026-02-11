"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TipoUsuario } from "@/lib/generated/prisma";
import { formatCPF } from "@/lib/utils";
import { Plus, Edit, Power, Loader2 } from "lucide-react";

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
}

interface UsuariosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  cpf: z.string().optional(), // CPF não é editável, apenas para validação
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

const getTipoLabel = (tipo: TipoUsuario) => {
  switch (tipo) {
    case TipoUsuario.SUPER_ADMIN:
      return "Super Admin";
    case TipoUsuario.ADMIN_CLINICA:
      return "Admin Clínica";
    case TipoUsuario.MEDICO:
      return "Médico";
    case TipoUsuario.SECRETARIA:
      return "Secretária";
    case TipoUsuario.PACIENTE:
      return "Paciente";
    default:
      return tipo;
  }
};

const getTipoBadgeVariant = (tipo: TipoUsuario) => {
  switch (tipo) {
    case TipoUsuario.SUPER_ADMIN:
      return "default";
    case TipoUsuario.ADMIN_CLINICA:
      return "secondary";
    case TipoUsuario.MEDICO:
      return "outline";
    default:
      return "outline";
  }
};

export function UsuariosDialog({
  open,
  onOpenChange,
  clinica,
}: UsuariosDialogProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
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

  // Carregar usuários quando o diálogo abrir
  useEffect(() => {
    if (open && clinica.id) {
      loadUsuarios();
    }
  }, [open, clinica.id]);

  // Resetar formulário quando abrir/fechar
  useEffect(() => {
    if (!formOpen) {
      form.reset();
      setEditingUsuario(null);
      setIsEditing(false);
    }
  }, [formOpen, form]);

  // Atualizar schema quando mudar entre criar/editar
  useEffect(() => {
    if (isEditing) {
      form.clearErrors();
      // Não precisamos mudar o resolver dinamicamente, vamos validar manualmente
    }
  }, [isEditing, form]);

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
    setFormOpen(true);
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
      senha: "", // Não preencher senha ao editar
    });
    setFormOpen(true);
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
        
        // Validar schema de atualização (sem CPF, pois não é editável)
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
          throw new Error(errorData.error || "Erro ao criar usuário");
        }

        toast.success("Usuário criado com sucesso!");
      }

      setFormOpen(false);
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Usuários - {clinica.nome}</DialogTitle>
            <DialogDescription>
              Gerencie os usuários desta clínica
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Usuário
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : usuarios.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum usuário encontrado
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuarios.map((usuario) => (
                      <TableRow key={usuario.id}>
                        <TableCell className="font-medium">
                          {usuario.nome}
                        </TableCell>
                        <TableCell>{usuario.email}</TableCell>
                        <TableCell>{formatCPF(usuario.cpf)}</TableCell>
                        <TableCell>
                          <Badge variant={getTipoBadgeVariant(usuario.tipo)}>
                            {getTipoLabel(usuario.tipo)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={usuario.ativo ? "default" : "secondary"}>
                            {usuario.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(usuario)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleStatus(usuario)}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de formulário */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUsuario ? "Editar Usuário" : "Novo Usuário"}
            </DialogTitle>
            <DialogDescription>
              {editingUsuario
                ? "Atualize as informações do usuário"
                : "Preencha os dados para criar um novo usuário"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
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
                      {editingUsuario ? "Nova Senha (Opcional)" : "Senha"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={editingUsuario ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
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
                  onClick={() => setFormOpen(false)}
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
        </DialogContent>
      </Dialog>
    </>
  );
}

