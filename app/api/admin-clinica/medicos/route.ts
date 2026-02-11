import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const medicoSchema = z.object({
  usuarioId: z.string().uuid("ID de usuário inválido"),
  crm: z.string().min(1, "CRM é obrigatório"),
  especialidade: z.string().min(1, "Especialidade é obrigatória"),
  limiteMaximoRetornosPorDia: z.number().int().min(0).nullable().optional(),
});

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
      clinicaId: auth.clinicaId,
      ...(search && {
        OR: [
          { crm: { contains: search, mode: "insensitive" as const } },
          { especialidade: { contains: search, mode: "insensitive" as const } },
          { usuario: { nome: { contains: search, mode: "insensitive" as const } } },
        ],
      }),
    };

    const [medicos, total] = await Promise.all([
      prisma.medico.findMany({
        where,
        select: {
          id: true,
          crm: true,
          especialidade: true,
          usuario: {
            select: {
              id: true,
              nome: true,
              email: true,
              telefone: true,
              avatar: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.medico.count({ where }),
    ]);

    return NextResponse.json({
      medicos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao listar médicos:", error);
    return NextResponse.json(
      { error: "Erro ao listar médicos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const validation = medicoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verificar se usuário existe e pertence à clínica
    const usuario = await prisma.usuario.findFirst({
      where: {
        id: data.usuarioId,
        clinicaId: auth.clinicaId,
        tipo: TipoUsuario.MEDICO,
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuário médico não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se CRM já existe
    const medicoExistente = await prisma.medico.findFirst({
      where: {
        crm: data.crm,
        clinicaId: auth.clinicaId,
      },
    });

    if (medicoExistente) {
      return NextResponse.json(
        { error: "CRM já cadastrado" },
        { status: 409 }
      );
    }

    const medico = await prisma.medico.create({
      data: {
        usuarioId: data.usuarioId,
        crm: data.crm,
        especialidade: data.especialidade,
        limiteMaximoRetornosPorDia: data.limiteMaximoRetornosPorDia ?? null,
        clinicaId: auth.clinicaId!,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json({ medico }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar médico:", error);
    return NextResponse.json(
      { error: "Erro ao criar médico" },
      { status: 500 }
    );
  }
}

