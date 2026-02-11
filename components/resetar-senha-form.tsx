"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AlertCircle, Lock, CheckCircle2, ArrowLeft } from "lucide-react";
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
import Link from "next/link";

const resetarSenhaSchema = z.object({
  senha: z
    .string()
    .min(1, "Senha é obrigatória")
    .min(6, "Senha deve ter no mínimo 6 caracteres"),
  confirmarSenha: z
    .string()
    .min(1, "Confirmação de senha é obrigatória"),
}).refine((data) => data.senha === data.confirmarSenha, {
  message: "As senhas não coincidem",
  path: ["confirmarSenha"],
});

type ResetarSenhaFormValues = z.infer<typeof resetarSenhaSchema>;

function ResetarSenhaFormContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenValido, setTokenValido] = useState<boolean | null>(null);

  const form = useForm<ResetarSenhaFormValues>({
    resolver: zodResolver(resetarSenhaSchema),
    defaultValues: {
      senha: "",
      confirmarSenha: "",
    },
  });

  // Verificar se o token é válido ao carregar
  useEffect(() => {
    const verificarToken = async () => {
      if (!token) {
        setTokenValido(false);
        setError("Token de recuperação não fornecido.");
        return;
      }

      try {
        const response = await fetch(`/api/auth/verificar-token?token=${token}`);
        if (response.ok) {
          setTokenValido(true);
        } else {
          const result = await response.json();
          setTokenValido(false);
          setError(result.error || "Token inválido ou expirado.");
        }
      } catch (error) {
        setTokenValido(false);
        setError("Erro ao verificar token.");
      }
    };

    verificarToken();
  }, [token]);

  const onSubmit = async (data: ResetarSenhaFormValues) => {
    if (!token) {
      setError("Token de recuperação não fornecido.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/resetar-senha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          senha: data.senha,
        }),
      });

      if (response.ok) {
        setSuccess(true);
        // Redirecionar para login após 3 segundos
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        const result = await response.json();
        setError(result.error || "Erro ao redefinir senha.");
      }
    } catch (error) {
      setError("Erro ao processar solicitação.");
    } finally {
      setIsLoading(false);
    }
  };

  if (tokenValido === null) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl">
          <CardContent className="pt-8 pb-8">
            {/* Logo e título no topo do card */}
            <div className="mb-8 text-center">
              <div className="mb-6 flex items-center justify-center">
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
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-white border-r-transparent"></div>
              <p className="mt-4 text-white/70">Verificando token...</p>
            </div>
            {/* Rodapé elegante */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-xs text-white/50 text-center">
                © 2024 Prontivus. Todos os direitos reservados.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokenValido) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl">
          <CardContent className="pt-8 pb-8">
            {/* Logo e título no topo do card */}
            <div className="mb-8 text-center">
              <div className="mb-6 flex items-center justify-center">
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

            {/* Header */}
            <div className="flex flex-col gap-2 text-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-white">Token Inválido</h2>
              <p className="text-white/70 text-sm">
                O link de recuperação é inválido ou expirou.
              </p>
            </div>
            <Alert variant="destructive" className="bg-red-500/20 border-red-400/30">
              <AlertCircle className="h-4 w-4 text-red-300" />
              <AlertTitle className="text-red-200">Erro</AlertTitle>
              <AlertDescription className="text-red-200/90">{error || "Token inválido ou expirado."}</AlertDescription>
            </Alert>
            <div className="mt-6 text-center">
              <Link href="/login">
                <Button variant="outline" className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20">
                  Voltar para login
                </Button>
              </Link>
            </div>

            {/* Rodapé elegante */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-xs text-white/50 text-center">
                © 2024 Prontivus. Todos os direitos reservados.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl">
          <CardContent className="pt-8 pb-8">
            {/* Logo e título no topo do card */}
            <div className="mb-8 text-center">
              <div className="mb-6 flex items-center justify-center">
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

            {/* Header */}
            <div className="flex flex-col gap-2 text-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-white">Senha Redefinida!</h2>
              <p className="text-white/70 text-sm">
                Sua senha foi redefinida com sucesso.
              </p>
            </div>
            <Alert className="mb-6 border-emerald-400/30 bg-emerald-500/20">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <AlertTitle className="text-emerald-200">
                Sucesso!
              </AlertTitle>
              <AlertDescription className="text-emerald-200/90">
                Sua senha foi redefinida com sucesso. Você será redirecionado para a página de login em instantes.
              </AlertDescription>
            </Alert>
            <div className="text-center">
              <Link href="/login">
                <Button className="w-full bg-white text-slate-900 hover:bg-white/90 font-semibold">
                  Ir para login
                </Button>
              </Link>
            </div>

            {/* Rodapé elegante */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-xs text-white/50 text-center">
                © 2024 Prontivus. Todos os direitos reservados.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col gap-6">
        {/* Card principal com tudo dentro */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl">
          <CardContent className="pt-8 pb-8">
            {/* Logo e título no topo do card */}
            <div className="mb-8 text-center">
              <div className="mb-6 flex items-center justify-center">
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
            <div className="flex flex-col gap-2 text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Link href="/login">
                  <button
                    type="button"
                    className="p-1 hover:bg-white/10 rounded-md transition-colors text-white"
                    aria-label="Voltar para login"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                </Link>
                <h2 className="text-2xl font-bold tracking-tight text-white">Redefinir Senha</h2>
              </div>
              <p className="text-white/70 text-sm">
                Digite sua nova senha abaixo
              </p>
            </div>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="senha"
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabel htmlFor="senha" className="text-white/90">Nova Senha</FieldLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                          <Input
                            id="senha"
                            type="password"
                            placeholder="••••••••"
                            className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-white/30"
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
                  name="confirmarSenha"
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabel htmlFor="confirmarSenha" className="text-white/90">Confirmar Senha</FieldLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                          <Input
                            id="confirmarSenha"
                            type="password"
                            placeholder="••••••••"
                            className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-white/30"
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
                      Redefinindo...
                    </>
                  ) : (
                    "Redefinir Senha"
                  )}
                </Button>
              </form>
            </Form>

            {/* Footer dentro do card */}
            <div className="mt-6 text-center text-sm text-white/70">
              Lembrou sua senha?{" "}
              <Link href="/login" className="text-white hover:text-white/90 hover:underline underline-offset-4 font-medium">
                Voltar para login
              </Link>
            </div>

            {/* Rodapé elegante */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-xs text-white/50 text-center">
                © 2024 Prontivus. Todos os direitos reservados.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ResetarSenhaForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ResetarSenhaFormContent className={className} {...props} />
    </Suspense>
  );
}
