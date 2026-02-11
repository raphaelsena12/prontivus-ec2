import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const updateEspecialidadeSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").optional(),
  descricao: z.string().optional(),
  ativo: z.boolean().optional(),
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

  return { authorized: true };
}

// GET /api/admin-clinica/especialidades/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    const especialidade = await prisma.especialidadeMedica.findUnique({
      where: { id },
    });

    if (!especialidade) {
      return NextResponse.json(
        { error: "Especialidade não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ especialidade });
  } catch (error) {
    console.error("Erro ao buscar especialidade:", error);
    return NextResponse.json(
      { error: "Erro ao buscar especialidade" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin-clinica/especialidades/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;
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
      data: validation.data,
    });

    return NextResponse.json({ especialidade });
  } catch (error) {
    console.error("Erro ao atualizar especialidade:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar especialidade" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin-clinica/especialidades/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    await prisma.especialidadeMedica.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Especialidade excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar especialidade:", error);
    return NextResponse.json(
      { error: "Erro ao deletar especialidade" },
      { status: 500 }
    );
  }
}














