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

  // Buscar o médico associado ao usuário
  const medico = await prisma.medico.findFirst({
    where: {
      usuarioId: session.user.id,
      clinicaId,
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

// GET /api/medico/aprovacoes - Listar agendamentos pendentes de aprovação
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const agendamentos = await prisma.consulta.findMany({
      where: {
        clinicaId: auth.clinicaId,
        medicoId: auth.medicoId,
        status: "AGUARDANDO_APROVACAO",
      },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
            cpf: true,
            telefone: true,
            celular: true,
          },
        },
        medico: {
          include: {
            usuario: {
              select: {
                nome: true,
              },
            },
          },
        },
        codigoTuss: {
          select: {
            codigoTuss: true,
            descricao: true,
          },
        },
        tipoConsulta: true,
        operadora: true,
        planoSaude: true,
      },
      orderBy: {
        dataHora: "asc",
      },
    });

    return NextResponse.json({ agendamentos });
  } catch (error: any) {
    console.error("Erro ao listar aprovações:", error);
    return NextResponse.json(
      { error: "Erro ao listar aprovações", details: error?.message || "Erro desconhecido" },
      { status: 500 }
    );
  }
}
