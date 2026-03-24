"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

type EscalaItem = {
  diaSemana: number;
  horaInicio: string;
  horaFim: string;
};

const DIAS = [
  { id: 0, nome: "Domingo" },
  { id: 1, nome: "Segunda" },
  { id: 2, nome: "Terça" },
  { id: 3, nome: "Quarta" },
  { id: 4, nome: "Quinta" },
  { id: 5, nome: "Sexta" },
  { id: 6, nome: "Sábado" },
];

interface EscalaMedicoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicoId?: string;
  medicoNome?: string;
}

export function EscalaMedicoModal({ open, onOpenChange, medicoId, medicoNome }: EscalaMedicoModalProps) {
  const [loading, setLoading] = useState(false);
  const [diasAtivos, setDiasAtivos] = useState<Record<number, boolean>>({});
  const [faixas, setFaixas] = useState<Record<number, { horaInicio: string; horaFim: string }>>({});

  const semMedico = !medicoId;

  const escalaPayload: EscalaItem[] = useMemo(() => {
    return DIAS.filter((d) => diasAtivos[d.id]).map((d) => ({
      diaSemana: d.id,
      horaInicio: faixas[d.id]?.horaInicio || "08:00",
      horaFim: faixas[d.id]?.horaFim || "18:00",
    }));
  }, [diasAtivos, faixas]);

  useEffect(() => {
    if (!open || !medicoId) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/secretaria/medicos/${medicoId}/escala`);
        if (!res.ok) throw new Error("Erro ao carregar escala");
        const data = await res.json();
        const ativos: Record<number, boolean> = {};
        const ranges: Record<number, { horaInicio: string; horaFim: string }> = {};
        (data.escalas || []).forEach((item: EscalaItem) => {
          ativos[item.diaSemana] = true;
          if (!ranges[item.diaSemana]) {
            ranges[item.diaSemana] = { horaInicio: item.horaInicio, horaFim: item.horaFim };
          }
        });
        setDiasAtivos(ativos);
        setFaixas(ranges);
      } catch (error) {
        toast.error("Erro ao carregar escala do médico");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, medicoId]);

  const handleSalvar = async () => {
    if (!medicoId) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/secretaria/medicos/${medicoId}/escala`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          escalas: escalaPayload,
          excecoes: [],
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Erro ao salvar escala");
      }
      toast.success("Escala salva com sucesso");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar escala");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurar escala do médico</DialogTitle>
          <DialogDescription>
            {medicoNome ? `Defina os dias e horários de atendimento de ${medicoNome}.` : "Selecione um médico para configurar a escala."}
          </DialogDescription>
        </DialogHeader>

        {semMedico ? (
          <div className="text-sm text-muted-foreground py-4">Selecione um médico na tela para configurar a escala.</div>
        ) : (
          <div className="space-y-3">
            {DIAS.map((dia) => {
              const ativo = !!diasAtivos[dia.id];
              return (
                <div key={dia.id} className="grid grid-cols-12 items-center gap-2 border rounded-md p-2">
                  <div className="col-span-4 flex items-center gap-2">
                    <Checkbox
                      checked={ativo}
                      onCheckedChange={(checked) => {
                        setDiasAtivos((prev) => ({ ...prev, [dia.id]: !!checked }));
                        setFaixas((prev) => ({
                          ...prev,
                          [dia.id]: prev[dia.id] || { horaInicio: "08:00", horaFim: "18:00" },
                        }));
                      }}
                    />
                    <Label>{dia.nome}</Label>
                  </div>
                  <div className="col-span-4">
                    <Input
                      type="time"
                      value={faixas[dia.id]?.horaInicio || "08:00"}
                      disabled={!ativo}
                      onChange={(e) =>
                        setFaixas((prev) => ({
                          ...prev,
                          [dia.id]: { ...(prev[dia.id] || { horaFim: "18:00" }), horaInicio: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="col-span-4">
                    <Input
                      type="time"
                      value={faixas[dia.id]?.horaFim || "18:00"}
                      disabled={!ativo}
                      onChange={(e) =>
                        setFaixas((prev) => ({
                          ...prev,
                          [dia.id]: { ...(prev[dia.id] || { horaInicio: "08:00" }), horaFim: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={loading || semMedico}>
            {loading ? "Salvando..." : "Salvar escala"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
