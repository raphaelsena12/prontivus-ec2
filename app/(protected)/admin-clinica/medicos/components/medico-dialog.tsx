"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Upload, X, FileText, Eye as EyeIcon, Trash2 } from "lucide-react";
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
  rqe?: number | null;
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

interface Especialidade {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string | null;
  ativo: boolean;
}

interface DocumentoUpload {
  file: File;
  tipoDocumento: string;
  preview?: string;
}

interface DocumentoExistente {
  id: string;
  nomeDocumento: string;
  tipoDocumento: string;
  mimeType: string;
  tamanho: number;
  createdAt: string;
  s3Key: string;
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
  rqe: z.number().int().min(0).nullable().optional(),
  limiteMaximoRetornosPorDia: z.number().int().min(0).nullable().optional(),
});

const updateMedicoSchema = z.object({
  crm: z.string().min(1, "CRM é obrigatório"),
  especialidade: z.string().min(1, "Especialidade é obrigatória"),
  rqe: z.number().int().min(0).nullable().optional(),
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
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([]);
  const [loadingEspecialidades, setLoadingEspecialidades] = useState(false);
  const [documentos, setDocumentos] = useState<DocumentoUpload[]>([]);
  const [documentosExistentes, setDocumentosExistentes] = useState<DocumentoExistente[]>([]);
  const [loadingDocumentos, setLoadingDocumentos] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<string | null>(null);
  const isEditing = !!medico;

  const form = useForm<any>({
    resolver: zodResolver(isEditing ? updateMedicoSchema : createMedicoSchema) as any,
    defaultValues: {
      usuarioId: "",
      crm: "",
      especialidade: "",
      rqe: null,
      limiteMaximoRetornosPorDia: null,
      ativo: true,
    },
  });

  // Buscar especialidades
  useEffect(() => {
    if (open) {
      const fetchEspecialidades = async () => {
        try {
          setLoadingEspecialidades(true);
          const response = await fetch("/api/admin-clinica/especialidades?ativo=true");
          if (response.ok) {
            const data = await response.json();
            setEspecialidades(data.especialidades || []);
          }
        } catch (error) {
          console.error("Erro ao buscar especialidades:", error);
        } finally {
          setLoadingEspecialidades(false);
        }
      };
      fetchEspecialidades();
    }
  }, [open]);

  // Buscar documentos existentes quando estiver editando
  useEffect(() => {
    if (open && isEditing && medico?.id) {
      const fetchDocumentos = async () => {
        try {
          setLoadingDocumentos(true);
          const response = await fetch(`/api/admin-clinica/medicos/${medico.id}/documentos`);
          if (response.ok) {
            const data = await response.json();
            setDocumentosExistentes(data.documentos || []);
          }
        } catch (error) {
          console.error("Erro ao buscar documentos:", error);
        } finally {
          setLoadingDocumentos(false);
        }
      };
      fetchDocumentos();
    } else {
      setDocumentosExistentes([]);
    }
  }, [open, isEditing, medico?.id]);

  // Limpar previews ao desmontar
  useEffect(() => {
    return () => {
      documentos.forEach((doc) => {
        if (doc.preview) {
          URL.revokeObjectURL(doc.preview);
        }
      });
    };
  }, [documentos]);

  useEffect(() => {
    if (medico) {
      form.reset({
        crm: medico.crm,
        especialidade: medico.especialidade,
        rqe: medico.rqe ?? null,
        limiteMaximoRetornosPorDia: medico.limiteMaximoRetornosPorDia,
        ativo: medico.ativo,
      });
    } else {
      form.reset({
        usuarioId: "",
        crm: "",
        especialidade: "",
        rqe: null,
        limiteMaximoRetornosPorDia: null,
        ativo: true,
      });
    }
    setDocumentos([]);
    if (!isEditing) {
      setDocumentosExistentes([]);
    }
  }, [medico, form, isEditing]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newDocs: DocumentoUpload[] = files.map((file) => {
      const tipoDocumento = file.name.toLowerCase().includes("certificado")
        ? "certificado"
        : file.name.toLowerCase().includes("diploma")
        ? "diploma"
        : "registro-profissional";

      let preview: string | undefined;
      if (file.type.startsWith("image/")) {
        preview = URL.createObjectURL(file);
      }

      return { file, tipoDocumento, preview };
    });

    setDocumentos([...documentos, ...newDocs]);
  };

  const removeDocumento = (index: number) => {
    const doc = documentos[index];
    if (doc.preview) {
      URL.revokeObjectURL(doc.preview);
    }
    setDocumentos(documentos.filter((_, i) => i !== index));
  };

  const uploadDocumentos = async (medicoId: string) => {
    if (documentos.length === 0) return;

    setUploadingDocs(true);
    try {
      for (const doc of documentos) {
        const formData = new FormData();
        formData.append("file", doc.file);
        formData.append("tipoDocumento", doc.tipoDocumento);

        const response = await fetch(
          `/api/admin-clinica/medicos/${medicoId}/documentos`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Erro ao fazer upload do documento");
        }
      }
    } finally {
      setUploadingDocs(false);
    }
  };

  const handleViewDocumento = async (documento: DocumentoExistente) => {
    if (!medico?.id) return;

    setLoadingUrl(documento.id);
    try {
      const response = await fetch(
        `/api/admin-clinica/medicos/${medico.id}/documentos/${documento.id}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao buscar documento");
      }

      const data = await response.json();
      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("URL do documento não encontrada");
      }
    } catch (error: any) {
      console.error("Erro ao visualizar documento:", error);
      toast.error(error.message || "Erro ao visualizar documento");
    } finally {
      setLoadingUrl(null);
    }
  };

  const handleDeleteDocumento = async (documentoId: string) => {
    if (!medico?.id) return;

    if (!confirm("Tem certeza que deseja excluir este documento?")) {
      return;
    }

    setDeletingDoc(documentoId);
    try {
      const response = await fetch(
        `/api/admin-clinica/medicos/${medico.id}/documentos/${documentoId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao excluir documento");
      }

      toast.success("Documento excluído com sucesso!");
      setDocumentosExistentes(
        documentosExistentes.filter((doc) => doc.id !== documentoId)
      );
    } catch (error: any) {
      console.error("Erro ao excluir documento:", error);
      toast.error(error.message || "Erro ao excluir documento");
    } finally {
      setDeletingDoc(null);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);

      const payload: any = {
        crm: data.crm,
        especialidade: data.especialidade,
        rqe: data.rqe ?? null,
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

      const result = await response.json();
      const medicoId = result.medico?.id || medico?.id;

      // Fazer upload dos documentos se houver
      if (documentos.length > 0 && medicoId) {
        await uploadDocumentos(medicoId);
      }

      toast.success(
        isEditing ? "Médico atualizado com sucesso!" : "Médico criado com sucesso!"
      );

      onSuccess();
      onOpenChange(false);
      form.reset();
      setDocumentos([]);
      // Recarregar documentos existentes após salvar
      if (isEditing && medico?.id) {
        const response = await fetch(`/api/admin-clinica/medicos/${medico.id}/documentos`);
        if (response.ok) {
          const data = await response.json();
          setDocumentosExistentes(data.documentos || []);
        }
      }
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={loading || loadingEspecialidades}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a especialidade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {especialidades.map((especialidade) => (
                        <SelectItem key={especialidade.id} value={especialidade.nome}>
                          {especialidade.nome} {especialidade.codigo && `(${especialidade.codigo})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rqe"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RQE</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Ex: 12345 (opcional)"
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
                    Registro de Qualificação de Especialista (opcional)
                  </p>
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

            <div className="space-y-2">
              <FormLabel>Documentos (Certificados, Diplomas, etc.)</FormLabel>
              
              {/* Documentos existentes (apenas no modo edição) */}
              {isEditing && (
                <div className="space-y-2">
                  {loadingDocumentos ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">
                        Carregando documentos...
                      </span>
                    </div>
                  ) : documentosExistentes.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Documentos anexados:
                      </p>
                      {documentosExistentes.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {doc.mimeType.startsWith("image/") ? (
                              <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                              </div>
                            ) : (
                              <FileText className="h-10 w-10 text-muted-foreground" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {doc.nomeDocumento}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(doc.tamanho / 1024).toFixed(2)} KB • {doc.tipoDocumento}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDocumento(doc)}
                              disabled={loading || loadingUrl === doc.id}
                            >
                              {loadingUrl === doc.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <EyeIcon className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDocumento(doc.id)}
                              disabled={loading || deletingDoc === doc.id}
                            >
                              {deletingDoc === doc.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-destructive" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhum documento anexado ainda.
                    </p>
                  )}
                </div>
              )}

              {/* Upload de novos documentos */}
              <div className="border-2 border-dashed rounded-lg p-4">
                <input
                  type="file"
                  id="documentos"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  disabled={loading || uploadingDocs}
                  className="hidden"
                />
                <label
                  htmlFor="documentos"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Clique para anexar novos documentos (imagem ou PDF)
                  </span>
                </label>
              </div>
              {documentos.length > 0 && (
                <div className="space-y-2 mt-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Novos documentos a serem enviados:
                  </p>
                  {documentos.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div className="flex items-center gap-2">
                        {doc.preview ? (
                          <img
                            src={doc.preview}
                            alt={doc.file.name}
                            className="h-10 w-10 object-cover rounded"
                          />
                        ) : (
                          <FileText className="h-10 w-10 text-muted-foreground" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {doc.file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(doc.file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocumento(index)}
                        disabled={loading || uploadingDocs}
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
              <Button type="submit" disabled={loading || uploadingDocs}>
                {(loading || uploadingDocs) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {uploadingDocs ? "Enviando documentos..." : isEditing ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

