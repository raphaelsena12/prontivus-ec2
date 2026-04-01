import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";

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

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const existente = await prisma.especialidadeCategoriaItem.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existente) {
      return NextResponse.json({ error: "Vínculo não encontrado" }, { status: 404 });
    }

    await prisma.especialidadeCategoriaItem.delete({ where: { id } });
    return NextResponse.json({ message: "Vínculo excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir vínculo especialidade↔categoria (super-admin):", error);
    return NextResponse.json({ error: "Erro ao excluir vínculo" }, { status: 500 });
  }
}

