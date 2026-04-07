"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import {
  Calendar,
  History,
  Plus,
  CreditCard,
  Video,
  Pill,
  ChevronRight,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";

interface PacienteContentProps {
  nome: string;
}

function getGreeting(firstName: string) {
  const hour = parseInt(
    new Intl.DateTimeFormat("en-US", { hour: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date())
  );
  if (hour < 12) return `Bom dia, ${firstName}`;
  if (hour < 18) return `Boa tarde, ${firstName}`;
  return `Boa noite, ${firstName}`;
}

function getFormattedDate() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

const quickActions = [
  {
    href: "/paciente/novo-agendamento",
    icon: Calendar,
    label: "Novo Agendamento",
    description: "Agende uma nova consulta",
    iconBg: "bg-primary/10 text-primary",
  },
  {
    href: "/paciente/telemedicina",
    icon: Video,
    label: "Telemedicina",
    description: "Consulta por videochamada",
    iconBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    badge: "online",
  },
  {
    href: "/paciente/historico-consultas",
    icon: History,
    label: "Hist. de Consultas",
    description: "Suas consultas realizadas",
    iconBg: "bg-primary/10 text-primary",
  },
  {
    href: "/paciente/historico-prescricoes",
    icon: Pill,
    label: "Prescrições",
    description: "Receitas e medicamentos",
    iconBg: "bg-primary/10 text-primary",
  },
  {
    href: "/paciente/historico-pagamentos",
    icon: CreditCard,
    label: "Pagamentos",
    description: "Histórico financeiro",
    iconBg: "bg-primary/10 text-primary",
  },
];

export function PacienteContent({ nome }: PacienteContentProps) {
  const firstName = nome.split(" ")[0];

  return (
    <div className="@container/main flex flex-1 flex-col gap-0">
      <div className="px-6 lg:px-8 pt-6">
        <PageHeader
          icon={LayoutDashboard}
          title={getGreeting(firstName)}
          subtitle={`${getFormattedDate()} · Portal do Paciente`}
        >
          <Link href="/paciente/novo-agendamento">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Novo Agendamento
            </Button>
          </Link>
        </PageHeader>
      </div>

      <div className="px-6 lg:px-8 pb-6 flex flex-col gap-6">
        {/* Grid de ações rápidas */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Acesso rápido
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href} className="group">
                <Card className="border hover:border-primary/30 hover:shadow-sm transition-all duration-150 cursor-pointer h-full">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-lg ${action.iconBg}`}
                        >
                          <action.icon style={{ width: 18, height: 18 }} />
                        </div>
                        {action.badge === "online" ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-transparent text-[10px] px-1.5 py-0 h-4 font-medium">
                            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                            Online
                          </Badge>
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground leading-tight">
                          {action.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Banner telemedicina */}
        <Card className="border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/40">
                  <Video
                    style={{ width: 18, height: 18 }}
                    className="text-emerald-600 dark:text-emerald-400"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      Telemedicina disponível
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Ao vivo
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Médicos online para atendimento imediato por videochamada
                  </p>
                </div>
              </div>
              <Link href="/paciente/telemedicina" className="shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 gap-1.5"
                >
                  Ver médicos online
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
