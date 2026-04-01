import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
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
  if (
    session.user.tipo !== TipoUsuario.ADMIN_CLINICA &&
    session.user.tipo !== TipoUsuario.SECRETARIA &&
    session.user.tipo !== TipoUsuario.MEDICO
  ) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Acesso negado" }, { status: 403 }),
    };
  }

  const clinicaId = await getUserClinicaId();
  if (!clinicaId) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Clínica não encontrada" }, { status: 403 }),
    };
  }

  return { authorized: true as const, clinicaId };
}

// GET /api/admin-clinica/especialidades-categorias (catálogo global)
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const ativo = searchParams.get("ativo");
    const limit = Math.min(parseInt(searchParams.get("limit") || "5000"), 5000);
    const where: any = {
      ...(ativo !== null && { ativo: ativo === "true" }),
    };

    const categorias = await prisma.especialidadeCategoria.findMany({
      where,
      orderBy: { nome: "asc" },
      take: limit,
      select: { id: true, codigo: true, nome: true, ativo: true },
    });

    return NextResponse.json({ categorias });
  } catch (error) {
    console.error("Erro ao listar categorias de especialidade (admin-clinica):", error);
    return NextResponse.json({ error: "Erro ao listar categorias" }, { status: 500 });
  }
}

