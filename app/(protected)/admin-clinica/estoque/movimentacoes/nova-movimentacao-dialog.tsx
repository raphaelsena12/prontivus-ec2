"use client";
import { getApiErrorMessage } from "@/lib/zod-validation-error";

import { useState, useRef } from "react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

function SearchableSelect({
  items,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  items: Array<{ id: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha somente ao clicar fora do container (scrollbar nativa não dispara mousedown no DOM)
  React.useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  const selectedLabel = items.find((i) => i.id === value)?.label ?? "";
  const filtered = search
    ? items.filter((i) => i.label.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={open ? search : selectedLabel}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setSearch("");
          setOpen(true);
        }}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
              onMouseDown={() => {
                onChange(item.id);
                setSearch("");
                setOpen(false);
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg px-3 py-2 text-sm text-gray-500">
          Nenhum resultado encontrado
        </div>
      )}
    </div>
  );
}

const movimentacaoSchema = z.object({
  tipoEstoque: z.enum(["MEDICAMENTO", "INSUMO"]),
  estoqueId: z.string().uuid("Selecione um item"),
  tipo: z.enum(["ENTRADA", "SAIDA", "AJUSTE"]),
  quantidade: z.number().int().min(1, "Quantidade deve ser maior que zero"),
  motivo: z.string().optional(),
  observacoes: z.string().optional(),
});

type MovimentacaoFormData = z.infer<typeof movimentacaoSchema>;

interface NovaMovimentacaoEstoqueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estoques: Array<{ id: string; medicamento: { nome: string } }>;
  insumos?: Array<{ id: string; nome: string }>;
  estoqueIdPreSelecionado?: string;
  tipoEstoquePreSelecionado?: "MEDICAMENTO" | "INSUMO";
  onSuccess: () => void;
}

export function NovaMovimentacaoEstoqueDialog({ open, onOpenChange, estoques, insumos = [], estoqueIdPreSelecionado, tipoEstoquePreSelecionado, onSuccess }: NovaMovimentacaoEstoqueDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingInsumos, setLoadingInsumos] = useState(false);
  const [loadingMedicamentos, setLoadingMedicamentos] = useState(false);
  const [insumosList, setInsumosList] = useState<Array<{ id: string; nome: string }>>(insumos);
  const [medicamentosList, setMedicamentosList] = useState<Array<{ id: string; nome: string }>>([]);
  const form = useForm<MovimentacaoFormData>({
    resolver: zodResolver(movimentacaoSchema),
    defaultValues: { tipoEstoque: "MEDICAMENTO", estoqueId: "", tipo: undefined, quantidade: 0, motivo: "", observacoes: "" },
  });

  const tipoEstoque = form.watch("tipoEstoque");

  // Buscar medicamentos globais quando o tipo for MEDICAMENTO
  React.useEffect(() => {
    if (tipoEstoque === "MEDICAMENTO" && medicamentosList.length === 0 && !loadingMedicamentos) {
      setLoadingMedicamentos(true);
      fetch("/api/admin-clinica/medicamentos?limit=1000")
        .then(res => res.json())
        .then(data => {
          setMedicamentosList((data.medicamentos || []).map((m: any) => ({ id: m.id, nome: m.nome })));
        })
        .catch(err => {
          console.error("Erro ao buscar medicamentos:", err);
          toast.error("Erro ao carregar medicamentos");
        })
        .finally(() => setLoadingMedicamentos(false));
    }
  }, [tipoEstoque, medicamentosList.length, loadingMedicamentos]);

  // Buscar insumos quando o tipo mudar para INSUMO
  React.useEffect(() => {
    if (tipoEstoque === "INSUMO" && insumosList.length === 0 && !loadingInsumos) {
      setLoadingInsumos(true);
      fetch("/api/admin-clinica/insumos?limit=1000")
        .then(res => res.json())
        .then(data => {
          setInsumosList(data.insumos || []);
        })
        .catch(err => {
          console.error("Erro ao buscar insumos:", err);
          toast.error("Erro ao carregar insumos");
        })
        .finally(() => setLoadingInsumos(false));
    }
  }, [tipoEstoque, insumosList.length, loadingInsumos]);

  // Atualizar o formulário quando o estoque pré-selecionado mudar ou o dialog abrir
  React.useEffect(() => {
    if (open) {
      if (estoqueIdPreSelecionado && tipoEstoquePreSelecionado) {
        form.setValue("tipoEstoque", tipoEstoquePreSelecionado);
        form.setValue("estoqueId", estoqueIdPreSelecionado);
      } else {
        form.reset({ tipoEstoque: "MEDICAMENTO", estoqueId: "", tipo: undefined, quantidade: 0, motivo: "", observacoes: "" });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, estoqueIdPreSelecionado, tipoEstoquePreSelecionado]);

  const onSubmit = async (data: MovimentacaoFormData) => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin-clinica/estoque/movimentacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(getApiErrorMessage(error) || "Erro ao criar movimentação");
      }
      toast.success("Movimentação criada com sucesso!");
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar movimentação");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Movimentação de Estoque</DialogTitle>
          <DialogDescription>Registre uma nova movimentação no estoque</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="tipoEstoque" render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Estoque *</FormLabel>
                <Select onValueChange={(value) => {
                  field.onChange(value);
                  form.setValue("estoqueId", ""); // Limpar seleção ao mudar tipo
                }} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="MEDICAMENTO">Medicamento</SelectItem>
                    <SelectItem value="INSUMO">Insumo</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="estoqueId" render={({ field }) => (
              <FormItem>
                <FormLabel>{tipoEstoque === "MEDICAMENTO" ? "Medicamento" : "Insumo"} *</FormLabel>
                <FormControl>
                  {(loadingMedicamentos && tipoEstoque === "MEDICAMENTO") || (loadingInsumos && tipoEstoque === "INSUMO") ? (
                    <div className="flex items-center gap-2 h-10 px-3 border rounded-md text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                    </div>
                  ) : (
                    <SearchableSelect
                      items={
                        tipoEstoque === "MEDICAMENTO"
                          ? medicamentosList.map((m) => ({ id: m.id, label: m.nome }))
                          : insumosList.map((i) => ({ id: i.id, label: i.nome }))
                      }
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={tipoEstoque === "MEDICAMENTO" ? "Digite para buscar medicamento..." : "Digite para buscar insumo..."}
                    />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="tipo" render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ENTRADA">Entrada</SelectItem>
                    <SelectItem value="SAIDA">Saída</SelectItem>
                    <SelectItem value="AJUSTE">Ajuste</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="quantidade" render={({ field }) => (
              <FormItem>
                <FormLabel>Quantidade *</FormLabel>
                <FormControl><Input {...field} type="number" min="1" onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} value={field.value || 0} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="motivo" render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo</FormLabel>
                <FormControl><Input {...field} placeholder="Motivo da movimentação" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="observacoes" render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl><Textarea {...field} rows={3} placeholder="Observações sobre a movimentação..." /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}















