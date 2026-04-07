"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { io, Socket } from "socket.io-client";
import { useSearchParams } from "next/navigation";

interface ChamadaPainel {
  id: string;
  pacienteNome: string;
  medicoNome: string;
  sala: string;
  status: "CHAMANDO" | "EM_ATENDIMENTO";
  horario: string;
  clinicaId: string;
}

const MAX_CHAMADAS = 9;

type AnnouncementSource = "polly" | "webspeech" | "failed";

async function tryWebSpeech(text: string): Promise<AnnouncementSource> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return "failed";
  }
  window.speechSynthesis.cancel();
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onend = () => resolve("webspeech");
    utterance.onerror = () => resolve("failed");
    window.speechSynthesis.speak(utterance);
  });
}

async function playPollyForPainel(
  text: string,
  clinicaId: string
): Promise<AnnouncementSource> {
  try {
    const res = await fetch("/api/public/text-to-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, clinicaId }),
    });

    if (res.ok) {
      const ct = res.headers.get("content-type");
      if (ct?.includes("audio")) {
        const blob = await res.blob();
        if (blob.size === 0) return tryWebSpeech(text);
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        try {
          await new Promise<void>((resolve, reject) => {
            audio.onended = () => {
              URL.revokeObjectURL(url);
              resolve();
            };
            audio.onerror = () => {
              URL.revokeObjectURL(url);
              reject(new Error("audio"));
            };
            void audio.play().then(undefined, reject);
          });
          return "polly";
        } catch {
          return tryWebSpeech(text);
        }
      }
    }
  } catch {
    // fallback
  }
  return tryWebSpeech(text);
}

function playBeep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const tone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.35, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + start + duration
      );
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    tone(880, 0, 0.14);
    tone(1100, 0.18, 0.14);
    tone(880, 0.36, 0.22);
  } catch {
    // AudioContext não disponível
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNome(nome: string) {
  const partes = nome.trim().split(/\s+/);
  if (partes.length <= 2) return nome;
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

// ─── Indicador de conexão ────────────────────────────────────────────────────

function StatusConexao({ connected }: { connected: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 text-base font-semibold ${
        connected ? "text-emerald-600" : "text-red-500"
      }`}
    >
      <span
        className={`inline-block w-2.5 h-2.5 rounded-full ${
          connected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
        }`}
      />
      {connected ? "Online" : "Offline"}
    </div>
  );
}

// ─── Card da chamada em destaque ─────────────────────────────────────────────

function CardDestaque({
  chamada,
  novo,
}: {
  chamada: ChamadaPainel;
  novo: boolean;
}) {
  const chamando = chamada.status === "CHAMANDO";

  return (
    <div
      className={`relative rounded-2xl bg-white border transition-all duration-700 overflow-hidden ${
        novo ? "scale-[1.01]" : "scale-100"
      }`}
      style={{
        borderColor: chamando ? "#bbf7d0" : "#bfdbfe",
        boxShadow: chamando
          ? "0 8px 40px rgba(16,185,129,0.18), 0 2px 8px rgba(16,185,129,0.1)"
          : "0 8px 40px rgba(59,130,246,0.18), 0 2px 8px rgba(59,130,246,0.1)",
        transition: "box-shadow 0.7s ease, transform 0.5s ease",
      }}
    >
      {/* Barra lateral colorida */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-2 rounded-l-2xl ${
          chamando ? "bg-emerald-400" : "bg-blue-500"
        }`}
      />

      {/* Faixa decorativa de fundo */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-64 opacity-[0.04] ${
          chamando ? "bg-emerald-500" : "bg-blue-500"
        }`}
        style={{
          background: chamando
            ? "radial-gradient(circle at 100% 50%, #10b981 0%, transparent 70%)"
            : "radial-gradient(circle at 100% 50%, #3b82f6 0%, transparent 70%)",
          opacity: 0.07,
        }}
      />

      <div className="pl-10 pr-8 py-8">
        {/* Badge de status */}
        <div
          className={`inline-flex items-center gap-2.5 px-5 py-2 rounded-full text-lg font-bold mb-6 ${
            chamando
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-blue-50 text-blue-700 border border-blue-200"
          }`}
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              chamando ? "bg-emerald-500 animate-ping" : "bg-blue-500"
            }`}
          />
          {chamando ? "CHAMANDO" : "EM ATENDIMENTO"}
        </div>

        <div className="flex items-end justify-between gap-8">
          <div className="flex-1 min-w-0">
            <p
              className="font-black text-slate-900 leading-none mb-4 truncate"
              style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)" }}
            >
              {formatNome(chamada.pacienteNome)}
            </p>
            <div
              className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-500"
              style={{ fontSize: "clamp(1.25rem, 2.2vw, 2rem)" }}
            >
              <span className="flex items-center gap-2">
                <DoctorIcon />
                {chamada.medicoNome}
              </span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-2">
                <RoomIcon />
                {chamada.sala}
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-slate-400 text-lg mb-1">Chamada às</p>
            <p
              className="font-mono font-bold text-slate-800 tabular-nums"
              style={{ fontSize: "clamp(1.75rem, 3vw, 3rem)" }}
            >
              {formatTime(chamada.horario)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Card secundário ──────────────────────────────────────────────────────────

function CardSecundario({ chamada }: { chamada: ChamadaPainel }) {
  const chamando = chamada.status === "CHAMANDO";

  return (
    <div
      className="rounded-xl bg-white border border-slate-100 shadow-sm transition-all duration-300 overflow-hidden"
      style={{
        boxShadow: chamando
          ? "0 2px 12px rgba(16,185,129,0.1)"
          : "0 2px 12px rgba(59,130,246,0.08)",
      }}
    >
      {/* Barra topo colorida fina */}
      <div
        className={`h-1 w-full ${chamando ? "bg-emerald-400" : "bg-blue-400"}`}
      />

      <div className="p-5">
        <div className="flex items-start justify-between mb-3 gap-2">
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 ${
              chamando
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-blue-50 text-blue-700 border border-blue-200"
            }`}
          >
            {chamando ? "CHAMANDO" : "EM ATENDIMENTO"}
          </span>
          <span className="font-mono text-slate-400 text-base tabular-nums">
            {formatTime(chamada.horario)}
          </span>
        </div>
        <p
          className="font-bold text-slate-800 leading-tight mb-2 truncate"
          style={{ fontSize: "clamp(1.25rem, 2vw, 1.875rem)" }}
        >
          {formatNome(chamada.pacienteNome)}
        </p>
        <div className="flex items-center gap-2 text-slate-400 text-sm truncate">
          <span className="truncate">{chamada.medicoNome}</span>
          <span className="text-slate-300 shrink-0">·</span>
          <span className="shrink-0">{chamada.sala}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Ícones inline ────────────────────────────────────────────────────────────

function DoctorIcon() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function RoomIcon() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function SoundOnIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function SoundOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

// ─── Estado vazio ─────────────────────────────────────────────────────────────

function AguardandoChamadas() {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/60"
      style={{ minHeight: "200px" }}
    >
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
        <p
          className="font-bold text-slate-300 mb-2"
          style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}
        >
          Aguardando chamadas...
        </p>
        <p className="text-slate-300 text-lg">
          As chamadas aparecerão aqui em tempo real
        </p>
      </div>
    </div>
  );
}

// ─── Conteúdo principal ───────────────────────────────────────────────────────

function PainelContent() {
  const searchParams = useSearchParams();
  const clinicaId = searchParams.get("clinicaId") ?? "";

  const [chamadas, setChamadas] = useState<ChamadaPainel[]>([]);
  const [connected, setConnected] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newCallId, setNewCallId] = useState<string | null>(null);
  const [clinica, setClinica] = useState<{ nome: string; logoUrl: string | null } | null>(null);

  const soundEnabledRef = useRef(true);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Dados da clínica (atualiza a cada 5 min para pegar mudanças de logo)
  useEffect(() => {
    if (!clinicaId) return;

    const fetchClinica = () =>
      fetch(`/api/public/clinica?clinicaId=${clinicaId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (data?.nome) setClinica(data); })
        .catch((e) => console.warn("[painel] erro ao buscar clínica:", e));

    fetchClinica();
    const id = setInterval(fetchClinica, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [clinicaId]);

  // Relógio
  useEffect(() => {
    const tick = () =>
      setCurrentTime(
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Socket.IO
  useEffect(() => {
    if (!clinicaId) return;

    const socket = io({
      path: "/api/socket",
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join-painel", { clinicaId });
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on(
      "chamadas-atuais",
      ({ chamadas: inicial }: { chamadas: ChamadaPainel[] }) => {
        setChamadas(inicial.slice(0, MAX_CHAMADAS));
      }
    );

    socket.on(
      "nova-chamada",
      ({ chamada, mensagem }: { chamada: ChamadaPainel; mensagem?: string }) => {
        if (soundEnabledRef.current) {
          playBeep();
          if (mensagem && clinicaId) {
            // Toca o anúncio Polly após o beep (delay para não sobrepor)
            setTimeout(() => {
              void playPollyForPainel(mensagem, clinicaId);
            }, 600);
          }
        }
        setNewCallId(chamada.id);
        setTimeout(() => setNewCallId(null), 3000);
        setChamadas((prev) => [chamada, ...prev].slice(0, MAX_CHAMADAS));
      }
    );

    socket.on(
      "atualizar-chamada",
      ({ chamada }: { chamada: ChamadaPainel }) => {
        setChamadas((prev) =>
          prev.map((c) => (c.id === chamada.id ? chamada : c))
        );
      }
    );

    return () => {
      socket.disconnect();
    };
  }, [clinicaId]);

  if (!clinicaId) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ background: "linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%)" }}
      >
        <div className="text-center px-8 bg-white rounded-2xl shadow-xl p-12 border border-slate-100">
          <p className="text-3xl font-bold text-red-500 mb-4">
            Parâmetro{" "}
            <code className="bg-slate-100 px-2 py-1 rounded text-slate-700">
              clinicaId
            </code>{" "}
            não informado
          </p>
          <p className="text-xl text-slate-500">
            Acesse:{" "}
            <span className="text-blue-600 font-mono">
              /painel-chamadas?clinicaId=SEU_ID
            </span>
          </p>
        </div>
      </div>
    );
  }

  const featured = chamadas[0] ?? null;
  const rest = chamadas.slice(1);

  return (
    <div
      className="flex flex-col h-screen overflow-hidden select-none"
      style={{
        background:
          "linear-gradient(160deg, #f0f4ff 0%, #eef2ff 50%, #f5f8ff 100%)",
      }}
    >
      {/* ── Header ── */}
      <header
        className="flex items-center justify-between px-10 border-b border-slate-200/80 shrink-0"
        style={{
          height: "120px",
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: "0 1px 24px rgba(99,102,241,0.06)",
        }}
      >
        {/* Logo e nome da clínica */}
        <div className="flex items-center gap-3 min-w-0">
          {clinica?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={clinica.logoUrl}
              alt={clinica.nome ?? "Logo"}
              className="rounded-xl object-contain shrink-0"
              style={{ height: "72px", width: "auto", maxWidth: "180px" }}
              onError={(e) => {
                // Se a imagem falhar, esconde e mostra o fallback
                (e.currentTarget as HTMLImageElement).style.display = "none";
                const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = "flex";
              }}
            />
          ) : null}
          <div
            className="w-16 h-16 rounded-xl items-center justify-center text-white font-black text-2xl shrink-0"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
              boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
              display: clinica?.logoUrl ? "none" : "flex",
            }}
          >
            {clinica?.nome?.[0]?.toUpperCase() ?? "C"}
          </div>
          <span
            className="font-black text-slate-800 tracking-tight truncate"
            style={{ fontSize: "clamp(1.5rem, 2.4vw, 2.2rem)" }}
          >
            {clinica?.nome ?? ""}
          </span>
        </div>

        {/* Título */}
        <h1
          className="font-bold text-slate-700 tracking-widest uppercase"
          style={{
            fontSize: "clamp(1.4rem, 2.2vw, 2rem)",
            letterSpacing: "0.2em",
          }}
        >
          Painel de Chamadas
        </h1>

        {/* Direita */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setSoundEnabled((s) => !s)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all text-base"
            title={soundEnabled ? "Desativar som" : "Ativar som"}
          >
            {soundEnabled ? <SoundOnIcon /> : <SoundOffIcon />}
            <span className="text-sm font-medium">
              {soundEnabled ? "Som ativo" : "Mudo"}
            </span>
          </button>

          <div
            className="font-mono font-bold text-slate-800 tabular-nums"
            style={{ fontSize: "clamp(1.8rem, 2.8vw, 2.6rem)" }}
          >
            {currentTime}
          </div>

          <StatusConexao connected={connected} />
        </div>
      </header>

      {/* ── Conteúdo ── */}
      <main className="flex-1 flex flex-col gap-5 p-8 overflow-hidden">
        {/* Chamada em destaque */}
        {featured ? (
          <CardDestaque chamada={featured} novo={newCallId === featured.id} />
        ) : (
          <AguardandoChamadas />
        )}

        {/* Chamadas anteriores */}
        {rest.length > 0 && (
          <>
            <div className="flex items-center gap-4 shrink-0">
              <div className="h-px flex-1 bg-slate-200" />
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">
                Chamadas anteriores
              </p>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div
              className="grid gap-4 overflow-hidden"
              style={{
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(380px, 1fr))",
              }}
            >
              {rest.map((chamada) => (
                <CardSecundario key={chamada.id} chamada={chamada} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ─── Export com Suspense ──────────────────────────────────────────────────────

export default function PainelChamadasPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center h-screen"
          style={{
            background: "linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%)",
          }}
        >
          <p className="text-3xl font-bold text-slate-300">
            Carregando painel...
          </p>
        </div>
      }
    >
      <PainelContent />
    </Suspense>
  );
}
