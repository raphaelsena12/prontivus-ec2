"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, History, FileText, Plus } from "lucide-react";
import Link from "next/link";

interface PacienteContentProps {
  nome: string;
}

export function PacienteContent({ nome }: PacienteContentProps) {
  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col">
        {/* Botões de ação alinhados à direita */}
        <div className="flex items-center justify-end px-4 lg:px-6 pt-2 pb-4">
          <Link href="/paciente/novo-agendamento">
            <Button className="text-xs">
              <Plus className="mr-2 h-3.5 w-3.5" />
              Novo Agendamento
            </Button>
          </Link>
        </div>

        {/* Conteúdo com margens laterais */}
        <div className="px-4 lg:px-6">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/paciente/novo-agendamento">
              <Card className="p-3 hover:bg-accent transition-colors cursor-pointer">
                <CardHeader className="p-0 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950">
                      <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <CardTitle className="text-xl">Novo Agendamento</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <CardDescription className="text-xs">
                    Agende uma nova consulta médica
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>

            <Link href="/paciente/historico-consultas">
              <Card className="p-3 hover:bg-accent transition-colors cursor-pointer">
                <CardHeader className="p-0 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
                      <History className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <CardTitle className="text-xl">Histórico de Consultas</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <CardDescription className="text-xs">
                    Visualize todas as suas consultas realizadas
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>

            <Link href="/paciente/historico-prescricoes">
              <Card className="p-3 hover:bg-accent transition-colors cursor-pointer">
                <CardHeader className="p-0 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950">
                      <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <CardTitle className="text-xl">Histórico de Prescrições</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <CardDescription className="text-xs">
                    Acesse suas receitas e prescrições médicas
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          </div>

          <Card className="mt-4 p-3">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-xl">Bem-vindo, {nome}!</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <CardDescription className="text-xs">
                Gerencie seus agendamentos, visualize seu histórico de consultas e acesse suas prescrições médicas.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}














