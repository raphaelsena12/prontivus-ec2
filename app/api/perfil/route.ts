import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Schema de validação para atualização de perfil
const updatePerfilSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").optional(),
  email: z.string().email("Email inválido").optional(),
  cpf: z.string().regex(/^\d{11}$/, "CPF deve conter 11 dígitos").optional(),
  crm: z.string().optional(),
  telefone: z.string().optional(),
});

// GET /api/perfil - Obter dados do perfil
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const clinicaId = session?.user?.clinicaId ?? null;

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

    let crm: string | null = null;
    if (usuario.tipo === "MEDICO") {
      if (!clinicaId) {
        return NextResponse.json(
          { error: "Clinica do médico não encontrada" },
          { status: 400 }
        );
      }
      const medico = await prisma.medico.findFirst({
        where: {
          usuarioId: usuario.id,
          clinicaId,
        },
        select: {
          crm: true,
        },
      });
      crm = medico?.crm ?? null;
    }

    return NextResponse.json({ usuario: { ...usuario, crm } });
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
    const clinicaId = session?.user?.clinicaId ?? null;

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
      cpf?: string;
      telefone?: string | null;
    } = {};

    // Em atualização, só deve falhar se o e-mail já pertencer a OUTRO usuário
    if (data.email) {
      const emailExistente = await prisma.usuario.findUnique({
        where: { email: data.email },
        select: { id: true },
      });

      if (emailExistente && emailExistente.id !== session.user.id) {
        return NextResponse.json(
          { error: "Email já cadastrado" },
          { status: 409 }
        );
      }

      updateData.email = data.email;
    }

    if (data.cpf) {
      const cpfExistente = await prisma.usuario.findFirst({
        where: {
          cpf: data.cpf,
          id: { not: session.user.id },
        },
      });

      if (cpfExistente) {
        return NextResponse.json(
          { error: "CPF já cadastrado" },
          { status: 409 }
        );
      }
      updateData.cpf = data.cpf;
    }

    // Atualizar outros campos
    if (data.nome) updateData.nome = data.nome;
    if (data.telefone !== undefined)
      updateData.telefone = data.telefone?.replace(/\D/g, "") || null;

    if (session.user.tipo === "MEDICO") {
      if (!clinicaId) {
        return NextResponse.json(
          { error: "Clinica do médico não encontrada" },
          { status: 400 }
        );
      }
      const crm = data.crm?.trim();
      if (!crm) {
        return NextResponse.json(
          { error: "CRM é obrigatório para médicos" },
          { status: 400 }
        );
      }

      const medico = await prisma.medico.findFirst({
        where: {
          usuarioId: session.user.id,
          clinicaId,
        },
        select: { id: true },
      });

      if (!medico) {
        return NextResponse.json(
          { error: "Registro de médico não encontrado para este usuário" },
          { status: 404 }
        );
      }

      await prisma.medico.update({
        where: { id: medico.id },
        data: { crm },
      });
    }

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

    let crm: string | null = null;
    if (usuario.tipo === "MEDICO") {
      if (!clinicaId) {
        return NextResponse.json(
          { error: "Clinica do médico não encontrada" },
          { status: 400 }
        );
      }
      const medico = await prisma.medico.findFirst({
        where: {
          usuarioId: usuario.id,
          clinicaId,
        },
        select: {
          crm: true,
        },
      });
      crm = medico?.crm ?? null;
    }

    return NextResponse.json({ usuario: { ...usuario, crm } });
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


