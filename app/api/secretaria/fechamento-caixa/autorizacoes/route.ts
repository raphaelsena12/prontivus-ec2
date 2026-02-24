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

// GET /api/secretaria/fechamento-caixa/autorizacoes - Buscar autorizações pendentes
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { clinicaId } = auth;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "AUTORIZADO";

    const autorizacoes = await prisma.autorizacaoFechamentoCaixa.findMany({
      where: {
        clinicaId,
        status,
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
      orderBy: {
        data: "desc",
      },
    });

    return NextResponse.json({
      autorizacoes,
    });
  } catch (error: any) {
    console.error("Erro ao buscar autorizações:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao buscar autorizações" },
      { status: 500 }
    );
  }
}
