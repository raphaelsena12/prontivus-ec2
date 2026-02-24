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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  codigoTussId: z.string().uuid("Código TUSS inválido").optional(),
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
  const [codigosTuss, setCodigosTuss] = useState<CodigoTuss[]>([]);
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

  // Carregar códigos TUSS quando o dialog abrir
  useEffect(() => {
    if (open) {
      const fetchCodigosTuss = async () => {
        try {
          setLoadingCodigosTuss(true);
          const response = await fetch(
            "/api/admin-clinica/codigos-tuss?tipoProcedimento=EXAME&ativo=true"
          );
          if (response.ok) {
            const data = await response.json();
            setCodigosTuss(data.codigosTuss || []);
          }
        } catch (error) {
          console.error("Erro ao buscar códigos TUSS:", error);
        } finally {
          setLoadingCodigosTuss(false);
        }
      };

      fetchCodigosTuss();
    }
  }, [open]);

  useEffect(() => {
    if (exame) {
      form.reset({
        nome: exame.nome,
        tipo: exame.tipo || undefined,
        descricao: exame.descricao || "",
        codigoTussId: exame.codigoTussId || undefined,
        ativo: exame.ativo,
      });
    } else {
      form.reset({
        nome: "",
        tipo: undefined,
        descricao: "",
        codigoTussId: undefined,
        ativo: true,
      });
    }
  }, [exame, form]);

  const onSubmit = async (data: ExameFormValues) => {
    try {
      setLoading(true);

      // Validar codigoTussId obrigatório apenas na criação
      if (!isEditing) {
        // Verificar se codigoTussId está presente e é válido
        if (!data.codigoTussId || data.codigoTussId.trim() === "") {
          form.setError("codigoTussId", {
            type: "manual",
            message: "Código TUSS é obrigatório",
          });
          setLoading(false);
          return;
        }
        // Validar formato UUID
        const uuidValidation = z.string().uuid().safeParse(data.codigoTussId);
        if (!uuidValidation.success) {
          form.setError("codigoTussId", {
            type: "manual",
            message: "Código TUSS inválido. Selecione um código válido.",
          });
          setLoading(false);
          return;
        }
      }

      // Na criação, codigoTussId é obrigatório e deve ser incluído
      // Na edição, incluir apenas se tiver valor
      const payload: any = {
        nome: data.nome,
        descricao: data.descricao || "",
        tipo: data.tipo || "",
      };

      if (!isEditing) {
        // Na criação, codigoTussId é obrigatório
        payload.codigoTussId = data.codigoTussId;
      } else if (data.codigoTussId && data.codigoTussId.trim() !== "") {
        // Na edição, incluir apenas se tiver valor válido
        payload.codigoTussId = data.codigoTussId;
      }

      // Incluir ativo apenas no modo de edição
      if (isEditing) {
        payload.ativo = data.ativo;
      }

      const url = isEditing
        ? `/api/admin-clinica/exames/${exame.id}`
        : `/api/admin-clinica/exames`;

      console.log("[ExameDialog] Payload sendo enviado:", JSON.stringify(payload, null, 2));
      console.log("[ExameDialog] isEditing:", isEditing);
      console.log("[ExameDialog] codigoTussId:", data.codigoTussId);

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
                <FormItem>
                  <FormLabel>
                    Código TUSS <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={(value) => {
                      // Garantir que sempre seja uma string válida
                      field.onChange(value);
                    }}
                    value={field.value || ""}
                    disabled={loading || loadingCodigosTuss}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o código TUSS" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadingCodigosTuss ? (
                        <SelectItem value="loading" disabled>
                          Carregando...
                        </SelectItem>
                      ) : codigosTuss.length === 0 ? (
                        <SelectItem value="empty" disabled>
                          Nenhum código TUSS encontrado
                        </SelectItem>
                      ) : (
                        codigosTuss.map((codigo) => (
                          <SelectItem key={codigo.id} value={codigo.id}>
                            {codigo.codigoTuss} - {codigo.descricao}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
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
