"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { ChatFlutuante } from "@/components/chat-flutuante";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { TipoUsuario } from "@/lib/generated/prisma/enums";

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: {
    id: string;
    nome: string;
    email: string;
    tipo: TipoUsuario;
    clinicaId: string | null;
    avatar?: string | null;
    planoNome?: string | null;
  };
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  return (
    <SidebarProvider
      className="m-0 p-0"
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 16)",
          margin: 0,
          padding: 0,
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        user={{
          name: user.nome,
          email: user.email,
          avatar: user.avatar || undefined,
          tipo: user.tipo,
          planoNome: user.planoNome || undefined,
        }}
      />
      <SidebarInset
        className="!m-0 !p-0"
        style={{
          margin: 0,
          padding: 0,
        }}
      >
        <SiteHeader
          user={{
            name: user.nome,
            email: user.email,
            avatar: user.avatar || undefined,
          }}
        />
        <div className="flex flex-1 flex-col bg-slate-50">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
      {(user.tipo === TipoUsuario.MEDICO || user.tipo === TipoUsuario.SECRETARIA) && user.clinicaId && (
        <ChatFlutuante
          userId={user.id}
          clinicaId={user.clinicaId}
          userTipo={user.tipo}
        />
      )}
    </SidebarProvider>
  );
}

