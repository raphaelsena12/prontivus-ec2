"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowLeft,
  Search,
  UserPlus,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

const buscarMedicoSchema = z.object({
  email: z.string().email("Email inválido"),
});

const convidarMedicoSchema = z.object({
  email: z.string().email("Email inválido"),
  crm: z.string().min(1, "CRM é obrigatório"),
  especialidade: z.string().min(1, "Especialidade é obrigatória"),
});

type BuscarMedicoValues = z.infer<typeof buscarMedicoSchema>;
type ConvidarMedicoValues = z.infer<typeof convidarMedicoSchema>;

interface UsuarioEncontrado {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
}

interface BuscarResult {
  found: boolean;
  usuario?: UsuarioEncontrado;
  jaAssociado?: boolean;
  jaMedico?: boolean;
  message?: string;
}

export default function ConvidarMedicoPage() {
  const router = useRouter();
  const [isSearching, setIsSearching] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [searchResult, setSearchResult] = useState<BuscarResult | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const buscarForm = useForm<BuscarMedicoValues>({
    resolver: zodResolver(buscarMedicoSchema),
    defaultValues: { email: "" },
  });

  const convidarForm = useForm<ConvidarMedicoValues>({
    resolver: zodResolver(convidarMedicoSchema),
    defaultValues: { email: "", crm: "", especialidade: "" },
  });

  const handleBuscar = async (data: BuscarMedicoValues) => {
    setIsSearching(true);
    setSearchResult(null);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/admin-clinica/medicos/convidar?email=${encodeURIComponent(data.email)}`
      );
      const result = await response.json();

      if (response.ok) {
        setSearchResult(result);
        if (result.found && result.usuario) {
          convidarForm.setValue("email", result.usuario.email);
        }
      } else {
        setErrorMessage(result.error || "Erro ao buscar médico");
      }
    } catch (error) {
      setErrorMessage("Erro ao buscar médico");
    } finally {
      setIsSearching(false);
    }
  };

  const handleConvidar = async (data: ConvidarMedicoValues) => {
    setIsInviting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin-clinica/medicos/convidar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessMessage(result.message || "Médico associado com sucesso!");
        setSearchResult(null);
        buscarForm.reset();
        convidarForm.reset();
      } else {
        setErrorMessage(result.error || "Erro ao convidar médico");
      }
    } catch (error) {
      setErrorMessage("Erro ao convidar médico");
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-6">
        <Link
          href="/admin-clinica/medicos"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para lista de médicos
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convidar Médico Externo
          </CardTitle>
          <CardDescription>
            Associe um médico que já possui conta no sistema à sua clínica.
            O médico poderá atender pacientes e acessar os recursos da clínica.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mensagens de sucesso/erro */}
          {successMessage && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Sucesso</AlertTitle>
              <AlertDescription className="text-green-700">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}

          {errorMessage && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Formulário de busca */}
          <Form {...buscarForm}>
            <form
              onSubmit={buscarForm.handleSubmit(handleBuscar)}
              className="space-y-4"
            >
              <FormField
                control={buscarForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email do Médico</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          placeholder="medico@email.com"
                          type="email"
                          {...field}
                        />
                      </FormControl>
                      <Button type="submit" disabled={isSearching}>
                        {isSearching ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                        <span className="ml-2">Buscar</span>
                      </Button>
                    </div>
                    <FormDescription>
                      Digite o email do médico que deseja associar à clínica
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>

          {/* Resultado da busca */}
          {searchResult && (
            <div className="border rounded-lg p-4 space-y-4">
              {searchResult.found && searchResult.usuario ? (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{searchResult.usuario.nome}</h4>
                      <p className="text-sm text-muted-foreground">
                        {searchResult.usuario.email}
                      </p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>

                  {searchResult.jaAssociado || searchResult.jaMedico ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Usuário já associado</AlertTitle>
                      <AlertDescription>
                        Este usuário já está associado a esta clínica
                        {searchResult.jaMedico && " como médico"}.
                      </AlertDescription>
                    </Alert>
                  ) : !searchResult.usuario.ativo ? (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertTitle>Usuário desativado</AlertTitle>
                      <AlertDescription>
                        Este usuário está desativado no sistema.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Form {...convidarForm}>
                      <form
                        onSubmit={convidarForm.handleSubmit(handleConvidar)}
                        className="space-y-4"
                      >
                        <input type="hidden" {...convidarForm.register("email")} />

                        <FormField
                          control={convidarForm.control}
                          name="crm"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CRM</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="12345/SP"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Número do CRM do médico com a UF
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={convidarForm.control}
                          name="especialidade"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Especialidade</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Cardiologia"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Especialidade principal do médico
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="submit"
                          className="w-full"
                          disabled={isInviting}
                        >
                          {isInviting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Associando...
                            </>
                          ) : (
                            <>
                              <UserPlus className="mr-2 h-4 w-4" />
                              Associar Médico à Clínica
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  )}
                </>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Usuário não encontrado</AlertTitle>
                  <AlertDescription>
                    Não foi encontrado nenhum usuário com este email no sistema.
                    O médico precisa ter uma conta cadastrada antes de ser
                    associado à clínica.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
