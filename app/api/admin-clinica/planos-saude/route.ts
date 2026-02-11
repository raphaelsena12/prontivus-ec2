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

  if (session.user.tipo !== TipoUsuario.ADMIN_CLINICA && session.user.tipo !== TipoUsuario.SECRETARIA) {
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

// GET /api/admin-clinica/planos-saude
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const operadoraId = searchParams.get("operadoraId");
    const ativo = searchParams.get("ativo");

    const where: any = {
      operadora: {
        clinicaId: auth.clinicaId,
      },
      ...(search && {
        OR: [
          { nome: { contains: search, mode: "insensitive" as const } },
          { codigoAns: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(operadoraId && { operadoraId }),
      ...(ativo !== null && { ativo: ativo === "true" }),
    };

    const planos = await prisma.planoSaude.findMany({
      where,
      include: {
        operadora: {
          select: {
            id: true,
            razaoSocial: true,
            nomeFantasia: true,
          },
        },
      },
      orderBy: [
        { operadora: { razaoSocial: "asc" } },
        { nome: "asc" },
      ],
    });

    return NextResponse.json({ planos });
  } catch (error) {
    console.error("Erro ao listar planos de saúde:", error);
    return NextResponse.json(
      { error: "Erro ao listar planos de saúde" },
      { status: 500 }
    );
  }
}














