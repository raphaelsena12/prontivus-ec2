"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface Exame {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: string | null;
  codigoTussId: string | null;
  ativo: boolean;
  codigoTuss?: {
    id: string;
    codigoTuss: string;
    descricao: string;
    tipoProcedimento: string;
  } | null;
}

interface CodigoTuss {
  id: string;
  codigoTuss: string;
  descricao: string;
  tipoProcedimento: string;
}

interface ExameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exame: Exame | null;
  onSuccess: () => void;
}

const exameSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  tipo: z.string().min(1, "Tipo é obrigatório"),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  codigoTussId: z.string().uuid("Código TUSS inválido").optional().nullable(),
  ativo: z.boolean().optional(),
});

type ExameFormValues = z.infer<typeof exameSchema>;

export function ExameDialog({
  open,
  onOpenChange,
  exame,
  onSuccess,
}: ExameDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingCodigosTuss, setLoadingCodigosTuss] = useState(false);
  const [tussSearch, setTussSearch] = useState("");
  const [codigosTuss, setCodigosTuss] = useState<CodigoTuss[]>([]);
  const [showTussSuggestions, setShowTussSuggestions] = useState(false);
  const isEditing = !!exame;

  const form = useForm<ExameFormValues>({
    resolver: zodResolver(exameSchema),
    defaultValues: {
      nome: "",
      tipo: undefined,
      descricao: "",
      codigoTussId: undefined,
      ativo: true,
    },
  });

  // Buscar códigos TUSS sob demanda (3+ caracteres)
  useEffect(() => {
    if (!open) return;

    const term = tussSearch.trim();
    if (term.length < 3) {
      setCodigosTuss([]);
      setLoadingCodigosTuss(false);
      return;
    }

    const controller = new AbortController();
    const fetchCodigosTuss = async () => {
      try {
        setLoadingCodigosTuss(true);
        const response = await fetch(
          `/api/admin-clinica/codigos-tuss?tipoProcedimento=EXAME&ativo=true&search=${encodeURIComponent(term)}`,
          { signal: controller.signal }
        );
        if (response.ok) {
          const data = await response.json();
          const resultados = data.codigosTuss || [];

          // Fallback: alguns catálogos podem não estar com tipoProcedimento=EXAME consistente.
          if (resultados.length === 0) {
            const fallbackResponse = await fetch(
              `/api/admin-clinica/codigos-tuss?ativo=true&search=${encodeURIComponent(term)}`,
              { signal: controller.signal }
            );

            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              setCodigosTuss(fallbackData.codigosTuss || []);
            } else {
              setCodigosTuss([]);
            }
          } else {
            setCodigosTuss(resultados);
          }

          setShowTussSuggestions(true);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Erro ao buscar códigos TUSS:", error);
        }
      } finally {
        setLoadingCodigosTuss(false);
      }
    };

    const timeout = setTimeout(fetchCodigosTuss, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [open, tussSearch]);

  useEffect(() => {
    if (exame) {
      form.reset({
        nome: exame.nome,
        tipo: exame.tipo || undefined,
        descricao: exame.descricao || "",
        codigoTussId: exame.codigoTussId || undefined,
        ativo: exame.ativo,
      });
      setTussSearch(
        exame.codigoTuss
          ? `${exame.codigoTuss.codigoTuss} - ${exame.codigoTuss.descricao}`
          : ""
      );
    } else {
      form.reset({
        nome: "",
        tipo: undefined,
        descricao: "",
        codigoTussId: undefined,
        ativo: true,
      });
      setTussSearch("");
    }
    setCodigosTuss([]);
    setShowTussSuggestions(false);
  }, [exame, form]);

  const onSubmit = async (data: ExameFormValues) => {
    try {
      setLoading(true);

      const tussId =
        data.codigoTussId && String(data.codigoTussId).trim()
          ? data.codigoTussId
          : null;

      const payload: Record<string, unknown> = {
        nome: data.nome,
        descricao: data.descricao || "",
        tipo: data.tipo || "",
        codigoTussId: tussId,
      };

      if (isEditing) {
        payload.ativo = data.ativo;
      }

      const url = isEditing
        ? `/api/admin-clinica/exames/${exame!.id}`
        : `/api/admin-clinica/exames`;

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao salvar exame");
      }

      toast.success(
        isEditing ? "Exame atualizado com sucesso!" : "Exame criado com sucesso!"
      );

      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar exame"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Exame" : "Novo Exame"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do exame"
              : "Preencha os dados para criar um novo exame"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      placeholder="Digite o nome do exame"
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
              name="codigoTussId"
              render={({ field }) => (
                <FormItem className="relative">
                  <FormLabel>
                    Código TUSS <span className="text-muted-foreground">(opcional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Digite ao menos 3 letras para buscar"
                      value={tussSearch}
                      disabled={loading}
                      onChange={(e) => {
                        setTussSearch(e.target.value);
                        field.onChange(undefined);
                        if (e.target.value.trim().length >= 3) {
                          setShowTussSuggestions(true);
                        } else {
                          setShowTussSuggestions(false);
                        }
                      }}
                      onFocus={() => {
                        if (tussSearch.trim().length >= 3) {
                          setShowTussSuggestions(true);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowTussSuggestions(false), 150);
                      }}
                    />
                  </FormControl>
                  {showTussSuggestions && (
                    <div className="absolute left-0 top-full z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                      {loadingCodigosTuss ? (
                        <p className="px-2 py-1.5 text-sm text-muted-foreground">
                          Carregando...
                        </p>
                      ) : codigosTuss.length === 0 ? (
                        <p className="px-2 py-1.5 text-sm text-muted-foreground">
                          Nenhum código TUSS encontrado
                        </p>
                      ) : (
                        codigosTuss.map((codigo) => (
                          <button
                            key={codigo.id}
                            type="button"
                            className="block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              field.onChange(codigo.id);
                              setTussSearch(`${codigo.codigoTuss} - ${codigo.descricao}`);
                              setShowTussSuggestions(false);
                            }}
                          >
                            {codigo.codigoTuss} - {codigo.descricao}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Tipo <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value || undefined)}
                    value={field.value || undefined}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="LABORATORIAL">Laboratorial</SelectItem>
                      <SelectItem value="IMAGEM">Imagem</SelectItem>
                      <SelectItem value="OUTROS">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Descrição <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Digite uma descrição"
                      rows={4}
                      {...field}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      <FormLabel>Exame ativo</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Desmarque para desativar o exame no sistema
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
