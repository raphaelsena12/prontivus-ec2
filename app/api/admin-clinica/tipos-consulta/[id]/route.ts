import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const updateTipoConsultaSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").optional(),
  descricao: z.string().optional(),
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

// GET /api/admin-clinica/tipos-consulta/[id]
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

    const tipoConsulta = await prisma.tipoConsulta.findUnique({
      where: { id },
    });

    if (!tipoConsulta) {
      return NextResponse.json(
        { error: "Tipo de consulta não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ tipoConsulta });
  } catch (error) {
    console.error("Erro ao buscar tipo de consulta:", error);
    return NextResponse.json(
      { error: "Erro ao buscar tipo de consulta" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin-clinica/tipos-consulta/[id]
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
    const validation = updateTipoConsultaSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const tipoConsulta = await prisma.tipoConsulta.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json({ tipoConsulta });
  } catch (error) {
    console.error("Erro ao atualizar tipo de consulta:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar tipo de consulta" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin-clinica/tipos-consulta/[id]
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

    // Verificar se tipo está sendo usado em consultas
    const consultas = await prisma.consulta.count({
      where: { tipoConsultaId: id },
    });

    if (consultas > 0) {
      // Desativar ao invés de deletar se estiver em uso
      await prisma.tipoConsulta.update({
        where: { id },
        data: { ativo: false },
      });

      return NextResponse.json({
        message: "Tipo de consulta desativado (está em uso)",
      });
    }

    // Desativar ao invés de deletar
    await prisma.tipoConsulta.update({
      where: { id },
      data: { ativo: false },
    });

    return NextResponse.json({ message: "Tipo de consulta desativado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar tipo de consulta:", error);
    return NextResponse.json(
      { error: "Erro ao deletar tipo de consulta" },
      { status: 500 }
    );
  }
}














