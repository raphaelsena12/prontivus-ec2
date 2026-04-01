"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type EspecialidadeLite = { id: string; codigo: string; nome: string };
type CategoriaLite = { id: string; codigo: string; nome: string };

interface RelacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  especialidades: EspecialidadeLite[];
  categorias: CategoriaLite[];
  onSuccess: () => void;
  apiBasePath?: string;
}

export function RelacaoDialog({
  open,
  onOpenChange,
  especialidades,
  categorias,
  onSuccess,
  apiBasePath = "/api/super-admin/especialidades-categorias-itens",
}: RelacaoDialogProps) {
  const [loading, setLoading] = useState(false);
  const [especialidadeId, setEspecialidadeId] = useState<string>("");
  const [categoriaId, setCategoriaId] = useState<string>("");

  const especialidadesOrdenadas = useMemo(
    () => [...(especialidades || [])].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [especialidades]
  );
  const categoriasOrdenadas = useMemo(
    () => [...(categorias || [])].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [categorias]
  );

  const handleClose = () => {
    onOpenChange(false);
    setEspecialidadeId("");
    setCategoriaId("");
  };

  const handleSubmit = async () => {
    if (!especialidadeId) {
      toast.error("Selecione uma especialidade");
      return;
    }
    if (!categoriaId) {
      toast.error("Selecione uma categoria");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(apiBasePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ especialidadeId, categoriaId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao criar vínculo");
      }
      toast.success("Vínculo criado com sucesso!");
      onSuccess();
      handleClose();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar vínculo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Novo Vínculo</DialogTitle>
          <DialogDescription>Relacione uma especialidade a uma categoria.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Especialidade</Label>
            <Select value={especialidadeId} onValueChange={setEspecialidadeId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma especialidade" />
              </SelectTrigger>
              <SelectContent>
                {especialidadesOrdenadas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.codigo} — {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoriaId} onValueChange={setCategoriaId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categoriasOrdenadas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.codigo} — {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar vínculo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

