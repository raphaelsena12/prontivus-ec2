"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Search, X, Plus } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Exame {
  id: string;
  nome: string;
  tipo: string | null;
  descricao: string | null;
}

interface GrupoExameItem {
  id: string;
  ordem: number;
  exame: Exame;
}

interface GrupoExame {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  exames: GrupoExameItem[];
}

interface GrupoExameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grupoExame: GrupoExame | null;
  onSuccess: () => void;
}

const grupoExameSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  descricao: z.string().optional(),
  ativo: z.boolean().optional(),
  examesIds: z.array(z.string()).optional(),
});

type GrupoExameFormValues = z.infer<typeof grupoExameSchema>;

export function GrupoExameDialog({
  open,
  onOpenChange,
  grupoExame,
  onSuccess,
}: GrupoExameDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingExames, setLoadingExames] = useState(false);
  const [examesDisponiveis, setExamesDisponiveis] = useState<Exame[]>([]);
  const [examesSelecionados, setExamesSelecionados] = useState<Exame[]>([]);
  const [buscaExame, setBuscaExame] = useState("");
  const [examesFiltrados, setExamesFiltrados] = useState<Exame[]>([]);
  const isEditing = !!grupoExame;

  const form = useForm<GrupoExameFormValues>({
    resolver: zodResolver(grupoExameSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      ativo: true,
      examesIds: [],
    },
  });

  useEffect(() => {
    if (grupoExame) {
      form.reset({
        nome: grupoExame.nome,
        descricao: grupoExame.descricao || "",
        ativo: grupoExame.ativo,
        examesIds: grupoExame.exames.map((item) => item.exame.id),
      });
      setExamesSelecionados(grupoExame.exames.map((item) => item.exame));
    } else {
      form.reset({
        nome: "",
        descricao: "",
        ativo: true,
        examesIds: [],
      });
      setExamesSelecionados([]);
    }
    setBuscaExame("");
  }, [grupoExame, form]);

  useEffect(() => {
    if (open) {
      fetchExames();
    }
  }, [open]);

  useEffect(() => {
    if (buscaExame) {
      const filtrados = examesDisponiveis.filter(
        (exame) =>
          !examesSelecionados.find((e) => e.id === exame.id) &&
          (exame.nome.toLowerCase().includes(buscaExame.toLowerCase()) ||
            exame.descricao?.toLowerCase().includes(buscaExame.toLowerCase()) ||
            exame.tipo?.toLowerCase().includes(buscaExame.toLowerCase()))
      );
      setExamesFiltrados(filtrados);
    } else {
      setExamesFiltrados(
        examesDisponiveis.filter(
          (exame) => !examesSelecionados.find((e) => e.id === exame.id)
        )
      );
    }
  }, [buscaExame, examesDisponiveis, examesSelecionados]);

  const fetchExames = async () => {
    try {
      setLoadingExames(true);
      const response = await fetch("/api/medico/exames?limit=1000");
      if (!response.ok) throw new Error("Erro ao buscar exames");
      const data = await response.json();
      setExamesDisponiveis(data.exames || []);
    } catch (error) {
      console.error("Erro ao buscar exames:", error);
      toast.error("Erro ao buscar exames");
    } finally {
      setLoadingExames(false);
    }
  };

  const handleAddExame = (exame: Exame) => {
    if (examesSelecionados.find((e) => e.id === exame.id)) {
      return;
    }
    const novosExames = [...examesSelecionados, exame];
    setExamesSelecionados(novosExames);
    form.setValue(
      "examesIds",
      novosExames.map((e) => e.id)
    );
    setBuscaExame("");
  };

  const handleRemoveExame = (exameId: string) => {
    const novosExames = examesSelecionados.filter((e) => e.id !== exameId);
    setExamesSelecionados(novosExames);
    form.setValue(
      "examesIds",
      novosExames.map((e) => e.id)
    );
  };

  const onSubmit = async (data: GrupoExameFormValues) => {
    try {
      setLoading(true);

      const payload: any = {
        nome: data.nome,
        descricao: data.descricao || null,
        examesIds: examesSelecionados.map((e) => e.id),
      };

      // Incluir ativo apenas no modo de edição
      if (isEditing) {
        payload.ativo = data.ativo;
      }

      const url = isEditing
        ? `/api/medico/grupos-exames/${grupoExame.id}`
        : `/api/medico/grupos-exames`;

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao salvar grupo de exames");
      }

      toast.success(
        isEditing
          ? "Grupo de exames atualizado com sucesso!"
          : "Grupo de exames criado com sucesso!"
      );

      onSuccess();
      onOpenChange(false);
      form.reset();
      setExamesSelecionados([]);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao salvar grupo de exames"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Grupo de Exames" : "Novo Grupo de Exames"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do grupo de exames"
              : "Preencha os dados para criar um novo grupo de exames"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 flex-1 flex flex-col min-h-0"
          >
            <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-2">
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
                        placeholder="Digite o nome do grupo de exames"
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

              {/* Exames Selecionados */}
              <div>
                <FormLabel>Exames Selecionados</FormLabel>
                {examesSelecionados.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    Nenhum exame selecionado
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {examesSelecionados.map((exame) => (
                      <div
                        key={exame.id}
                        className="flex items-center justify-between p-2 border rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">{exame.nome}</p>
                          {exame.tipo && (
                            <p className="text-xs text-muted-foreground">
                              {exame.tipo}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveExame(exame.id)}
                          disabled={loading}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Buscar e Adicionar Exames */}
              <div>
                <FormLabel>Adicionar Exames</FormLabel>
                <div className="mt-2 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar exames..."
                      value={buscaExame}
                      onChange={(e) => setBuscaExame(e.target.value)}
                      disabled={loading || loadingExames}
                      className="pl-9"
                    />
                  </div>
                  <ScrollArea className="h-48 border rounded-lg">
                    {loadingExames ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : examesFiltrados.length === 0 ? (
                      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                        {buscaExame
                          ? "Nenhum exame encontrado"
                          : "Nenhum exame disponível"}
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {examesFiltrados.map((exame) => (
                          <button
                            key={exame.id}
                            type="button"
                            onClick={() => handleAddExame(exame)}
                            disabled={loading}
                            className="w-full text-left p-2 rounded-lg border hover:bg-accent transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {exame.nome}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  {exame.tipo && (
                                    <Badge variant="outline" className="text-xs">
                                      {exame.tipo}
                                    </Badge>
                                  )}
                                  {exame.descricao && (
                                    <span className="text-xs text-muted-foreground">
                                      {exame.descricao}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
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
                        <FormLabel>Grupo de exames ativo</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Desmarque para desativar o grupo de exames no sistema
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              )}
            </div>

            <DialogFooter className="flex-shrink-0">
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
