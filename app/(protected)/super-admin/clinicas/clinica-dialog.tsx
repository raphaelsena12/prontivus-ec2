"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Label } from "@/components/ui/label";
import { TipoPlano, StatusClinica } from "@/lib/generated/prisma";
import { createClinica, updateClinica } from "./actions";
import { ESTADOS_BRASILEIROS } from "@/lib/estados-brasileiros";
import { Upload, Loader2, X } from "lucide-react";
import Image from "next/image";

interface Plano {
  id: string;
  nome: TipoPlano;
  tokensMensais: number;
  preco: number;
  telemedicineHabilitada: boolean;
}

interface Clinica {
  id: string;
  nome: string;
  cnpj: string;
  email: string;
  telefone: string | null;
  status: StatusClinica;
  tokensMensaisDisponiveis: number;
  tokensConsumidos: number;
  telemedicineHabilitada: boolean;
  dataContratacao: Date;
  dataExpiracao: Date | null;
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  pais?: string | null;
  logoUrl?: string | null;
  plano: {
    id: string;
    nome: TipoPlano;
    tokensMensais: number;
    preco: number;
    telemedicineHabilitada: boolean;
  };
}

interface ClinicaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  clinica?: Clinica | null;
  planos: Plano[];
}

// Validação de CNPJ
const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

const validateCNPJ = (cnpj: string): boolean => {
  const cleaned = cnpj.replace(/\D/g, "");
  if (cleaned.length !== 14) return false;

  // Validação básica de dígitos verificadores
  let size = cleaned.length - 2;
  let numbers = cleaned.substring(0, size);
  const digits = cleaned.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  size = size + 1;
  numbers = cleaned.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === parseInt(digits.charAt(1));
};

// Validação de telefone brasileiro
const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;

// Formatação de CEP
const formatCEP = (value: string) => {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 8) {
    return cleaned.replace(/(\d{5})(\d)/, "$1-$2");
  }
  return value;
};

const formatCNPJ = (value: string) => {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 14) {
    return cleaned
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return value;
};

const formatPhone = (value: string) => {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 11) {
    if (cleaned.length <= 10) {
      return cleaned
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    } else {
      return cleaned
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2");
    }
  }
  return value;
};

const clinicaSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  cnpj: z
    .string()
    .min(1, "CNPJ é obrigatório")
    .refine(
      (val) => {
        const formatted = formatCNPJ(val);
        return cnpjRegex.test(formatted) && validateCNPJ(formatted);
      },
      { message: "CNPJ inválido" }
    ),
  email: z.string().email("Email inválido"),
  telefone: z
    .string()
    .min(1, "Telefone é obrigatório")
    .refine(
      (val) => {
        const formatted = formatPhone(val);
        return phoneRegex.test(formatted);
      },
      { message: "Telefone inválido. Use o formato (XX) XXXXX-XXXX" }
    ),
  planoId: z.string().min(1, "Plano é obrigatório"),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  pais: z.string().optional(),
  logoUrl: z.string().optional(),
});

type ClinicaFormValues = z.infer<typeof clinicaSchema>;

export function ClinicaDialog({
  open,
  onOpenChange,
  onSuccess,
  clinica,
  planos,
}: ClinicaDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const isEditing = !!clinica;

  const form = useForm<ClinicaFormValues>({
    resolver: zodResolver(clinicaSchema),
    defaultValues: {
      nome: "",
      cnpj: "",
      email: "",
      telefone: "",
      planoId: "",
      cep: "",
      endereco: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      pais: "Brasil",
      logoUrl: "",
    },
  });

  // Preencher formulário ao editar
  useEffect(() => {
    if (clinica && open) {
      form.reset({
        nome: clinica.nome,
        cnpj: formatCNPJ(clinica.cnpj),
        email: clinica.email,
        telefone: clinica.telefone ? formatPhone(clinica.telefone) : "",
        planoId: clinica.plano.id,
        cep: clinica.cep ? formatCEP(clinica.cep) : "",
        endereco: clinica.endereco || "",
        numero: clinica.numero || "",
        complemento: clinica.complemento || "",
        bairro: clinica.bairro || "",
        cidade: clinica.cidade || "",
        estado: clinica.estado || "",
        pais: clinica.pais || "Brasil",
        logoUrl: clinica.logoUrl || "",
      });
      setLogoPreview(clinica.logoUrl || null);
    } else if (!clinica && open) {
      form.reset({
        nome: "",
        cnpj: "",
        email: "",
        telefone: "",
        planoId: "",
        cep: "",
        endereco: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        pais: "Brasil",
        logoUrl: "",
      });
      setLogoPreview(null);
    }
  }, [clinica, open, form]);

  const selectedPlanoId = form.watch("planoId");
  const selectedPlano = planos.find((p) => p.id === selectedPlanoId);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Tipo de arquivo não permitido. Use JPEG, PNG ou WEBP");
      return;
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Tamanho máximo: 5MB");
      return;
    }

    setUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (clinica?.id) {
        formData.append("clinicaId", clinica.id);
      } else {
        // Para nova clínica, usar um ID temporário baseado no CNPJ
        const cnpj = form.getValues("cnpj").replace(/\D/g, "");
        if (!cnpj) {
          toast.error("Preencha o CNPJ antes de fazer upload da logo");
          setUploadingLogo(false);
          return;
        }
        formData.append("clinicaId", `temp-${cnpj}`);
      }

      const response = await fetch("/api/super-admin/clinicas/upload-logo", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao fazer upload");
      }

      form.setValue("logoUrl", data.url);
      setLogoPreview(data.url);
      toast.success("Logo enviada com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer upload da logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const onSubmit = async (data: ClinicaFormValues) => {
    setIsLoading(true);

    try {
      if (isEditing && clinica) {
        const result = await updateClinica({
          id: clinica.id,
          nome: data.nome,
          email: data.email,
          telefone: data.telefone,
          planoId: data.planoId,
          cep: data.cep,
          endereco: data.endereco,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          cidade: data.cidade,
          estado: data.estado,
          pais: data.pais,
          logoUrl: data.logoUrl,
        });

        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Clínica atualizada com sucesso!");
          onSuccess();
        }
      } else {
        const result = await createClinica({
          nome: data.nome,
          cnpj: data.cnpj,
          email: data.email,
          telefone: data.telefone,
          planoId: data.planoId,
          cep: data.cep,
          endereco: data.endereco,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          cidade: data.cidade,
          estado: data.estado,
          pais: data.pais,
          logoUrl: data.logoUrl,
        });

        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Clínica criada com sucesso!");
          toast.info(
            `Admin criado: admin@${data.cnpj.replace(/\D/g, "")}.clinica.com`
          );
          onSuccess();
        }
      }
    } catch {
      toast.error("Erro ao salvar clínica");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Clínica" : "Nova Clínica"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações da clínica"
              : "Preencha os dados para criar uma nova clínica"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Clínica</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo da clínica" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cnpj"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CNPJ</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="00.000.000/0000-00"
                      disabled={isEditing}
                      {...field}
                      onChange={(e) => {
                        const formatted = formatCNPJ(e.target.value);
                        field.onChange(formatted);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="contato@clinica.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(00) 00000-0000"
                        {...field}
                        onChange={(e) => {
                          const formatted = formatPhone(e.target.value);
                          field.onChange(formatted);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="planoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plano</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um plano" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {planos.map((plano) => (
                        <SelectItem key={plano.id} value={plano.id}>
                          {plano.nome === TipoPlano.BASICO && "Básico"}
                          {plano.nome === TipoPlano.INTERMEDIARIO &&
                            "Intermediário"}
                          {plano.nome === TipoPlano.PROFISSIONAL &&
                            "Profissional"}
                          {" - "}
                          {plano.tokensMensais.toLocaleString("pt-BR")} tokens
                          {plano.telemedicineHabilitada && " + Telemedicina"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedPlano && (
              <div className="rounded-md border p-4 bg-muted/50">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Tokens mensais:
                    </span>
                    <span className="font-medium">
                      {selectedPlano.tokensMensais.toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Telemedicina:</span>
                    <span className="font-medium">
                      {selectedPlano.telemedicineHabilitada
                        ? "Habilitada"
                        : "Desabilitada"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Upload de Logo */}
            <div className="space-y-2">
              <Label>Logo da Clínica</Label>
              {logoPreview ? (
                <div className="relative">
                  <div className="relative h-24 w-full rounded-md border bg-background overflow-hidden" style={{ minWidth: '100%', width: '100%' }}>
                    <img
                      src={logoPreview}
                      alt="Logo da clínica"
                      className="h-full w-full object-contain p-3"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={() => {
                      setLogoPreview(null);
                      form.setValue("logoUrl", "");
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <label
                  htmlFor="logo-upload"
                  className="flex h-20 w-full cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-input bg-muted/50 transition-colors hover:bg-muted"
                >
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Escolher arquivo
                    </span>
                  </div>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="hidden"
                  />
                </label>
              )}
              <p className="text-xs text-muted-foreground">
                JPG, PNG ou WEBP. Máximo 5MB.
              </p>
              {uploadingLogo && (
                <p className="text-xs text-primary flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Enviando...
                </p>
              )}
            </div>

            {/* Endereço */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-semibold">Endereço</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="cep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="00000-000"
                          {...field}
                          onChange={(e) => {
                            const formatted = formatCEP(e.target.value);
                            field.onChange(formatted);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ESTADOS_BRASILEIROS.map((estado) => (
                            <SelectItem key={estado.value} value={estado.value}>
                              {estado.label}
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
                  name="cidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Cidade" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="endereco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input placeholder="Rua, Avenida, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="numero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input placeholder="Número" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="complemento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input placeholder="Apto, Sala, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bairro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input placeholder="Bairro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="pais"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>País</FormLabel>
                    <FormControl>
                      <Input placeholder="País" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvando..." : isEditing ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
