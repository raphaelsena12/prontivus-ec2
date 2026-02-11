"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { TipoUsuario } from "@/lib/generated/prisma";
import { maskCPF, maskTelefoneAuto, removeMask } from "@/lib/masks";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  telefone: string | null;
  tipo: TipoUsuario;
  ativo: boolean;
}

interface UsuarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario: Usuario | null;
  onSuccess: () => void;
}

const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;

const createUsuarioSchema = z.object({
  nome: z.string()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  email: z.string()
    .email("Email inválido")
    .max(100, "Email deve ter no máximo 100 caracteres"),
  cpf: z
    .string()
    .min(11, "CPF deve ter 11 dígitos")
    .max(14, "CPF inválido")
    .refine((val) => removeMask(val).length === 11, {
      message: "CPF inválido",
    }),
  telefone: z
    .string()
    .min(1, "Telefone é obrigatório")
    .max(15, "Telefone inválido")
    .refine(
      (val) => phoneRegex.test(val),
      { message: "Telefone inválido. Use o formato (XX) XXXXX-XXXX" }
    ),
  tipo: z.nativeEnum(TipoUsuario),
  senha: z.string()
    .min(1, "Senha é obrigatória")
    .min(6, "Senha deve ter no mínimo 6 caracteres")
    .max(255, "Senha deve ter no máximo 255 caracteres"),
});

const updateUsuarioSchema = z.object({
  nome: z.string()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  email: z.string()
    .email("Email inválido")
    .max(100, "Email deve ter no máximo 100 caracteres"),
  telefone: z
    .string()
    .min(1, "Telefone é obrigatório")
    .max(15, "Telefone inválido")
    .refine(
      (val) => phoneRegex.test(val),
      { message: "Telefone inválido. Use o formato (XX) XXXXX-XXXX" }
    ),
  tipo: z.nativeEnum(TipoUsuario),
  senha: z
    .union([
      z.string().min(6, "Senha deve ter no mínimo 6 caracteres").max(255, "Senha deve ter no máximo 255 caracteres"),
      z.literal(""),
      z.undefined()
    ])
    .optional(),
  ativo: z.boolean().optional(),
});

type UsuarioFormValues = z.infer<typeof createUsuarioSchema>;

export function UsuarioDialog({
  open,
  onOpenChange,
  usuario,
  onSuccess,
}: UsuarioDialogProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!usuario;

  const form = useForm<UsuarioFormValues>({
    resolver: zodResolver(createUsuarioSchema),
    mode: "onSubmit",
    defaultValues: {
      nome: "",
      email: "",
      cpf: "",
      telefone: "",
      tipo: TipoUsuario.MEDICO,
      senha: "",
    },
  });

  useEffect(() => {
    if (usuario) {
      form.reset({
        nome: usuario.nome,
        email: usuario.email,
        cpf: maskCPF(usuario.cpf),
        telefone: usuario.telefone ? maskTelefoneAuto(usuario.telefone) : "",
        tipo: usuario.tipo,
        senha: "",
      });
    } else {
      form.reset({
        nome: "",
        email: "",
        cpf: "",
        telefone: "",
        tipo: TipoUsuario.MEDICO,
        senha: "",
      });
    }
    // Atualizar o resolver quando mudar entre criar e editar
    form.clearErrors();
  }, [usuario, form]);

  const onSubmit = async (data: UsuarioFormValues) => {
    try {
      setLoading(true);

      const cpfLimpo = removeMask(data.cpf);
      const telefoneLimpo = removeMask(data.telefone);

      if (isEditing) {
        // Validar schema de atualização (senha é opcional)
        // Primeiro, limpar erro de senha se estiver vazia
        if (!data.senha || data.senha.trim() === "") {
          form.clearErrors("senha");
        }
        
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
          setLoading(false);
          return;
        }

        const updateData: any = {
          nome: data.nome,
          email: data.email,
          telefone: telefoneLimpo,
          tipo: data.tipo,
        };

        if (data.senha && data.senha.trim() !== "") {
          updateData.senha = data.senha.trim();
        }

        const response = await fetch(`/api/admin-clinica/usuarios/${usuario.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          const error = await response.json();
          let errorMessage = error.error || "Erro ao atualizar usuário";
          
          // Se houver detalhes de validação, formatar e exibir
          if (error.details && Array.isArray(error.details)) {
            const detailsMessages = error.details.map((detail: any) => {
              const field = detail.path?.join(".") || "campo";
              return `${field}: ${detail.message}`;
            }).join("; ");
            errorMessage = `${errorMessage} - ${detailsMessages}`;
          }
          
          throw new Error(errorMessage);
        }

        toast.success("Usuário atualizado com sucesso!");
      } else {
        const response = await fetch(`/api/admin-clinica/usuarios`, {
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
        });

        if (!response.ok) {
          const error = await response.json();
          let errorMessage = error.error || "Erro ao criar usuário";
          
          // Se houver detalhes de validação, formatar e exibir
          if (error.details && Array.isArray(error.details)) {
            const detailsMessages = error.details.map((detail: any) => {
              const field = detail.path?.join(".") || "campo";
              return `${field}: ${detail.message}`;
            }).join("; ");
            errorMessage = `${errorMessage} - ${detailsMessages}`;
          }
          
          throw new Error(errorMessage);
        }

        toast.success("Usuário criado com sucesso!");
      }

      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar usuário"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Usuário" : "Novo Usuário"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
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
                  <FormLabel>
                    Nome <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nome completo"
                      {...field}
                      disabled={loading}
                      maxLength={100}
                    />
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
                    <FormLabel>
                      Email <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@exemplo.com"
                        {...field}
                        disabled={loading}
                        maxLength={100}
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
                    <FormLabel>
                      CPF <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="000.000.000-00"
                        disabled={isEditing || loading}
                        maxLength={14}
                        value={field.value ? maskCPF(field.value) : ""}
                        onChange={(e) => {
                          const masked = maskCPF(e.target.value);
                          field.onChange(masked);
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
                    <FormLabel>
                      Telefone <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(00) 00000-0000"
                        {...field}
                        disabled={loading}
                        maxLength={15}
                        value={field.value ? maskTelefoneAuto(field.value) : ""}
                        onChange={(e) => {
                          const masked = maskTelefoneAuto(e.target.value);
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
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Tipo de Usuário <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={loading}
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
                    {isEditing ? "Nova Senha (Opcional)" : "Senha"} {!isEditing && <span className="text-destructive">*</span>}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={
                        isEditing
                          ? "Deixe em branco para manter"
                          : "Mínimo 6 caracteres"
                      }
                      {...field}
                      disabled={loading}
                      maxLength={255}
                      onChange={(e) => {
                        // Limpar erro de validação quando estiver editando e campo estiver vazio
                        if (isEditing && e.target.value === "") {
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

