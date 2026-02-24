import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";

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

  if (session.user.tipo !== TipoUsuario.SECRETARIA && session.user.tipo !== TipoUsuario.ADMIN_CLINICA) {
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

// GET /api/secretaria/pacientes
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "ativo"; // Padrão: apenas ativos

    const where: any = {
      clinicaId: auth.clinicaId,
      ...(search && {
        OR: [
          { nome: { contains: search, mode: "insensitive" as const } },
          { cpf: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    // Filtrar por status - por padrão mostra apenas ativos
    if (status === "ativo" || !status) {
      where.ativo = true;
    } else if (status === "inativo") {
      where.ativo = false;
    }
    // Se status === "todos", não adiciona filtro de ativo

    const pacientes = await prisma.paciente.findMany({
      where,
      select: {
        id: true,
        numeroProntuario: true,
        nome: true,
        cpf: true,
        email: true,
        telefone: true,
        celular: true,
        dataNascimento: true,
        ativo: true,
      },
      orderBy: { nome: "asc" },
      take: 100, // Limitar a 100 resultados para o select
    });

    return NextResponse.json({ pacientes }, { status: 200 });
  } catch (error) {
    console.error("Erro ao listar pacientes:", error);
    return NextResponse.json(
      { error: "Erro ao listar pacientes" },
      { status: 500 }
    );
  }
}
