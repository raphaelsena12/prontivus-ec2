import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const medicamentoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  principioAtivo: z.string().optional().nullable(),
  laboratorio: z.string().optional().nullable(),
  apresentacao: z.string().optional().nullable(),
  concentracao: z.string().optional().nullable(),
  unidade: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
});

async function checkAuthorization() {
  const session = await getSession();
  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }
  if (session.user.tipo !== TipoUsuario.SUPER_ADMIN) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Acesso negado" }, { status: 403 }),
    };
  }
  return { authorized: true };
}

// GET /api/super-admin/medicamentos (catálogo global)
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50"), 1), 1000);
    const skip = (page - 1) * limit;

    const where: any = {
      clinicaId: null,
      ...(search && {
        OR: [
          { nome: { contains: search, mode: "insensitive" as const } },
          { principioAtivo: { contains: search, mode: "insensitive" as const } },
          { laboratorio: { contains: search, mode: "insensitive" as const } },
          { numeroRegistro: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [medicamentos, total] = await Promise.all([
      prisma.medicamento.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.medicamento.count({ where }),
    ]);

    return NextResponse.json({
      medicamentos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao listar medicamentos (super-admin):", error);
    return NextResponse.json({ error: "Erro ao listar medicamentos" }, { status: 500 });
  }
}

// POST /api/super-admin/medicamentos (criar no catálogo global)
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const validation = medicamentoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;
    const medicamento = await prisma.medicamento.create({
      data: {
        clinicaId: null,
        nome: data.nome,
        principioAtivo: data.principioAtivo ?? null,
        laboratorio: data.laboratorio ?? null,
        apresentacao: data.apresentacao ?? null,
        concentracao: data.concentracao ?? null,
        unidade: data.unidade ?? null,
        ativo: data.ativo ?? true,
      },
    });

    return NextResponse.json({ medicamento }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar medicamento (super-admin):", error);
    return NextResponse.json({ error: "Erro ao criar medicamento" }, { status: 500 });
  }
}

