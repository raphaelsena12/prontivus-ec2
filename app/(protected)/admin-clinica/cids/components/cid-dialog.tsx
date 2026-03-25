"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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

interface Cid {
  id: string;
  codigo: string;
  descricao: string;
  categoria: string | null;
  subcategoria: string | null;
  observacoes: string | null;
  ativo: boolean;
}

interface CidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cid: Cid | null;
  onSuccess: () => void;
  apiBasePath?: string;
}

const cidSchema = z.object({
  codigo: z.string().min(1, "Codigo e obrigatorio"),
  descricao: z.string().min(3, "Descricao deve ter no minimo 3 caracteres"),
  categoria: z.string().optional(),
  subcategoria: z.string().optional(),
  observacoes: z.string().optional(),
  ativo: z.boolean().optional(),
});

type CidFormValues = z.infer<typeof cidSchema>;

export function CidDialog({
  open,
  onOpenChange,
  cid,
  onSuccess,
  apiBasePath = "/api/admin-clinica/cids",
}: CidDialogProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!cid;

  const form = useForm<CidFormValues>({
    resolver: zodResolver(cidSchema),
    defaultValues: {
      codigo: "",
      descricao: "",
      categoria: "",
      subcategoria: "",
      observacoes: "",
      ativo: true,
    },
  });

  useEffect(() => {
    if (cid) {
      form.reset({
        codigo: cid.codigo,
        descricao: cid.descricao,
        categoria: cid.categoria || "",
        subcategoria: cid.subcategoria || "",
        observacoes: cid.observacoes || "",
        ativo: cid.ativo,
      });
    } else {
      form.reset({
        codigo: "",
        descricao: "",
        categoria: "",
        subcategoria: "",
        observacoes: "",
        ativo: true,
      });
    }
  }, [cid, form]);

  const onSubmit = async (data: CidFormValues) => {
    try {
      setLoading(true);

      const payload = {
        codigo: data.codigo.trim().toUpperCase(),
        descricao: data.descricao,
        categoria: data.categoria || null,
        subcategoria: data.subcategoria || null,
        observacoes: data.observacoes || null,
        ...(isEditing ? { ativo: data.ativo } : {}),
      };

      const response = await fetch(
        isEditing ? `${apiBasePath}/${cid.id}` : `${apiBasePath}`,
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao salvar CID");
      }

      toast.success(isEditing ? "CID atualizado com sucesso!" : "CID criado com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar CID");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar CID" : "Novo CID"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Atualize os dados do CID" : "Preencha os dados para cadastrar um CID"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="codigo"
                render={({ field }) => (
                  <FormItem className="sm:col-span-1">
                    <FormLabel>Codigo</FormLabel>
                    <FormControl>
                      <Input {...field} className="uppercase" disabled={loading || isEditing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Descricao</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="categoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subcategoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategoria</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observacoes</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ""} rows={3} disabled={loading} />
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
                      <FormLabel>CID ativo</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
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
