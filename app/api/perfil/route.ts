import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Schema de validação para atualização de perfil
const updatePerfilSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").optional(),
  email: z.string().email("Email inválido").optional(),
  telefone: z.string().optional(),
});

// GET /api/perfil - Obter dados do perfil
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        nome: true,
        email: true,
        cpf: true,
        telefone: true,
        avatar: true,
        tipo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ usuario });
  } catch (error) {
    console.error("Erro ao buscar perfil:", error);
    return NextResponse.json(
      { error: "Erro ao buscar perfil" },
      { status: 500 }
    );
  }
}

// PATCH /api/perfil - Atualizar perfil
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = updatePerfilSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;
    const updateData: {
      nome?: string;
      email?: string;
      telefone?: string | null;
    } = {};

    // Verificar se email já existe (se mudou)
    if (data.email && data.email !== session.user.email) {
      const emailExistente = await prisma.usuario.findUnique({
        where: { email: data.email },
      });

      if (emailExistente) {
        return NextResponse.json(
          { error: "Email já cadastrado" },
          { status: 409 }
        );
      }
      updateData.email = data.email;
    }

    // Atualizar outros campos
    if (data.nome) updateData.nome = data.nome;
    if (data.telefone !== undefined)
      updateData.telefone = data.telefone?.replace(/\D/g, "") || null;

    // Atualizar usuário
    const usuario = await prisma.usuario.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        nome: true,
        email: true,
        cpf: true,
        telefone: true,
        avatar: true,
        tipo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ usuario });
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Email já cadastrado" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Erro ao atualizar perfil" },
      { status: 500 }
    );
  }
}


