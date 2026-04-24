"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, HeartPulse, AlertTriangle, Pill } from "lucide-react";
import { toast } from "sonner";

interface DadosSaude {
  alergias: string;
  medicamentosEmUso: string;
}

export function DadosSaudeSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dados, setDados] = useState<DadosSaude>({
    alergias: "",
    medicamentosEmUso: "",
  });
  const [original, setOriginal] = useState<DadosSaude>({
    alergias: "",
    medicamentosEmUso: "",
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/paciente/meus-dados");
        if (!res.ok) throw new Error("Erro ao carregar dados");
        const data = await res.json();
        if (cancelled) return;
        const normalized: DadosSaude = {
          alergias: data.alergias ?? "",
          medicamentosEmUso: data.medicamentosEmUso ?? "",
        };
        setDados(normalized);
        setOriginal(normalized);
      } catch (error) {
        if (!cancelled) {
          toast.error("Não foi possível carregar seus dados de saúde");
          console.error(error);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasChanges =
    dados.alergias.trim() !== original.alergias.trim() ||
    dados.medicamentosEmUso.trim() !== original.medicamentosEmUso.trim();

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/paciente/meus-dados", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alergias: dados.alergias.trim() || null,
          medicamentosEmUso: dados.medicamentosEmUso.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      const data = await res.json();
      const normalized: DadosSaude = {
        alergias: data.alergias ?? "",
        medicamentosEmUso: data.medicamentosEmUso ?? "",
      };
      setDados(normalized);
      setOriginal(normalized);
      toast.success("Dados atualizados com sucesso");
    } catch (error) {
      toast.error("Erro ao salvar dados de saúde");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <HeartPulse className="h-5 w-5 text-rose-600" />
          <CardTitle>Dados de Saúde</CardTitle>
        </div>
        <CardDescription>
          Informe suas alergias e medicamentos em uso. Essas informações ficam
          visíveis para a equipe médica durante o atendimento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="alergias" className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                Alergias
              </Label>
              <Textarea
                id="alergias"
                rows={3}
                maxLength={500}
                placeholder="Ex.: Dipirona, penicilina, frutos do mar..."
                value={dados.alergias}
                onChange={(e) => setDados((d) => ({ ...d, alergias: e.target.value }))}
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                Liste substâncias e reações, separando por vírgula. Deixe em branco se não houver.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="medicamentosEmUso" className="flex items-center gap-2 text-amber-700">
                <Pill className="h-4 w-4" />
                Medicamentos em uso
              </Label>
              <Textarea
                id="medicamentosEmUso"
                rows={4}
                maxLength={1000}
                placeholder="Ex.: Losartana 50mg 1x/dia; Metformina 850mg 2x/dia..."
                value={dados.medicamentosEmUso}
                onChange={(e) =>
                  setDados((d) => ({ ...d, medicamentosEmUso: e.target.value }))
                }
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                Inclua nome, dose e frequência. Deixe em branco se não usa medicação contínua.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={saving || !hasChanges}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar alterações
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
