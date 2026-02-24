import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { getTenantFilter } from "@/lib/prisma-helpers";

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

  const allowedTypes = [
    TipoUsuario.SUPER_ADMIN,
    TipoUsuario.ADMIN_CLINICA,
    TipoUsuario.MEDICO,
  ];

  if (!(allowedTypes as TipoUsuario[]).includes(session.user.tipo)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      ),
    };
  }

  const clinicaId = await getUserClinicaId();

  // Super Admin não precisa de clinicaId
  if (session.user.tipo !== TipoUsuario.SUPER_ADMIN && !clinicaId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, clinicaId, userType: session.user.tipo };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const pacienteId = searchParams.get("pacienteId");
    const medicoId = searchParams.get("medicoId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    if (!auth.userType) {
      return NextResponse.json(
        { error: "Tipo de usuário não encontrado" },
        { status: 403 }
      );
    }

    const tenantFilter = getTenantFilter(auth.userType, auth.clinicaId);

    const where: any = {
      ...(tenantFilter && tenantFilter),
      ...(pacienteId && { pacienteId }),
      ...(medicoId && { medicoId }),
      ...(search && {
        OR: [
          { paciente: { nome: { contains: search, mode: "insensitive" as const } } },
          { paciente: { cpf: { contains: search, mode: "insensitive" as const } } },
          { medico: { usuario: { nome: { contains: search, mode: "insensitive" as const } } } },
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

