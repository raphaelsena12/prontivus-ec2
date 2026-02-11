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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface Medico {
  id: string;
  crm: string;
  especialidade: string;
  limiteMaximoRetornosPorDia?: number | null;
  ativo?: boolean;
  usuario: {
    id: string;
    nome: string;
    email: string;
  };
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

interface MedicoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medico: Medico | null;
  usuarios: Usuario[];
  onSuccess: () => void;
}

const createMedicoSchema = z.object({
  usuarioId: z.string().uuid("Selecione um usuário médico"),
  crm: z.string().min(1, "CRM é obrigatório"),
  especialidade: z.string().min(1, "Especialidade é obrigatória"),
  limiteMaximoRetornosPorDia: z.number().int().min(0).nullable().optional(),
});

const updateMedicoSchema = z.object({
  crm: z.string().min(1, "CRM é obrigatório"),
  especialidade: z.string().min(1, "Especialidade é obrigatória"),
  limiteMaximoRetornosPorDia: z.number().int().min(0).nullable().optional(),
  ativo: z.boolean().optional(),
});

type MedicoFormValues = z.infer<typeof createMedicoSchema> | z.infer<typeof updateMedicoSchema>;

export function MedicoDialog({
  open,
  onOpenChange,
  medico,
  usuarios,
  onSuccess,
}: MedicoDialogProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!medico;

  const form = useForm<any>({
    resolver: zodResolver(isEditing ? updateMedicoSchema : createMedicoSchema) as any,
    defaultValues: {
      usuarioId: "",
      crm: "",
      especialidade: "",
      limiteMaximoRetornosPorDia: null,
      ativo: true,
    },
  });

  useEffect(() => {
    if (medico) {
      form.reset({
        crm: medico.crm,
        especialidade: medico.especialidade,
        limiteMaximoRetornosPorDia: medico.limiteMaximoRetornosPorDia,
        ativo: medico.ativo,
      });
    } else {
      form.reset({
        usuarioId: "",
        crm: "",
        especialidade: "",
        limiteMaximoRetornosPorDia: null,
        ativo: true,
      });
    }
  }, [medico, form]);

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);

      const payload: any = {
        crm: data.crm,
        especialidade: data.especialidade,
        limiteMaximoRetornosPorDia: data.limiteMaximoRetornosPorDia ?? null,
      };

      if (!isEditing) {
        if (!data.usuarioId) {
          toast.error("Selecione um usuário médico");
          setLoading(false);
          return;
        }
        payload.usuarioId = data.usuarioId;
      } else {
        payload.ativo = data.ativo;
      }

      const url = isEditing
        ? `/api/admin-clinica/medicos/${medico.id}`
        : `/api/admin-clinica/medicos`;

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao salvar médico");
      }

      toast.success(
        isEditing ? "Médico atualizado com sucesso!" : "Médico criado com sucesso!"
      );

      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar médico"
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
            {isEditing ? "Editar Médico" : "Novo Médico"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do médico"
              : "Preencha os dados para criar um novo médico"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!isEditing && (
              <FormField
                control={form.control}
                name="usuarioId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Usuário Médico <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={loading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o usuário" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {usuarios.map((usuario) => (
                          <SelectItem key={usuario.id} value={usuario.id}>
                            {usuario.nome} ({usuario.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isEditing && (
              <div className="rounded-md border p-3 bg-muted/50">
                <p className="text-sm font-medium">Usuário</p>
                <p className="text-sm text-muted-foreground">
                  {medico.usuario.nome} ({medico.usuario.email})
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="crm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    CRM <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="000000"
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
              name="especialidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Especialidade <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Cardiologia, Pediatria, etc"
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
              name="limiteMaximoRetornosPorDia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Limite máximo de retornos por dia
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Ex: 5 (deixe vazio para sem limite)"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === "" ? null : parseInt(value, 10));
                      }}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-muted-foreground">
                    Número máximo de consultas de retorno que o médico aceita ter na agenda por dia
                  </p>
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
                      <FormLabel>Médico ativo</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Desmarque para desativar o médico no sistema
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

