"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { IconBell, IconLogout, IconUserCircle } from "@tabler/icons-react";
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

export function SiteHeader({ user }: SiteHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const pageTitle = getPageTitle(pathname);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      className="relative flex h-(--header-height) shrink-0 items-center gap-2 border-b border-border bg-background shadow-sm transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) text-foreground"
    >
      <div className="relative z-10 flex w-full items-center gap-3 px-4 lg:gap-4 lg:px-6 text-foreground">
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

            {/* Botão de Notificações */}
            <Button
              variant="ghost"
              size="icon"
              className="relative hover:bg-muted text-foreground transition-all duration-200"
            >
              <IconBell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
            </Button>

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
