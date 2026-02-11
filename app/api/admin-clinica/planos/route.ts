import { NextRequest, NextResponse } from "next/server";
import { getSession, hasUserType, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";

// GET /api/admin-clinica/planos - Lista todos os planos disponíveis
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const isAdminClinica = await hasUserType(TipoUsuario.ADMIN_CLINICA);
    if (!isAdminClinica) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    const planos = await prisma.plano.findMany({
      where: {
        ativo: true,
      },
      orderBy: {
        preco: "asc",
      },
    });

    return NextResponse.json({ planos });
  } catch (error) {
    console.error("Erro ao listar planos:", error);
    return NextResponse.json(
      { error: "Erro ao listar planos" },
      { status: 500 }
    );
  }
}














