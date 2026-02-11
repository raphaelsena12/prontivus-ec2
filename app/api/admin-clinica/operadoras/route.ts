import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const operadoraSchema = z.object({
  codigoAns: z.string().min(1, "Código ANS é obrigatório"),
  razaoSocial: z.string().min(3, "Razão social é obrigatória"),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  ativo: z.boolean().optional().default(true),
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

// GET /api/admin-clinica/operadoras
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const ativo = searchParams.get("ativo");

    const where: any = {
      clinicaId: auth.clinicaId,
      ...(search && {
        OR: [
          { codigoAns: { contains: search, mode: "insensitive" as const } },
          { razaoSocial: { contains: search, mode: "insensitive" as const } },
          { nomeFantasia: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(ativo !== null && { ativo: ativo === "true" }),
    };

    const operadoras = await prisma.operadora.findMany({
      select: {
        id: true,
        clinicaId: true,
        codigoAns: true,
        razaoSocial: true,
        nomeFantasia: true,
        cnpj: true,
        telefone: true,
        email: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
      },
      where,
      orderBy: { razaoSocial: "asc" },
    });

    // Buscar planos separadamente
    const operadoraIds = operadoras.map(o => o.id);
    const planosSaude = await prisma.planoSaude.findMany({
      where: {
        operadoraId: { in: operadoraIds },
        ativo: true,
      },
    });
    const planosMap = new Map<string, typeof planosSaude>();
    planosSaude.forEach(plano => {
      if (!planosMap.has(plano.operadoraId)) {
        planosMap.set(plano.operadoraId, []);
      }
      planosMap.get(plano.operadoraId)!.push(plano);
    });

    const operadorasComPlanos = operadoras.map(operadora => ({
      ...operadora,
      planosSaude: planosMap.get(operadora.id) || [],
    }));

    return NextResponse.json({ operadoras: operadorasComPlanos });
  } catch (error) {
    console.error("Erro ao listar operadoras:", error);
    return NextResponse.json(
      { error: "Erro ao listar operadoras" },
      { status: 500 }
    );
  }
}

// POST /api/admin-clinica/operadoras
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const validation = operadoraSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    if (!auth.clinicaId) {
      return NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 404 }
      );
    }

    const operadora = await prisma.operadora.create({
      data: {
        ...data,
        clinicaId: auth.clinicaId,
        email: data.email || null,
      },
    });

    // Buscar planos separadamente (será vazio para nova operadora)
    const planosSaude = await prisma.planoSaude.findMany({
      where: {
        operadoraId: operadora.id,
      },
    });

    return NextResponse.json({
      operadora: {
        ...operadora,
        planosSaude,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar operadora:", error);
    return NextResponse.json(
      { error: "Erro ao criar operadora" },
      { status: 500 }
    );
  }
}

