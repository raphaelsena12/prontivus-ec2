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

// POST /api/medico/fechamento-caixa/autorizar - Autorizar fechamento de caixa
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { clinicaId, medicoId } = auth;
    if (!clinicaId || !medicoId) {
      return NextResponse.json(
        { error: "Clínica ou médico não encontrado" },
        { status: 400 }
      );
    }
    const body = await request.json();
    const { data, observacoes } = body;

    if (!data) {
      return NextResponse.json(
        { error: "Data é obrigatória" },
        { status: 400 }
      );
    }

    // Converter data para DateTime (início do dia)
    const dataFechamento = new Date(data);
    dataFechamento.setHours(0, 0, 0, 0);

    // Verificar se já existe autorização para esta data
    const autorizacaoExistente = await prisma.autorizacaoFechamentoCaixa.findUnique({
      where: {
        clinicaId_medicoId_data: {
          clinicaId,
          medicoId,
          data: dataFechamento,
        },
      },
    });

    if (autorizacaoExistente) {
      return NextResponse.json(
        { error: "Já existe uma autorização para esta data" },
        { status: 400 }
      );
    }

    // Criar autorização
    const autorizacao = await prisma.autorizacaoFechamentoCaixa.create({
      data: {
        clinicaId,
        medicoId,
        data: dataFechamento,
        observacoes: observacoes || null,
        status: "AUTORIZADO",
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

    return NextResponse.json({
      success: true,
      autorizacao,
    });
  } catch (error: any) {
    console.error("Erro ao autorizar fechamento de caixa:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao autorizar fechamento de caixa" },
      { status: 500 }
    );
  }
}
