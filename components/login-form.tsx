"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AlertCircle, Mail, Lock, ArrowLeft, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  FieldLabel,
} from "@/components/ui/field";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email é obrigatório")
    .email("Formato de email inválido"),
  password: z
    .string()
    .min(1, "Senha é obrigatória")
    .min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const recuperarSenhaSchema = z.object({
  email: z
    .string()
    .min(1, "Email é obrigatório")
    .email("Formato de email inválido"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RecuperarSenhaFormValues = z.infer<typeof recuperarSenhaSchema>;

function LoginFormContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showRecuperarSenha, setShowRecuperarSenha] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [recuperarSenhaSuccess, setRecuperarSenhaSuccess] = useState(false);

  // Tratar erros da URL
  const urlError = searchParams.get("error");
  const [error, setError] = useState<string | null>(() => {
    if (!urlError) return null;
    if (urlError === "true" || urlError === "Configuration") {
      return "Erro de configuração. Verifique as variáveis de ambiente.";
    }
    // Limpar o erro da URL
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
    }
    return "Erro ao fazer login. Verifique suas credenciais.";
  });

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const recuperarSenhaForm = useForm<RecuperarSenhaFormValues>({
    resolver: zodResolver(recuperarSenhaSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleEsqueceuSenha = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsTransitioning(true);
    setTimeout(() => {
      setShowRecuperarSenha(true);
      setIsTransitioning(false);
      // Focar no input após a transição
      setTimeout(() => {
        const input = document.getElementById("recuperar-email") as HTMLInputElement;
        if (input) {
          input.focus();
          input.click();
        }
      }, 350);
    }, 300);
  };

  const handleVoltarLogin = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setShowRecuperarSenha(false);
      setRecuperarSenhaSuccess(false);
      recuperarSenhaForm.reset();
      setIsTransitioning(false);
    }, 300);
  };

  const onRecuperarSenha = async (data: RecuperarSenhaFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/recuperar-senha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: data.email }),
      });

      if (response.ok) {
        setRecuperarSenhaSuccess(true);
      } else {
        const result = await response.json();
        recuperarSenhaForm.setError("email", {
          type: "manual",
          message: result.error || "Erro ao enviar email de recuperação",
        });
      }
    } catch (error) {
      recuperarSenhaForm.setError("email", {
        type: "manual",
        message: "Erro ao processar solicitação",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        let errorMessage = "Erro ao fazer login. Tente novamente.";

        if (result.error === "CredentialsSignin") {
          errorMessage =
            "Email ou senha incorretos. Verifique suas credenciais.";
        } else if (result.error === "Configuration") {
          errorMessage =
            "Erro de configuração do servidor. Entre em contato com o suporte.";
        } else if (result.error === "true") {
          errorMessage = "Erro ao fazer login. Verifique suas credenciais.";
        } else if (
          typeof result.error === "string" &&
          result.error.length > 0
        ) {
          errorMessage = result.error;
        }

        setError(errorMessage);
        setIsLoading(false);
      } else if (result?.ok) {
        // Buscar sessão para verificar se precisa selecionar tenant
        const sessionResponse = await fetch("/api/auth/session");
        const session = await sessionResponse.json();

        if (session?.user?.requiresTenantSelection) {
          // Redirecionar para seleção de clínica
          router.push("/selecionar-clinica");
        } else {
          router.push("/dashboard");
        }
        router.refresh();
      }
    } catch {
      setError("Erro ao fazer login. Tente novamente.");
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6 relative", className)} {...props}>
      <div className="flex flex-col gap-6 relative">
        {/* Container com transição */}
        {!showRecuperarSenha ? (
          <div
            key="login-form"
            className={cn(
              "transition-all duration-300 ease-in-out w-full",
              isTransitioning && "opacity-0 scale-95",
              !isTransitioning && "opacity-100 scale-100"
            )}
            style={{ display: isTransitioning ? "none" : "block" }}
          >
            {/* Formulário de Login */}
            <>
              {/* Card principal com tudo dentro */}
              <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl transition-all duration-300 hover:shadow-2xl hover:shadow-white/20 hover:border-white/40">
                <CardContent className="pt-6 pb-6">
                  {/* Logo e título no topo do card */}
                  <div className="mb-6 text-center">
                    <div className="mb-4 flex items-center justify-center">
                      <Image 
                        src="/LogotipoemFundoTransparente.webp" 
                        alt="Prontivus" 
                        width={180} 
                        height={54}
                        className="h-auto"
                        priority
                      />
                    </div>
                  </div>

                  {error && (
                    <Alert variant="destructive" className="mb-6 bg-red-500/20 border-red-400/30">
                      <AlertCircle className="h-4 w-4 text-red-300" />
                      <AlertTitle className="text-red-200">Erro</AlertTitle>
                      <AlertDescription className="text-red-200/90">{error}</AlertDescription>
                    </Alert>
                  )}

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FieldLabel htmlFor="email" className="text-white/90">Email</FieldLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                                <Input
                                  id="email"
                                  type="email"
                                  placeholder="nome@exemplo.com"
                                  className={cn(
                                    "pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/50",
                                    "focus:bg-white/20 focus:border-white/40",
                                    field.value && "bg-white/20 text-white border-white/30"
                                  )}
                                  disabled={isLoading}
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FieldLabel htmlFor="password" className="text-white/90">Senha</FieldLabel>
                              <button
                                type="button"
                                onClick={handleEsqueceuSenha}
                                className="text-sm text-white/70 hover:text-white underline-offset-4 hover:underline"
                              >
                                Esqueceu a senha?
                              </button>
                            </div>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                                <Input
                                  id="password"
                                  type="password"
                                  placeholder="••••••••"
                                  className={cn(
                                    "pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/50",
                                    "focus:bg-white/20 focus:border-white/40",
                                    field.value && "bg-white/20 text-white border-white/30"
                                  )}
                                  disabled={isLoading}
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full bg-white text-slate-900 hover:bg-white/90 font-semibold" 
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Entrando...
                          </>
                        ) : (
                          "Entrar"
                        )}
                      </Button>
                    </form>
                  </Form>

                  {/* Footer dentro do card */}
                  <div className="mt-4 text-center text-sm text-white/70">
                    Não tem uma conta?{" "}
                    <a
                      href="#"
                      className="text-white hover:text-white/90 hover:underline underline-offset-4 font-medium"
                    >
                      Entre em contato
                    </a>
                  </div>

                  {/* Rodapé elegante */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs text-white/50 text-center">
                      © 2026 Prontivus. Todos os direitos reservados.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          </div>
        ) : (
          <div
            key="recover-form"
            className={cn(
              "transition-all duration-300 ease-in-out w-full",
              isTransitioning && "opacity-0 scale-95",
              !isTransitioning && "opacity-100 scale-100"
            )}
            style={{ display: isTransitioning ? "none" : "block" }}
          >
            {/* Formulário de Recuperação de Senha */}
            <>
              {/* Card principal com tudo dentro */}
              <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl transition-all duration-300 hover:shadow-2xl hover:shadow-white/20 hover:border-white/40">
                <CardContent className="pt-6 pb-6">
                  {/* Logo e título no topo do card */}
                  <div className="mb-6 text-center">
                    <div className="mb-4 flex items-center justify-center">
                      <Image 
                        src="/LogotipoemFundoTransparente.webp" 
                        alt="Prontivus" 
                        width={180} 
                        height={54}
                        className="h-auto"
                        priority
                      />
                    </div>
                  </div>

                  {/* Header do formulário */}
                  <div className="flex flex-col gap-2 text-center mb-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <button
                        type="button"
                        onClick={handleVoltarLogin}
                        className="p-1 hover:bg-white/10 rounded-md transition-colors text-white"
                        aria-label="Voltar para login"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <h2 className="text-2xl font-bold tracking-tight text-white">Recuperar Senha</h2>
                    </div>
                    <p className="text-white/70 text-sm">
                      {recuperarSenhaSuccess
                        ? "Verifique sua caixa de entrada"
                        : "Digite seu email para receber um link de recuperação"}
                    </p>
                  </div>

                  {recuperarSenhaSuccess ? (
                    <Alert className="mb-4 border-emerald-400/30 bg-emerald-500/20">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <AlertTitle className="text-emerald-200">
                        Email enviado!
                      </AlertTitle>
                      <AlertDescription className="text-emerald-200/90">
                        Se o email estiver cadastrado, você receberá um link de recuperação em breve.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Form {...recuperarSenhaForm}>
                      <form
                        onSubmit={recuperarSenhaForm.handleSubmit(onRecuperarSenha)}
                        className="space-y-4"
                        noValidate
                      >
                        <FormField
                          control={recuperarSenhaForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FieldLabel htmlFor="recuperar-email" className="text-white/90">Email</FieldLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50 pointer-events-none z-10" />
                                  <Input
                                    id="recuperar-email"
                                    type="email"
                                    placeholder="nome@exemplo.com"
                                    className={cn(
                                      "pl-9 relative z-0 bg-white/10 border-white/20 text-white placeholder:text-white/50",
                                      "focus:bg-white/20 focus:border-white/40",
                                      field.value && "bg-white/20 text-white border-white/30"
                                    )}
                                    disabled={isLoading}
                                    autoComplete="email"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          className="w-full bg-white text-slate-900 hover:bg-white/90 font-semibold" 
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              Enviando...
                            </>
                          ) : (
                            "Enviar link de recuperação"
                          )}
                        </Button>
                      </form>
                    </Form>
                  )}

                  {/* Footer dentro do card */}
                  {!recuperarSenhaSuccess && (
                    <div className="mt-4 text-center text-sm text-white/70">
                      Lembrou sua senha?{" "}
                      <button
                        type="button"
                        onClick={handleVoltarLogin}
                        className="text-white hover:text-white/90 hover:underline underline-offset-4 font-medium"
                      >
                        Voltar para login
                      </button>
                    </div>
                  )}

                  {/* Rodapé elegante */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs text-white/50 text-center">
                      © 2024 Prontivus. Todos os direitos reservados.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          </div>
        )}
      </div>
    </div>
  );
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <LoginFormContent className={className} {...props} />
    </Suspense>
  );
}
