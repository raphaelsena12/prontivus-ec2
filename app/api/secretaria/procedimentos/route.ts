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

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "1000");
    const skip = (page - 1) * limit;

    const where = {
      clinicaId: auth.clinicaId!,
      ativo: true,
      ...(search && {
        OR: [
          { codigo: { contains: search, mode: "insensitive" as const } },
          { nome: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [procedimentos, total] = await Promise.all([
      prisma.procedimento.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nome: "asc" },
      }),
      prisma.procedimento.count({ where }),
    ]);

    return NextResponse.json({
      procedimentos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao listar procedimentos:", error);
    return NextResponse.json(
      { error: "Erro ao listar procedimentos" },
      { status: 500 }
    );
  }
}
