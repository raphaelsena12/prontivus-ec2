import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const formaPagamentoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional().nullable(),
  tipo: z.enum([
    "DINHEIRO",
    "CARTAO_CREDITO",
    "CARTAO_DEBITO",
    "PIX",
    "BOLETO",
    "TRANSFERENCIA",
  ]),
  bandeiraCartao: z.string().optional().nullable(),
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

// GET /api/super-admin/formas-pagamento (catálogo global)
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
        OR: [{ nome: { contains: search, mode: "insensitive" as const } }],
      }),
    };

    const [formasPagamento, total] = await Promise.all([
      prisma.formaPagamento.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nome: "asc" },
      }),
      prisma.formaPagamento.count({ where }),
    ]);

    return NextResponse.json({
      formasPagamento,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Erro ao listar formas de pagamento (super-admin):", error);
    return NextResponse.json(
      { error: "Erro ao listar formas de pagamento" },
      { status: 500 }
    );
  }
}

// POST /api/super-admin/formas-pagamento (criar no catálogo global)
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const validation = formaPagamentoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;
    const formaPagamento = await prisma.formaPagamento.create({
      data: {
        clinicaId: null,
        nome: data.nome,
        descricao: data.descricao ?? null,
        tipo: data.tipo,
        bandeiraCartao: data.bandeiraCartao ?? null,
        ativo: data.ativo ?? true,
      },
    });

    return NextResponse.json({ formaPagamento }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar forma de pagamento (super-admin):", error);
    return NextResponse.json(
      { error: "Erro ao criar forma de pagamento" },
      { status: 500 }
    );
  }
}

