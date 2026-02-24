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

  // Buscar o médico associado ao usuário
  const medico = await prisma.medico.findFirst({
    where: { usuarioId: session.user.id },
    select: { id: true },
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

    const where: any = {
      clinicaId: auth.clinicaId,
      medicoId: auth.medicoId, // Filtrar apenas prontuários do médico logado
      ...(search && {
        OR: [
          { paciente: { nome: { contains: search, mode: "insensitive" as const } } },
          { paciente: { cpf: { contains: search, mode: "insensitive" as const } } },
          { diagnostico: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [prontuarios, total] = await Promise.all([
      prisma.prontuario.findMany({
        where,
        include: {
          paciente: {
            select: {
              id: true,
              numeroProntuario: true,
              nome: true,
              cpf: true,
              dataNascimento: true,
            },
          },
          medico: {
            include: {
              usuario: {
                select: {
                  nome: true,
                },
              },
            },
          },
          consulta: {
            select: {
              id: true,
              dataHora: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.prontuario.count({ where }),
    ]);

    return NextResponse.json({
      prontuarios,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao listar prontuários:", error);
    return NextResponse.json(
      { error: "Erro ao listar prontuários" },
      { status: 500 }
    );
  }
}





