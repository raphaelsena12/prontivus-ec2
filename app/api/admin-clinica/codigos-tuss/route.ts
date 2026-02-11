import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const codigoTussSchema = z.object({
  codigoTuss: z.string().min(1, "Código TUSS é obrigatório"),
  descricao: z.string().min(1, "Descrição é obrigatória").max(500),
  descricaoDetalhada: z.string().optional(),
  tipoProcedimento: z.enum([
    "CONSULTA",
    "EXAME",
    "PROCEDIMENTO_AMBULATORIAL",
    "CIRURGIA",
    "OUTROS",
  ]),
  grupoId: z.string().uuid().optional().nullable(),
  dataVigenciaInicio: z.string().transform((str) => new Date(str)),
  dataVigenciaFim: z.string().transform((str) => new Date(str)).optional().nullable(),
  ativo: z.boolean().optional().default(true),
  observacoes: z.string().optional(),
  especialidadesIds: z.array(z.string().uuid()).optional(),
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

// GET /api/admin-clinica/codigos-tuss
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const tipoProcedimento = searchParams.get("tipoProcedimento");
    const ativo = searchParams.get("ativo");
    const especialidadeId = searchParams.get("especialidadeId");

    const where: any = {
      ...(search && {
        OR: [
          { codigoTuss: { contains: search, mode: "insensitive" as const } },
          { descricao: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(tipoProcedimento && { tipoProcedimento }),
      ...(ativo !== null && { ativo: ativo === "true" }),
      ...(especialidadeId && {
        tussEspecialidades: {
          some: {
            especialidadeId,
          },
        },
      }),
    };

    const codigosTuss = await prisma.codigoTuss.findMany({
      where,
      include: {
        grupo: true,
        tussEspecialidades: {
          include: {
            especialidade: true,
          },
        },
      },
      orderBy: { codigoTuss: "asc" },
    });

    return NextResponse.json({ codigosTuss });
  } catch (error) {
    console.error("Erro ao listar códigos TUSS:", error);
    return NextResponse.json(
      { error: "Erro ao listar códigos TUSS" },
      { status: 500 }
    );
  }
}

// POST /api/admin-clinica/codigos-tuss
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const validation = codigoTussSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verificar se código TUSS já existe
    const existente = await prisma.codigoTuss.findUnique({
      where: { codigoTuss: data.codigoTuss },
    });

    if (existente) {
      return NextResponse.json(
        { error: "Código TUSS já existe" },
        { status: 409 }
      );
    }

    // Criar código TUSS
    const codigoTuss = await prisma.codigoTuss.create({
      data: {
        codigoTuss: data.codigoTuss,
        descricao: data.descricao,
        descricaoDetalhada: data.descricaoDetalhada,
        tipoProcedimento: data.tipoProcedimento,
        grupoId: data.grupoId,
        dataVigenciaInicio: data.dataVigenciaInicio,
        dataVigenciaFim: data.dataVigenciaFim,
        ativo: data.ativo,
        observacoes: data.observacoes,
      },
    });

    // Vincular especialidades se fornecidas
    if (data.especialidadesIds && data.especialidadesIds.length > 0) {
      await Promise.all(
        data.especialidadesIds.map((especialidadeId: string) =>
          prisma.tussEspecialidade.create({
            data: {
              codigoTussId: codigoTuss.id,
              especialidadeId,
            },
          })
        )
      );
    }

    const codigoTussCompleto = await prisma.codigoTuss.findUnique({
      where: { id: codigoTuss.id },
      include: {
        grupo: true,
        tussEspecialidades: {
          include: {
            especialidade: true,
          },
        },
      },
    });

    return NextResponse.json({ codigoTuss: codigoTussCompleto }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar código TUSS:", error);
    return NextResponse.json(
      { error: "Erro ao criar código TUSS" },
      { status: 500 }
    );
  }
}

