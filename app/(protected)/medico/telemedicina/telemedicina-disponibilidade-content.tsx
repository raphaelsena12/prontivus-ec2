"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import {
  Video,
  Clock,
  DollarSign,
  Calendar,
  Loader2,
  Info,
  Power,
  PowerOff,
  Save,
  Tag,
  X,
  AlertCircle,
  CheckCircle2,
  TimerIcon,
  Bell,
  User,
  PhoneCall,
  ChevronRight,
} from "lucide-react";

interface SessaoAguardando {
  sessionId: string;
  consultaId: string;
  status: string;
  dataHora: string;
  criadoEm: string;
  paciente: {
    id: string;
    nome: string;
    dataNascimento: string | null;
    telefone: string | null;
    email: string | null;
  };
}

function calcIdade(dataNascimento: string | null): string {
  if (!dataNascimento) return "";
  const diff = Date.now() - new Date(dataNascimento).getTime();
  const anos = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  return `${anos} anos`;
}

function calcEspera(criadoEm: string): string {
  const diff = Date.now() - new Date(criadoEm).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min === 1) return "1 min";
  return `${min} min`;
}

function WaitTimer({ criadoEm }: { criadoEm: string }) {
  const [label, setLabel] = useState(() => calcEspera(criadoEm));
  useEffect(() => {
    const t = setInterval(() => setLabel(calcEspera(criadoEm)), 30000);
    return () => clearInterval(t);
  }, [criadoEm]);
  return <span>{label}</span>;
}

interface DisponibilidadeConfig {
  id?: string;
  status: "OFFLINE" | "ONLINE" | "EM_ATENDIMENTO";
  inicioImediato: boolean;
  horaInicio: string | null;
  horaFim: string | null;
  diasSemana: string[];
  valorConsulta: number;
  tempoConsultaMin: number;
  bio: string | null;
  tags: string[];
  fotoUrl: string | null;
  onlineSince: string | null;
}

const DIAS_OPTIONS = [
  { key: "SEG", label: "Seg" },
  { key: "TER", label: "Ter" },
  { key: "QUA", label: "Qua" },
  { key: "QUI", label: "Qui" },
  { key: "SEX", label: "Sex" },
  { key: "SAB", label: "Sáb" },
  { key: "DOM", label: "Dom" },
];

const DEFAULT_CONFIG: DisponibilidadeConfig = {
  status: "OFFLINE",
  inicioImediato: true,
  horaInicio: "08:00",
  horaFim: "18:00",
  diasSemana: ["SEG", "TER", "QUA", "QUI", "SEX"],
  valorConsulta: 0,
  tempoConsultaMin: 30,
  bio: "",
  tags: [],
  fotoUrl: null,
  onlineSince: null,
};

function OnlineTimer({ since }: { since: string }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const calc = () => {
      const diff = Date.now() - new Date(since).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setElapsed(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    calc();
    const t = setInterval(calc, 30000);
    return () => clearInterval(t);
  }, [since]);

  return (
    <span className="tabular-nums text-emerald-700 dark:text-emerald-300 font-semibold">
      {elapsed}
    </span>
  );
}

export function TelemedicinaDisponibilidadeContent() {
  const router = useRouter();
  const [config, setConfig] = useState<DisponibilidadeConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [sessoesAguardando, setSessoesAguardando] = useState<SessaoAguardando[]>([]);
  const prevCountRef = useRef(0);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/medico/telemedicina/disponibilidade");
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.config) {
        setConfig({
          ...data.config,
          valorConsulta: Number(data.config.valorConsulta),
        });
      }
    } catch {
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSessoesAguardando = useCallback(async () => {
    try {
      const res = await fetch("/api/medico/telemedicina/sessoes-aguardando");
      if (!res.ok) return;
      const data = await res.json();
      const novas: SessaoAguardando[] = data.sessoes || [];
      // Notificar se chegaram novas sessões
      if (novas.length > prevCountRef.current && prevCountRef.current >= 0) {
        const diff = novas.length - prevCountRef.current;
        if (diff > 0) {
          toast(
            `${diff} paciente${diff > 1 ? "s" : ""} aguardando atendimento`,
            {
              icon: "🔔",
              duration: 6000,
            }
          );
        }
      }
      prevCountRef.current = novas.length;
      setSessoesAguardando(novas);
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    fetchSessoesAguardando();
    const interval = setInterval(fetchSessoesAguardando, 10_000);
    return () => clearInterval(interval);
  }, [fetchSessoesAguardando]);

  const handleSave = async () => {
    if (!config.inicioImediato && (!config.horaInicio || !config.horaFim)) {
      toast.error("Informe os horários de disponibilidade");
      return;
    }
    if (config.valorConsulta <= 0) {
      toast.error("Informe o valor da consulta");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/medico/telemedicina/disponibilidade", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setConfig((prev) => ({ ...prev, ...data.config, valorConsulta: Number(data.config.valorConsulta) }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast.success("Configurações salvas com sucesso");
    } catch {
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    const novoStatus = config.status === "ONLINE" ? "OFFLINE" : "ONLINE";

    if (novoStatus === "ONLINE" && config.valorConsulta <= 0) {
      toast.error("Salve as configurações (incluindo valor da consulta) antes de ficar online");
      return;
    }

    setTogglingStatus(true);
    try {
      const res = await fetch("/api/medico/telemedicina/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro");
      }

      const data = await res.json();
      setConfig((prev) => ({
        ...prev,
        status: data.config.status,
        onlineSince: data.config.onlineSince,
      }));
      toast.success(novoStatus === "ONLINE" ? "Você está online! Pacientes podem te encontrar." : "Você está offline.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar status");
    } finally {
      setTogglingStatus(false);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (!tag || config.tags.includes(tag) || config.tags.length >= 6) return;
    setConfig((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setConfig((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const toggleDia = (dia: string) => {
    setConfig((prev) => ({
      ...prev,
      diasSemana: prev.diasSemana.includes(dia)
        ? prev.diasSemana.filter((d) => d !== dia)
        : [...prev.diasSemana, dia],
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isOnline = config.status === "ONLINE";
  const isEmAtendimento = config.status === "EM_ATENDIMENTO";
  const hasConfig = config.id !== undefined;

  return (
    <div className="@container/main flex flex-1 flex-col gap-0">
      <div className="px-6 lg:px-8 pt-6">
        <PageHeader
          icon={Video}
          title="Telemedicina — Disponibilidade"
          subtitle="Configure sua presença e apareça para pacientes que buscam atendimento online"
        />
      </div>

      <div className="px-6 lg:px-8 pb-8 flex flex-col gap-6">
        {/* Pacientes Aguardando */}
        {sessoesAguardando.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="relative flex h-5 w-5 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <Bell className="relative h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-sm font-bold text-foreground">
                Paciente{sessoesAguardando.length > 1 ? "s" : ""} aguardando
              </h2>
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-xs px-2">
                {sessoesAguardando.length}
              </Badge>
            </div>

            <div className="flex flex-col gap-2">
              {sessoesAguardando.map((sessao) => (
                <div
                  key={sessao.sessionId}
                  className="flex items-center gap-4 rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3"
                >
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/60">
                    <User className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>

                  {/* Info do paciente */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {sessao.paciente.nome}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      {sessao.paciente.dataNascimento && (
                        <span className="text-xs text-muted-foreground">
                          {calcIdade(sessao.paciente.dataNascimento)}
                        </span>
                      )}
                      {sessao.paciente.telefone && (
                        <span className="text-xs text-muted-foreground">
                          {sessao.paciente.telefone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tempo de espera */}
                  <div className="flex flex-col items-end gap-0.5 shrink-0 text-right">
                    <span className="text-[10px] text-muted-foreground">aguardando há</span>
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 tabular-nums">
                      <WaitTimer criadoEm={sessao.criadoEm} />
                    </span>
                  </div>

                  {/* CTA */}
                  <Button
                    size="sm"
                    className="shrink-0 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold gap-1.5"
                    onClick={() =>
                      router.push(`/medico/telemedicina/sessao/${sessao.sessionId}`)
                    }
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                    Entrar
                    <ChevronRight className="h-3.5 w-3.5 opacity-70" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Card */}
        <Card className={`border-2 transition-all ${
          isOnline
            ? "border-emerald-400 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20"
            : isEmAtendimento
            ? "border-amber-400 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20"
            : "border-border"
        }`}>
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {/* Status indicator */}
                <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                  isOnline
                    ? "bg-emerald-100 dark:bg-emerald-950/60"
                    : isEmAtendimento
                    ? "bg-amber-100 dark:bg-amber-950/60"
                    : "bg-muted"
                }`}>
                  <Video className={`h-6 w-6 ${
                    isOnline ? "text-emerald-600 dark:text-emerald-400"
                    : isEmAtendimento ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
                  }`} />
                  {isOnline && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500" />
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-semibold text-foreground">
                      {isOnline ? "Você está online" : isEmAtendimento ? "Em atendimento" : "Você está offline"}
                    </h2>
                    <Badge className={
                      isOnline
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-transparent"
                        : isEmAtendimento
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-transparent"
                        : "bg-muted text-muted-foreground border-transparent"
                    }>
                      {isOnline ? "Online" : isEmAtendimento ? "Em Atendimento" : "Offline"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isOnline && config.onlineSince ? (
                      <span className="flex items-center gap-1">
                        <TimerIcon className="h-3 w-3" />
                        Online há <OnlineTimer since={config.onlineSince} />
                      </span>
                    ) : isEmAtendimento ? (
                      "Finalize o atendimento atual para voltar ao status online"
                    ) : hasConfig ? (
                      "Configure abaixo e clique em ficar online para aparecer aos pacientes"
                    ) : (
                      "Preencha as configurações abaixo antes de ficar online"
                    )}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleToggleStatus}
                disabled={togglingStatus || isEmAtendimento || !hasConfig}
                size="lg"
                className={`gap-2 font-semibold min-w-[160px] ${
                  isOnline
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-emerald-500 hover:bg-emerald-600 text-white"
                }`}
              >
                {togglingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isOnline ? (
                  <PowerOff className="h-4 w-4" />
                ) : (
                  <Power className="h-4 w-4" />
                )}
                {togglingStatus
                  ? "Aguarde..."
                  : isOnline
                  ? "Ficar Offline"
                  : "Ficar Online"}
              </Button>
            </div>

            {!hasConfig && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Salve suas configurações pelo menos uma vez antes de ficar online.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Coluna esquerda */}
          <div className="flex flex-col gap-6">
            {/* Informações visíveis ao paciente */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  Informações Visíveis ao Paciente
                </CardTitle>
                <CardDescription className="text-xs">
                  Essas informações aparecem no portal de telemedicina dos pacientes.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {/* Bio */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium">Apresentação / Bio</Label>
                  <Textarea
                    placeholder="Descreva brevemente sua área de atuação e experiência para os pacientes..."
                    value={config.bio ?? ""}
                    onChange={(e) => setConfig((p) => ({ ...p, bio: e.target.value }))}
                    rows={4}
                    className="text-sm resize-none"
                    maxLength={400}
                  />
                  <p className="text-[10px] text-muted-foreground text-right">
                    {(config.bio ?? "").length}/400
                  </p>
                </div>

                {/* Tags */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    Especialidades / Tags
                    <span className="text-muted-foreground font-normal">(máx. 6)</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: Ansiedade, Check-up..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      className="text-sm"
                      maxLength={30}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTag}
                      disabled={!tagInput.trim() || config.tags.length >= 6}
                    >
                      Adicionar
                    </Button>
                  </div>
                  {config.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {config.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium"
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="hover:text-destructive transition-colors ml-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Valor e Tempo */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Valor e Duração
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium">
                      Valor da Consulta (R$) <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        R$
                      </span>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="0,00"
                        value={config.valorConsulta || ""}
                        onChange={(e) =>
                          setConfig((p) => ({ ...p, valorConsulta: parseFloat(e.target.value) || 0 }))
                        }
                        className="pl-9 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Duração (min)
                    </Label>
                    <Input
                      type="number"
                      min="10"
                      max="120"
                      step="5"
                      value={config.tempoConsultaMin}
                      onChange={(e) =>
                        setConfig((p) => ({ ...p, tempoConsultaMin: parseInt(e.target.value) || 30 }))
                      }
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    O paciente verá o valor antes de iniciar a consulta. O pagamento é processado no início da sessão.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna direita */}
          <div className="flex flex-col gap-6">
            {/* Disponibilidade de Horário */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Disponibilidade de Horário
                </CardTitle>
                <CardDescription className="text-xs">
                  Defina quando você aceita consultas de telemedicina.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                {/* Toggle início imediato */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium">Início Imediato</p>
                    <p className="text-xs text-muted-foreground">
                      Disponível assim que você ficar online, sem restrição de horário
                    </p>
                  </div>
                  <Switch
                    checked={config.inicioImediato}
                    onCheckedChange={(v) =>
                      setConfig((p) => ({ ...p, inicioImediato: v }))
                    }
                  />
                </div>

                {/* Horários fixos */}
                {!config.inicioImediato && (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs font-medium">Hora de Início</Label>
                        <Input
                          type="time"
                          value={config.horaInicio ?? "08:00"}
                          onChange={(e) =>
                            setConfig((p) => ({ ...p, horaInicio: e.target.value }))
                          }
                          className="text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs font-medium">Hora de Fim</Label>
                        <Input
                          type="time"
                          value={config.horaFim ?? "18:00"}
                          onChange={(e) =>
                            setConfig((p) => ({ ...p, horaFim: e.target.value }))
                          }
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Dias da semana */}
                <div className="flex flex-col gap-2">
                  <Label className="text-xs font-medium">Dias da Semana</Label>
                  <div className="flex flex-wrap gap-2">
                    {DIAS_OPTIONS.map((dia) => {
                      const selected = config.diasSemana.includes(dia.key);
                      return (
                        <button
                          key={dia.key}
                          type="button"
                          onClick={() => toggleDia(dia.key)}
                          className={`h-9 w-11 rounded-lg text-xs font-semibold border transition-all ${
                            selected
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-muted-foreground border-border hover:border-primary/50"
                          }`}
                        >
                          {dia.label}
                        </button>
                      );
                    })}
                  </div>
                  {config.diasSemana.length === 0 && (
                    <p className="text-xs text-destructive">Selecione pelo menos um dia</p>
                  )}
                </div>

                {/* Resumo do horário */}
                {config.diasSemana.length > 0 && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                    <p className="text-xs text-primary font-medium">
                      {config.inicioImediato ? (
                        <>Disponível imediatamente · {config.diasSemana.join(", ")}</>
                      ) : (
                        <>
                          {config.horaInicio} às {config.horaFim} · {config.diasSemana.join(", ")}
                        </>
                      )}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preview de como aparece para o paciente */}
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Preview — Como aparece para o paciente
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-base shadow-sm">
                        M
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${isOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">Seu nome aqui</p>
                      <p className="text-xs text-muted-foreground">Sua especialidade</p>
                    </div>
                    <Badge className={isOnline
                      ? "bg-emerald-100 text-emerald-700 border-transparent text-[10px]"
                      : "bg-muted text-muted-foreground border-transparent text-[10px]"
                    }>
                      {isOnline ? "Online" : "Offline"}
                    </Badge>
                  </div>
                  {config.bio && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{config.bio}</p>
                  )}
                  {config.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {config.tags.slice(0, 3).map((t) => (
                        <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-dashed border-muted">
                    <span className="text-xs font-bold text-foreground">
                      R$ {config.valorConsulta.toFixed(2).replace(".", ",")}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {config.tempoConsultaMin} min
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Botão salvar */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving || config.diasSemana.length === 0}
            size="lg"
            className="gap-2 min-w-[160px]"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar Configurações"}
          </Button>
        </div>
      </div>
    </div>
  );
}
