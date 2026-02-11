import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const bloqueioAgendaSchema = z.object({
  medicoId: z.string().uuid("Médico é obrigatório"),
  dataInicio: z.string().min(1, "Data início é obrigatória"),
  horaInicio: z.string().min(1, "Horário início é obrigatório").refine(
    (val) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val),
    "Horário início inválido (formato: HH:mm)"
  ),
  dataFim: z.string().min(1, "Data fim é obrigatória"),
  horaFim: z.string().min(1, "Horário fim é obrigatório").refine(
    (val) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val),
    "Horário fim inválido (formato: HH:mm)"
  ),
  observacoes: z.string().optional(),
});

async function checkAuthorization() {
  const session = await getSession();

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Não autenticado" },
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
        { error: "Clínica não encontrada" },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, clinicaId };
}

// POST /api/secretaria/bloqueios-agenda
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const validation = bloqueioAgendaSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verificar se médico pertence à clínica
    const medico = await prisma.medico.findFirst({
      where: {
        id: data.medicoId,
        clinicaId: auth.clinicaId,
      },
    });

    if (!medico) {
      return NextResponse.json(
        { error: "Médico não encontrado" },
        { status: 404 }
      );
    }

    // Combinar data e hora para criar DateTime
    const dataHoraInicio = new Date(`${data.dataInicio}T${data.horaInicio}:00`);
    const dataHoraFim = new Date(`${data.dataFim}T${data.horaFim}:00`);

    // Validar que data fim é posterior à data início
    if (dataHoraFim <= dataHoraInicio) {
      return NextResponse.json(
        { error: "Data/hora fim deve ser posterior à data/hora início" },
        { status: 400 }
      );
    }

    // Verificar se já existe consulta agendada no período
    const consultasExistentes = await prisma.consulta.findMany({
      where: {
        clinicaId: auth.clinicaId,
        medicoId: data.medicoId,
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
          error: "Existem consultas agendadas neste período. Cancele-as antes de criar o bloqueio.",
          consultas: consultasExistentes.map(c => ({
            id: c.id,
            dataHora: c.dataHora,
          })),
        },
        { status: 400 }
      );
    }

    // Criar bloqueio de agenda
    if (!auth.clinicaId) {
      return NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 404 }
      );
    }

    const bloqueio = await prisma.bloqueioAgenda.create({
      data: {
        clinicaId: auth.clinicaId,
        medicoId: data.medicoId,
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

    return NextResponse.json({ bloqueio }, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar bloqueio de agenda:", error);
    
    // Se o erro for relacionado à tabela não existir
    if (error?.code === "P2021" || error?.code === "42P01") {
      return NextResponse.json(
        { 
          error: "Tabela de bloqueios não encontrada. Execute a migration do banco de dados.",
          details: error.message 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error?.message || "Erro ao criar bloqueio de agenda",
        details: error?.code || "Erro desconhecido"
      },
      { status: 500 }
    );
  }
}

// GET /api/secretaria/bloqueios-agenda
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const medicoId = searchParams.get("medicoId");
    const data = searchParams.get("data");
    const dataInicio = searchParams.get("dataInicio");
    const dataFim = searchParams.get("dataFim");

    const where: any = {
      clinicaId: auth.clinicaId,
      ...(medicoId && { medicoId }),
    };

    // Se fornecido dataInicio e dataFim, buscar bloqueios que se sobrepõem com esse período
    if (dataInicio && dataFim) {
      where.OR = [
        {
          // Bloqueio que começa dentro do período
          AND: [
            { dataInicio: { gte: new Date(dataInicio + "T00:00:00") } },
            { dataInicio: { lte: new Date(dataFim + "T23:59:59") } },
          ],
        },
        {
          // Bloqueio que termina dentro do período
          AND: [
            { dataFim: { gte: new Date(dataInicio + "T00:00:00") } },
            { dataFim: { lte: new Date(dataFim + "T23:59:59") } },
          ],
        },
        {
          // Bloqueio que contém completamente o período
          AND: [
            { dataInicio: { lte: new Date(dataInicio + "T00:00:00") } },
            { dataFim: { gte: new Date(dataFim + "T23:59:59") } },
          ],
        },
      ];
    } else if (data) {
      // Fallback para busca por data única (compatibilidade)
      where.OR = [
        {
          dataInicio: {
            gte: new Date(data + "T00:00:00"),
            lt: new Date(data + "T23:59:59"),
          },
        },
        {
          dataFim: {
            gte: new Date(data + "T00:00:00"),
            lt: new Date(data + "T23:59:59"),
          },
        },
      ];
    }

    const bloqueios = await prisma.bloqueioAgenda.findMany({
      where,
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
      orderBy: { dataInicio: "asc" },
    });

    return NextResponse.json({ bloqueios });
  } catch (error) {
    console.error("Erro ao listar bloqueios de agenda:", error);
    return NextResponse.json(
      { error: "Erro ao listar bloqueios de agenda" },
      { status: 500 }
    );
  }
}
