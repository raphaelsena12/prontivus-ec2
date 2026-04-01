import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const updateCategoriaSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").optional(),
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

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const categoria = await prisma.especialidadeCategoria.findUnique({ where: { id } });
    if (!categoria) {
      return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
    }
    return NextResponse.json({ categoria });
  } catch (error) {
    console.error("Erro ao buscar categoria de especialidade (super-admin):", error);
    return NextResponse.json({ error: "Erro ao buscar categoria" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const existente = await prisma.especialidadeCategoria.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existente) {
      return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateCategoriaSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const categoria = await prisma.especialidadeCategoria.update({
      where: { id },
      data: {
        ...validation.data,
        nome: validation.data.nome?.trim(),
      },
    });

    return NextResponse.json({ categoria });
  } catch (error) {
    console.error("Erro ao atualizar categoria de especialidade (super-admin):", error);
    return NextResponse.json({ error: "Erro ao atualizar categoria" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const existente = await prisma.especialidadeCategoria.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existente) {
      return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
    }

    await prisma.especialidadeCategoria.delete({ where: { id } });
    return NextResponse.json({ message: "Categoria excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir categoria de especialidade (super-admin):", error);
    return NextResponse.json({ error: "Erro ao excluir categoria" }, { status: 500 });
  }
}

