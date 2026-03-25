import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const updateEspecialidadeSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").optional(),
  descricao: z.string().optional().nullable(),
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

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const especialidade = await prisma.especialidadeMedica.findUnique({ where: { id } });
    if (!especialidade) {
      return NextResponse.json({ error: "Especialidade não encontrada" }, { status: 404 });
    }
    return NextResponse.json({ especialidade });
  } catch (error) {
    console.error("Erro ao buscar especialidade (super-admin):", error);
    return NextResponse.json({ error: "Erro ao buscar especialidade" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const existente = await prisma.especialidadeMedica.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existente) {
      return NextResponse.json({ error: "Especialidade não encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateEspecialidadeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const especialidade = await prisma.especialidadeMedica.update({
      where: { id },
      data: {
        ...validation.data,
        nome: validation.data.nome?.trim(),
        descricao: validation.data.descricao?.trim() || null,
      },
    });

    return NextResponse.json({ especialidade });
  } catch (error) {
    console.error("Erro ao atualizar especialidade (super-admin):", error);
    return NextResponse.json({ error: "Erro ao atualizar especialidade" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const existente = await prisma.especialidadeMedica.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existente) {
      return NextResponse.json({ error: "Especialidade não encontrada" }, { status: 404 });
    }

    await prisma.especialidadeMedica.delete({ where: { id } });
    return NextResponse.json({ message: "Especialidade excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir especialidade (super-admin):", error);
    return NextResponse.json({ error: "Erro ao excluir especialidade" }, { status: 500 });
  }
}

