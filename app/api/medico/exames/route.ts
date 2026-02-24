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

  return { authorized: true, clinicaId };
}

// GET /api/medico/exames
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where = {
      clinicaId: auth.clinicaId,
      ativo: true, // Apenas exames ativos
      ...(search && {
        OR: [
          { nome: { contains: search, mode: "insensitive" as const } },
          { descricao: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const exames = await prisma.exame.findMany({
      where,
      orderBy: { nome: "asc" },
      take: 50, // Limitar a 50 resultados
      select: {
        id: true,
        nome: true,
        descricao: true,
        tipo: true,
      },
    });

    return NextResponse.json({ exames });
  } catch (error) {
    console.error("Erro ao listar exames:", error);
    return NextResponse.json(
      { error: "Erro ao listar exames" },
      { status: 500 }
    );
  }
}
