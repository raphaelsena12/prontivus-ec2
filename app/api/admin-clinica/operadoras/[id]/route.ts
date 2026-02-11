import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const updateOperadoraSchema = z.object({
  codigoAns: z.string().min(1, "Código ANS é obrigatório").optional(),
  razaoSocial: z.string().min(3, "Razão social é obrigatória").optional(),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  ativo: z.boolean().optional(),
});

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

  if (session.user.tipo !== TipoUsuario.ADMIN_CLINICA && session.user.tipo !== TipoUsuario.SECRETARIA) {
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

// GET /api/admin-clinica/operadoras/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    const operadora = await prisma.operadora.findFirst({
      select: {
        id: true,
        clinicaId: true,
        codigoAns: true,
        razaoSocial: true,
        nomeFantasia: true,
        cnpj: true,
        telefone: true,
        email: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
      },
      where: {
        id,
        clinicaId: auth.clinicaId,
      },
    });

    if (!operadora) {
      return NextResponse.json(
        { error: "Operadora não encontrada" },
        { status: 404 }
      );
    }

    // Buscar planos separadamente
    const planosSaude = await prisma.planoSaude.findMany({
      where: {
        operadoraId: operadora.id,
      },
    });

    return NextResponse.json({
      operadora: {
        ...operadora,
        planosSaude,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar operadora:", error);
    return NextResponse.json(
      { error: "Erro ao buscar operadora" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin-clinica/operadoras/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;
    const body = await request.json();
    const validation = updateOperadoraSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    // Verificar se operadora pertence à clínica
    const operadoraExistente = await prisma.operadora.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId,
      },
    });

    if (!operadoraExistente) {
      return NextResponse.json(
        { error: "Operadora não encontrada" },
        { status: 404 }
      );
    }

    const data = validation.data;
    const operadora = await prisma.operadora.update({
      where: { id },
      data: {
        ...data,
        email: data.email || null,
      },
    });

    // Buscar planos separadamente
    const planosSaude = await prisma.planoSaude.findMany({
      where: {
        operadoraId: operadora.id,
      },
    });

    return NextResponse.json({
      operadora: {
        ...operadora,
        planosSaude,
      },
    });
  } catch (error) {
    console.error("Erro ao atualizar operadora:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar operadora" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin-clinica/operadoras/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAuthorization();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    // Verificar se operadora pertence à clínica
    const operadora = await prisma.operadora.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId,
      },
    });

    if (!operadora) {
      return NextResponse.json(
        { error: "Operadora não encontrada" },
        { status: 404 }
      );
    }

    // Desativar ao invés de deletar
    await prisma.operadora.update({
      where: { id },
      data: { ativo: false },
    });

    return NextResponse.json({ message: "Operadora desativada com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar operadora:", error);
    return NextResponse.json(
      { error: "Erro ao deletar operadora" },
      { status: 500 }
    );
  }
}














