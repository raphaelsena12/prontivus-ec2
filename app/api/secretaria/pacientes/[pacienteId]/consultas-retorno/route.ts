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

// GET /api/secretaria/pacientes/[pacienteId]/consultas-retorno
// Verifica se há consultas do tipo Retorno nos últimos 30 dias
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
    const { searchParams } = new URL(request.url);
    const excludeConsultaId = searchParams.get("excludeConsultaId");
    const medicoId = searchParams.get("medicoId");

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
      // Se não houver tipo "Retorno" cadastrado, retornar que não há consultas
      return NextResponse.json({
        temRetorno: false,
        consultas: [],
      });
    }

    console.log(`[CONSULTAS-RETORNO] Buscando TODOS os retornos agendados para paciente ${pacienteId}`);
    console.log(`[CONSULTAS-RETORNO] Data atual: ${new Date().toISOString()}`);

    // Buscar TODAS as consultas do tipo Retorno agendadas (passadas e futuras)
    // IMPORTANTE: Verificar todos os retornos do paciente, independente do médico
    // A regra é: paciente com mais de um retorno agendado (qualquer data, passado ou futuro)
    const where: any = {
      pacienteId,
      clinicaId: auth.clinicaId,
      tipoConsultaId: tipoRetorno.id,
      // Não filtrar por data - buscar todos os retornos agendados
      status: {
        not: "CANCELADA",
      },
    };

    // NÃO filtrar por médico - a regra é verificar TODOS os retornos do paciente
    // independente do médico, pois o alerta é sobre o paciente ter muitos retornos
    // O parâmetro medicoId é ignorado para esta verificação

    // Excluir consulta específica se fornecida (útil ao editar agendamento)
    if (excludeConsultaId) {
      where.id = {
        not: excludeConsultaId,
      };
    }

    const consultas = await prisma.consulta.findMany({
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
      orderBy: {
        dataHora: "desc",
      },
    });

    console.log(`[CONSULTAS-RETORNO] Encontradas ${consultas.length} consulta(s) de retorno no período`);
    consultas.forEach((c, idx) => {
      console.log(`[CONSULTAS-RETORNO] Retorno ${idx + 1}: ID=${c.id}, Data=${c.dataHora.toISOString()}, Médico=${c.medico.usuario.nome}, Status=${c.status}`);
    });

    // Retornar temRetorno = true apenas quando há mais de 1 retorno (não apenas 1)
    const temRetorno = consultas.length > 1;
    console.log(`[CONSULTAS-RETORNO] temRetorno = ${temRetorno} (${consultas.length} > 1)`);

    return NextResponse.json({
      temRetorno,
      consultas: consultas.map((consulta) => ({
        id: consulta.id,
        dataHora: consulta.dataHora,
        medico: consulta.medico.usuario.nome,
      })),
    });
  } catch (error) {
    console.error("Erro ao verificar consultas de retorno:", error);
    return NextResponse.json(
      { error: "Erro ao verificar consultas de retorno" },
      { status: 500 }
    );
  }
}
