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

  return { authorized: true, clinicaId, secretariaId: session.user.id };
}

// POST /api/secretaria/fechamento-caixa/fechar - Fechar caixa
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { clinicaId, secretariaId } = auth;
    const body = await request.json();
    const { autorizacaoId, assinaturaSecretaria } = body;

    if (!autorizacaoId) {
      return NextResponse.json(
        { error: "ID da autorização é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar autorização
    const autorizacao = await prisma.autorizacaoFechamentoCaixa.findUnique({
      where: {
        id: autorizacaoId,
      },
    });

    if (!autorizacao) {
      return NextResponse.json(
        { error: "Autorização não encontrada" },
        { status: 404 }
      );
    }

    if (autorizacao.clinicaId !== clinicaId) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    if (autorizacao.status !== "AUTORIZADO") {
      return NextResponse.json(
        { error: "Autorização já foi processada" },
        { status: 400 }
      );
    }

    // Atualizar autorização
    const autorizacaoAtualizada = await prisma.autorizacaoFechamentoCaixa.update({
      where: {
        id: autorizacaoId,
      },
      data: {
        status: "FECHADO",
        fechadoEm: new Date(),
        assinaturaSecretaria: assinaturaSecretaria || null,
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
      autorizacao: autorizacaoAtualizada,
    });
  } catch (error: any) {
    console.error("Erro ao fechar caixa:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao fechar caixa" },
      { status: 500 }
    );
  }
}
