import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/auth/verificar-token - Verificar se o token é válido
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token não fornecido" },
        { status: 400 }
      );
    }

    // Buscar usuário com o token
    const usuario = await prisma.usuario.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: {
          gt: new Date(), // Token ainda não expirou
        },
      },
      select: {
        id: true,
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: "Token inválido ou expirado" },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Erro ao verificar token:", error);
    return NextResponse.json(
      { error: "Erro ao verificar token" },
      { status: 500 }
    );
  }
}
