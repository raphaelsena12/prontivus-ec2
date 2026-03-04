"use client";

import { useState } from "react";
import { IconBrandWhatsapp } from "@tabler/icons-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface WhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paciente: {
    id: string;
    nome: string;
    celular: string | null;
    telefone: string | null;
  };
}

export function WhatsAppDialog({ open, onOpenChange, paciente }: WhatsAppDialogProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const telefone = paciente.celular || paciente.telefone;

  async function handleSend() {
    if (!message.trim()) {
      toast.error("Digite uma mensagem");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: telefone,
          message: message.trim(),
          pacienteId: paciente.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Mensagem enviada com sucesso!");
      setMessage("");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconBrandWhatsapp className="w-5 h-5 text-green-600" />
            Enviar mensagem WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="rounded-lg bg-muted px-3 py-2 text-sm">
            <p className="text-muted-foreground text-xs">Destinatário</p>
            <p className="font-medium">{paciente.nome}</p>
            <p className="text-muted-foreground text-xs">{telefone}</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="mensagem">Mensagem</Label>
            <Textarea
              id="mensagem"
              placeholder="Digite sua mensagem..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">{message.length}/1000</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <IconBrandWhatsapp className="w-4 h-4 mr-2" />
            {sending ? "Enviando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
