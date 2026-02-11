import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    if (session.user.tipo !== TipoUsuario.ADMIN_CLINICA) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas Admin Clínica." },
        { status: 403 }
      );
    }

    const clinicaId = await getUserClinicaId();

    if (!clinicaId) {
      return NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 403 }
      );
    }

    const usuarios = await prisma.usuario.findMany({
      where: {
        clinicaId,
        tipo: TipoUsuario.MEDICO,
        ativo: true,
      },
      select: {
        id: true,
        nome: true,
        email: true,
      },
      orderBy: { nome: "asc" },
    });

    return NextResponse.json({ usuarios });
  } catch (error) {
    console.error("Erro ao listar usuários médicos:", error);
    return NextResponse.json(
      { error: "Erro ao listar usuários médicos" },
      { status: 500 }
    );
  }
}










