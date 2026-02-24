"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatDate, formatTime } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import {
  CheckCircle2,
  Clock,
  Search,
  User,
  Calendar,
  Phone,
  Stethoscope,
  Volume2,
  LogIn,
} from "lucide-react";
import { IconCircleCheckFilled, IconLoader } from "@tabler/icons-react";

interface Consulta {
  id: string;
  dataHora: string;
  status: string;
  updatedAt: string;
  paciente: {
    id: string;
    nome: string;
    cpf: string;
    telefone: string | null;
    celular: string | null;
  };
  medico: {
    id: string;
    usuario: {
      nome: string;
    };
  } | null;
  codigoTuss: {
    codigoTuss: string;
    descricao: string;
  } | null;
  tipoConsulta: {
    nome: string;
  } | null;
  operadora: {
    nomeFantasia: string | null;
    razaoSocial: string;
  } | null;
  planoSaude: {
    nome: string;
  } | null;
}

export function CheckInContent() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [consultaToCheckIn, setConsultaToCheckIn] = useState<Consulta | null>(
    null
  );
  const [processing, setProcessing] = useState(false);
  const [speaking, setSpeaking] = useState<string | null>(null);

  const chamarPaciente = async (nomePaciente: string) => {
    setSpeaking(nomePaciente);

    // Criar a mensagem a ser falada
    const mensagem = `Atenção, ${nomePaciente}, favor se dirigir ao atendimento.`;

    try {
      // Tentar usar AWS Polly para voz de IA melhorada
      console.log("Chamando API de voz com IA...");
      const response = await fetch("/api/secretaria/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: mensagem }),
      });

      console.log("Resposta da API:", {
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get("content-type"),
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        
        // Verificar se é áudio (pode ser audio/mpeg, audio/mp3, etc)
        if (contentType && contentType.includes("audio")) {
          // Obter o áudio como blob
          const audioBlob = await response.blob();
          
          console.log("Áudio recebido:", {
            size: audioBlob.size,
            type: audioBlob.type,
          });
          
          // Verificar se o blob não está vazio
          if (audioBlob.size === 0) {
            console.warn("Áudio vazio recebido, usando fallback");
            fallbackToWebSpeech(mensagem, nomePaciente);
            return;
          }

          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);

          // Quando o áudio terminar
          audio.onended = () => {
            console.log("Áudio de IA reproduzido com sucesso");
            URL.revokeObjectURL(audioUrl);
            setSpeaking(null);
          };

          // Em caso de erro
          audio.onerror = (error) => {
            console.error("Erro ao reproduzir áudio:", error);
            URL.revokeObjectURL(audioUrl);
            setSpeaking(null);
            // Fallback para Web Speech API
            fallbackToWebSpeech(mensagem, nomePaciente);
          };

          // Reproduzir o áudio
          try {
            await audio.play();
            console.log("Reproduzindo áudio de IA...");
            toast.success(`Chamando ${nomePaciente} com voz de IA...`);
            return; // Sucesso, não usar fallback
          } catch (playError) {
            console.error("Erro ao reproduzir áudio:", playError);
            URL.revokeObjectURL(audioUrl);
            setSpeaking(null);
            fallbackToWebSpeech(mensagem, nomePaciente);
          }
        } else {
          // Não é áudio, provavelmente é um erro JSON
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText || "Erro desconhecido" };
          }
          console.warn("API retornou erro (não é áudio):", errorData);
          if (errorData.error) {
            if (errorData.error.includes("Credenciais AWS")) {
              toast.error("Credenciais AWS não configuradas. Usando voz padrão.");
            } else if (errorData.isPermissionError || errorData.error.includes("permissão IAM") || errorData.error.includes("polly:SynthesizeSpeech")) {
              toast.error("Permissão IAM necessária: Adicione 'polly:SynthesizeSpeech' na política IAM. Usando voz padrão.");
            } else {
              toast.warning("Erro na API de voz. Usando voz padrão do navegador.");
            }
          }
          fallbackToWebSpeech(mensagem, nomePaciente);
        }
      } else {
        // Se a API falhar, usar fallback
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || "Erro desconhecido" };
        }
        console.warn("Erro na API de voz (status não OK):", {
          status: response.status,
          error: errorData,
        });
        if (errorData.error) {
          if (errorData.error.includes("Credenciais AWS")) {
            toast.error("Credenciais AWS não configuradas. Usando voz padrão.");
          } else if (errorData.isPermissionError || errorData.error.includes("permissão IAM") || errorData.error.includes("polly:SynthesizeSpeech")) {
            toast.error("Permissão IAM necessária: Adicione 'polly:SynthesizeSpeech' na política IAM. Usando voz padrão.");
          } else {
            toast.warning("Erro na API de voz. Usando voz padrão do navegador.");
          }
        }
        fallbackToWebSpeech(mensagem, nomePaciente);
      }
    } catch (error: any) {
      console.error("Erro ao chamar paciente:", error);
      toast.warning("Erro ao conectar com API de voz. Usando voz padrão.");
      // Fallback para Web Speech API
      fallbackToWebSpeech(mensagem, nomePaciente);
    }
  };

  const fallbackToWebSpeech = (mensagem: string, nomePaciente: string) => {
    // Verificar se a Web Speech API está disponível
    if (!("speechSynthesis" in window)) {
      toast.error("Seu navegador não suporta síntese de voz");
      setSpeaking(null);
      return;
    }

    // Cancelar qualquer fala em andamento
    window.speechSynthesis.cancel();

    // Criar utterance
    const utterance = new SpeechSynthesisUtterance(mensagem);
    utterance.lang = "pt-BR";
    utterance.rate = 0.9; // Velocidade um pouco mais lenta para melhor compreensão
    utterance.pitch = 1;
    utterance.volume = 1;

    // Quando a fala terminar
    utterance.onend = () => {
      setSpeaking(null);
    };

    // Em caso de erro
    utterance.onerror = (error) => {
      console.error("Erro na síntese de voz:", error);
      toast.error("Erro ao chamar paciente por voz");
      setSpeaking(null);
    };

    // Falar
    window.speechSynthesis.speak(utterance);
    toast.success(`Chamando ${nomePaciente}...`);
  };

  const fetchConsultas = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/secretaria/check-in");

      if (!response.ok) {
        throw new Error("Erro ao carregar consultas");
      }

      const data = await response.json();
      setConsultas(data.consultas || []);
    } catch (error) {
      toast.error("Erro ao carregar consultas de hoje");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultas();
  }, []);

  const handleCheckIn = async () => {
    if (!consultaToCheckIn) return;

    try {
      setProcessing(true);
      const response = await fetch("/api/secretaria/check-in", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          consultaId: consultaToCheckIn.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao fazer check-in");
      }

      toast.success("Check-in realizado com sucesso!");
      setCheckInDialogOpen(false);
      setConsultaToCheckIn(null);
      fetchConsultas();
    } catch (error: any) {
      toast.error(error.message || "Erro ao realizar check-in");
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const openCheckInDialog = (consulta: Consulta) => {
    setConsultaToCheckIn(consulta);
    setCheckInDialogOpen(true);
  };

  const filteredConsultas = consultas.filter((consulta) => {
    const searchLower = search.toLowerCase();
    return (
      consulta.paciente.nome.toLowerCase().includes(searchLower) ||
      consulta.paciente.cpf.includes(searchLower) ||
      consulta.medico?.usuario.nome.toLowerCase().includes(searchLower) ||
      false
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AGENDADA":
        return (
          <Badge variant="outline" className="bg-transparent border-yellow-500 text-yellow-700 dark:text-yellow-400 text-[10px] py-0.5 px-1.5 leading-tight">
            <Clock className="mr-1 h-3 w-3" />
            Agendada
          </Badge>
        );
      case "CONFIRMADA":
        return (
          <Badge variant="outline" className="bg-transparent border-green-500 text-green-700 dark:text-green-400 text-[10px] py-0.5 px-1.5 leading-tight">
            <IconCircleCheckFilled className="mr-1 h-3 w-3 fill-green-500 dark:fill-green-400" />
            Confirmada
          </Badge>
        );
      case "REALIZADA":
        return (
          <Badge variant="outline" className="bg-transparent border-blue-500 text-blue-700 dark:text-blue-400 text-[10px] py-0.5 px-1.5 leading-tight">
            Realizada
          </Badge>
        );
      case "CANCELADA":
        return (
          <Badge variant="outline" className="bg-transparent border-red-500 text-red-700 dark:text-red-400 text-[10px] py-0.5 px-1.5 leading-tight">
            <IconLoader className="mr-1 h-3 w-3" />
            Cancelada
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-[10px] py-0.5 px-1.5 leading-tight">{status}</Badge>;
    }
  };

  return (
    <div className="@container/main flex flex-1 flex-col px-4 lg:px-6 py-6">
      <PageHeader
        icon={LogIn}
        title="Check-in"
        subtitle="Registre a chegada dos pacientes e gerencie os atendimentos do dia"
      />

      <div className="flex flex-col">
        {/* Campo de busca */}
        <div className="flex items-center justify-end pb-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente por nome, CPF ou médico..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Conteúdo */}
        <div>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="text-xs font-semibold py-3">Data</TableHead>
                  <TableHead className="text-xs font-semibold py-3">Paciente</TableHead>
                  <TableHead className="text-xs font-semibold py-3">Telefone</TableHead>
                  <TableHead className="text-xs font-semibold py-3">Médico</TableHead>
                  <TableHead className="text-xs font-semibold py-3">Tipo</TableHead>
                  <TableHead className="text-xs font-semibold py-3">Convênio</TableHead>
                  <TableHead className="text-xs font-semibold py-3">Horário Check-in</TableHead>
                  <TableHead className="text-xs font-semibold py-3 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <span className="text-xs text-muted-foreground">Carregando consultas...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredConsultas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Calendar className="h-12 w-12 text-muted-foreground opacity-50" />
                        <span className="text-xs text-muted-foreground">
                          {search ? "Nenhuma consulta encontrada" : "Nenhuma consulta para hoje"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConsultas.map((consulta) => (
                    <TableRow key={consulta.id} className="hover:bg-muted/50">
                      <TableCell className="text-xs py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {formatDate(new Date(consulta.dataHora))}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatTime(new Date(consulta.dataHora))}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">
                            {consulta.paciente.nome}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        {(consulta.paciente.telefone || consulta.paciente.celular) ? (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>
                              {consulta.paciente.celular || consulta.paciente.telefone}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        {consulta.medico ? (
                          <div className="flex items-center gap-2">
                            <Stethoscope className="h-3 w-3 text-muted-foreground" />
                            <span>{consulta.medico.usuario.nome}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        {consulta.tipoConsulta ? (
                          <span>{consulta.tipoConsulta.nome}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        {consulta.operadora ? (
                          <Badge variant="outline" className="bg-transparent border-blue-500 text-blue-700 dark:text-blue-400 text-[10px] py-0.5 px-1.5 leading-tight">
                            {consulta.operadora.nomeFantasia || consulta.operadora.razaoSocial}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-transparent border-gray-500 text-gray-700 dark:text-gray-400 text-[10px] py-0.5 px-1.5 leading-tight">
                            Particular
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        {consulta.status === "CONFIRMADA" ? (
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {formatTime(new Date(consulta.updatedAt))}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatDate(new Date(consulta.updatedAt))}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => chamarPaciente(consulta.paciente.nome)}
                            disabled={speaking === consulta.paciente.nome}
                          >
                            <Volume2 className="h-3 w-3 mr-1.5" />
                            {speaking === consulta.paciente.nome ? "Chamando..." : "Chamar"}
                          </Button>
                          {consulta.status === "AGENDADA" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => openCheckInDialog(consulta)}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1.5" />
                              Check-in
                            </Button>
                          ) : consulta.status === "CONFIRMADA" ? (
                            <Badge variant="outline" className="bg-transparent border-green-500 text-green-700 dark:text-green-400 text-[10px] py-0.5 px-1.5 leading-tight">
                              <IconCircleCheckFilled className="mr-1 h-3 w-3 fill-green-500 dark:fill-green-400" />
                              Check-in realizado
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <AlertDialog open={checkInDialogOpen} onOpenChange={setCheckInDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sidebar-accent via-sidebar-accent/90 to-sidebar-accent/80">
                <CheckCircle2 className="h-5 w-5 text-sidebar-accent-foreground" />
              </div>
              <AlertDialogTitle className="text-xl">Confirmar Check-in</AlertDialogTitle>
            </div>
            <div className="text-muted-foreground text-sm">
              {consultaToCheckIn && (
                <div className="space-y-4 mt-4">
                  <p className="text-base text-gray-700">
                    Deseja realizar o check-in do paciente{" "}
                    <strong className="text-gray-900">{consultaToCheckIn.paciente.nome}</strong>?
                  </p>
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg space-y-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">
                        <strong className="text-gray-900">Horário:</strong>{" "}
                        {formatTime(new Date(consultaToCheckIn.dataHora))} -{" "}
                        {formatDate(new Date(consultaToCheckIn.dataHora))}
                      </span>
                    </div>
                    {consultaToCheckIn.medico && (
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">
                          <strong className="text-gray-900">Médico:</strong>{" "}
                          {consultaToCheckIn.medico.usuario.nome}
                        </span>
                      </div>
                    )}
                    {consultaToCheckIn.tipoConsulta && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">
                          <strong className="text-gray-900">Tipo:</strong>{" "}
                          {consultaToCheckIn.tipoConsulta.nome}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={processing} className="shadow-sm">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCheckIn}
              disabled={processing}
              className="gap-2 bg-sidebar-accent hover:bg-sidebar-accent/90 text-sidebar-accent-foreground shadow-sm hover:shadow-md transition-all"
            >
              {processing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-sidebar-accent-foreground border-t-transparent" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmar Check-in
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

