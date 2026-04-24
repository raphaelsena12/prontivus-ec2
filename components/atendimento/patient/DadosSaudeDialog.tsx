"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Pill, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DadosSaudeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pacienteId: string;
  initialAlergias: string | null;
  initialMedicamentosEmUso: string | null;
  onSaved: (data: { alergias: string | null; medicamentosEmUso: string | null }) => void;
}

export function DadosSaudeDialog({
  open,
  onOpenChange,
  pacienteId,
  initialAlergias,
  initialMedicamentosEmUso,
  onSaved,
}: DadosSaudeDialogProps) {
  const [alergias, setAlergias] = useState("");
  const [medicamentosEmUso, setMedicamentosEmUso] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAlergias(initialAlergias ?? "");
      setMedicamentosEmUso(initialMedicamentosEmUso ?? "");
    }
  }, [open, initialAlergias, initialMedicamentosEmUso]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/medico/pacientes/${pacienteId}/dados-saude`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alergias: alergias.trim() || null,
          medicamentosEmUso: medicamentosEmUso.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      const data = await res.json();
      onSaved({
        alergias: data.alergias ?? null,
        medicamentosEmUso: data.medicamentosEmUso ?? null,
      });
      toast.success("Dados de saúde atualizados");
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao salvar dados de saúde");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dados de Saúde do Paciente</DialogTitle>
          <DialogDescription>
            Atualize as alergias e medicamentos em uso do paciente. As informações ficam
            em destaque no cabeçalho do atendimento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="dados-alergias" className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              Alergias
            </Label>
            <Textarea
              id="dados-alergias"
              rows={3}
              maxLength={500}
              placeholder="Ex.: Dipirona, penicilina, frutos do mar..."
              value={alergias}
              onChange={(e) => setAlergias(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dados-medicamentos" className="flex items-center gap-2 text-amber-700">
              <Pill className="h-4 w-4" />
              Medicamentos em uso
            </Label>
            <Textarea
              id="dados-medicamentos"
              rows={4}
              maxLength={1000}
              placeholder="Ex.: Losartana 50mg 1x/dia; Metformina 850mg 2x/dia..."
              value={medicamentosEmUso}
              onChange={(e) => setMedicamentosEmUso(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
