import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const bloqueioUpdateSchema = z.object({
  dataInicio: z.string().min(1, "Data inicio e obrigatoria"),
  horaInicio: z.string().min(1, "Horario inicio e obrigatorio").refine(
    (val) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val),
    "Horario inicio invalido (formato: HH:mm)"
  ),
  dataFim: z.string().min(1, "Data fim e obrigatoria"),
  horaFim: z.string().min(1, "Horario fim e obrigatorio").refine(
    (val) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val),
    "Horario fim invalido (formato: HH:mm)"
  ),
  observacoes: z.string().optional(),
});

async function checkAuthorization() {
  const session = await getSession();

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Nao autenticado" },
        { status: 401 }
      ),
    };
  }

  if (session.user.tipo !== TipoUsuario.SECRETARIA && session.user.tipo !== TipoUsuario.ADMIN_CLINICA) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      ),
    };
  }

  const clinicaId = await getUserClinicaId();
  if (!clinicaId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Clinica nao encontrada" },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, clinicaId };
}

// GET /api/secretaria/bloqueios-agenda/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    const bloqueio = await prisma.bloqueioAgenda.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId,
      },
      include: {
        medico: {
          include: {
            usuario: {
              select: {
                nome: true,
              },
            },
          },
        },
      },
    });

    if (!bloqueio) {
      return NextResponse.json(
        { error: "Bloqueio nao encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ bloqueio });
  } catch (error) {
    console.error("Erro ao buscar bloqueio:", error);
    return NextResponse.json(
      { error: "Erro ao buscar bloqueio" },
      { status: 500 }
    );
  }
}

// PUT /api/secretaria/bloqueios-agenda/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    const bloqueioExistente = await prisma.bloqueioAgenda.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId,
      },
    });

    if (!bloqueioExistente) {
      return NextResponse.json(
        { error: "Bloqueio nao encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = bloqueioUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    const dataHoraInicio = new Date(`${data.dataInicio}T${data.horaInicio}:00`);
    const dataHoraFim = new Date(`${data.dataFim}T${data.horaFim}:00`);

    if (dataHoraFim <= dataHoraInicio) {
      return NextResponse.json(
        { error: "Data/hora fim deve ser posterior a data/hora inicio" },
        { status: 400 }
      );
    }

    // Verificar se ja existe consulta agendada no periodo
    const consultasExistentes = await prisma.consulta.findMany({
      where: {
        clinicaId: auth.clinicaId,
        medicoId: bloqueioExistente.medicoId,
        dataHora: {
          gte: dataHoraInicio,
          lt: dataHoraFim,
        },
        status: {
          notIn: ["CANCELADA"],
        },
      },
    });

    if (consultasExistentes.length > 0) {
      return NextResponse.json(
        {
          error: "Existem consultas agendadas neste periodo. Cancele-as antes de atualizar o bloqueio.",
        },
        { status: 400 }
      );
    }

    const bloqueio = await prisma.bloqueioAgenda.update({
      where: { id },
      data: {
        dataInicio: dataHoraInicio,
        horaInicio: data.horaInicio,
        dataFim: dataHoraFim,
        horaFim: data.horaFim,
        observacoes: data.observacoes || null,
      },
      include: {
        medico: {
          include: {
            usuario: {
              select: {
                nome: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ bloqueio });
  } catch (error) {
    console.error("Erro ao atualizar bloqueio:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar bloqueio" },
      { status: 500 }
    );
  }
}

// DELETE /api/secretaria/bloqueios-agenda/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    const bloqueio = await prisma.bloqueioAgenda.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId,
      },
    });

    if (!bloqueio) {
      return NextResponse.json(
        { error: "Bloqueio nao encontrado" },
        { status: 404 }
      );
    }

    await prisma.bloqueioAgenda.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Bloqueio removido com sucesso" });
  } catch (error) {
    console.error("Erro ao remover bloqueio:", error);
    return NextResponse.json(
      { error: "Erro ao remover bloqueio" },
      { status: 500 }
    );
  }
}
