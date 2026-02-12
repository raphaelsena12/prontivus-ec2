"use client";

import * as React from "react";
import {
  IconDashboard,
  IconUsers,
  IconCalendar,
  IconFileText,
  IconStethoscope,
  IconBuilding,
  IconInnerShadowTop,
  IconCreditCard,
  IconFlask,
  IconPill,
  IconBox,
  IconCash,
  IconReceipt,
  IconReceiptRefund,
  IconPhoneCall,
  IconList,
  IconAlertCircle,
  IconLayoutGrid,
  IconCheck,
  IconHistory,
} from "@tabler/icons-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { TipoUsuario } from "@/lib/generated/prisma/enums";

import { NavMain } from "@/components/nav-main";
import { NavMainWithCategories, type NavCategory, type NavItem } from "@/components/nav-main-with-categories";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    name: string;
    email: string;
    avatar?: string | null;
    tipo: TipoUsuario;
    planoNome?: string;
  };
}

const getMenuCategories = (tipo: TipoUsuario): NavCategory[] => {
  const categories: NavCategory[] = [];

  // Admin Clínica - Menu categorizado
  if (tipo === TipoUsuario.ADMIN_CLINICA) {
    categories.push({
      title: "Cadastros",
      icon: IconLayoutGrid,
      defaultOpen: false,
      items: [
        {
          title: "Pacientes",
          url: "/admin-clinica/pacientes",
          icon: IconUsers,
        },
        {
          title: "Usuários",
          url: "/admin-clinica/usuarios",
          icon: IconUsers,
        },
        {
          title: "Médicos",
          url: "/admin-clinica/medicos",
          icon: IconStethoscope,
        },
        {
          title: "Especialidades",
          url: "/admin-clinica/especialidades",
          icon: IconStethoscope,
        },
        {
          title: "Exames",
          url: "/admin-clinica/exames",
          icon: IconFlask,
        },
        {
          title: "Medicamentos",
          url: "/admin-clinica/medicamentos",
          icon: IconPill,
        },
        {
          title: "Procedimentos",
          url: "/admin-clinica/procedimentos",
          icon: IconFileText,
        },
        {
          title: "Formas de Pagamento",
          url: "/admin-clinica/formas-pagamento",
          icon: IconCreditCard,
        },
        {
          title: "Estoque",
          url: "/admin-clinica/estoque",
          icon: IconBox,
        },
      ],
    });

    categories.push({
      title: "Financeiro",
      icon: IconCash,
      defaultOpen: false,
      items: [
        {
          title: "Contas a Pagar",
          url: "/admin-clinica/contas-pagar",
          icon: IconReceiptRefund,
        },
        {
          title: "Contas a Receber",
          url: "/admin-clinica/contas-receber",
          icon: IconReceipt,
        },
        {
          title: "Fluxo de Caixa",
          url: "/admin-clinica/fluxo-caixa",
          icon: IconCash,
        },
      ],
    });

    categories.push({
      title: "TUSS",
      icon: IconFileText,
      defaultOpen: false,
      items: [
        {
          title: "Códigos TUSS",
          url: "/admin-clinica/codigos-tuss",
          icon: IconFileText,
        },
        {
          title: "Valores TUSS",
          url: "/admin-clinica/tuss-valores",
          icon: IconFileText,
        },
        {
          title: "Aceitação TUSS",
          url: "/admin-clinica/tuss-aceitacao",
          icon: IconFileText,
        },
      ],
    });
  }

  // Médico - Menu categorizado
  if (tipo === TipoUsuario.MEDICO) {
    // Categoria "Atendimento" removida - itens movidos para topItems

    categories.push({
      title: "Financeiro",
      icon: IconCash,
      defaultOpen: false,
      items: [
        {
          title: "Dashboard Financeiro",
          url: "/medico/dashboard-financeiro",
          icon: IconDashboard,
        },
        {
          title: "Contas a Pagar",
          url: "/medico/contas-pagar",
          icon: IconReceiptRefund,
        },
        {
          title: "Contas a Receber",
          url: "/medico/contas-receber",
          icon: IconReceipt,
        },
        {
          title: "Fluxo de Caixa",
          url: "/medico/fluxo-caixa",
          icon: IconCash,
        },
        {
          title: "Inadimplência",
          url: "/medico/inadimplencia",
          icon: IconAlertCircle,
        },
      ],
    });

    categories.push({
      title: "Estoque",
      icon: IconBox,
      defaultOpen: false,
      items: [
        {
          title: "Gerenciar Estoque",
          url: "/medico/estoque",
          icon: IconBox,
        },
      ],
    });
  }

  return categories;
};

const getSimpleMenuItems = (tipo: TipoUsuario) => {
  const items = [];

  // Super Admin - menu simplificado sem categorias
  if (tipo === TipoUsuario.SUPER_ADMIN) {
    items.push({
      title: "Início",
      url: "/dashboard",
      icon: IconDashboard,
    });
    items.push({
      title: "Clínicas",
      url: "/super-admin/clinicas",
      icon: IconBuilding,
    });
    items.push({
      title: "Pagamentos",
      url: "/super-admin/pagamentos",
      icon: IconCreditCard,
    });
  }

  // Secretaria - menu simplificado sem categorias
  if (tipo === TipoUsuario.SECRETARIA) {
    items.push({
      title: "Início",
      url: "/dashboard",
      icon: IconDashboard,
    });
    items.push({
      title: "Pacientes",
      url: "/secretaria/pacientes",
      icon: IconUsers,
    });
    items.push({
      title: "Agendamentos",
      url: "/secretaria/agendamentos",
      icon: IconCalendar,
    });
    items.push({
      title: "Check-in",
      url: "/secretaria/check-in",
      icon: IconCheck,
    });
    items.push({
      title: "Painel de Chamadas",
      url: "/secretaria/painel-chamadas",
      icon: IconPhoneCall,
    });
  }

  // Paciente - menu simplificado sem categorias
  if (tipo === TipoUsuario.PACIENTE) {
    items.push({
      title: "Início",
      url: "/paciente",
      icon: IconDashboard,
    });
    items.push({
      title: "Novo Agendamento",
      url: "/paciente/novo-agendamento",
      icon: IconCalendar,
    });
    items.push({
      title: "Histórico de Consultas",
      url: "/paciente/historico-consultas",
      icon: IconHistory,
    });
    items.push({
      title: "Histórico de Prescrições",
      url: "/paciente/historico-prescricoes",
      icon: IconFileText,
    });
  }

  return items;
};


export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const menuCategories = getMenuCategories(user.tipo);
  const simpleMenuItems = getSimpleMenuItems(user.tipo);
  const hasCategories = menuCategories.length > 0;

  // Itens principais no topo
  let topItems: NavItem[] | undefined = undefined;
  
  if (user.tipo === TipoUsuario.MEDICO && hasCategories) {
    // Para médicos, mostrar os itens principais no topo
    topItems = [
      {
        title: "Início",
        url: "/dashboard",
        icon: IconDashboard,
      },
      {
        title: "Agendamentos",
        url: "/medico/agendamentos",
        icon: IconCalendar,
      },
      {
        title: "Fila de Atendimento",
        url: "/medico/fila-atendimento",
        icon: IconList,
      },
      {
        title: "Histórico de Prontuários",
        url: "/medico/prontuarios",
        icon: IconFileText,
      },
      {
        title: "Manipulados",
        url: "/medico/manipulados",
        icon: IconFlask,
      },
    ];
  } else if (hasCategories) {
    // Para outros tipos com categorias, apenas Início
    topItems = [{
      title: "Início",
      url: "/dashboard",
      icon: IconDashboard,
    }];
  }


  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-white/10 relative overflow-hidden px-4 py-3">
        <div className="flex flex-col gap-2 items-center">
          {/* Logo e texto */}
          <Link href="/dashboard" className="flex flex-col gap-0.5 items-center group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
            <Image 
              src="/LogotipoemFundoTransparente.webp" 
              alt="Prontivus" 
              width={100} 
              height={30}
              className="group-data-[collapsible=icon]:hidden"
              priority
            />
            {/* Ícone quando colapsado */}
            <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/20">
              <span className="text-lg font-bold text-white">P</span>
            </div>
          </Link>
          
          {/* Badge do plano */}
          <div className="w-full flex justify-center group-data-[collapsible=icon]:hidden">
            {user.tipo === TipoUsuario.ADMIN_CLINICA && user.planoNome ? (
              <Link href="/admin-clinica/pagamentos">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-blue-400/50 bg-blue-500/10 hover:bg-blue-500/20 transition-colors cursor-pointer">
                  <IconCheck className="h-2.5 w-2.5 text-blue-300 shrink-0" />
                  <span className="text-[10px] font-medium text-white leading-tight">
                    Plano: {user.planoNome === "BASICO" ? "Básico" : user.planoNome === "INTERMEDIARIO" ? "Intermediário" : "Profissional"}
                  </span>
                </div>
              </Link>
            ) : (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-blue-400/50 bg-blue-500/10">
                <IconCheck className="h-2.5 w-2.5 text-blue-300 shrink-0" />
                <span className="text-[10px] font-medium text-white uppercase leading-tight">
                  {user.tipo === TipoUsuario.SUPER_ADMIN && "SUPER ADMIN"}
                  {user.tipo === TipoUsuario.ADMIN_CLINICA && "ADMIN CLÍNICA"}
                  {user.tipo === TipoUsuario.MEDICO && "MÉDICO"}
                  {user.tipo === TipoUsuario.SECRETARIA && "SECRETARIA"}
                  {user.tipo === TipoUsuario.PACIENTE && "PACIENTE"}
                  {user.planoNome && user.tipo !== TipoUsuario.SUPER_ADMIN && ` - ${user.planoNome === "BASICO" ? "Básico" : user.planoNome === "INTERMEDIARIO" ? "Intermediário" : "Profissional"}`}
                </span>
              </div>
            )}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-0 py-2">
        {hasCategories ? (
          <NavMainWithCategories 
            categories={menuCategories} 
            topItems={topItems}
          />
        ) : (
          <NavMain items={simpleMenuItems} />
        )}
      </SidebarContent>
    </Sidebar>
  );
}
