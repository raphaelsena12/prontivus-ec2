"use client";

import React, { useState, useEffect, useContext } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { IconBell, IconLogout, IconUserCircle, IconMessage, IconPhoneCall, IconShieldLock } from "@tabler/icons-react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TenantSelector } from "@/components/tenant-selector";
import { TipoUsuario } from "@/lib/generated/prisma";
import { ChatContext } from "@/components/chat-context";
import { Printer, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const capitalizeWords = (str: string): string => {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const getPageTitle = (pathname: string): string => {
  const routes: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/super-admin": "Super Admin",
    "/super-admin/clinicas": "Gestão de Clínicas",
    "/super-admin/pagamentos": "Gerenciamento de Pagamentos",
    "/super-admin/configuracoes": "Configurações",
    "/super-admin/medicamentos": "Medicamentos (Global)",
    "/super-admin/cids": "CIDs (Global)",
    "/super-admin/formas-pagamento": "Formas de Pagamento (Global)",
    "/super-admin/operadoras": "Operadoras (Global)",
    "/admin-clinica": "Admin Clínica",
    "/admin-clinica/exames": "Exames",
    "/admin-clinica/especialidades": "Especialidades Médicas",
    "/admin-clinica/medicamentos": "Medicamentos",
    "/admin-clinica/pacientes": "Pacientes",
    "/admin-clinica/usuarios": "Usuários",
    "/admin-clinica/medicos": "Médicos",
    "/admin-clinica/procedimentos": "Procedimentos",
    "/admin-clinica/formas-pagamento": "Formas de Pagamento",
    "/admin-clinica/estoque": "Estoque",
    "/admin-clinica/contas-pagar": "Contas a Pagar",
    "/admin-clinica/contas-receber": "Contas a Receber",
    "/admin-clinica/fluxo-caixa": "Fluxo de Caixa",
    "/medico": "Médico",
    "/medico/agendamentos": "Agendamentos",
    "/medico/fila-atendimento": "Fila de Atendimento",
    "/medico/prontuarios": "Prontuários",
    "/medico/dashboard-financeiro": "Dashboard Financeiro",
    "/medico/contas-pagar": "Contas a Pagar",
    "/medico/contas-receber": "Contas a Receber",
    "/medico/fluxo-caixa": "Fluxo de Caixa",
    "/medico/inadimplencia": "Inadimplência",
    "/medico/estoque": "Estoque",
    "/medico/manipulados": "Manipulados",
    "/secretaria": "Secretária",
    "/secretaria/agendamentos": "Agendamentos",
    "/secretaria/painel-chamadas": "Painel de Chamadas",
    "/secretaria/exames": "Exames",
    "/secretaria/medicamentos": "Medicamentos",
    "/secretaria/pacientes": "Pacientes",
    "/secretaria/check-in": "Check-in",
    "/paciente": "Início",
    "/paciente/novo-agendamento": "Novo Agendamento",
    "/paciente/historico-consultas": "Histórico de Consultas",
    "/paciente/historico-prescricoes": "Histórico de Prescrições",
    "/pacientes": "Pacientes",
    "/consultas": "Consultas",
    "/prontuarios": "Prontuários",
    "/medicos": "Médicos",
    "/usuarios": "Usuários",
    "/configuracoes": "Configurações",
  };

  if (routes[pathname]) {
    return routes[pathname];
  }

  // Se não houver rota mapeada, capitaliza a primeira letra de cada palavra
  const lastSegment = pathname.split("/").pop() || "";
  const formatted = lastSegment.replace(/-/g, " ");
  return capitalizeWords(formatted) || "Dashboard";
};

const getBreadcrumbItems = (pathname: string) => {
  const segments = pathname.split("/").filter(Boolean);
  const items: Array<{ label: string; href: string; isLast: boolean }> = [];

  const routeLabels: Record<string, string> = {
    "super-admin": "Super Admin",
    "clinicas": "Clínicas",
    "pagamentos": "Pagamentos",
    "configuracoes": "Configurações",
    "cids": "CIDs",
    "formas-pagamento": "Formas de Pagamento",
    // "medicamentos" já existe abaixo e serve tanto pra super-admin quanto admin-clinica
    "admin-clinica": "Admin Clínica",
    "exames": "Exames",
    "especialidades": "Especialidades",
    "medicamentos": "Medicamentos",
    "pacientes": "Pacientes",
    "usuarios": "Usuários",
    "medicos": "Médicos",
    "procedimentos": "Procedimentos",
    "estoque": "Estoque",
    "contas-pagar": "Contas a Pagar",
    "contas-receber": "Contas a Receber",
    "fluxo-caixa": "Fluxo de Caixa",
    "medico": "Médico",
    "agendamentos": "Agendamentos",
    "fila-atendimento": "Fila de Atendimento",
    "prontuarios": "Prontuários",
    "dashboard-financeiro": "Dashboard Financeiro",
    "inadimplencia": "Inadimplência",
    "manipulados": "Manipulados",
    "secretaria": "Secretária",
    "painel-chamadas": "Painel de Chamadas",
    "check-in": "Check-in",
    "paciente": "Paciente",
    "novo-agendamento": "Novo Agendamento",
    "historico-consultas": "Histórico de Consultas",
    "historico-prescricoes": "Histórico de Prescrições",
    "dashboard": "Dashboard",
  };

  segments.forEach((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const label = routeLabels[segment] || capitalizeWords(segment.replace(/-/g, " "));
    items.push({
      label,
      href,
      isLast: index === segments.length - 1,
    });
  });

  return items;
};

interface SiteHeaderProps {
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

interface AutorizacaoFechamento {
  id: string;
  data: string;
  status: string;
  medicoId: string;
  medico: {
    id: string;
    usuario: {
      nome: string;
    };
  };
}

export function SiteHeader({ user }: SiteHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const pageTitle = getPageTitle(pathname);
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();
  const [autorizacoes, setAutorizacoes] = useState<AutorizacaoFechamento[]>([]);
  const [loadingAutorizacoes, setLoadingAutorizacoes] = useState(false);
  const [clinicaInfo, setClinicaInfo] = useState<{ nome: string | null; logoUrl: string | null }>({ nome: null, logoUrl: null });
  const chatContext = useContext(ChatContext);
  const isOpen = chatContext?.isOpen ?? false;
  const setIsOpen = chatContext?.setIsOpen ?? (() => {});
  const mensagensNaoLidas = chatContext?.mensagensNaoLidas ?? 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!session?.user?.clinicaId) return;
    fetch("/api/auth/clinica-info")
      .then((r) => r.json())
      .then((data) => setClinicaInfo({ nome: data.clinicaNome || null, logoUrl: data.clinicaLogoUrl || null }))
      .catch(() => {});
  }, [session?.user?.clinicaId]);

  // Buscar autorizações de fechamento de caixa se for secretária
  useEffect(() => {
    if (session?.user?.tipo === TipoUsuario.SECRETARIA || session?.user?.tipo === TipoUsuario.ADMIN_CLINICA) {
      const fetchAutorizacoes = async () => {
        try {
          setLoadingAutorizacoes(true);
          const [responseAutorizadas, responseFechadas] = await Promise.all([
            fetch("/api/secretaria/fechamento-caixa/autorizacoes?status=AUTORIZADO"),
            fetch("/api/secretaria/fechamento-caixa/autorizacoes?status=FECHADO"),
          ]);
          
          const dataAutorizadas = responseAutorizadas.ok ? await responseAutorizadas.json() : { autorizacoes: [] };
          const dataFechadas = responseFechadas.ok ? await responseFechadas.json() : { autorizacoes: [] };
          
          const todas = [...(dataAutorizadas.autorizacoes || []), ...(dataFechadas.autorizacoes || [])];
          todas.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
          
          setAutorizacoes(todas);
        } catch (error) {
          console.error("Erro ao carregar autorizações:", error);
        } finally {
          setLoadingAutorizacoes(false);
        }
      };

      fetchAutorizacoes();
      const interval = setInterval(fetchAutorizacoes, 30000);
      return () => clearInterval(interval);
    }
  }, [session?.user?.tipo]);

  const handleFecharCaixa = async (autorizacaoId: string, data: string) => {
    try {
      const response = await fetch("/api/secretaria/fechamento-caixa/fechar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          autorizacaoId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao fechar caixa");
      }

      toast.success("Caixa fechado com sucesso!");
      
      // Atualizar lista
      const [resAutorizadas, resFechadas] = await Promise.all([
        fetch("/api/secretaria/fechamento-caixa/autorizacoes?status=AUTORIZADO"),
        fetch("/api/secretaria/fechamento-caixa/autorizacoes?status=FECHADO"),
      ]);
      
      const dataAutorizadas = resAutorizadas.ok ? await resAutorizadas.json() : { autorizacoes: [] };
      const dataFechadas = resFechadas.ok ? await resFechadas.json() : { autorizacoes: [] };
      
      const todas = [...(dataAutorizadas.autorizacoes || []), ...(dataFechadas.autorizacoes || [])];
      todas.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      
      setAutorizacoes(todas);
    } catch (error: any) {
      toast.error(error.message || "Erro ao fechar caixa");
      console.error(error);
    }
  };

  const handleImprimirResumo = async (dataRaw: string, medicoId: string) => {
    try {
      // Garantir formato YYYY-MM-DD mesmo que venha como ISO string completo
      const dataParam = dataRaw.split("T")[0];
      const nomeSecretaria = session?.user?.nome || user?.name || "";
      const params = new URLSearchParams({ data: dataParam, medicoId, nomeSecretaria });
      const url = `/api/secretaria/fechamento-caixa/pdf?${params.toString()}`;
      const win = window.open(url, "_blank");
      if (!win) {
        toast.error("Por favor, permita pop-ups para abrir o PDF");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar PDF");
      console.error(error);
    }
  };

  const autorizacoesNaoLidas = autorizacoes.filter(a => a.status === "AUTORIZADO").length;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  };

  return (
    <header
      className="sticky top-0 z-20 flex h-(--header-height) shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) text-foreground"
    >
      <div className="relative z-10 flex w-full items-center gap-2 px-3 lg:gap-3 lg:px-5 text-foreground">
        <SidebarTrigger className="-ml-1 h-9 w-9 rounded-lg hover:bg-muted text-foreground transition-all duration-200 active:scale-95" />

        {/* Seletor de Clínica (esquerda) */}
        {mounted && user && session?.user?.tipo !== TipoUsuario.SUPER_ADMIN && (
          <>
            <Separator orientation="vertical" className="h-5 bg-border/60 mx-1" />
            <TenantSelector />
          </>
        )}

        <div className="flex-1" />

        {user && (
          <div className="flex items-center gap-1">
            {/* Botão de Chat */}
            {(session?.user?.tipo === TipoUsuario.MEDICO || session?.user?.tipo === TipoUsuario.SECRETARIA) && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Mensagens"
                className="relative h-9 w-9 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
                onClick={() => setIsOpen(!isOpen)}
              >
                <IconMessage className="h-[18px] w-[18px]" />
                {mensagensNaoLidas > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-red-500/70 opacity-75 animate-ping"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-background"></span>
                  </span>
                )}
              </Button>
            )}

            {/* Botão de Notificações */}
            {(session?.user?.tipo === TipoUsuario.SECRETARIA || session?.user?.tipo === TipoUsuario.ADMIN_CLINICA) ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Notificações"
                    className="relative h-9 w-9 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
                  >
                    <IconBell className="h-[18px] w-[18px]" />
                    {autorizacoesNaoLidas > 0 && (
                      <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-red-500/70 opacity-75 animate-ping"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-background"></span>
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[22rem] p-0 rounded-xl overflow-hidden">
                  <DropdownMenuLabel className="px-4 py-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold tracking-tight">Notificações</span>
                      {autorizacoesNaoLidas > 0 && (
                        <span className="text-[11px] font-semibold bg-red-500 text-white px-2 py-0.5 rounded-full">
                          {autorizacoesNaoLidas} nova{autorizacoesNaoLidas > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="m-0" />
                  {loadingAutorizacoes ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Carregando...
                    </div>
                  ) : autorizacoes.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Nenhuma notificação
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      {autorizacoes.map((autorizacao) => {
                        const dataFormatada = new Date(autorizacao.data).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        });
                        const isFechado = autorizacao.status === "FECHADO";
                        
                        return (
                          <div
                            key={autorizacao.id}
                            className={`p-3 border-b last:border-b-0 ${
                              isFechado ? "bg-green-50/50" : "bg-orange-50/50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-0.5">
                                  {isFechado ? "Caixa Fechado" : "Autorização de Fechamento"}
                                </p>
                                <p className="text-sm font-medium text-gray-900">
                                  {autorizacao.medico.usuario.nome}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {isFechado
                                    ? "O médico autorizou e o caixa foi fechado."
                                    : "O médico autorizou o fechamento do caixa."}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  Data: {dataFormatada}
                                  {isFechado && (
                                    <span className="ml-2 text-green-600 font-medium">• Fechado</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleImprimirResumo(autorizacao.data, autorizacao.medico.id)}
                                className="h-7 text-xs flex-1"
                              >
                                <Printer className="w-3 h-3 mr-1" />
                                Imprimir
                              </Button>
                              {!isFechado && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleFecharCaixa(autorizacao.id, autorizacao.data)}
                                  className="h-7 text-xs flex-1"
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Fechar
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Notificações"
                className="relative h-9 w-9 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
              >
                <IconBell className="h-[18px] w-[18px]" />
              </Button>
            )}

            <Separator
              orientation="vertical"
              className="h-5 bg-border/60 mx-1.5"
            />

            {/* Avatar com Dropdown */}
            {mounted && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 h-9 pl-1 pr-2.5 rounded-full hover:bg-muted text-foreground transition-all duration-200"
                  >
                    <Avatar className="h-7 w-7 ring-1 ring-border/60">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden text-sm font-medium md:inline-block text-foreground tracking-tight max-w-[12rem] truncate">
                      {user.name}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-1.5 rounded-xl">
                  <DropdownMenuLabel className="p-0">
                    <div className="flex items-center gap-3 p-2.5">
                      <Avatar className="h-10 w-10 ring-1 ring-border/60">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate tracking-tight">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={() => router.push("/perfil")}
                      className="cursor-pointer rounded-lg py-2 px-2.5 hover:bg-accent/80 transition-colors duration-200 group"
                    >
                      <IconUserCircle className="mr-2.5 h-[18px] w-[18px] text-muted-foreground transition-transform duration-200 group-hover:scale-110" />
                      <span className="text-sm">Perfil</span>
                    </DropdownMenuItem>
                    {session?.user?.tipo === TipoUsuario.PACIENTE && (
                      <DropdownMenuItem
                        onClick={() => router.push("/paciente/meus-dados")}
                        className="cursor-pointer rounded-lg py-2 px-2.5 hover:bg-accent/80 transition-colors duration-200 group"
                      >
                        <IconShieldLock className="mr-2.5 h-[18px] w-[18px] text-muted-foreground transition-transform duration-200 group-hover:scale-110" />
                        <span className="text-sm">Meus Dados</span>
                      </DropdownMenuItem>
                    )}
                    {session?.user?.tipo === TipoUsuario.SECRETARIA &&
                      session?.user?.clinicaId && (
                        <DropdownMenuItem
                          onClick={() => {
                            const id = session?.user?.clinicaId;
                            if (!id) return;
                            window.open(
                              `/painel-chamadas?clinicaId=${encodeURIComponent(id)}`,
                              "_blank"
                            );
                          }}
                          className="cursor-pointer rounded-lg py-2 px-2.5 hover:bg-accent/80 transition-colors duration-200 group"
                        >
                          <IconPhoneCall className="mr-2.5 h-[18px] w-[18px] text-muted-foreground transition-transform duration-200 group-hover:scale-110" />
                          <span className="text-sm">Painel de Chamadas</span>
                        </DropdownMenuItem>
                      )}
                    {session?.user?.tipo === TipoUsuario.ADMIN_CLINICA && session?.user?.clinicaId && (
                      <DropdownMenuItem
                        onClick={() => {
                          const id = session?.user?.clinicaId;
                          if (!id) return;
                          window.open(`/painel-chamadas?clinicaId=${encodeURIComponent(id)}`, "_blank");
                        }}
                        className="cursor-pointer rounded-lg py-2 px-2.5 hover:bg-accent/80 transition-colors duration-200 group"
                      >
                        <IconPhoneCall className="mr-2.5 h-[18px] w-[18px] text-muted-foreground transition-transform duration-200 group-hover:scale-110" />
                        <span className="text-sm">Painel de Chamadas (TV)</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive cursor-pointer rounded-lg py-2 px-2.5 hover:bg-destructive/10 transition-colors duration-200 group"
                  >
                    <IconLogout className="mr-2.5 h-[18px] w-[18px] transition-transform duration-200 group-hover:-translate-x-0.5" />
                    <span className="text-sm font-medium">Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {!mounted && (
              <Button
                variant="ghost"
                className="flex items-center gap-2 h-9 pl-1 pr-2.5 rounded-full text-foreground"
                disabled
              >
                <Avatar className="h-7 w-7 ring-1 ring-border/60">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {user.name ? getInitials(user.name) : "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium md:inline-block text-foreground tracking-tight max-w-[12rem] truncate">
                  {user.name}
                </span>
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
