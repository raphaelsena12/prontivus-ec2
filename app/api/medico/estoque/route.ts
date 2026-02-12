import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";

async function checkAuthorization() {
  const session = await getSession();
  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Não autorizado" }, { status: 401 }),
    };
  }

  if (session.user.tipo !== TipoUsuario.MEDICO) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado. Apenas médicos podem acessar." },
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
        { status: 404 }
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
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const where = {
      clinicaId: auth.clinicaId!,
      ...(search && {
        OR: [
          { medicamento: { nome: { contains: search, mode: "insensitive" as const } } },
          { medicamento: { principioAtivo: { contains: search, mode: "insensitive" as const } } },
        ],
      }),
    };

    const [estoques, total] = await Promise.all([
      prisma.estoqueMedicamento.findMany({
        where,
        include: { 
          medicamento: {
            select: {
              id: true,
              nome: true,
              principioAtivo: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.estoqueMedicamento.count({ where }),
    ]);

    return NextResponse.json({ 
      estoques, 
      pagination: { 
        page, 
        limit, 
        total, 
        totalPages: Math.ceil(total / limit) 
      } 
    });
  } catch (error) {
    console.error("Erro ao listar estoque:", error);
    return NextResponse.json({ error: "Erro ao listar estoque" }, { status: 500 });
  }
}
