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

  if (session.user.tipo !== TipoUsuario.PACIENTE) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado. Apenas pacientes podem acessar." },
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

  const paciente = await prisma.paciente.findFirst({
    where: {
      clinicaId: clinicaId,
      usuarioId: session.user.id,
    },
    select: { id: true },
  });

  if (!paciente) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Paciente não encontrado" },
        { status: 404 }
      ),
    };
  }

  return { authorized: true, clinicaId, pacienteId: paciente.id };
}

// GET /api/paciente/pagamentos
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");

    const skip = (page - 1) * limit;

    const where: any = {
      pacienteId: auth.pacienteId,
    };

    if (status) {
      where.status = status;
    }

    const [pagamentos, total] = await Promise.all([
      prisma.pagamentoConsulta.findMany({
        where,
        include: {
          consulta: {
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
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.pagamentoConsulta.count({ where }),
    ]);

    return NextResponse.json({
      pagamentos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao buscar pagamentos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar pagamentos" },
      { status: 500 }
    );
  }
}
