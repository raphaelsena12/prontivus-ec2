"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AvatarWithS3 } from "@/components/avatar-with-s3";
import { formatCPF } from "@/lib/utils";
import { Loader2, ArrowLeft, Camera, Lock, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  telefone: string | null;
  avatar: string | null;
  tipo: string;
  createdAt: Date;
  updatedAt: Date;
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

const updatePerfilSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  telefone: z
    .string()
    .optional()
    .refine(
      (val) => !val || phoneRegex.test(formatPhone(val)),
      { message: "Telefone inválido. Use o formato (XX) XXXXX-XXXX" }
    ),
});

const changePasswordSchema = z.object({
  senhaAtual: z.string().min(1, "Senha atual é obrigatória"),
  novaSenha: z.string().min(6, "Nova senha deve ter no mínimo 6 caracteres"),
  confirmarSenha: z.string().min(6, "Confirmação de senha é obrigatória"),
}).refine((data) => data.novaSenha === data.confirmarSenha, {
  message: "As senhas não coincidem",
  path: ["confirmarSenha"],
});

type PerfilFormValues = z.infer<typeof updatePerfilSchema>;
type PasswordFormValues = z.infer<typeof changePasswordSchema>;

export function PerfilContent() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const perfilForm = useForm<PerfilFormValues>({
    resolver: zodResolver(updatePerfilSchema),
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  useEffect(() => {
    loadPerfil();
  }, []);

  const loadPerfil = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/perfil");
      if (!response.ok) {
        throw new Error("Erro ao carregar perfil");
      }
      const data = await response.json();
      setUsuario(data.usuario);
      perfilForm.reset({
        nome: data.usuario.nome,
        email: data.usuario.email,
        telefone: data.usuario.telefone
          ? formatPhone(data.usuario.telefone)
          : "",
      });
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
      toast.error("Erro ao carregar perfil");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleUpdatePerfil = async (data: PerfilFormValues) => {
    setIsSubmitting(true);
    try {
      const telefoneLimpo = data.telefone?.replace(/\D/g, "") || null;

      const response = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: data.nome,
          email: data.email,
          telefone: telefoneLimpo,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao atualizar perfil");
      }

      const result = await response.json();
      setUsuario(result.usuario);
      
      // Atualizar sessão
      await update({
        ...session,
        user: {
          ...session?.user,
          nome: result.usuario.nome,
          email: result.usuario.email,
        },
      });

      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao atualizar perfil"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (data: PasswordFormValues) => {
    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/perfil/senha", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senhaAtual: data.senhaAtual,
          novaSenha: data.novaSenha,
          confirmarSenha: data.confirmarSenha,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao alterar senha");
      }

      passwordForm.reset();
      toast.success("Senha alterada com sucesso!");
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao alterar senha"
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      // Criar FormData para enviar o arquivo
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/perfil/avatar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao atualizar avatar");
      }

      const result = await response.json();
      setUsuario(result.usuario);
      
      // Atualizar sessão
      await update({
        ...session,
        user: {
          ...session?.user,
          avatar: result.usuario.avatar,
        },
      });

      toast.success("Foto atualizada com sucesso!");
      setUploadingAvatar(false);
    } catch (error) {
      console.error("Erro ao atualizar avatar:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao atualizar avatar"
      );
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Erro ao carregar perfil</p>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col pt-2">
        <div className="px-4 lg:px-6">
          <Tabs defaultValue="perfil" className="space-y-4">
            <TabsList>
              <TabsTrigger value="perfil" className="flex items-center gap-2 text-xs">
                <User className="h-3.5 w-3.5" />
                Informações Pessoais
              </TabsTrigger>
              <TabsTrigger value="senha" className="flex items-center gap-2 text-xs">
                <Lock className="h-3.5 w-3.5" />
                Alterar Senha
              </TabsTrigger>
            </TabsList>

            <TabsContent value="perfil" className="space-y-4">
              <Card>
                <CardHeader className="p-4 pb-3">
                  <CardTitle className="text-xl">Foto de Perfil</CardTitle>
                  <CardDescription className="text-xs">
                    Clique na foto para alterar sua imagem de perfil
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <AvatarWithS3
                        avatar={usuario.avatar}
                        alt={usuario.nome}
                        fallback={getInitials(usuario.nome)}
                        className="h-20 w-20"
                        fallbackClassName="bg-gradient-to-br from-primary/20 to-primary/10 font-semibold text-xl"
                      />
                      <label
                        htmlFor="avatar-upload"
                        className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarUpload}
                          disabled={uploadingAvatar}
                        />
                      </label>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG ou GIF. Máximo de 5MB.
                      </p>
                      {uploadingAvatar && (
                        <p className="text-xs text-primary mt-2 flex items-center gap-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Enviando...
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4 pb-3">
                  <CardTitle className="text-xl">Informações Pessoais</CardTitle>
                  <CardDescription className="text-xs">
                    Atualize suas informações de contato
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <Form {...perfilForm}>
                    <form
                      onSubmit={perfilForm.handleSubmit(handleUpdatePerfil)}
                      className="space-y-4"
                    >
                      <FormField
                        control={perfilForm.control}
                        name="nome"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome Completo</FormLabel>
                            <FormControl>
                              <Input placeholder="Seu nome completo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={perfilForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="seu@email.com"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={perfilForm.control}
                          name="telefone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefone</FormLabel>
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
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormItem>
                          <FormLabel>CPF</FormLabel>
                          <FormControl>
                            <Input
                              value={formatCPF(usuario.cpf)}
                              disabled
                              className="bg-muted"
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            CPF não pode ser alterado
                          </p>
                        </FormItem>

                        <FormItem>
                          <FormLabel>Tipo de Usuário</FormLabel>
                          <FormControl>
                            <Input
                              value={usuario.tipo}
                              disabled
                              className="bg-muted"
                            />
                          </FormControl>
                        </FormItem>
                      </div>

                      <div className="flex justify-end gap-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => router.back()}
                          disabled={isSubmitting}
                          className="text-xs"
                        >
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="text-xs">
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            "Salvar Alterações"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="senha" className="space-y-4">
              <Card>
                <CardHeader className="p-4 pb-3">
                  <CardTitle className="text-xl">Alterar Senha</CardTitle>
                  <CardDescription className="text-xs">
                    Digite sua senha atual e escolha uma nova senha
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <Form {...passwordForm}>
                    <form
                      onSubmit={passwordForm.handleSubmit(handleChangePassword)}
                      className="space-y-4"
                    >
                      <FormField
                        control={passwordForm.control}
                        name="senhaAtual"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha Atual</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Digite sua senha atual"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Separator />

                      <FormField
                        control={passwordForm.control}
                        name="novaSenha"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nova Senha</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Mínimo 6 caracteres"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={passwordForm.control}
                        name="confirmarSenha"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirmar Nova Senha</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Digite a nova senha novamente"
                                {...field}
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
                          onClick={() => passwordForm.reset()}
                          disabled={isChangingPassword}
                          className="text-xs"
                        >
                          Limpar
                        </Button>
                        <Button type="submit" disabled={isChangingPassword} className="text-xs">
                          {isChangingPassword ? (
                            <>
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              Alterando...
                            </>
                          ) : (
                            "Alterar Senha"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

