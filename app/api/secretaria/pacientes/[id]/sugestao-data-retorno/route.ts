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

// GET /api/secretaria/pacientes/[id]/sugestao-data-retorno?medicoId=xxx
// Busca a última consulta de retorno nos últimos 30 dias e sugere data após 30 dias
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id: pacienteId } = await params;
    const { searchParams } = new URL(request.url);
    const medicoId = searchParams.get("medicoId");

    if (!medicoId) {
      return NextResponse.json({
        temRetorno30Dias: false,
        dataSugerida: null,
        ultimaConsulta: null,
      });
    }

    // Verificar se o paciente pertence à clínica
    const paciente = await prisma.paciente.findFirst({
      where: {
        id: pacienteId,
        clinicaId: auth.clinicaId,
      },
    });

    if (!paciente) {
      return NextResponse.json(
        { error: "Paciente não encontrado" },
        { status: 404 }
      );
    }

    // Buscar o tipo de consulta "Retorno"
    const tipoRetorno = await prisma.tipoConsulta.findFirst({
      where: {
        codigo: "RETORNO",
        ativo: true,
      },
    });

    if (!tipoRetorno) {
      return NextResponse.json({
        temRetorno30Dias: false,
        dataSugerida: null,
        ultimaConsulta: null,
      });
    }

    // Calcular data de 30 dias atrás
    const hoje = new Date();
    const trintaDiasAtras = new Date(hoje);
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

    // Buscar a última consulta de retorno nos últimos 30 dias com o mesmo médico
    const ultimaConsulta = await prisma.consulta.findFirst({
      where: {
        pacienteId,
        medicoId,
        clinicaId: auth.clinicaId,
        tipoConsultaId: tipoRetorno.id,
        dataHora: {
          gte: trintaDiasAtras,
          lte: hoje,
        },
        status: {
          not: "CANCELADA",
        },
      },
      orderBy: {
        dataHora: "desc",
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

    if (!ultimaConsulta) {
      return NextResponse.json({
        temRetorno30Dias: false,
        dataSugerida: null,
        ultimaConsulta: null,
      });
    }

    // Calcular data sugerida: 30 dias após a última consulta
    const dataUltimaConsulta = new Date(ultimaConsulta.dataHora);
    const dataSugerida = new Date(dataUltimaConsulta);
    dataSugerida.setDate(dataSugerida.getDate() + 30);

    // Se a data sugerida for no passado, usar a data de hoje + 30 dias
    if (dataSugerida < hoje) {
      dataSugerida.setTime(hoje.getTime());
      dataSugerida.setDate(dataSugerida.getDate() + 30);
    }

    return NextResponse.json({
      temRetorno30Dias: true,
      dataSugerida: dataSugerida.toISOString().split('T')[0], // Retornar apenas a data (YYYY-MM-DD)
      ultimaConsulta: {
        id: ultimaConsulta.id,
        dataHora: ultimaConsulta.dataHora,
        medico: ultimaConsulta.medico.usuario.nome,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar sugestão de data de retorno:", error);
    return NextResponse.json(
      { error: "Erro ao buscar sugestão de data de retorno" },
      { status: 500 }
    );
  }
}
