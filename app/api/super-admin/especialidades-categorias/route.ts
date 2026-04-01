import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const categoriaSchema = z.object({
  codigo: z.string().min(1, "Código é obrigatório"),
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
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
  return { authorized: true as const };
}

// GET /api/super-admin/especialidades-categorias (catálogo global)
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const ativo = searchParams.get("ativo");
    const limit = Math.min(parseInt(searchParams.get("limit") || "1000"), 5000);

    const where: any = {
      ...(ativo !== null && { ativo: ativo === "true" }),
      ...(search && {
        OR: [
          { codigo: { contains: search, mode: "insensitive" as const } },
          { nome: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const categorias = await prisma.especialidadeCategoria.findMany({
      where,
      orderBy: { nome: "asc" },
      take: limit,
    });

    return NextResponse.json({ categorias });
  } catch (error) {
    console.error("Erro ao listar categorias de especialidade (super-admin):", error);
    return NextResponse.json(
      { error: "Erro ao listar categorias" },
      { status: 500 }
    );
  }
}

// POST /api/super-admin/especialidades-categorias (criar no catálogo global)
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const validation = categoriaSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;
    const codigoNormalizado = data.codigo.trim().toUpperCase();

    const existente = await prisma.especialidadeCategoria.findUnique({
      where: { codigo: codigoNormalizado },
      select: { id: true },
    });

    if (existente) {
      return NextResponse.json(
        { error: "Código de categoria já existe" },
        { status: 409 }
      );
    }

    const categoria = await prisma.especialidadeCategoria.create({
      data: {
        codigo: codigoNormalizado,
        nome: data.nome.trim(),
        ativo: data.ativo ?? true,
      },
    });

    return NextResponse.json({ categoria }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar categoria de especialidade (super-admin):", error);
    return NextResponse.json(
      { error: "Erro ao criar categoria" },
      { status: 500 }
    );
  }
}

