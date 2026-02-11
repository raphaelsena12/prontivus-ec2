"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneOff, Clock, User, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { formatTime } from "@/lib/utils";

interface Chamada {
  id: string;
  paciente: {
    id: string;
    nome: string;
    telefone: string | null;
  };
  status: "AGUARDANDO" | "EM_ATENDIMENTO" | "ATENDIDO" | "CANCELADO";
  horario: Date;
  observacoes: string | null;
}

export function PainelChamadasContent() {
  const [chamadas, setChamadas] = useState<Chamada[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChamadas = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/secretaria/painel-chamadas");

      if (!response.ok) {
        throw new Error("Erro ao carregar chamadas");
      }

      const data = await response.json();
      setChamadas(data.chamadas || []);
    } catch (error) {
      toast.error("Erro ao carregar chamadas");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChamadas();
    // Atualizar a cada 5 segundos
    const interval = setInterval(fetchChamadas, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAtender = async (id: string) => {
    try {
      const response = await fetch(`/api/secretaria/painel-chamadas/${id}/atender`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Erro ao atender chamada");
      }

      toast.success("Chamada atendida com sucesso");
      fetchChamadas();
    } catch (error) {
      toast.error("Erro ao atender chamada");
      console.error(error);
    }
  };

  const handleFinalizar = async (id: string) => {
    try {
      const response = await fetch(`/api/secretaria/painel-chamadas/${id}/finalizar`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Erro ao finalizar chamada");
      }

      toast.success("Chamada finalizada com sucesso");
      fetchChamadas();
    } catch (error) {
      toast.error("Erro ao finalizar chamada");
      console.error(error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      AGUARDANDO: "destructive",
      EM_ATENDIMENTO: "secondary",
      ATENDIDO: "default",
      CANCELADO: "outline",
    };
    return (
      <Badge variant={variants[status] || "outline"}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const chamadasAguardando = chamadas.filter((c) => c.status === "AGUARDANDO");
  const chamadasEmAtendimento = chamadas.filter((c) => c.status === "EM_ATENDIMENTO");

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <h1 className="text-2xl font-bold">Painel de Chamadas</h1>
          <p className="text-muted-foreground">
            Gerencie as chamadas dos pacientes na recepção
          </p>
        </div>

        <div className="grid gap-4 px-4 lg:px-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-red-500" />
                Aguardando
              </CardTitle>
              <CardDescription>
                {chamadasAguardando.length} chamada(s) aguardando atendimento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {chamadasAguardando.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma chamada aguardando
                </p>
              ) : (
                chamadasAguardando.map((chamada) => (
                  <Card key={chamada.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{chamada.paciente.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {chamada.paciente.telefone || "Sem telefone"}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {formatTime(chamada.horario)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAtender(chamada.id)}
                        >
                          <Phone className="h-4 w-4 mr-1" />
                          Atender
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-blue-500" />
                Em Atendimento
              </CardTitle>
              <CardDescription>
                {chamadasEmAtendimento.length} chamada(s) em atendimento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {chamadasEmAtendimento.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma chamada em atendimento
                </p>
              ) : (
                chamadasEmAtendimento.map((chamada) => (
                  <Card key={chamada.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{chamada.paciente.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {chamada.paciente.telefone || "Sem telefone"}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {formatTime(chamada.horario)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleFinalizar(chamada.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Finalizar
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="px-4 lg:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Chamadas</CardTitle>
              <CardDescription>
                Todas as chamadas do dia
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-4">Carregando...</p>
              ) : chamadas.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">
                  Nenhuma chamada registrada hoje
                </p>
              ) : (
                <div className="space-y-2">
                  {chamadas.map((chamada) => (
                    <div
                      key={chamada.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{chamada.paciente.nome}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatTime(chamada.horario)}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(chamada.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}














