import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const createSchema = z.object({
  especialidadeId: z.string().min(1, "especialidadeId é obrigatório"),
  categoriaId: z.string().min(1, "categoriaId é obrigatório"),
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
  return { authorized: true as const };
}

// GET /api/super-admin/especialidades-categorias-itens
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "2000"), 5000);

    const itens = await prisma.especialidadeCategoriaItem.findMany({
      take: limit,
      orderBy: [
        { especialidade: { nome: "asc" } },
        { categoria: { nome: "asc" } },
      ],
      include: {
        especialidade: { select: { id: true, codigo: true, nome: true } },
        categoria: { select: { id: true, codigo: true, nome: true } },
      },
    });

    return NextResponse.json({ itens });
  } catch (error) {
    console.error("Erro ao listar vínculos especialidade↔categoria (super-admin):", error);
    return NextResponse.json({ error: "Erro ao listar vínculos" }, { status: 500 });
  }
}

// POST /api/super-admin/especialidades-categorias-itens
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const validation = createSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { especialidadeId, categoriaId } = validation.data;

    const existente = await prisma.especialidadeCategoriaItem.findFirst({
      where: { especialidadeId, categoriaId },
      select: { id: true },
    });
    if (existente) {
      return NextResponse.json({ error: "Vínculo já existe" }, { status: 409 });
    }

    const item = await prisma.especialidadeCategoriaItem.create({
      data: { especialidadeId, categoriaId },
      include: {
        especialidade: { select: { id: true, codigo: true, nome: true } },
        categoria: { select: { id: true, codigo: true, nome: true } },
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar vínculo especialidade↔categoria (super-admin):", error);
    return NextResponse.json({ error: "Erro ao criar vínculo" }, { status: 500 });
  }
}

