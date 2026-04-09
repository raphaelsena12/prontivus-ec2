import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const criarExcecaoSchema = z.object({
  medicoId: z.string().uuid(),
  data: z.string().min(10),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
  horaFim: z.string().regex(/^\d{2}:\d{2}$/),
  observacoes: z.string().optional().nullable(),
});

async function checkAuthorization() {
  const session = await getSession();
  if (!session) {
    return { authorized: false as const, response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  }

  if (session.user.tipo !== TipoUsuario.SECRETARIA && session.user.tipo !== TipoUsuario.ADMIN_CLINICA) {
    return { authorized: false as const, response: NextResponse.json({ error: "Acesso negado" }, { status: 403 }) };
  }

  const clinicaId = await getUserClinicaId();
  if (!clinicaId) {
    return { authorized: false as const, response: NextResponse.json({ error: "Clínica não encontrada" }, { status: 404 }) };
  }

  return { authorized: true as const, clinicaId };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const medicoId = searchParams.get("medicoId");

    if (!medicoId) {
      return NextResponse.json({ error: "medicoId é obrigatório" }, { status: 400 });
    }

    const excecoes = await prisma.medicoEscalaAgendaExcecao.findMany({
      where: {
        clinicaId: auth.clinicaId,
        medicoId,
        ativo: true,
        data: { gte: new Date() },
      },
      orderBy: { data: "asc" },
    });

    return NextResponse.json({ excecoes });
  } catch (error) {
    console.error("Erro ao buscar exceções:", error);
    return NextResponse.json({ error: "Erro ao buscar exceções" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const validation = criarExcecaoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Dados inválidos", details: validation.error.issues }, { status: 400 });
    }

    const { medicoId, data, horaInicio, horaFim, observacoes } = validation.data;

    const medico = await prisma.medico.findFirst({
      where: { id: medicoId, clinicaId: auth.clinicaId, ativo: true },
      select: { id: true },
    });
    if (!medico) {
      return NextResponse.json({ error: "Médico não encontrado" }, { status: 404 });
    }

    // Verificar se já existe exceção para essa data
    const existente = await prisma.medicoEscalaAgendaExcecao.findFirst({
      where: {
        clinicaId: auth.clinicaId,
        medicoId,
        data: new Date(`${data}T00:00:00-03:00`),
      },
    });
    if (existente) {
      return NextResponse.json({ error: "Já existe um horário extra cadastrado para essa data" }, { status: 409 });
    }

    const excecao = await prisma.medicoEscalaAgendaExcecao.create({
      data: {
        clinicaId: auth.clinicaId,
        medicoId,
        data: new Date(`${data}T00:00:00-03:00`),
        horaInicio,
        horaFim,
        ativo: true,
        observacoes: observacoes ?? null,
      },
    });

    return NextResponse.json({ excecao }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar exceção:", error);
    return NextResponse.json({ error: "Erro ao criar exceção" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
    }

    const excecao = await prisma.medicoEscalaAgendaExcecao.findFirst({
      where: { id, clinicaId: auth.clinicaId },
    });
    if (!excecao) {
      return NextResponse.json({ error: "Exceção não encontrada" }, { status: 404 });
    }

    await prisma.medicoEscalaAgendaExcecao.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir exceção:", error);
    return NextResponse.json({ error: "Erro ao excluir exceção" }, { status: 500 });
  }
}
