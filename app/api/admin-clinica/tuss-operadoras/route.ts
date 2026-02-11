import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const tussOperadoraSchema = z.object({
  codigoTussId: z.string().uuid("ID do código TUSS inválido"),
  operadoraId: z.string().uuid().optional().nullable(),
  planoSaudeId: z.string().uuid().optional().nullable(),
  aceito: z.boolean().default(true),
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

// GET /api/admin-clinica/tuss-operadoras
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
    const aceito = searchParams.get("aceito");

    const where: any = {
      ...(codigoTussId && { codigoTussId }),
      ...(operadoraId && { operadoraId }),
      ...(planoSaudeId && { planoSaudeId }),
      ...(aceito !== null && { aceito: aceito === "true" }),
      ...(search && {
        OR: [
          { codigoTuss: { codigoTuss: { contains: search, mode: "insensitive" as const } } },
          { codigoTuss: { descricao: { contains: search, mode: "insensitive" as const } } },
          { operadora: { razaoSocial: { contains: search, mode: "insensitive" as const } } },
          { planoSaude: { nome: { contains: search, mode: "insensitive" as const } } },
        ],
      }),
    };

    const tussOperadoras = await prisma.tussOperadora.findMany({
      where,
      include: {
        codigoTuss: true,
        operadora: true,
        planoSaude: true,
      },
      orderBy: [
        { operadoraId: "asc" },
        { planoSaudeId: "asc" },
      ],
    });

    return NextResponse.json({ tussOperadoras });
  } catch (error) {
    console.error("Erro ao listar aceitação TUSS:", error);
    return NextResponse.json(
      { error: "Erro ao listar aceitação TUSS" },
      { status: 500 }
    );
  }
}

// POST /api/admin-clinica/tuss-operadoras
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const validation = tussOperadoraSchema.safeParse(body);

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

    // Verificar se já existe regra para esta combinação
    const existente = await prisma.tussOperadora.findFirst({
      where: {
        codigoTussId: data.codigoTussId,
        operadoraId: data.operadoraId || null,
        planoSaudeId: data.planoSaudeId || null,
      },
    });

    if (existente) {
      return NextResponse.json(
        { error: "Regra de aceitação já existe para esta combinação" },
        { status: 409 }
      );
    }

    const tussOperadora = await prisma.tussOperadora.create({
      data: {
        codigoTussId: data.codigoTussId,
        operadoraId: data.operadoraId || null,
        planoSaudeId: data.planoSaudeId || null,
        aceito: data.aceito,
        observacoes: data.observacoes || null,
      },
      include: {
        codigoTuss: true,
        operadora: true,
        planoSaude: true,
      },
    });

    return NextResponse.json({ tussOperadora }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar aceitação TUSS:", error);
    return NextResponse.json(
      { error: "Erro ao criar aceitação TUSS" },
      { status: 500 }
    );
  }
}




