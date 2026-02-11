import { NextRequest, NextResponse } from "next/server";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Schema de validação para atualização de usuário
const updateUsuarioSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").optional(),
  email: z.string().email("Email inválido").optional(),
  telefone: z.string().optional(),
  tipo: z.nativeEnum(TipoUsuario).optional(),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").optional(),
  ativo: z.boolean().optional(),
});

// Helper para verificar autorização
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

  const admin = await isSuperAdmin();

  if (!admin) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado. Apenas Super Admin." },
        { status: 403 }
      ),
    };
  }

  return { authorized: true };
}

// Helper para validar UUID
function isValidUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// PUT /api/super-admin/clinicas/[id]/usuarios/[usuarioId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; usuarioId: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id, usuarioId } = await params;

    // Validar IDs
    if (!isValidUUID(id) || !isValidUUID(usuarioId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se clínica existe
    const clinica = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!clinica) {
      return NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 404 }
      );
    }

    // Verificar se usuário existe e pertence à clínica
    const usuarioExistente = await prisma.usuario.findFirst({
      where: {
        id: usuarioId,
        clinicaId: id,
      },
    });

    if (!usuarioExistente) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = updateUsuarioSchema.safeParse(body);

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
      tipo?: TipoUsuario;
      senha?: string;
      ativo?: boolean;
    } = {};

    // Verificar se email já existe (se mudou)
    if (data.email && data.email !== usuarioExistente.email) {
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
    if (data.tipo) updateData.tipo = data.tipo;
    if (data.ativo !== undefined) updateData.ativo = data.ativo;

    // Hash da senha se fornecida
    if (data.senha) {
      updateData.senha = await bcrypt.hash(data.senha, 10);
    }

    // Atualizar usuário
    const usuario = await prisma.usuario.update({
      where: { id: usuarioId },
      data: updateData,
      select: {
        id: true,
        nome: true,
        email: true,
        cpf: true,
        telefone: true,
        tipo: true,
        ativo: true,
        primeiroAcesso: true,
        ultimoAcesso: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ usuario });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
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
      { error: "Erro ao atualizar usuário" },
      { status: 500 }
    );
  }
}

// DELETE /api/super-admin/clinicas/[id]/usuarios/[usuarioId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; usuarioId: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id, usuarioId } = await params;

    // Validar IDs
    if (!isValidUUID(id) || !isValidUUID(usuarioId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se clínica existe
    const clinica = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!clinica) {
      return NextResponse.json(
        { error: "Clínica não encontrada" },
        { status: 404 }
      );
    }

    // Verificar se usuário existe e pertence à clínica
    const usuarioExistente = await prisma.usuario.findFirst({
      where: {
        id: usuarioId,
        clinicaId: id,
      },
    });

    if (!usuarioExistente) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Soft delete: desativar usuário
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { ativo: false },
    });

    return NextResponse.json({
      message: "Usuário desativado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao desativar usuário:", error);
    return NextResponse.json(
      { error: "Erro ao desativar usuário" },
      { status: 500 }
    );
  }
}














