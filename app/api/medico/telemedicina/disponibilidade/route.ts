import { NextRequest, NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

// GET /api/medico/telemedicina/disponibilidade
export async function GET() {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) return auth.response;
    if (!auth.medicoId) {
      return NextResponse.json(
        { error: "Médico não identificado" },
        { status: 403 }
      );
    }

    const config = await prisma.medicoTelemedicina.findUnique({
      where: { medicoId: auth.medicoId },
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Erro ao buscar disponibilidade:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PUT /api/medico/telemedicina/disponibilidade
export async function PUT(request: NextRequest) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) return auth.response;
    if (!auth.medicoId || !auth.clinicaId) {
      return NextResponse.json(
        { error: "Médico ou clínica não identificados" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      inicioImediato,
      horaInicio,
      horaFim,
      diasSemana,
      valorConsulta,
      tempoConsultaMin,
      bio,
      tags,
      fotoUrl,
    } = body;

    const config = await prisma.medicoTelemedicina.upsert({
      where: { medicoId: auth.medicoId },
      update: {
        inicioImediato: inicioImediato ?? true,
        horaInicio: inicioImediato ? null : (horaInicio ?? null),
        horaFim: inicioImediato ? null : (horaFim ?? null),
        diasSemana: diasSemana ?? ["SEG", "TER", "QUA", "QUI", "SEX"],
        valorConsulta: valorConsulta ?? 0,
        tempoConsultaMin: tempoConsultaMin ?? 30,
        bio: bio ?? null,
        tags: tags ?? [],
        fotoUrl: fotoUrl ?? null,
      },
      create: {
        medicoId: auth.medicoId,
        clinicaId: auth.clinicaId,
        inicioImediato: inicioImediato ?? true,
        horaInicio: inicioImediato ? null : (horaInicio ?? null),
        horaFim: inicioImediato ? null : (horaFim ?? null),
        diasSemana: diasSemana ?? ["SEG", "TER", "QUA", "QUI", "SEX"],
        valorConsulta: valorConsulta ?? 0,
        tempoConsultaMin: tempoConsultaMin ?? 30,
        bio: bio ?? null,
        tags: tags ?? [],
        fotoUrl: fotoUrl ?? null,
        status: "OFFLINE",
      },
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Erro ao salvar disponibilidade:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
