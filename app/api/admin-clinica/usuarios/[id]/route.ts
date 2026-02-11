import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Schema de validação para atualização de usuário
const updateUsuarioSchema = z.object({
  nome: z.string()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .optional(),
  email: z.string()
    .email("Email inválido")
    .max(100, "Email deve ter no máximo 100 caracteres")
    .optional(),
  telefone: z.string()
    .min(1, "Telefone é obrigatório")
    .max(15, "Telefone inválido")
    .refine((val) => {
      const cleaned = val.replace(/\D/g, "");
      return cleaned.length >= 10 && cleaned.length <= 11;
    }, {
      message: "Telefone inválido",
    }),
  tipo: z.nativeEnum(TipoUsuario).optional(),
  senha: z.string()
    .min(6, "Senha deve ter no mínimo 6 caracteres")
    .max(255, "Senha deve ter no máximo 255 caracteres")
    .optional(),
  ativo: z.boolean().optional(),
});

// Helper para validar UUID
function isValidUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// PUT /api/admin-clinica/usuarios/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    // Validar ID
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se usuário existe e pertence à clínica
    const usuarioExistente = await prisma.usuario.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId!,
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
      updateData.telefone = data.telefone.replace(/\D/g, "");
    if (data.tipo) updateData.tipo = data.tipo;
    if (data.ativo !== undefined) updateData.ativo = data.ativo;

    // Hash da senha se fornecida
    if (data.senha) {
      updateData.senha = await bcrypt.hash(data.senha, 10);
    }

    // Atualizar usuário
    const usuario = await prisma.usuario.update({
      where: { id },
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

// DELETE /api/admin-clinica/usuarios/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    // Validar ID
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se usuário existe e pertence à clínica
    const usuarioExistente = await prisma.usuario.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId!,
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
      where: { id },
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














