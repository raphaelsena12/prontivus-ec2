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

// GET /api/secretaria/medicos/[medicoId]/limite-retornos?data=2024-02-06
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ medicoId: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { medicoId } = await params;
    const { searchParams } = new URL(request.url);
    const dataStr = searchParams.get("data");

    if (!dataStr) {
      return NextResponse.json(
        { error: "Data é obrigatória" },
        { status: 400 }
      );
    }

    // Buscar médico e verificar se pertence à clínica
    const medico = await prisma.medico.findFirst({
      where: {
        id: medicoId,
        clinicaId: auth.clinicaId,
        ativo: true,
      },
      select: {
        id: true,
        limiteMaximoRetornosPorDia: true,
      },
    });

    if (!medico) {
      return NextResponse.json(
        { error: "Médico não encontrado" },
        { status: 404 }
      );
    }

    // Se não tiver limite configurado, retornar que não há limite
    if (medico.limiteMaximoRetornosPorDia === null || medico.limiteMaximoRetornosPorDia === undefined) {
      return NextResponse.json({
        limiteMaximoRetornosPorDia: null,
        retornosNoDia: 0,
        limiteAtingido: false,
        mensagem: null,
      });
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
        limiteMaximoRetornosPorDia: medico.limiteMaximoRetornosPorDia,
        retornosNoDia: 0,
        limiteAtingido: false,
        mensagem: null,
      });
    }

    // Calcular início e fim do dia usando UTC para evitar problemas de timezone
    // A data vem no formato YYYY-MM-DD
    const dataParts = dataStr.split('-');
    if (dataParts.length !== 3) {
      return NextResponse.json(
        { error: "Formato de data inválido. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const ano = parseInt(dataParts[0], 10);
    const mes = parseInt(dataParts[1], 10);
    const dia = parseInt(dataParts[2], 10);

    // Criar datas no início e fim do dia em UTC
    // Isso garante que a comparação seja consistente independente do timezone do servidor
    const inicioDia = new Date(Date.UTC(ano, mes - 1, dia, 0, 0, 0, 0));
    const fimDia = new Date(Date.UTC(ano, mes - 1, dia, 23, 59, 59, 999));

    console.log(`[LIMITE-RETORNOS] Buscando retornos para médico ${medicoId}, clínica ${auth.clinicaId}`);
    console.log(`[LIMITE-RETORNOS] Data recebida: ${dataStr}`);
    console.log(`[LIMITE-RETORNOS] Início do dia (UTC): ${inicioDia.toISOString()}`);
    console.log(`[LIMITE-RETORNOS] Fim do dia (UTC): ${fimDia.toISOString()}`);
    console.log(`[LIMITE-RETORNOS] Tipo Retorno ID: ${tipoRetorno.id}`);

    // Primeiro, buscar todas as consultas do médico no dia para debug
    const todasConsultas = await prisma.consulta.findMany({
      where: {
        medicoId: medicoId,
        clinicaId: auth.clinicaId,
        dataHora: {
          gte: inicioDia,
          lte: fimDia,
        },
      },
      select: {
        id: true,
        dataHora: true,
        tipoConsultaId: true,
        status: true,
      },
    });

    console.log(`[LIMITE-RETORNOS] Total de consultas no dia: ${todasConsultas.length}`);
    todasConsultas.forEach((c, idx) => {
      console.log(`[LIMITE-RETORNOS] Consulta ${idx + 1}: ID=${c.id}, DataHora=${c.dataHora.toISOString()}, TipoConsultaId=${c.tipoConsultaId}, Status=${c.status}`);
    });

    // Contar retornos do médico no dia
    // IMPORTANTE: Contar apenas consultas com status diferente de CANCELADA
    // Usar uma query mais flexível que também verifica se tipoConsultaId não é null
    const retornosNoDia = await prisma.consulta.count({
      where: {
        medicoId: medicoId,
        clinicaId: auth.clinicaId,
        tipoConsultaId: {
          equals: tipoRetorno.id,
        },
        dataHora: {
          gte: inicioDia,
          lte: fimDia,
        },
        status: {
          not: "CANCELADA",
        },
      },
    });

    // Debug adicional: buscar retornos manualmente para verificar
    const retornosDebug = await prisma.consulta.findMany({
      where: {
        medicoId: medicoId,
        clinicaId: auth.clinicaId,
        tipoConsultaId: tipoRetorno.id,
        dataHora: {
          gte: inicioDia,
          lte: fimDia,
        },
      },
      select: {
        id: true,
        dataHora: true,
        tipoConsultaId: true,
        status: true,
      },
    });

    console.log(`[LIMITE-RETORNOS] Retornos encontrados (com filtro de status): ${retornosNoDia}`);
    console.log(`[LIMITE-RETORNOS] Retornos encontrados (sem filtro de status): ${retornosDebug.length}`);
    retornosDebug.forEach((r, idx) => {
      console.log(`[LIMITE-RETORNOS] Retorno ${idx + 1}: ID=${r.id}, DataHora=${r.dataHora.toISOString()}, Status=${r.status}`);
    });

    console.log(`[LIMITE-RETORNOS] Retornos encontrados: ${retornosNoDia}, Limite: ${medico.limiteMaximoRetornosPorDia}`);

    const limiteAtingido = retornosNoDia >= medico.limiteMaximoRetornosPorDia;

    // Retornar mensagem apenas quando há retornos agendados ou limite atingido
    let mensagem: string | null = null;
    if (limiteAtingido) {
      mensagem = `⚠️ Limite de retornos diários atingido! O médico já possui ${retornosNoDia} retorno(s) agendado(s) para este dia. Limite máximo: ${medico.limiteMaximoRetornosPorDia}`;
    } else if (retornosNoDia > 0) {
      mensagem = `Atenção: O médico já possui ${retornosNoDia} retorno(s) agendado(s) para este dia. Limite máximo: ${medico.limiteMaximoRetornosPorDia}`;
    }
    // Não mostrar mensagem quando não há retornos agendados (retornosNoDia === 0)

    return NextResponse.json({
      limiteMaximoRetornosPorDia: medico.limiteMaximoRetornosPorDia,
      retornosNoDia,
      limiteAtingido,
      mensagem,
    });
  } catch (error) {
    console.error("Erro ao verificar limite de retornos:", error);
    return NextResponse.json(
      { error: "Erro ao verificar limite de retornos" },
      { status: 500 }
    );
  }
}
