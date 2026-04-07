"use client";

import { brazilToday } from "@/lib/timezone-utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Printer, CalendarDays, CalendarRange, Calendar, List } from "lucide-react";
import { type FormatoAgenda, type AgendaItem, gerarAgendaPdf } from "@/lib/pdf/agenda-print";

interface ImprimirAgendaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicoNome: string;
  agendamentos: AgendaItem[];
}

const FORMATOS: { value: FormatoAgenda; label: string; desc: string; icon: React.ElementType }[] = [
  { value: "diario", label: "Diário", desc: "Agenda de um dia específico", icon: CalendarDays },
  { value: "semanal", label: "Semanal", desc: "Visão da semana completa", icon: CalendarRange },
  { value: "mensal", label: "Mensal", desc: "Calendário do mês inteiro", icon: Calendar },
  { value: "lista", label: "Lista", desc: "Todos os agendamentos", icon: List },
];

export function ImprimirAgendaModal({ open, onOpenChange, medicoNome, agendamentos }: ImprimirAgendaModalProps) {
  const [formato, setFormato] = useState<FormatoAgenda>("diario");
  const [data, setData] = useState(() => brazilToday());
  const [gerando, setGerando] = useState(false);

  const handleGerar = () => {
    try {
      setGerando(true);

      const dataRef = new Date(data + "T12:00:00");

      const pdfBytes = gerarAgendaPdf({
        formato,
        medicoNome,
        data: dataRef,
        agendamentos,
      });

      // Criar blob e abrir em nova aba
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");

      // Limpar URL após um tempo
      setTimeout(() => URL.revokeObjectURL(url), 30000);

      toast.success("PDF gerado com sucesso");
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF da agenda");
    } finally {
      setGerando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Imprimir Agenda
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground/80">
            Selecione o formato e a data de referência para gerar o PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Seleção de formato */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Formato</Label>
            <div className="grid grid-cols-2 gap-2">
              {FORMATOS.map((f) => {
                const Icon = f.icon;
                const isSelected = formato === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFormato(f.value)}
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/60 hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="min-w-0">
                      <span className={`text-xs font-medium block ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {f.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight block">
                        {f.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Data de referência */}
          <div className="space-y-2">
            <Label htmlFor="data-ref" className="text-xs font-medium">
              {formato === "diario" && "Data"}
              {formato === "semanal" && "Semana de"}
              {formato === "mensal" && "Mês de referência"}
              {formato === "lista" && "Data (para referência)"}
            </Label>
            <Input
              id="data-ref"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="text-xs h-8"
            />
            <p className="text-[10px] text-muted-foreground">
              {formato === "diario" && "Exibe os agendamentos do dia selecionado."}
              {formato === "semanal" && "Exibe a semana (seg-dom) que contém esta data."}
              {formato === "mensal" && "Exibe o calendário do mês desta data."}
              {formato === "lista" && "Exibe todos os agendamentos carregados em formato de lista."}
            </p>
          </div>

          {/* Info do médico */}
          <div className="rounded-md bg-muted/50 p-2.5">
            <p className="text-[10px] text-muted-foreground">
              Médico: <span className="font-medium text-foreground">{medicoNome}</span>
            </p>
            <p className="text-[10px] text-muted-foreground">
              {agendamentos.length} agendamento(s) carregado(s)
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleGerar}
            disabled={gerando || !data}
            className="text-xs h-8"
          >
            {gerando ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                Gerar PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
