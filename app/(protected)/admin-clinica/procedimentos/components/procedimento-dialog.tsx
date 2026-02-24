"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, X, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Procedimento {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  valor: number | string;
  ativo: boolean;
  procedimentosMedicamentos?: Array<{
    id: string;
    medicamentoId: string;
    quantidade: number | null;
    observacoes: string | null;
    medicamento: {
      id: string;
      nome: string;
    };
  }>;
  procedimentosInsumos?: Array<{
    id: string;
    insumoId: string;
    quantidade: number | null;
    observacoes: string | null;
    insumo: {
      id: string;
      nome: string;
    };
  }>;
}

interface ProcedimentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  procedimento: Procedimento | null;
  onSuccess: () => void;
}

interface Medicamento {
  id: string;
  nome: string;
}

interface Insumo {
  id: string;
  nome: string;
}

const procedimentoSchema = z.object({
  codigo: z.string().min(1, "Código é obrigatório"),
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  valor: z.string().refine((val) => {
    const num = parseFloat(val.replace(",", "."));
    return !isNaN(num) && num >= 0;
  }, "Valor deve ser maior ou igual a zero"),
  ativo: z.boolean().optional(),
});

type ProcedimentoFormValues = z.infer<typeof procedimentoSchema>;

export function ProcedimentoDialog({
  open,
  onOpenChange,
  procedimento,
  onSuccess,
}: ProcedimentoDialogProps) {
  const [loading, setLoading] = useState(false);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loadingMedicamentos, setLoadingMedicamentos] = useState(false);
  const [loadingInsumos, setLoadingInsumos] = useState(false);
  const [selectedMedicamentos, setSelectedMedicamentos] = useState<Array<{
    medicamentoId: string;
    quantidade?: number;
    observacoes?: string;
  }>>([]);
  const [selectedInsumos, setSelectedInsumos] = useState<Array<{
    insumoId: string;
    quantidade?: number;
    observacoes?: string;
  }>>([]);
  const [medicamentoSelect, setMedicamentoSelect] = useState("");
  const [insumoSelect, setInsumoSelect] = useState("");
  const isEditing = !!procedimento;

  const form = useForm<ProcedimentoFormValues>({
    resolver: zodResolver(procedimentoSchema),
    defaultValues: {
      codigo: "",
      nome: "",
      descricao: "",
      valor: "0",
      ativo: true,
    },
  });

  useEffect(() => {
    if (open) {
      fetchMedicamentos();
      fetchInsumos();
    }
  }, [open]);

  useEffect(() => {
    if (procedimento) {
      const valor = typeof procedimento.valor === "string" 
        ? procedimento.valor 
        : procedimento.valor.toString();
      form.reset({
        codigo: procedimento.codigo,
        nome: procedimento.nome,
        descricao: procedimento.descricao || "",
        valor: valor,
        ativo: procedimento.ativo,
      });
      
      // Carregar medicamentos e insumos relacionados
      if (procedimento.procedimentosMedicamentos) {
        setSelectedMedicamentos(
          procedimento.procedimentosMedicamentos.map((pm) => ({
            medicamentoId: pm.medicamentoId,
            quantidade: pm.quantidade ? Number(pm.quantidade) : undefined,
            observacoes: pm.observacoes || undefined,
          }))
        );
      }
      if (procedimento.procedimentosInsumos) {
        setSelectedInsumos(
          procedimento.procedimentosInsumos.map((pi) => ({
            insumoId: pi.insumoId,
            quantidade: pi.quantidade ? Number(pi.quantidade) : undefined,
            observacoes: pi.observacoes || undefined,
          }))
        );
      }
    } else {
      form.reset({
        codigo: "",
        nome: "",
        descricao: "",
        valor: "0",
        ativo: true,
      });
      setSelectedMedicamentos([]);
      setSelectedInsumos([]);
    }
  }, [procedimento, form]);

  const fetchMedicamentos = async () => {
    try {
      setLoadingMedicamentos(true);
      const response = await fetch("/api/admin-clinica/medicamentos?limit=1000");
      if (!response.ok) throw new Error("Erro ao buscar medicamentos");
      const data = await response.json();
      setMedicamentos(data.medicamentos || []);
    } catch (error) {
      console.error("Erro ao buscar medicamentos:", error);
    } finally {
      setLoadingMedicamentos(false);
    }
  };

  const fetchInsumos = async () => {
    try {
      setLoadingInsumos(true);
      const response = await fetch("/api/admin-clinica/insumos?limit=1000");
      if (!response.ok) throw new Error("Erro ao buscar insumos");
      const data = await response.json();
      setInsumos(data.insumos || []);
    } catch (error) {
      console.error("Erro ao buscar insumos:", error);
    } finally {
      setLoadingInsumos(false);
    }
  };

  const handleAddMedicamento = () => {
    if (!medicamentoSelect) return;
    if (selectedMedicamentos.find((m) => m.medicamentoId === medicamentoSelect)) {
      toast.error("Medicamento já adicionado");
      return;
    }
    setSelectedMedicamentos([
      ...selectedMedicamentos,
      { medicamentoId: medicamentoSelect },
    ]);
    setMedicamentoSelect("");
  };

  const handleAddInsumo = () => {
    if (!insumoSelect) return;
    if (selectedInsumos.find((i) => i.insumoId === insumoSelect)) {
      toast.error("Insumo já adicionado");
      return;
    }
    setSelectedInsumos([
      ...selectedInsumos,
      { insumoId: insumoSelect },
    ]);
    setInsumoSelect("");
  };

  const handleRemoveMedicamento = (medicamentoId: string) => {
    setSelectedMedicamentos(
      selectedMedicamentos.filter((m) => m.medicamentoId !== medicamentoId)
    );
  };

  const handleRemoveInsumo = (insumoId: string) => {
    setSelectedInsumos(
      selectedInsumos.filter((i) => i.insumoId !== insumoId)
    );
  };

  const handleUpdateMedicamento = (
    medicamentoId: string,
    field: "quantidade" | "observacoes",
    value: number | string
  ) => {
    setSelectedMedicamentos(
      selectedMedicamentos.map((m) =>
        m.medicamentoId === medicamentoId
          ? { ...m, [field]: value }
          : m
      )
    );
  };

  const handleUpdateInsumo = (
    insumoId: string,
    field: "quantidade" | "observacoes",
    value: number | string
  ) => {
    setSelectedInsumos(
      selectedInsumos.map((i) =>
        i.insumoId === insumoId
          ? { ...i, [field]: value }
          : i
      )
    );
  };

  const onSubmit = async (data: ProcedimentoFormValues) => {
    try {
      setLoading(true);

      const payload: any = {
        codigo: data.codigo,
        nome: data.nome,
        descricao: data.descricao || null,
        valor: parseFloat(data.valor.replace(",", ".")) || 0,
        medicamentos: selectedMedicamentos.map((m) => ({
          medicamentoId: m.medicamentoId,
          quantidade: m.quantidade,
          observacoes: m.observacoes,
        })),
        insumos: selectedInsumos.map((i) => ({
          insumoId: i.insumoId,
          quantidade: i.quantidade,
          observacoes: i.observacoes,
        })),
      };

      if (isEditing) {
        payload.ativo = data.ativo;
      }

      const url = isEditing
        ? `/api/admin-clinica/procedimentos/${procedimento.id}`
        : `/api/admin-clinica/procedimentos`;

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao salvar procedimento");
      }

      toast.success(
        isEditing ? "Procedimento atualizado com sucesso!" : "Procedimento criado com sucesso!"
      );

      onSuccess();
      onOpenChange(false);
      form.reset();
      setSelectedMedicamentos([]);
      setSelectedInsumos([]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar procedimento"
      );
    } finally {
      setLoading(false);
    }
  };

  const getMedicamentoNome = (id: string) => {
    return medicamentos.find((m) => m.id === id)?.nome || "";
  };

  const getInsumoNome = (id: string) => {
    return insumos.find((i) => i.id === id)?.nome || "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Procedimento" : "Novo Procedimento"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do procedimento"
              : "Preencha os dados para criar um novo procedimento"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="codigo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Código <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Digite o código do procedimento"
                        {...field}
                        disabled={loading || isEditing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Nome <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Digite o nome do procedimento"
                        {...field}
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Digite uma descrição (opcional)"
                      rows={3}
                      {...field}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="valor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="0,00"
                      {...field}
                      disabled={loading}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d,]/g, "");
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Medicamentos */}
            <div className="space-y-2">
              <FormLabel>Medicamentos Utilizados</FormLabel>
              <div className="flex gap-2">
                <Select
                  value={medicamentoSelect}
                  onValueChange={setMedicamentoSelect}
                  disabled={loading || loadingMedicamentos}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione um medicamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {medicamentos
                      .filter((m) => !selectedMedicamentos.find((sm) => sm.medicamentoId === m.id))
                      .map((medicamento) => (
                        <SelectItem key={medicamento.id} value={medicamento.id}>
                          {medicamento.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={handleAddMedicamento}
                  disabled={!medicamentoSelect || loading}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {selectedMedicamentos.length > 0 && (
                <div className="space-y-2 mt-2">
                  {selectedMedicamentos.map((sm) => (
                    <div
                      key={sm.medicamentoId}
                      className="flex items-center gap-2 p-2 border rounded-md"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {getMedicamentoNome(sm.medicamentoId)}
                        </div>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="number"
                            placeholder="Quantidade"
                            value={sm.quantidade || ""}
                            onChange={(e) =>
                              handleUpdateMedicamento(
                                sm.medicamentoId,
                                "quantidade",
                                e.target.value ? parseFloat(e.target.value) : 0
                              )
                            }
                            className="h-7 text-xs w-24"
                            disabled={loading}
                          />
                          <Input
                            placeholder="Observações"
                            value={sm.observacoes || ""}
                            onChange={(e) =>
                              handleUpdateMedicamento(
                                sm.medicamentoId,
                                "observacoes",
                                e.target.value
                              )
                            }
                            className="h-7 text-xs flex-1"
                            disabled={loading}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMedicamento(sm.medicamentoId)}
                        disabled={loading}
                        className="h-7 w-7 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Insumos */}
            <div className="space-y-2">
              <FormLabel>Insumos Utilizados</FormLabel>
              <div className="flex gap-2">
                <Select
                  value={insumoSelect}
                  onValueChange={setInsumoSelect}
                  disabled={loading || loadingInsumos}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione um insumo" />
                  </SelectTrigger>
                  <SelectContent>
                    {insumos
                      .filter((i) => !selectedInsumos.find((si) => si.insumoId === i.id))
                      .map((insumo) => (
                        <SelectItem key={insumo.id} value={insumo.id}>
                          {insumo.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={handleAddInsumo}
                  disabled={!insumoSelect || loading}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {selectedInsumos.length > 0 && (
                <div className="space-y-2 mt-2">
                  {selectedInsumos.map((si) => (
                    <div
                      key={si.insumoId}
                      className="flex items-center gap-2 p-2 border rounded-md"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {getInsumoNome(si.insumoId)}
                        </div>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="number"
                            placeholder="Quantidade"
                            value={si.quantidade || ""}
                            onChange={(e) =>
                              handleUpdateInsumo(
                                si.insumoId,
                                "quantidade",
                                e.target.value ? parseFloat(e.target.value) : 0
                              )
                            }
                            className="h-7 text-xs w-24"
                            disabled={loading}
                          />
                          <Input
                            placeholder="Observações"
                            value={si.observacoes || ""}
                            onChange={(e) =>
                              handleUpdateInsumo(
                                si.insumoId,
                                "observacoes",
                                e.target.value
                              )
                            }
                            className="h-7 text-xs flex-1"
                            disabled={loading}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveInsumo(si.insumoId)}
                        disabled={loading}
                        className="h-7 w-7 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isEditing && (
              <FormField
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={loading}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Procedimento ativo</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Desmarque para desativar o procedimento no sistema
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
