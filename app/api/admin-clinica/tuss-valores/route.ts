import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";
import { validarVigenciaValor } from "@/lib/tuss-helpers";

const tussValorSchema = z.object({
  codigoTussId: z.string().uuid("ID do código TUSS inválido"),
  operadoraId: z.string().uuid().optional().nullable(),
  planoSaudeId: z.string().uuid().optional().nullable(),
  tipoConsultaId: z.string().uuid().optional().nullable(),
  valor: z.number().positive("Valor deve ser positivo"),
  dataVigenciaInicio: z.string().transform((str) => new Date(str)),
  dataVigenciaFim: z
    .union([z.string(), z.null()])
    .optional()
    .transform((val) => (val && val !== "" ? new Date(val) : null)),
  ativo: z.boolean().optional().default(true),
  observacoes: z.string().optional(),
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

  if (session.user.tipo !== TipoUsuario.ADMIN_CLINICA) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado. Apenas Admin Clínica." },
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

// GET /api/admin-clinica/tuss-valores
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const codigoTussId = searchParams.get("codigoTussId");
    const operadoraId = searchParams.get("operadoraId");
    const planoSaudeId = searchParams.get("planoSaudeId");
    const tipoConsultaId = searchParams.get("tipoConsultaId");
    const ativo = searchParams.get("ativo");

    const where: any = {
      clinicaId: auth.clinicaId,
      ...(codigoTussId && { codigoTussId }),
      ...(operadoraId && { operadoraId }),
      ...(planoSaudeId && { planoSaudeId }),
      ...(tipoConsultaId && { tipoConsultaId }),
      ...(ativo !== null && { ativo: ativo === "true" }),
      ...(search && {
        OR: [
          { codigoTuss: { codigoTuss: { contains: search, mode: "insensitive" as const } } },
          { codigoTuss: { descricao: { contains: search, mode: "insensitive" as const } } },
          { operadora: { razaoSocial: { contains: search, mode: "insensitive" as const } } },
          { planoSaude: { nome: { contains: search, mode: "insensitive" as const } } },
        ],
      }),
    };

    const valores = await prisma.tussValor.findMany({
      where,
      include: {
        codigoTuss: true,
        operadora: true,
        planoSaude: true,
        tipoConsulta: true,
      },
      orderBy: [
        { dataVigenciaInicio: "desc" },
      ],
    });

    return NextResponse.json({ valores });
  } catch (error) {
    console.error("Erro ao listar valores TUSS:", error);
    return NextResponse.json(
      { error: "Erro ao listar valores TUSS" },
      { status: 500 }
    );
  }
}

// POST /api/admin-clinica/tuss-valores
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const validation = tussValorSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verificar se código TUSS existe
    const codigoTuss = await prisma.codigoTuss.findUnique({
      where: { id: data.codigoTussId },
    });

    if (!codigoTuss) {
      return NextResponse.json(
        { error: "Código TUSS não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se operadora pertence à clínica (se fornecida)
    if (data.operadoraId) {
      const operadora = await prisma.operadora.findFirst({
        where: {
          id: data.operadoraId,
          clinicaId: auth.clinicaId,
        },
      });

      if (!operadora) {
        return NextResponse.json(
          { error: "Operadora não encontrada ou não pertence à clínica" },
          { status: 404 }
        );
      }
    }

    // Verificar se plano pertence à operadora (se fornecido)
    if (data.planoSaudeId && data.operadoraId) {
      const plano = await prisma.planoSaude.findFirst({
        where: {
          id: data.planoSaudeId,
          operadoraId: data.operadoraId,
        },
      });

      if (!plano) {
        return NextResponse.json(
          { error: "Plano não encontrado ou não pertence à operadora" },
          { status: 404 }
        );
      }
    }

    if (!auth.clinicaId) {
      return NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 404 }
      );
    }

    const valor = await prisma.tussValor.create({
      data: {
        ...data,
        clinicaId: auth.clinicaId,
        valor: data.valor,
      },
      include: {
        codigoTuss: true,
        operadora: true,
        planoSaude: true,
        tipoConsulta: true,
      },
    });

    return NextResponse.json({ valor }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar valor TUSS:", error);
    return NextResponse.json(
      { error: "Erro ao criar valor TUSS" },
      { status: 500 }
    );
  }
}

