import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const updatePlanoSaudeSchema = z.object({
  codigoAns: z.string().optional(),
  nome: z.string().min(3, "Nome é obrigatório").optional(),
  tipoPlano: z.enum([
    "AMBULATORIAL",
    "HOSPITALAR",
    "AMBULATORIAL_HOSPITALAR",
    "ODONTOLOGICO",
  ]).optional(),
  abrangencia: z.enum(["NACIONAL", "REGIONAL", "MUNICIPAL"]).optional(),
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

// GET /api/admin-clinica/planos-saude/[id]
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

    const planoSaude = await prisma.planoSaude.findFirst({
      where: { id },
      include: {
        operadora: true,
      },
    });

    if (!planoSaude || !planoSaude.operadora || planoSaude.operadora.clinicaId !== auth.clinicaId) {
      return NextResponse.json(
        { error: "Plano de saúde não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ planoSaude });
  } catch (error) {
    console.error("Erro ao buscar plano de saúde:", error);
    return NextResponse.json(
      { error: "Erro ao buscar plano de saúde" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin-clinica/planos-saude/[id]
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
    const validation = updatePlanoSaudeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    // Verificar se plano pertence à clínica
    const planoSaudeExistente = await prisma.planoSaude.findFirst({
      where: { id },
      include: {
        operadora: true,
      },
    });

    if (!planoSaudeExistente || !planoSaudeExistente.operadora || planoSaudeExistente.operadora.clinicaId !== auth.clinicaId) {
      return NextResponse.json(
        { error: "Plano de saúde não encontrado" },
        { status: 404 }
      );
    }

    const planoSaude = await prisma.planoSaude.update({
      where: { id },
      data: validation.data,
      include: {
        operadora: true,
      },
    });

    return NextResponse.json({ planoSaude });
  } catch (error) {
    console.error("Erro ao atualizar plano de saúde:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar plano de saúde" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin-clinica/planos-saude/[id]
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

    // Verificar se plano pertence à clínica
    const planoSaude = await prisma.planoSaude.findFirst({
      where: { id },
      include: {
        operadora: true,
      },
    });

    if (!planoSaude || !planoSaude.operadora || planoSaude.operadora.clinicaId !== auth.clinicaId) {
      return NextResponse.json(
        { error: "Plano de saúde não encontrado" },
        { status: 404 }
      );
    }

    // Desativar ao invés de deletar
    await prisma.planoSaude.update({
      where: { id },
      data: { ativo: false },
    });

    return NextResponse.json({ message: "Plano de saúde desativado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar plano de saúde:", error);
    return NextResponse.json(
      { error: "Erro ao deletar plano de saúde" },
      { status: 500 }
    );
  }
}

