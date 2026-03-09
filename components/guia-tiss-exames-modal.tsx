"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, FileText } from "lucide-react";

export interface ExameSolicitado {
  nome: string;
  tipo?: string;
  justificativa?: string;
}

interface GuiaTissExamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (exames: ExameSolicitado[]) => void;
  examesSugeridos: ExameSolicitado[];
  isLoading?: boolean;
}

export function GuiaTissExamesModal({
  isOpen,
  onClose,
  onConfirm,
  examesSugeridos,
  isLoading = false,
}: GuiaTissExamesModalProps) {
  // Inicializado direto da prop — funciona porque o componente é remontado via key
  const [texto, setTexto] = useState(() =>
    examesSugeridos.map((e) => e.nome).join(", ")
  );

  const handleConfirm = () => {
    const exames: ExameSolicitado[] = texto
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((nome) => ({ nome }));
    onConfirm(exames);
  };

  const totalExames = texto.split(",").map((l) => l.trim()).filter(Boolean).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-[#306953]" />
            Guia Consulta TISS — Exames Solicitados
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {examesSugeridos.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Sugestões da IA pré-preenchidas. Edite conforme necessário.
            </div>
          )}

          <Textarea
            placeholder="Hemograma completo, Glicemia em jejum, Colesterol total"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={1000}
            rows={4}
            className="text-sm"
          />
          <p className="text-right text-xs text-muted-foreground -mt-1">
            {texto.length}/1000
          </p>

          <p className="text-xs text-muted-foreground">
            {totalExames === 0
              ? "Nenhum exame informado."
              : totalExames === 1
                ? "1 exame será incluído na guia."
                : `${totalExames} exames serão incluídos na guia.`}
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || totalExames === 0}
            className="bg-[#306953] hover:bg-[#306953]/90 text-white"
          >
            {isLoading ? "Gerando..." : "Gerar Guia"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
