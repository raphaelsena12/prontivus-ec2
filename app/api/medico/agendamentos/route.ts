import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";

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

  if (session.user.tipo !== TipoUsuario.MEDICO) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado. Apenas médicos podem acessar esta rota." },
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

  // Buscar o médico pelo usuarioId
  const medico = await prisma.medico.findFirst({
    where: {
      usuarioId: session.user.id,
      clinicaId: clinicaId,
    },
  });

  if (!medico) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Médico não encontrado" },
        { status: 404 }
      ),
    };
  }

  return { authorized: true, clinicaId, medicoId: medico.id };
}

// GET /api/medico/agendamentos
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const date = searchParams.get("date");

    const where: any = {
      clinicaId: auth.clinicaId,
      medicoId: auth.medicoId,
      ...(search && {
        OR: [
          { paciente: { nome: { contains: search, mode: "insensitive" as const } } },
        ],
      }),
      ...(date && {
        dataHora: {
          gte: new Date(date + "T00:00:00"),
          lt: new Date(date + "T23:59:59"),
        },
      }),
    };

    const agendamentos = await prisma.consulta.findMany({
      where,
      select: {
        id: true,
        dataHora: true,
        status: true,
        valorCobrado: true,
        paciente: {
          select: {
            id: true,
            nome: true,
            cpf: true,
            telefone: true,
            celular: true,
          },
        },
        codigoTuss: {
          select: {
            codigoTuss: true,
            descricao: true,
          },
        },
        tipoConsulta: {
          select: {
            nome: true,
          },
        },
        operadora: {
          select: {
            nomeFantasia: true,
            razaoSocial: true,
          },
        },
        planoSaude: {
          select: {
            nome: true,
          },
        },
      },
      orderBy: { dataHora: "asc" },
    });

    return NextResponse.json({ agendamentos });
  } catch (error) {
    console.error("Erro ao listar agendamentos:", error);
    return NextResponse.json(
      { error: "Erro ao listar agendamentos" },
      { status: 500 }
    );
  }
}

