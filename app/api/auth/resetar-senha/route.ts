import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Schema de validação
const resetarSenhaSchema = z.object({
  token: z.string().min(1, "Token é obrigatório"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

// POST /api/auth/resetar-senha - Redefinir senha usando token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = resetarSenhaSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { token, senha } = validation.data;

    // Buscar usuário com o token válido
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

    // Hash da nova senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Atualizar senha e limpar token
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        senha: senhaHash,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    return NextResponse.json({
      message: "Senha redefinida com sucesso",
    });
  } catch (error) {
    console.error("Erro ao redefinir senha:", error);
    return NextResponse.json(
      { error: "Erro ao processar solicitação" },
      { status: 500 }
    );
  }
}
