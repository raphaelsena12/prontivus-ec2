"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";
import { IconMessage, IconX, IconSend, IconChevronDown, IconCircle, IconClock, IconUserOff } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TipoUsuario } from "@/lib/generated/prisma";
import { useChat } from "@/components/chat-context";

interface Mensagem {
  id: string;
  conteudo: string;
  enviadoPorMedico: boolean;
  lida: boolean;
  createdAt: string;
  medico?: {
    usuario: {
      id: string;
      nome: string;
      avatar?: string | null;
    };
  };
  secretaria?: {
    id: string;
    nome: string;
    avatar?: string | null;
  };
}

type StatusUsuario = "online" | "ausente" | "ocupado" | "offline";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  avatar?: string | null;
  crm?: string;
  especialidade?: string;
  mensagensNaoLidas?: number;
  status?: StatusUsuario;
}

interface ChatFlutuanteProps {
  userId: string;
  clinicaId: string;
  userTipo: TipoUsuario;
  showFloatingButton?: boolean;
}

export function ChatFlutuante({ userId, clinicaId, userTipo, showFloatingButton = false }: ChatFlutuanteProps) {
  const { data: session } = useSession();
  const { isOpen, setIsOpen, setMensagensNaoLidas: setMensagensNaoLidasContext } = useChat();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);
  
  // Sincronizar com o contexto
  useEffect(() => {
    setMensagensNaoLidasContext(mensagensNaoLidas);
  }, [mensagensNaoLidas, setMensagensNaoLidasContext]);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [meuStatus, setMeuStatus] = useState<StatusUsuario>("online");
  const [statusMenuAberto, setStatusMenuAberto] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  // Garantir que o componente só renderize no cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  // Função auxiliar para obter o ID do outro usuário na mensagem
  const getOutroUsuarioId = (mensagem: Mensagem): string => {
    if (userTipo === TipoUsuario.MEDICO) {
      return mensagem.secretaria?.id || "";
    } else {
      return mensagem.medico?.usuario?.id || "";
    }
  };

  // Função para verificar se a mensagem é minha
  const isMensagemMinha = (mensagem: Mensagem): boolean => {
    return (
      (userTipo === TipoUsuario.MEDICO && mensagem.enviadoPorMedico) ||
      (userTipo === TipoUsuario.SECRETARIA && !mensagem.enviadoPorMedico)
    );
  };

  // Função para recarregar o contador de mensagens não lidas do servidor
  const recarregarContadorNaoLidasRef = useRef<(() => Promise<void>) | null>(null);
  
  const recarregarContadorNaoLidas = useCallback(async () => {
    try {
      // Usar cache: 'no-store' para garantir dados atualizados
      const response = await fetch("/api/chat/mensagens", {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (response.ok) {
        const data = await response.json();
        const todasMensagens = data.mensagens || [];
        
        // Contar todas as mensagens não lidas (de todos os usuários)
        const naoLidas = todasMensagens.filter((m: Mensagem) => {
          const isMine = 
            (userTipo === TipoUsuario.MEDICO && m.enviadoPorMedico) ||
            (userTipo === TipoUsuario.SECRETARIA && !m.enviadoPorMedico);
          return !m.lida && !isMine;
        }).length;
        
        console.log(`[recarregarContador] Total de mensagens: ${todasMensagens.length}, Não lidas: ${naoLidas}`);
        setMensagensNaoLidas(naoLidas);
      } else {
        console.error("Erro ao buscar mensagens:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Erro ao carregar mensagens não lidas:", error);
    }
  }, [userTipo]);

  // Atualizar ref sempre que a função mudar
  useEffect(() => {
    recarregarContadorNaoLidasRef.current = recarregarContadorNaoLidas;
  }, [recarregarContadorNaoLidas]);

  // Função wrapper que usa a ref (não precisa estar nas dependências)
  const recarregarContador = useCallback(async () => {
    if (recarregarContadorNaoLidasRef.current) {
      await recarregarContadorNaoLidasRef.current();
    }
  }, []);

  // Carregar todas as mensagens não lidas ao montar o componente (apenas uma vez)
  useEffect(() => {
    if (!session) return;
    
    recarregarContador();
    // Removido intervalo de polling - usar apenas Socket.IO para atualizações em tempo real
  }, [session, userTipo, recarregarContador]);

  // Função auxiliar para obter o nome do remetente
  const getNomeRemetente = (mensagem: Mensagem): string => {
    if (mensagem.enviadoPorMedico) {
      return mensagem.medico?.usuario?.nome || "Médico";
    } else {
      return mensagem.secretaria?.nome || "Secretária";
    }
  };

  // Função auxiliar para obter o avatar do remetente
  const getAvatarRemetente = (mensagem: Mensagem): string | null => {
    if (mensagem.enviadoPorMedico) {
      return mensagem.medico?.usuario?.avatar || null;
    } else {
      return mensagem.secretaria?.avatar || null;
    }
  };

  // Conectar ao Socket.IO (sempre conectado, mesmo com chat fechado)
  useEffect(() => {
    if (!session) return;

    const socketUrl = typeof window !== "undefined" 
      ? window.location.origin 
      : "http://localhost:3000";

    const newSocket = io(socketUrl, {
      path: "/api/socket",
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      console.log("Conectado ao Socket.IO");
      newSocket.emit("join-chat", {
        userId,
        clinicaId,
        tipo: userTipo,
        status: meuStatus,
      });
    });

    newSocket.on("new-message", (data: { mensagem: Mensagem }) => {
      const outroId = getOutroUsuarioId(data.mensagem);
      const isMine = isMensagemMinha(data.mensagem);
      
      const chatAbertoEVendoConversa = 
        isOpen && 
        usuarioSelecionado && 
        usuarioSelecionado.id === outroId &&
        !isMine;

      // Se o chat está aberto e a conversa do remetente está visível, adicionar e marcar como lida
      if (usuarioSelecionado && outroId === usuarioSelecionado.id) {
        setMensagens((prev) => {
          if (prev.some((m) => m.id === data.mensagem.id)) {
            return prev;
          }
          
          const mensagemComLida = chatAbertoEVendoConversa 
            ? { ...data.mensagem, lida: true }
            : data.mensagem;
          
          return [...prev, mensagemComLida];
        });

        // Se o chat está aberto e visível, marcar como lida no servidor
        if (chatAbertoEVendoConversa && !data.mensagem.lida) {
          fetch(`/api/chat/mensagens/${data.mensagem.id}/lida`, {
            method: "PATCH",
          }).then(() => {
            // Atualizar contador localmente (decrementar)
            setMensagensNaoLidas((prev) => Math.max(0, prev - 1));
            // Atualizar contador do usuário na lista
            setUsuarios((prev) =>
              prev.map((u) =>
                u.id === outroId
                  ? { ...u, mensagensNaoLidas: Math.max(0, (u.mensagensNaoLidas || 0) - 1) }
                  : u
              )
            );
          }).catch((error) => {
            console.error("Erro ao marcar mensagem como lida:", error);
          });
        }

        setTimeout(() => {
          scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth",
          });
        }, 100);
      }

      // Atualizar contadores localmente (mais rápido que recarregar do servidor)
      if (!isMine && !chatAbertoEVendoConversa) {
        // Incrementar contador global
        setMensagensNaoLidas((prev) => prev + 1);
        // Atualizar contador do usuário na lista
        setUsuarios((prev) =>
          prev.map((u) =>
            u.id === outroId
              ? { ...u, mensagensNaoLidas: (u.mensagensNaoLidas || 0) + 1 }
              : u
          )
        );
      }
    });

    newSocket.on("message-read-update", (data: { mensagemId: string }) => {
      setMensagens((prev) =>
        prev.map((m) =>
          m.id === data.mensagemId ? { ...m, lida: true } : m
        )
      );
      
      // Atualizar contador localmente (decrementar)
      setMensagensNaoLidas((prev) => Math.max(0, prev - 1));
    });

    // Atualizar status dos usuários
    newSocket.on("user-status-update", (data: { userId: string; status: StatusUsuario }) => {
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === data.userId ? { ...u, status: data.status } : u
        )
      );
    });

    // Receber lista de usuários com status ao conectar
    newSocket.on("users-status", (data: { users: Array<{ userId: string; status: StatusUsuario }> }) => {
      setUsuarios((prev) =>
        prev.map((u) => {
          const userStatus = data.users.find((us) => us.userId === u.id);
          return userStatus ? { ...u, status: userStatus.status } : { ...u, status: "offline" as StatusUsuario };
        })
      );
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [userId, clinicaId, userTipo, session, isOpen, usuarioSelecionado, recarregarContador, meuStatus]);

  // Carregar usuários disponíveis
  useEffect(() => {
    if (!isOpen) return;

    const carregarUsuarios = async () => {
      try {
        const response = await fetch("/api/chat/usuarios", {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setUsuarios(data.usuarios || []);
        }
      } catch (error) {
        console.error("Erro ao carregar usuários:", error);
      }
    };

    carregarUsuarios();
    // Removido intervalo de polling - usar apenas Socket.IO para atualizações em tempo real
  }, [isOpen]);

  // Carregar mensagens quando selecionar um usuário
  useEffect(() => {
    if (!usuarioSelecionado || !isOpen) return;

    const carregarMensagens = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/chat/mensagens", {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        if (response.ok) {
          const data = await response.json();
          // Filtrar mensagens apenas do usuário selecionado
          const mensagensFiltradas = (data.mensagens || []).filter((m: Mensagem) => 
            getOutroUsuarioId(m) === usuarioSelecionado.id
          );
          console.log(`[carregarMensagens] Mensagens filtradas: ${mensagensFiltradas.length}`);
          setMensagens(mensagensFiltradas);

          // Marcar mensagens não lidas como lidas (otimizado - uma única requisição em batch)
          const mensagensParaMarcar = mensagensFiltradas.filter(
            (m: Mensagem) => !m.lida && getOutroUsuarioId(m) === usuarioSelecionado.id && !isMensagemMinha(m)
          );

          if (mensagensParaMarcar.length > 0) {
            // Marcar todas em paralelo (mais rápido)
            await Promise.all(
              mensagensParaMarcar.map((msg: Mensagem) =>
                fetch(`/api/chat/mensagens/${msg.id}/lida`, {
                  method: "PATCH",
                }).catch((error) => {
                  console.error(`Erro ao marcar mensagem ${msg.id} como lida:`, error);
                })
              )
            );

            // Atualizar contadores localmente (mais rápido)
            const quantidadeMarcada = mensagensParaMarcar.length;
            setMensagensNaoLidas((prev) => Math.max(0, prev - quantidadeMarcada));
            setUsuarios((prev) =>
              prev.map((u) =>
                u.id === usuarioSelecionado.id
                  ? { ...u, mensagensNaoLidas: 0 }
                  : u
              )
            );

            // Atualizar estado local
            setMensagens((prev) =>
              prev.map((m) =>
                mensagensParaMarcar.some((msg: Mensagem) => msg.id === m.id)
                  ? { ...m, lida: true }
                  : m
              )
            );
          }

          // Scroll para baixo
          setTimeout(() => {
            scrollRef.current?.scrollTo({
              top: scrollRef.current.scrollHeight,
              behavior: "auto",
            });
          }, 100);
        }
      } catch (error) {
        console.error("Erro ao carregar mensagens:", error);
      } finally {
        setIsLoading(false);
      }
    };

    carregarMensagens();
  }, [usuarioSelecionado, isOpen, userTipo, recarregarContador]);

  // Enviar mensagem
  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !usuarioSelecionado || !socket) return;

    try {
      const response = await fetch("/api/chat/mensagens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conteudo: novaMensagem.trim(),
          outroUsuarioId: usuarioSelecionado.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setNovaMensagem("");

        // Emitir via socket para atualização em tempo real
        socket.emit("send-message", {
          mensagem: data.mensagem,
        });

        // Scroll para baixo
        setTimeout(() => {
          scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth",
          });
        }, 100);
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviarMensagem();
    }
  };

  // Função para mudar status
  const mudarStatus = (novoStatus: StatusUsuario) => {
    setMeuStatus(novoStatus);
    setStatusMenuAberto(false);
    if (socket) {
      socket.emit("update-status", {
        userId,
        clinicaId,
        status: novoStatus,
      });
    }
  };

  // Função para obter cor do status
  const getStatusColor = (status?: StatusUsuario): string => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "ausente":
        return "bg-yellow-500";
      case "ocupado":
        return "bg-red-500";
      case "offline":
      default:
        return "bg-gray-400";
    }
  };

  // Função para obter ícone do status
  const getStatusIcon = (status?: StatusUsuario) => {
    switch (status) {
      case "online":
        return <IconCircle className="h-3 w-3 fill-current" />;
      case "ausente":
        return <IconClock className="h-3 w-3" />;
      case "ocupado":
        return <IconCircle className="h-3 w-3 fill-current" />;
      case "offline":
      default:
        return <IconUserOff className="h-3 w-3" />;
    }
  };

  // Fechar menu de status ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setStatusMenuAberto(false);
      }
    };

    if (statusMenuAberto) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [statusMenuAberto]);

  // Recarregar contador apenas quando fechar o chat (para sincronização final)
  useEffect(() => {
    if (isOpen) return;
    
    // Recarregar apenas uma vez quando fechar (para sincronização final)
    const timeout = setTimeout(() => {
      recarregarContador();
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [isOpen, recarregarContador]);

  if (userTipo !== TipoUsuario.MEDICO && userTipo !== TipoUsuario.SECRETARIA) {
    return null;
  }

  if (!mounted) {
    return null;
  }

  return (
    <>
      {showFloatingButton && typeof window !== "undefined" && createPortal(
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "fixed bottom-6 right-6 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-110 hover:shadow-xl relative",
            isOpen && "hidden"
          )}
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            zIndex: 9999,
          }}
          aria-label="Abrir chat"
        >
          <IconMessage className="h-6 w-6" />
          {mensagensNaoLidas > 0 && (
            <div className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground px-2 text-xs font-semibold shadow-lg animate-pulse border-2 border-background">
              {mensagensNaoLidas > 9 ? "9+" : mensagensNaoLidas}
            </div>
          )}
        </button>,
        document.body
      )}
      
      {/* Painel de chat */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 z-[9999] flex h-[600px] w-[400px] flex-col overflow-hidden shadow-2xl rounded-none p-0 pt-0">
          {/* Header */}
          <div className="flex items-center justify-between bg-primary p-4 text-primary-foreground">
            <div className="flex items-center gap-2">
              <IconMessage className="h-5 w-5" />
              <h3 className="font-semibold">Chat</h3>
            </div>
            <div className="flex items-center gap-2">
              {/* Seletor de Status */}
              <div className="relative" ref={statusMenuRef}>
                <button
                  onClick={() => setStatusMenuAberto(!statusMenuAberto)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-primary/80 transition-colors text-primary-foreground"
                  title="Status"
                >
                  <span className={cn("h-2.5 w-2.5 rounded-full", getStatusColor(meuStatus))} />
                  <span className="text-xs font-medium capitalize hidden sm:inline text-primary-foreground">{meuStatus}</span>
                </button>
                {statusMenuAberto && (
                  <div className="absolute right-0 top-full mt-1 bg-background border rounded-lg shadow-lg p-1 z-50 min-w-[120px]">
                    <button
                      onClick={() => mudarStatus("online")}
                      className="w-full text-left px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent rounded flex items-center gap-2 transition-colors"
                    >
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      Online
                    </button>
                    <button
                      onClick={() => mudarStatus("ausente")}
                      className="w-full text-left px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent rounded flex items-center gap-2 transition-colors"
                    >
                      <span className="h-2 w-2 rounded-full bg-yellow-500" />
                      Ausente
                    </button>
                    <button
                      onClick={() => mudarStatus("ocupado")}
                      className="w-full text-left px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent rounded flex items-center gap-2 transition-colors"
                    >
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      Ocupado
                    </button>
                    <button
                      onClick={() => mudarStatus("offline")}
                      className="w-full text-left px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent rounded flex items-center gap-2 transition-colors"
                    >
                      <span className="h-2 w-2 rounded-full bg-gray-400" />
                      Offline
                    </button>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground hover:bg-primary/80"
                onClick={() => setIsOpen(false)}
              >
                <IconX className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Lista de usuários ou conversa */}
          {!usuarioSelecionado ? (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="border-b p-3">
                <p className="text-sm font-medium text-muted-foreground">
                  {userTipo === TipoUsuario.MEDICO
                    ? "Selecione uma secretária"
                    : "Selecione um médico"}
                </p>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2">
                  {usuarios.length === 0 ? (
                    <p className="p-4 text-center text-sm text-muted-foreground">
                      Nenhum usuário disponível
                    </p>
                  ) : (
                    usuarios.map((usuario) => (
                      <button
                        key={usuario.id}
                        onClick={() => setUsuarioSelecionado(usuario)}
                        className="flex w-full items-center gap-3 rounded-lg p-3 transition-colors hover:bg-accent relative"
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={usuario.avatar || undefined} />
                            <AvatarFallback>
                              {usuario.nome
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          {/* Indicador de status */}
                          <span
                            className={cn(
                              "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
                              getStatusColor(usuario.status)
                            )}
                            title={usuario.status ? usuario.status.charAt(0).toUpperCase() + usuario.status.slice(1) : "Offline"}
                          />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{usuario.nome}</p>
                            {usuario.mensagensNaoLidas && usuario.mensagensNaoLidas > 0 && (
                              <Badge
                                variant="destructive"
                                className="h-5 min-w-5 rounded-full px-1.5 text-xs font-semibold"
                              >
                                {usuario.mensagensNaoLidas > 9 ? "9+" : usuario.mensagensNaoLidas}
                              </Badge>
                            )}
                          </div>
                          {usuario.crm && (
                            <p className="text-xs text-muted-foreground">
                              {usuario.crm} - {usuario.especialidade}
                            </p>
                          )}
                        </div>
                        <IconChevronDown className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Header da conversa */}
              <div className="flex items-center gap-3 border-b p-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setUsuarioSelecionado(null)}
                >
                  <IconChevronDown className="h-4 w-4 rotate-90" />
                </Button>
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={usuarioSelecionado.avatar || undefined} />
                    <AvatarFallback>
                      {usuarioSelecionado.nome
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Indicador de status */}
                  <span
                    className={cn(
                      "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
                      getStatusColor(usuarioSelecionado.status)
                    )}
                    title={usuarioSelecionado.status ? usuarioSelecionado.status.charAt(0).toUpperCase() + usuarioSelecionado.status.slice(1) : "Offline"}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{usuarioSelecionado.nome}</p>
                    <span className={cn("text-xs capitalize text-muted-foreground")}>
                      {usuarioSelecionado.status || "offline"}
                    </span>
                  </div>
                  {usuarioSelecionado.crm && (
                    <p className="text-xs text-muted-foreground">
                      {usuarioSelecionado.crm} - {usuarioSelecionado.especialidade}
                    </p>
                  )}
                </div>
              </div>

              {/* Mensagens */}
              <ScrollArea ref={scrollRef} className="flex-1 p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-sm text-muted-foreground">Carregando...</p>
                  </div>
                ) : mensagens.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-sm text-muted-foreground">
                      Nenhuma mensagem ainda. Comece a conversar!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {mensagens.map((mensagem) => {
                      const isMine = isMensagemMinha(mensagem);

                      return (
                        <div
                          key={mensagem.id}
                          className={cn(
                            "flex gap-3",
                            isMine && "flex-row-reverse"
                          )}
                        >
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage
                              src={getAvatarRemetente(mensagem) || undefined}
                            />
                            <AvatarFallback>
                              {getNomeRemetente(mensagem)
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={cn(
                              "flex max-w-[75%] flex-col gap-1",
                              isMine && "items-end"
                            )}
                          >
                            <div
                              className={cn(
                                "rounded-2xl px-4 py-2",
                                isMine
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              )}
                            >
                              <p className="text-sm">{mensagem.conteudo}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(mensagem.createdAt), "HH:mm", {
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Input de mensagem */}
              <div className="border-t p-3">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem..."
                    className="flex-1"
                  />
                  <Button
                    onClick={enviarMensagem}
                    disabled={!novaMensagem.trim()}
                    size="icon"
                  >
                    <IconSend className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </>
  );
}
