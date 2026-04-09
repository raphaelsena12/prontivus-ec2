"use client";

import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ConsentimentoModalProps {
  /** Se true, verifica automaticamente ao montar */
  autoCheck?: boolean;
}

export function ConsentimentoModal({ autoCheck = true }: ConsentimentoModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aceitou, setAceitou] = useState(false);
  const [textoTermo, setTextoTermo] = useState("");
  const [versao, setVersao] = useState("");

  const verificarConsentimento = useCallback(async () => {
    try {
      const res = await fetch("/api/paciente/consentimento");

      // 401 = não é paciente, não mostrar modal
      if (res.status === 401) return;

      if (!res.ok) {
        console.warn("[LGPD] Erro ao verificar consentimento:", res.status);
        return;
      }

      const data = await res.json();
      if (!data.consentimentoAceito) {
        setTextoTermo(data.textoTermo || "");
        setVersao(data.versaoAtual || "");
        setOpen(true);
      }
    } catch (err) {
      console.warn("[LGPD] Falha ao verificar consentimento:", err);
    }
  }, []);

  useEffect(() => {
    if (autoCheck) {
      verificarConsentimento();
    }
  }, [autoCheck, verificarConsentimento]);

  const handleAceitar = async () => {
    if (!aceitou) return;

    setLoading(true);
    try {
      const res = await fetch("/api/paciente/consentimento", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Erro ao registrar consentimento");
      }

      toast.success("Consentimento registrado com sucesso!");
      setOpen(false);
    } catch {
      toast.error("Erro ao registrar consentimento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                Termo de Consentimento LGPD
              </DialogTitle>
              <DialogDescription className="text-xs">
                Versão {versao} — Lei Geral de Proteção de Dados (Lei nº 13.709/2018)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Corpo do termo com scroll */}
        <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-muted/20 max-h-[50vh]">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b">
            <ScrollText className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Leia atentamente antes de aceitar
            </span>
          </div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
            {textoTermo}
          </div>
        </div>

        <DialogFooter className="flex-col gap-4 sm:flex-col">
          {/* Checkbox de aceite */}
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-background">
            <Checkbox
              id="aceite-lgpd"
              checked={aceitou}
              onCheckedChange={(checked) => setAceitou(checked === true)}
              disabled={loading}
              className="mt-0.5"
            />
            <label
              htmlFor="aceite-lgpd"
              className="text-sm leading-snug cursor-pointer select-none"
            >
              Li e compreendi o Termo de Consentimento acima e{" "}
              <strong>autorizo o tratamento dos meus dados pessoais e de saúde</strong>{" "}
              conforme descrito.
            </label>
          </div>

          <Button
            onClick={handleAceitar}
            disabled={!aceitou || loading}
            className="w-full"
            size="lg"
          >
            {loading ? "Registrando..." : "Aceitar e Continuar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
