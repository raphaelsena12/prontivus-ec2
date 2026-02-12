"use client";

import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarioHorariosProps {
  dataSelecionada: Date | null;
  onDataSelecionada: (data: Date) => void;
  horariosDisponiveis: string[];
  onHorarioSelecionado: (horario: string) => void;
  horarioSelecionado: string | null;
  datasComDisponibilidade?: Set<string>; // Datas que têm horários disponíveis (formato YYYY-MM-DD)
  onClose?: () => void;
}

const diasSemana = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function CalendarioHorarios({
  dataSelecionada,
  onDataSelecionada,
  horariosDisponiveis,
  onHorarioSelecionado,
  horarioSelecionado,
  datasComDisponibilidade = new Set(),
  onClose,
}: CalendarioHorariosProps) {
  const [mesAtual, setMesAtual] = useState(dataSelecionada || new Date());

  const diasDoMes = useMemo(() => {
    const inicioMes = startOfMonth(mesAtual);
    const fimMes = endOfMonth(mesAtual);
    const inicioSemana = startOfWeek(inicioMes, { weekStartsOn: 0 }); // Domingo = 0
    const fimSemana = endOfWeek(fimMes, { weekStartsOn: 0 });
    
    return eachDayOfInterval({ start: inicioSemana, end: fimSemana });
  }, [mesAtual]);

  const hoje = new Date();
  const dataMinima = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const dataMaxima = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 30);

  const handleDataClick = (data: Date) => {
    // Verificar se a data está dentro do range permitido
    if (data < dataMinima || data > dataMaxima) {
      return;
    }
    onDataSelecionada(data);
  };

  const handleMesAnterior = () => {
    setMesAtual(subMonths(mesAtual, 1));
  };

  const handleProximoMes = () => {
    setMesAtual(addMonths(mesAtual, 1));
  };

  const formatarData = (data: Date): string => {
    const dia = data.getDate();
    const mes = meses[data.getMonth()];
    return `${dia} de ${mes}`;
  };

  const temDisponibilidade = (data: Date): boolean => {
    const dataStr = format(data, "yyyy-MM-dd");
    return datasComDisponibilidade.has(dataStr);
  };

  const isDataSelecionada = (data: Date): boolean => {
    if (!dataSelecionada) return false;
    return isSameDay(data, dataSelecionada);
  };

  const isHoje = (data: Date): boolean => {
    return isSameDay(data, hoje);
  };

  const isMesAtual = (data: Date): boolean => {
    return isSameMonth(data, mesAtual);
  };

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-lg border p-3">
      {/* Header */}
      <div className="mb-3">
        <h2 className="text-xs font-semibold">Selecione a Data e Horário</h2>
      </div>

      {/* Calendário */}
      <div className="mb-3">
        {/* Navegação do mês */}
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleMesAnterior}
            className="h-6 w-6"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <h3 className="text-xs font-semibold">
            {meses[mesAtual.getMonth()]} {mesAtual.getFullYear()}
          </h3>
          <Button
            variant="outline"
            size="icon"
            onClick={handleProximoMes}
            className="h-6 w-6"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>

        {/* Dias da semana */}
        <div className="grid grid-cols-7 gap-0.5 mb-1.5">
          {diasSemana.map((dia) => (
            <div
              key={dia}
              className="text-center text-[10px] font-medium text-gray-600 dark:text-gray-400 py-1"
            >
              {dia}
            </div>
          ))}
        </div>

        {/* Dias do mês */}
        <div className="grid grid-cols-7 gap-0.5">
          {diasDoMes.map((dia, index) => {
            const dataStr = format(dia, "yyyy-MM-dd");
            const disponivel = temDisponibilidade(dia);
            const selecionado = isDataSelecionada(dia);
            const hojeDia = isHoje(dia);
            const mesAtualDia = isMesAtual(dia);
            const dentroDoRange = dia >= dataMinima && dia <= dataMaxima;

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleDataClick(dia)}
                disabled={!dentroDoRange || !mesAtualDia}
                className={cn(
                  "relative aspect-square flex items-center justify-center text-xs rounded transition-colors",
                  !mesAtualDia && "text-gray-300 dark:text-gray-700",
                  mesAtualDia && dentroDoRange && "text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800",
                  !dentroDoRange && mesAtualDia && "text-gray-400 dark:text-gray-600 cursor-not-allowed",
                  selecionado && "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 font-semibold",
                  hojeDia && !selecionado && mesAtualDia && "bg-gray-100 dark:bg-gray-800 font-medium"
                )}
              >
                {format(dia, "d")}
                {/* Indicador de disponibilidade */}
                {disponivel && mesAtualDia && dentroDoRange && (
                  <div className={cn(
                    "absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-6 h-0.5 rounded",
                    selecionado ? "bg-white dark:bg-gray-900" : "bg-green-500"
                  )} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Horários disponíveis */}
      {dataSelecionada && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-[10px] text-gray-600 dark:text-gray-400 mb-1">
            Clique para selecionar um horário do dia
          </p>
          <p className="text-[10px] font-medium mb-2 border-b border-dashed pb-1 inline-block">
            {formatarData(dataSelecionada)}
          </p>
          
          {horariosDisponiveis.length === 0 ? (
            <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center py-2">
              Nenhum horário disponível para esta data
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-1">
              {horariosDisponiveis.map((horario) => (
                <Button
                  key={horario}
                  type="button"
                  variant={horarioSelecionado === horario ? "default" : "outline"}
                  onClick={() => onHorarioSelecionado(horario)}
                  className={cn(
                    "h-7 text-[10px] font-medium",
                    horarioSelecionado === horario && "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900"
                  )}
                >
                  {horario}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
