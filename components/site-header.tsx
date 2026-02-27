"use client";

import React, { useState, useEffect, useContext } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { IconBell, IconLogout, IconUserCircle, IconMessage } from "@tabler/icons-react";
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
import { cn } from "@/lib/utils";
import { TenantSelector } from "@/components/tenant-selector";
import { TipoUsuario } from "@/lib/generated/prisma";
import { ChatContext } from "@/components/chat-context";
import { Printer, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

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
    "admin-clinica": "Admin Clínica",
    "exames": "Exames",
    "especialidades": "Especialidades",
    "medicamentos": "Medicamentos",
    "pacientes": "Pacientes",
    "usuarios": "Usuários",
    "medicos": "Médicos",
    "procedimentos": "Procedimentos",
    "formas-pagamento": "Formas de Pagamento",
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
  const chatContext = useContext(ChatContext);
  const isOpen = chatContext?.isOpen ?? false;
  const setIsOpen = chatContext?.setIsOpen ?? (() => {});
  const mensagensNaoLidas = chatContext?.mensagensNaoLidas ?? 0;

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const handleImprimirResumo = async (data: string, medicoId: string) => {
    try {
      const params = new URLSearchParams({ data, medicoId });
      const response = await fetch(`/api/secretaria/fechamento-caixa/resumo-financeiro?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao gerar resumo financeiro");
      }

      const resumo = await response.json();
      const nomeSecretaria = session?.user?.nome || user?.name || "";

      // Criar janela de impressão (código similar ao da secretaria-content.tsx)
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Por favor, permita pop-ups para imprimir o resumo");
        return;
      }

      const dataFormatada = new Date(data).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      // HTML simplificado para impressão (mesmo código do secretaria-content.tsx)
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Relatório Financeiro - ${dataFormatada}</title>
            <style>
              @media print {
                @page {
                  margin: 1.5cm;
                }
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                padding: 0;
                color: #1f2937;
                line-height: 1.6;
                background: #fff;
                padding-bottom: 60px;
              }
              .header {
                text-align: center;
                margin-bottom: 40px;
                padding-bottom: 20px;
                border-bottom: 1px solid #3b82f6;
              }
              .header h1 {
                font-size: 22px;
                font-weight: 700;
                color: #1e40af;
                margin-bottom: 6px;
              }
              .header p {
                color: #6b7280;
                font-size: 12px;
                margin: 3px 0;
              }
              .info-clinica {
                margin-bottom: 25px;
                font-size: 11px;
                color: #4b5563;
                text-align: center;
              }
              .section-title {
                font-size: 15px;
                font-weight: 600;
                color: #1f2937;
                margin: 25px 0 12px 0;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                background: #fff;
              }
              thead th {
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                color: #fff;
                padding: 10px 8px;
                text-align: left;
                font-weight: 600;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              tbody td {
                padding: 10px 8px;
                font-size: 11px;
                color: #374151;
                border-bottom: 1px solid #f3f4f6;
              }
              tbody tr:hover {
                background-color: #f9fafb;
              }
              .totais {
                margin-top: 40px;
                padding: 25px;
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                border-radius: 8px;
              }
              .totais h3 {
                font-size: 13px;
                font-weight: 600;
                color: #1e40af;
                margin-bottom: 12px;
              }
              .total-geral {
                font-weight: 700;
                font-size: 12px;
                background: #1e40af !important;
                color: #fff !important;
              }
              .total-geral td {
                color: #fff !important;
                padding: 12px 8px;
              }
              .assinaturas {
                margin-top: 60px;
                display: flex;
                justify-content: space-between;
                padding-top: 40px;
              }
              .assinatura {
                width: 45%;
                text-align: center;
              }
              .assinatura p {
                margin-bottom: 6px;
                font-size: 11px;
                color: #4b5563;
              }
              .assinatura strong {
                font-size: 12px;
                color: #1f2937;
                font-weight: 600;
              }
              .assinatura .linha {
                border-top: 1px solid #1f2937;
                margin-top: 50px;
                padding-top: 6px;
                font-size: 10px;
                color: #6b7280;
              }
              .footer {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                text-align: center;
                font-size: 9px;
                color: #9ca3af;
                padding: 15px 0;
                border-top: 1px solid #e5e7eb;
                background: #fff;
              }
              .valor {
                text-align: right;
                font-weight: 500;
                color: #059669;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Relatório Financeiro</h1>
              <p>Data: ${dataFormatada}</p>
              ${resumo.clinica ? `<p style="margin-top: 8px; font-weight: 500; color: #1f2937;">${resumo.clinica.nome}</p>` : ""}
            </div>
            
            ${resumo.clinica && resumo.clinica.endereco ? `
            <div class="info-clinica">
              ${resumo.clinica.endereco ? `<p>${resumo.clinica.endereco}${resumo.clinica.cidade ? ` - ${resumo.clinica.cidade}/${resumo.clinica.estado || ""}` : ""}</p>` : ""}
            </div>
            ` : ""}

            <h2 class="section-title">Consultas Realizadas</h2>
            ${resumo.consultas && resumo.consultas.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Paciente</th>
                  <th>Convênio/Plano</th>
                  <th>Tipo</th>
                  <th style="text-align: right;">Valor</th>
                </tr>
              </thead>
              <tbody>
                ${resumo.consultas.map((consulta: any) => {
                  const hora = new Date(consulta.dataHora).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const convenio = consulta.operadora
                    ? consulta.operadora.nomeFantasia || consulta.operadora.razaoSocial
                    : consulta.planoSaude
                    ? consulta.planoSaude.nome
                    : "Particular";
                  const tipo = consulta.tipoConsulta?.nome || "-";
                  const valor = consulta.valorCobrado
                    ? Number(consulta.valorCobrado).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })
                    : "-";

                  return `
                    <tr>
                      <td>${hora}</td>
                      <td>${consulta.paciente.nome}</td>
                      <td>${convenio}</td>
                      <td>${tipo}</td>
                      <td class="valor">${valor}</td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
            ` : '<div class="empty-state">Nenhuma consulta encontrada para esta data.</div>'}

            <div class="totais">
              <h3>Totais por Forma de Pagamento</h3>
              ${Object.keys(resumo.totalPorFormaPagamento || {}).length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Forma de Pagamento</th>
                    <th style="text-align: right;">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(resumo.totalPorFormaPagamento || {}).map(
                    ([forma, valor]: [string, any]) => `
                    <tr>
                      <td>${forma.replace(/_/g, " ")}</td>
                      <td class="valor">${Number(valor).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}</td>
                    </tr>
                  `
                  ).join("")}
                  <tr class="total-geral">
                    <td>TOTAL GERAL</td>
                    <td style="text-align: right;">${Number(resumo.totalGeral || 0).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}</td>
                  </tr>
                </tbody>
              </table>
              ` : '<p style="color: #9ca3af; font-style: italic;">Nenhum pagamento registrado.</p>'}

              <h3 style="margin-top: 25px;">Totais por Convênio</h3>
              ${Object.keys(resumo.totalPorConvenio || {}).length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Convênio</th>
                    <th style="text-align: right;">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(resumo.totalPorConvenio || {}).map(
                    ([convenio, valor]: [string, any]) => `
                    <tr>
                      <td>${convenio}</td>
                      <td class="valor">${Number(valor).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}</td>
                    </tr>
                  `
                  ).join("")}
                </tbody>
              </table>
              ` : '<p style="color: #9ca3af; font-style: italic;">Nenhum convênio registrado.</p>'}
            </div>

            <div class="assinaturas">
              <div class="assinatura">
                <p><strong>Médico</strong></p>
                ${resumo.autorizacao?.medico?.usuario?.nome ? `<p>${resumo.autorizacao.medico.usuario.nome}</p>` : ""}
                <div class="linha">Assinatura do Médico</div>
              </div>
              <div class="assinatura">
                <p><strong>Secretária</strong></p>
                ${nomeSecretaria ? `<p>${nomeSecretaria}</p>` : ""}
                <div class="linha">Assinatura da Secretária</div>
              </div>
            </div>

            <div class="footer">
              <p>Prontivus - Sistema de Gestão Médica</p>
              <p>Impresso em: ${new Date().toLocaleString("pt-BR")}</p>
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar resumo financeiro");
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
      className="sticky top-0 z-20 flex h-(--header-height) shrink-0 items-center gap-2 border-b border-border bg-background shadow-sm transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) text-foreground overflow-x-hidden"
    >
      <div className="relative z-10 flex w-full items-center gap-3 px-4 lg:gap-4 lg:px-6 text-foreground overflow-x-hidden">
        <SidebarTrigger className="-ml-1 hover:bg-muted text-foreground transition-all duration-200 hover:scale-105 active:scale-95" />
        
        <Separator
          orientation="vertical"
          className="h-6 bg-border"
        />
        
        <div className="flex-1">
          {pathname === "/super-admin" && user ? (
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              Bem-vindo, {user.name}.
            </h1>
          ) : (
            <Breadcrumb>
              <BreadcrumbList>
                {getBreadcrumbItems(pathname).map((item, index) => (
                  <React.Fragment key={item.href}>
                    <BreadcrumbItem>
                      {item.isLast ? (
                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!item.isLast && <BreadcrumbSeparator />}
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}
        </div>

        {user && (
          <div className="flex items-center gap-2">
            {/* Seletor de Clínica (Multi-Tenant) */}
            {mounted && (
              <TenantSelector className="text-foreground [&_button]:text-foreground [&_button]:hover:bg-muted [&_svg]:text-muted-foreground" />
            )}

            <Separator
              orientation="vertical"
              className="h-6 bg-border hidden md:block"
            />

            {/* Botão de Chat */}
            {(session?.user?.tipo === TipoUsuario.MEDICO || session?.user?.tipo === TipoUsuario.SECRETARIA) && (
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-muted text-foreground transition-all duration-200"
                onClick={() => setIsOpen(!isOpen)}
              >
                <IconMessage className="h-5 w-5" />
                {mensagensNaoLidas > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
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
                    className="relative hover:bg-muted text-foreground transition-all duration-200"
                  >
                    <IconBell className="h-5 w-5" />
                    {autorizacoesNaoLidas > 0 && (
                      <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>
                    <div className="flex items-center justify-between">
                      <span>Notificações</span>
                      {autorizacoesNaoLidas > 0 && (
                        <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                          {autorizacoesNaoLidas}
                        </span>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
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
                                <p className="text-sm font-medium text-gray-900">
                                  {autorizacao.medico.usuario.nome}
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
                className="relative hover:bg-muted text-foreground transition-all duration-200"
              >
                <IconBell className="h-5 w-5" />
              </Button>
            )}

            <Separator
              orientation="vertical"
              className="h-6 bg-border"
            />

            {/* Avatar com Dropdown */}
            {mounted && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 px-2 hover:bg-muted text-foreground transition-all duration-200"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="bg-muted text-foreground font-semibold">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden font-medium md:inline-block text-foreground">
                      {user.name}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem 
                      onClick={() => router.push("/perfil")}
                      className="cursor-pointer hover:bg-accent/80 transition-colors duration-200 group"
                    >
                      <IconUserCircle className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                      Perfil
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive cursor-pointer hover:bg-destructive/10 transition-colors duration-200 group"
                  >
                    <IconLogout className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:rotate-12" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {!mounted && (
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-2 text-foreground"
                disabled
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-muted text-foreground font-semibold">
                    {user.name ? getInitials(user.name) : "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden font-medium md:inline-block text-foreground">
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
