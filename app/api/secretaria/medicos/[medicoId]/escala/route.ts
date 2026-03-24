import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const escalaItemSchema = z.object({
  diaSemana: z.number().int().min(0).max(6),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
  horaFim: z.string().regex(/^\d{2}:\d{2}$/),
});

const excecaoItemSchema = z.object({
  data: z.string().min(10),
  ativo: z.boolean(),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  horaFim: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  observacoes: z.string().optional().nullable(),
});

const atualizarEscalaSchema = z.object({
  escalas: z.array(escalaItemSchema),
  excecoes: z.array(excecaoItemSchema).optional().default([]),
});

async function checkAuthorization() {
  const session = await getSession();
  if (!session) {
    return { authorized: false, response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  }

  if (session.user.tipo !== TipoUsuario.SECRETARIA && session.user.tipo !== TipoUsuario.ADMIN_CLINICA) {
    return { authorized: false, response: NextResponse.json({ error: "Acesso negado" }, { status: 403 }) };
  }

  const clinicaId = await getUserClinicaId();
  if (!clinicaId) {
    return { authorized: false, response: NextResponse.json({ error: "Clínica não encontrada" }, { status: 404 }) };
  }

  return { authorized: true, clinicaId };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ medicoId: string }> }) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { medicoId } = await params;
    const { searchParams } = new URL(request.url);
    const dataInicio = searchParams.get("dataInicio");
    const dataFim = searchParams.get("dataFim");

    const medico = await prisma.medico.findFirst({
      where: { id: medicoId, clinicaId: auth.clinicaId, ativo: true },
      select: { id: true },
    });
    if (!medico) {
      return NextResponse.json({ error: "Médico não encontrado" }, { status: 404 });
    }

    const escalas = await prisma.medicoEscalaAgenda.findMany({
      where: { clinicaId: auth.clinicaId, medicoId, ativo: true },
      orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
    });

    const excecoes = await prisma.medicoEscalaAgendaExcecao.findMany({
      where: {
        clinicaId: auth.clinicaId,
        medicoId,
        ...(dataInicio && dataFim
          ? {
              data: {
                gte: new Date(`${dataInicio}T00:00:00-03:00`),
                lte: new Date(`${dataFim}T23:59:59-03:00`),
              },
            }
          : {}),
      },
      orderBy: [{ data: "asc" }, { horaInicio: "asc" }],
    });

    return NextResponse.json({ escalas, excecoes });
  } catch (error) {
    console.error("Erro ao buscar escala do médico:", error);
    return NextResponse.json({ error: "Erro ao buscar escala do médico" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ medicoId: string }> }) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { medicoId } = await params;
    const body = await request.json();
    const validation = atualizarEscalaSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Dados inválidos", details: validation.error.issues }, { status: 400 });
    }

    const medico = await prisma.medico.findFirst({
      where: { id: medicoId, clinicaId: auth.clinicaId, ativo: true },
      select: { id: true },
    });
    if (!medico) {
      return NextResponse.json({ error: "Médico não encontrado" }, { status: 404 });
    }

    const { escalas, excecoes } = validation.data;
    await prisma.$transaction(async (tx) => {
      await tx.medicoEscalaAgenda.deleteMany({
        where: { clinicaId: auth.clinicaId, medicoId },
      });

      if (escalas.length > 0) {
        await tx.medicoEscalaAgenda.createMany({
          data: escalas.map((item) => ({
            clinicaId: auth.clinicaId!,
            medicoId,
            diaSemana: item.diaSemana,
            horaInicio: item.horaInicio,
            horaFim: item.horaFim,
            ativo: true,
          })),
        });
      }

      await tx.medicoEscalaAgendaExcecao.deleteMany({
        where: { clinicaId: auth.clinicaId, medicoId },
      });
      if (excecoes.length > 0) {
        await tx.medicoEscalaAgendaExcecao.createMany({
          data: excecoes.map((item) => ({
            clinicaId: auth.clinicaId!,
            medicoId,
            data: new Date(`${item.data}T00:00:00-03:00`),
            ativo: item.ativo,
            horaInicio: item.horaInicio ?? null,
            horaFim: item.horaFim ?? null,
            observacoes: item.observacoes ?? null,
          })),
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao salvar escala do médico:", error);
    return NextResponse.json({ error: "Erro ao salvar escala do médico" }, { status: 500 });
  }
}
