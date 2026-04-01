import { NextRequest, NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

// Mapeia número do dia JS (0=Dom) para os nomes usados no campo diasSemana
const DIA_JS_PARA_NOME: Record<number, string> = {
  0: "DOM",
  1: "SEG",
  2: "TER",
  3: "QUA",
  4: "QUI",
  5: "SEX",
  6: "SAB",
};

function dentroDoHorario(horaInicio: string, horaFim: string, agora: Date): boolean {
  const [hIni, mIni] = horaInicio.split(":").map(Number);
  const [hFim, mFim] = horaFim.split(":").map(Number);
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const minutosIni = hIni * 60 + mIni;
  const minutosFim = hFim * 60 + mFim;
  return minutosAgora >= minutosIni && minutosAgora <= minutosFim;
}

// POST /api/medico/telemedicina/status
// Body: { status: "ONLINE" | "OFFLINE" }
export async function POST(request: NextRequest) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const { status } = body;

    if (!["ONLINE", "OFFLINE"].includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    // Garante que a config existe antes de mudar status
    const existing = await prisma.medicoTelemedicina.findUnique({
      where: { medicoId: auth.medicoId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Configure sua disponibilidade antes de ficar online" },
        { status: 400 }
      );
    }

    // Item 4: Validar horário e dia da semana ao tentar ficar ONLINE
    if (status === "ONLINE" && !existing.inicioImediato) {
      const agora = new Date();
      const diaAtual = DIA_JS_PARA_NOME[agora.getDay()];
      const diasPermitidos: string[] = Array.isArray(existing.diasSemana) ? existing.diasSemana as string[] : [];

      if (diasPermitidos.length > 0 && !diasPermitidos.includes(diaAtual)) {
        const nomesDias = diasPermitidos.join(", ");
        return NextResponse.json(
          { error: `Você só pode ficar online nos dias configurados: ${nomesDias}. Hoje é ${diaAtual}.` },
          { status: 400 }
        );
      }

      if (existing.horaInicio && existing.horaFim) {
        if (!dentroDoHorario(existing.horaInicio, existing.horaFim, agora)) {
          return NextResponse.json(
            { error: `Fora do horário configurado (${existing.horaInicio} – ${existing.horaFim}). Ajuste a configuração ou aguarde o horário.` },
            { status: 400 }
          );
        }
      }
    }

    const updated = await prisma.medicoTelemedicina.update({
      where: { medicoId: auth.medicoId },
      data: {
        status,
        onlineSince: status === "ONLINE" ? new Date() : null,
      },
    });

    return NextResponse.json({ config: updated });
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
