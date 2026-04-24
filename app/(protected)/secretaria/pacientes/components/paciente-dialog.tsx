"use client";

import { formatDateToInput } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { maskCPF as maskCPFInput, maskRG, maskTelefone, maskCelular, maskCEP, removeMask } from "@/lib/masks";
import { maskCPF as maskCPFDisplay } from "@/lib/utils";

interface Paciente {
  id: string;
  nome: string;
  cpf: string | null;
  rg: string | null;
  dataNascimento: Date | string | null;
  sexo: string;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  profissao: string | null;
  estadoCivil: string | null;
  observacoes: string | null;
  alergias: string | null;
  medicamentosEmUso: string | null;
  ativo: boolean;
}

interface PacienteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paciente: Paciente | null;
  onSuccess: () => void;
}

const pacienteSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  cpf: z.string().min(11, "CPF inválido"),
  rg: z.string().optional(),
  dataNascimento: z.string().min(1, "Data de nascimento é obrigatória"),
  sexo: z.enum(["M", "F", "OUTRO"]),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefone: z.string().optional(),
  celular: z.string().optional(),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  profissao: z.string().optional(),
  estadoCivil: z.enum(["SOLTEIRO", "CASADO", "DIVORCIADO", "VIUVO"]).optional(),
  observacoes: z.string().optional(),
  alergias: z.string().optional(),
  medicamentosEmUso: z.string().optional(),
});

type PacienteFormValues = z.infer<typeof pacienteSchema>;

export function PacienteDialog({
  open,
  onOpenChange,
  paciente,
  onSuccess,
}: PacienteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [consentimentoLGPD, setConsentimentoLGPD] = useState(false);
  const [cpfRevealed, setCpfRevealed] = useState(false);
  const isEditing = !!paciente;

  const form = useForm<PacienteFormValues>({
    resolver: zodResolver(pacienteSchema),
    defaultValues: {
      nome: "",
      cpf: "",
      rg: "",
      dataNascimento: "",
      sexo: undefined,
      email: "",
      telefone: "",
      celular: "",
      cep: "",
      endereco: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      profissao: "",
      estadoCivil: undefined,
      observacoes: "",
      alergias: "",
      medicamentosEmUso: "",
    },
  });

  useEffect(() => {
    if (paciente) {
      form.reset({
        nome: paciente.nome || "",
        cpf: paciente.cpf ? maskCPFInput(paciente.cpf) : "",
        rg: paciente.rg ? maskRG(paciente.rg) : "",
        dataNascimento: paciente.dataNascimento
          ? formatDateToInput(paciente.dataNascimento)
          : "",
        sexo: paciente.sexo as "M" | "F" | "OUTRO",
        email: paciente.email || "",
        telefone: paciente.telefone ? maskTelefone(paciente.telefone) : "",
        celular: paciente.celular ? maskCelular(paciente.celular) : "",
        cep: paciente.cep ? maskCEP(paciente.cep) : "",
        endereco: paciente.endereco || "",
        numero: paciente.numero || "",
        complemento: paciente.complemento || "",
        bairro: paciente.bairro || "",
        cidade: paciente.cidade || "",
        estado: paciente.estado || "",
        profissao: paciente.profissao || "",
        estadoCivil: paciente.estadoCivil as "SOLTEIRO" | "CASADO" | "DIVORCIADO" | "VIUVO" | undefined,
        observacoes: paciente.observacoes || "",
        alergias: paciente.alergias || "",
        medicamentosEmUso: paciente.medicamentosEmUso || "",
      });
    } else {
      form.reset({
        nome: "",
        cpf: "",
        rg: "",
        dataNascimento: "",
        sexo: undefined,
        email: "",
        telefone: "",
        celular: "",
        cep: "",
        endereco: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        profissao: "",
        estadoCivil: undefined,
        observacoes: "",
        alergias: "",
        medicamentosEmUso: "",
      });
      setConsentimentoLGPD(false);
    }
    setCpfRevealed(false);
  }, [paciente, form]);

  const onSubmit = async (data: PacienteFormValues) => {
    try {
      setLoading(true);

      const payload: any = {
        nome: data.nome,
        cpf: removeMask(data.cpf),
        dataNascimento: data.dataNascimento,
        sexo: data.sexo,
      };

      if (data.rg && data.rg.trim()) payload.rg = removeMask(data.rg);
      if (data.email !== undefined) payload.email = data.email || "";
      if (data.telefone && data.telefone.trim()) payload.telefone = removeMask(data.telefone);
      if (data.celular && data.celular.trim()) payload.celular = removeMask(data.celular);
      if (data.cep && data.cep.trim()) payload.cep = removeMask(data.cep);
      if (data.endereco && data.endereco.trim()) payload.endereco = data.endereco;
      if (data.numero && data.numero.trim()) payload.numero = data.numero;
      if (data.complemento && data.complemento.trim()) payload.complemento = data.complemento;
      if (data.bairro && data.bairro.trim()) payload.bairro = data.bairro;
      if (data.cidade && data.cidade.trim()) payload.cidade = data.cidade;
      if (data.estado && data.estado.trim()) payload.estado = data.estado;
      if (data.profissao && data.profissao.trim()) payload.profissao = data.profissao;
      if (data.estadoCivil) payload.estadoCivil = data.estadoCivil;
      if (data.observacoes && data.observacoes.trim()) payload.observacoes = data.observacoes;
      payload.alergias = data.alergias?.trim() ? data.alergias.trim() : null;
      payload.medicamentosEmUso = data.medicamentosEmUso?.trim() ? data.medicamentosEmUso.trim() : null;

      const url = isEditing
        ? `/api/admin-clinica/pacientes/${paciente.id}`
        : `/api/admin-clinica/pacientes`;

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok && !isEditing && consentimentoLGPD) {
        // Registrar consentimento presencial para o paciente recém-criado
        try {
          const result = await response.clone().json();
          if (result.paciente?.id) {
            await fetch("/api/secretaria/pacientes/consentimento", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pacienteId: result.paciente.id }),
            });
          }
        } catch {
          // Não bloquear o cadastro se falhar o registro do consentimento
        }
      }

      if (!response.ok) {
        let error;
        try {
          error = await response.json();
        } catch (e) {
          console.error("Erro ao processar JSON:", e);
          error = { error: "Erro ao processar resposta do servidor" };
        }
        
        if (response.status === 409) {
          const errorMessage = error.error || "CPF já cadastrado";
          setLoading(false);
          toast.error("⚠️ CPF Duplicado", {
            description: `${errorMessage}. Este CPF já está cadastrado para outro paciente no sistema. Verifique se o paciente já existe antes de tentar cadastrar novamente.`,
            duration: 6000,
          });
          return;
        }
        
        if (error.details && Array.isArray(error.details)) {
          const mensagens = error.details.map((d: any) => `${d.path.join('.')}: ${d.message}`).join(', ');
          throw new Error(`Erro de validação: ${mensagens}`);
        }
        throw new Error(error.error || "Erro ao salvar paciente");
      }

      toast.success(
        isEditing ? "Paciente atualizado com sucesso!" : "Paciente criado com sucesso!"
      );

      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao salvar paciente";
      if (!errorMessage.includes("CPF já cadastrado")) {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Paciente" : "Novo Paciente"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do paciente"
              : "Preencha os dados para criar um novo paciente"}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pr-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Nome Completo <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} maxLength={100} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => {
                    const showMasked = isEditing && !cpfRevealed;
                    return (
                      <FormItem>
                        <FormLabel>
                          CPF <span className="text-destructive">*</span>
                        </FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="000.000.000-00"
                              maxLength={14}
                              disabled={loading || showMasked}
                              value={
                                showMasked
                                  ? maskCPFDisplay(removeMask(field.value))
                                  : field.value
                                  ? maskCPFInput(field.value)
                                  : ""
                              }
                              onChange={(e) => {
                                const masked = maskCPFInput(e.target.value);
                                field.onChange(masked);
                              }}
                              className={isEditing ? "pr-10" : ""}
                            />
                          </FormControl>
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => setCpfRevealed(!cpfRevealed)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              tabIndex={-1}
                            >
                              {cpfRevealed ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="rg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RG</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="00.000.000-0"
                          maxLength={12}
                          disabled={loading}
                          value={field.value ? maskRG(field.value) : ""}
                          onChange={(e) => {
                            const masked = maskRG(e.target.value);
                            field.onChange(masked);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dataNascimento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Data de Nascimento <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sexo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Sexo <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        disabled={loading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o sexo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="M">Masculino</SelectItem>
                          <SelectItem value="F">Feminino</SelectItem>
                          <SelectItem value="OUTRO">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estadoCivil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado Civil</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "" ? undefined : value)}
                        value={field.value || ""}
                        disabled={loading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o estado civil" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SOLTEIRO">Solteiro(a)</SelectItem>
                          <SelectItem value="CASADO">Casado(a)</SelectItem>
                          <SelectItem value="DIVORCIADO">Divorciado(a)</SelectItem>
                          <SelectItem value="VIUVO">Viúvo(a)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} maxLength={100} disabled={loading} />
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
                          {...field}
                          placeholder="(00) 0000-0000"
                          maxLength={15}
                          disabled={loading}
                          value={field.value ? maskTelefone(field.value) : ""}
                          onChange={(e) => {
                            const masked = maskTelefone(e.target.value);
                            field.onChange(masked);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="celular"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Celular</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="(00) 00000-0000"
                          maxLength={15}
                          disabled={loading}
                          value={field.value ? maskCelular(field.value) : ""}
                          onChange={(e) => {
                            const masked = maskCelular(e.target.value);
                            field.onChange(masked);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="profissao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profissão</FormLabel>
                      <FormControl>
                        <Input {...field} maxLength={100} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <h3 className="mb-4 text-lg font-semibold">Endereço</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="00000-000"
                            maxLength={9}
                            disabled={loading}
                            value={field.value ? maskCEP(field.value) : ""}
                            onChange={(e) => {
                              const masked = maskCEP(e.target.value);
                              field.onChange(masked);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endereco"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Input {...field} maxLength={200} disabled={loading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="numero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input {...field} maxLength={10} disabled={loading} />
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
                          <Input {...field} maxLength={50} disabled={loading} />
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
                          <Input {...field} maxLength={100} disabled={loading} />
                        </FormControl>
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
                          <Input {...field} maxLength={100} disabled={loading} />
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
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="UF"
                            maxLength={2}
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div>
                <h3 className="mb-4 text-lg font-semibold">
                  Dados de Saúde
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="alergias"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-red-700">Alergias</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={2}
                            maxLength={500}
                            placeholder="Ex.: Dipirona, penicilina, frutos do mar..."
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="medicamentosEmUso"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-amber-700">Medicamentos em uso</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={2}
                            maxLength={1000}
                            placeholder="Ex.: Losartana 50mg 1x/dia; Metformina 850mg 2x/dia..."
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div>
                <h3 className="mb-4 text-lg font-semibold">
                  Informações Adicionais
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="observacoes"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={4}
                            maxLength={1000}
                            placeholder="Observações sobre o paciente..."
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Consentimento LGPD — apenas no cadastro novo */}
              {!isEditing && (
                <div className="rounded-lg border p-4 bg-blue-50/50">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground mb-1">
                        Consentimento LGPD
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Marque abaixo se o paciente assinou o Termo de Consentimento
                        para Tratamento de Dados Pessoais e de Saúde (Lei nº 13.709/2018).
                      </p>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="consentimento-lgpd"
                          checked={consentimentoLGPD}
                          onCheckedChange={(checked) => setConsentimentoLGPD(checked === true)}
                          disabled={loading}
                        />
                        <label
                          htmlFor="consentimento-lgpd"
                          className="text-sm cursor-pointer select-none"
                        >
                          Paciente assinou o termo de consentimento LGPD
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t">
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
                  {isEditing ? "Atualizar" : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
