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

// GET /api/medico/paciente/[pacienteId]/consultas - Buscar histórico de consultas do paciente
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pacienteId: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { pacienteId } = await params;

    // Buscar consultas do paciente
    const consultas = await prisma.consulta.findMany({
      where: {
        pacienteId,
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
        tipoConsulta: {
          select: {
            nome: true,
          },
        },
        prontuarios: {
          select: {
            id: true,
            diagnostico: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        dataHora: "desc",
      },
    });

    return NextResponse.json({ consultas }, { status: 200 });
  } catch (error) {
    console.error("Erro ao buscar histórico de consultas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar histórico de consultas" },
      { status: 500 }
    );
  }
}










