import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user?.clinicaId) {
      return NextResponse.json({
        clinicaNome: null,
        avatar: null,
      });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.clinicaId },
      select: {
        nome: true,
      },
    });

    // Buscar avatar do usuário se necessário
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        avatar: true,
      },
    });

    return NextResponse.json({
      clinicaNome: tenant?.nome || null,
      avatar: usuario?.avatar || null,
    });
  } catch (error) {
    console.error("Erro ao buscar informações da clínica:", error);
    return NextResponse.json(
      { error: "Erro ao buscar informações" },
      { status: 500 }
    );
  }
}
