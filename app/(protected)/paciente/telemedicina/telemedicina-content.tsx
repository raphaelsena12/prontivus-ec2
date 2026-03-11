"use client";

import { useState, useEffect, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Video,
  Search,
  Clock,
  Zap,
  Shield,
  Headphones,
  ChevronRight,
  Filter,
  Loader2,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Lock,
  Stethoscope,
  User,
} from "lucide-react";
import { toast } from "sonner";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Medico {
  id: string;
  medicoTelemedicinaId: string;
  nome: string;
  especialidade: string;
  crm: string;
  status: "ONLINE" | "EM_ATENDIMENTO";
  valorConsulta: number;
  tempoConsultaMin: number;
  bio: string | null;
  tags: string[];
  fotoUrl: string | null;
  onlineSince: string | null;
}

type ModalStep = "resumo" | "pagamento" | "processando" | "sucesso";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

const GRADIENT_COLORS = [
  "from-blue-500 to-blue-600",
  "from-pink-500 to-rose-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-fuchsia-500 to-pink-600",
  "from-sky-500 to-cyan-600",
  "from-indigo-500 to-blue-700",
];

function getColor(id: string) {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return GRADIENT_COLORS[hash % GRADIENT_COLORS.length];
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function MedicoAvatar({
  medico,
  size = "md",
}: {
  medico: Medico;
  size?: "sm" | "md";
}) {
  const [imgError, setImgError] = useState(false);
  const color = getColor(medico.id);
  const cls =
    size === "sm"
      ? "h-10 w-10 rounded-xl text-sm"
      : "h-14 w-14 rounded-2xl text-lg";

  if (medico.fotoUrl && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={medico.fotoUrl}
        alt={medico.nome}
        className={`${cls} object-cover shadow-md`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center ${cls} bg-gradient-to-br ${color} text-white font-bold shadow-md`}
    >
      {getInitials(medico.nome)}
    </div>
  );
}

// ─── Formulário Stripe (inner) ────────────────────────────────────────────────

function PaymentForm({
  medico,
  pagamentoId,
  paymentIntentId,
  onSuccess,
}: {
  medico: Medico;
  pagamentoId: string;
  paymentIntentId: string;
  onSuccess: (patientLink: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);

    // Confirmar pagamento sem redirect
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {},
      redirect: "if_required",
    });

    if (error) {
      toast.error(error.message || "Erro ao processar pagamento");
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status !== "succeeded") {
      toast.error("Pagamento não confirmado. Tente novamente.");
      setSubmitting(false);
      return;
    }

    // Iniciar consulta imediata
    try {
      const res = await fetch("/api/paciente/telemedicina/iniciar-imediato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId,
          pagamentoId,
          medicoId: medico.id,
          medicoTelemedicinaId: medico.medicoTelemedicinaId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao iniciar consulta");
      }

      const data = await res.json();
      onSuccess(data.patientLink);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao criar sessão de consulta"
      );
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="rounded-xl border bg-muted/30 px-4 py-3 flex items-center gap-3">
        <MedicoAvatar medico={medico} size="sm" />
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold truncate">{medico.nome}</span>
          <span className="text-xs text-muted-foreground">
            {medico.especialidade}
          </span>
        </div>
        <div className="ml-auto text-right shrink-0">
          <span className="text-base font-bold text-foreground">
            R${" "}
            {medico.valorConsulta.toFixed(2).replace(".", ",")}
          </span>
          <p className="text-[10px] text-muted-foreground">
            {medico.tempoConsultaMin} min
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Lock className="h-3 w-3" />
          Dados do cartão
        </label>
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>

      <Button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full h-11 font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processando...
          </>
        ) : (
          <>
            <Lock className="h-4 w-4 mr-2" />
            Pagar R${" "}
            {medico.valorConsulta.toFixed(2).replace(".", ",")} e entrar
          </>
        )}
      </Button>

      <p className="text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1">
        <Shield className="h-3 w-3" />
        Pagamento seguro processado pelo Stripe
      </p>
    </form>
  );
}

// ─── Modal de Consulta ────────────────────────────────────────────────────────

function ConsultaModal({
  medico,
  open,
  onClose,
}: {
  medico: Medico | null;
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<ModalStep>("resumo");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [pagamentoId, setPagamentoId] = useState<string | null>(null);
  const [patientLink, setPatientLink] = useState<string | null>(null);
  const [loadingPI, setLoadingPI] = useState(false);

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("resumo");
        setClientSecret(null);
        setPaymentIntentId(null);
        setPagamentoId(null);
        setPatientLink(null);
        setLoadingPI(false);
      }, 300);
    }
  }, [open]);

  const criarPaymentIntent = async () => {
    if (!medico) return;
    setLoadingPI(true);
    try {
      const res = await fetch("/api/paciente/telemedicina/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicoTelemedicinaId: medico.medicoTelemedicinaId,
          medicoId: medico.id,
          valor: medico.valorConsulta,
          medicoNome: medico.nome,
          especialidade: medico.especialidade,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao criar pagamento");
      }

      const data = await res.json();
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      setPagamentoId(data.pagamentoId);
      setStep("pagamento");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao inicializar pagamento"
      );
    } finally {
      setLoadingPI(false);
    }
  };

  if (!medico) return null;

  const color = getColor(medico.id);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
        {/* Topo colorido */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${color}`} />

        <div className="p-6 flex flex-col gap-5">
          <DialogHeader className="p-0 gap-1">
            <DialogTitle className="text-base">
              {step === "sucesso"
                ? "Consulta iniciada!"
                : "Confirmar consulta"}
            </DialogTitle>
          </DialogHeader>

          {/* Passo 1: Resumo */}
          {step === "resumo" && (
            <div className="flex flex-col gap-5">
              {/* Card médico */}
              <div className="flex items-start gap-3 rounded-xl border p-4">
                <MedicoAvatar medico={medico} size="md" />
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <p className="text-sm font-bold leading-tight">{medico.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {medico.especialidade}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70">
                    {medico.crm}
                  </p>
                  {medico.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {medico.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Detalhes */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-0.5 rounded-lg border p-3">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Valor da consulta
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    R$ {medico.valorConsulta.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 rounded-lg border p-3">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Duração estimada
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    {medico.tempoConsultaMin} min
                  </span>
                </div>
              </div>

              {/* Aviso */}
              <div className="flex items-start gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-3">
                <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Consulta por vídeo via Telemedicina. Após o pagamento, você
                  receberá acesso imediato à sala.
                </p>
              </div>

              <Button
                onClick={criarPaymentIntent}
                disabled={loadingPI}
                className="w-full h-11 font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
              >
                {loadingPI ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Aguarde...
                  </>
                ) : (
                  "Continuar para pagamento"
                )}
              </Button>
            </div>
          )}

          {/* Passo 2: Stripe Payment Element */}
          {step === "pagamento" && clientSecret && pagamentoId && paymentIntentId && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: "stripe",
                  variables: {
                    colorPrimary: "#10b981",
                    borderRadius: "8px",
                  },
                },
                locale: "pt-BR",
              }}
            >
              <PaymentForm
                medico={medico}
                pagamentoId={pagamentoId}
                paymentIntentId={paymentIntentId}
                onSuccess={(link) => {
                  setPatientLink(link);
                  setStep("sucesso");
                }}
              />
            </Elements>
          )}

          {/* Passo 3: Sucesso */}
          {step === "sucesso" && patientLink && (
            <div className="flex flex-col items-center gap-5 py-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>

              <div className="text-center flex flex-col gap-1">
                <p className="text-base font-bold">Pagamento confirmado!</p>
                <p className="text-sm text-muted-foreground">
                  Sua sala de consulta está pronta.
                  <br />O médico foi notificado e entrará em breve.
                </p>
              </div>

              <div className="w-full flex flex-col gap-3">
                <div className="rounded-xl border bg-muted/30 p-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/40 shrink-0">
                    <Video className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold">Sala disponível</span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      Consulta com {medico.nome}
                    </span>
                  </div>
                  <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse mr-1 inline-block" />
                    Ao vivo
                  </Badge>
                </div>

                <Button
                  asChild
                  className="w-full h-11 font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                >
                  <a href={patientLink} target="_blank" rel="noopener noreferrer">
                    <Video className="h-4 w-4 mr-2" />
                    Entrar na Consulta
                    <ExternalLink className="h-3.5 w-3.5 ml-2 opacity-70" />
                  </a>
                </Button>

                <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground">
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Card do Médico ───────────────────────────────────────────────────────────

function MedicoCard({
  medico,
  onIniciar,
}: {
  medico: Medico;
  onIniciar: (m: Medico) => void;
}) {
  const isOnline = medico.status === "ONLINE";
  const color = getColor(medico.id);

  return (
    <div className="group relative flex flex-col rounded-2xl border bg-card overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
      <div className={`h-1 w-full bg-gradient-to-r ${color}`} />

      <div className="flex flex-col gap-4 p-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <MedicoAvatar medico={medico} />
            <span
              className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background ${
                isOnline ? "bg-emerald-500" : "bg-amber-500"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isOnline ? "bg-emerald-300 animate-ping" : "bg-amber-300"
                }`}
              />
            </span>
          </div>

          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground leading-tight truncate">
              {medico.nome}
            </h3>
            <p className="text-xs font-medium text-muted-foreground">
              {medico.especialidade}
            </p>
            <p className="text-[10px] text-muted-foreground/70">{medico.crm}</p>
          </div>

          <div className="shrink-0">
            {isOnline ? (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] px-2 py-0.5 font-medium">
                <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                Online
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px] px-2 py-0.5 font-medium">
                <span className="mr-1 h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
                Ocupado
              </Badge>
            )}
          </div>
        </div>

        {medico.bio && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {medico.bio}
          </p>
        )}

        {medico.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {medico.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-dashed border-muted pt-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {medico.tempoConsultaMin} min
          </div>
          <div className="text-xs text-muted-foreground">
            {isOnline ? "Atendimento imediato" : "Em atendimento"}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground">
              Consulta a partir de
            </span>
            <span className="text-base font-bold text-foreground">
              R$ {medico.valorConsulta.toFixed(2).replace(".", ",")}
            </span>
          </div>
          <Button
            className={`flex-1 font-semibold text-sm ${
              isOnline
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-sm"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
            disabled={!isOnline}
            size="sm"
            onClick={() => isOnline && onIniciar(medico)}
          >
            {isOnline ? (
              <>
                <Video className="h-4 w-4 mr-1.5" />
                Iniciar Consulta
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 mr-1.5" />
                Em Atendimento
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export function TelemedicinaContent() {
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [especialidade, setEspecialidade] = useState("Todas");
  const [medicoSelecionado, setMedicoSelecionado] = useState<Medico | null>(
    null
  );
  const [modalAberto, setModalAberto] = useState(false);

  const loadMedicos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/paciente/medicos-online");
      if (!res.ok) throw new Error("Erro ao buscar médicos");
      const data = await res.json();
      setMedicos(data.medicos || []);
    } catch {
      setMedicos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMedicos();
    const interval = setInterval(loadMedicos, 30_000);
    return () => clearInterval(interval);
  }, [loadMedicos]);

  const handleIniciar = (m: Medico) => {
    setMedicoSelecionado(m);
    setModalAberto(true);
  };

  const especialidades = [
    "Todas",
    ...Array.from(new Set(medicos.map((m) => m.especialidade))).sort(),
  ];

  const filtered = medicos.filter((m) => {
    const matchEsp =
      especialidade === "Todas" || m.especialidade === especialidade;
    const matchSearch =
      !search ||
      m.nome.toLowerCase().includes(search.toLowerCase()) ||
      m.especialidade.toLowerCase().includes(search.toLowerCase()) ||
      m.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchEsp && matchSearch;
  });

  const onlineCount = medicos.filter((m) => m.status === "ONLINE").length;
  const onlineFiltered = filtered.filter((m) => m.status === "ONLINE");
  const ocupadoFiltered = filtered.filter((m) => m.status === "EM_ATENDIMENTO");

  return (
    <>
      <ConsultaModal
        medico={medicoSelecionado}
        open={modalAberto}
        onClose={() => {
          setModalAberto(false);
          loadMedicos(); // atualiza lista ao fechar
        }}
      />

      <div className="@container/main flex flex-1 flex-col gap-0">
        {/* Header */}
        <div className="px-6 lg:px-8 pt-6">
          <PageHeader
            icon={Video}
            title="Telemedicina"
            subtitle="Consulte com médicos online agora, sem sair de casa"
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5">
                <div className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </div>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {loading
                    ? "..."
                    : `${onlineCount} médico${onlineCount !== 1 ? "s" : ""} online`}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={loadMedicos}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </PageHeader>

          <div className="flex flex-wrap gap-2 -mt-2 mb-4">
            {[
              { icon: Zap, label: "Atendimento imediato" },
              { icon: Shield, label: "Médicos verificados" },
              { icon: Headphones, label: "Suporte 24h" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1"
              >
                <Icon className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filtros */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar médico, especialidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex gap-1.5">
                {especialidades.map((esp) => (
                  <button
                    key={esp}
                    onClick={() => setEspecialidade(esp)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                      especialidade === esp
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {esp}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 lg:px-8 py-6 flex flex-col gap-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              <p className="text-sm text-muted-foreground">
                Buscando médicos online...
              </p>
            </div>
          ) : (
            <>
              {onlineFiltered.length > 0 && (
                <section className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <h2 className="text-sm font-bold text-foreground">
                          Disponíveis Agora
                        </h2>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs px-2">
                        {onlineFiltered.length}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Atendimento imediato
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {onlineFiltered.map((medico) => (
                      <MedicoCard
                        key={medico.id}
                        medico={medico}
                        onIniciar={handleIniciar}
                      />
                    ))}
                  </div>
                </section>
              )}

              {ocupadoFiltered.length > 0 && (
                <section className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        <h2 className="text-sm font-bold text-foreground">
                          Em Atendimento
                        </h2>
                      </div>
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-xs px-2">
                        {ocupadoFiltered.length}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Disponível em breve
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {ocupadoFiltered.map((medico) => (
                      <MedicoCard
                        key={medico.id}
                        medico={medico}
                        onIniciar={handleIniciar}
                      />
                    ))}
                  </div>
                </section>
              )}

              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted">
                    <Video className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">
                      {medicos.length === 0
                        ? "Nenhum médico online no momento"
                        : "Nenhum médico encontrado"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {medicos.length === 0
                        ? "Tente novamente mais tarde ou agende uma consulta"
                        : "Tente ajustar os filtros ou a busca"}
                    </p>
                  </div>
                  {(search || especialidade !== "Todas") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearch("");
                        setEspecialidade("Todas");
                      }}
                    >
                      Limpar filtros
                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  )}
                </div>
              )}
            </>
          )}

          <div className="rounded-2xl border bg-muted/30 p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/40">
              <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                Segurança e Privacidade Garantidas
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Todas as consultas são realizadas em ambiente seguro e
                criptografado, em conformidade com a LGPD e resoluções do CFM.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
