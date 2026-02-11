import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserClinicaId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TipoUsuario } from "@/lib/generated/prisma";
import { z } from "zod";

const updateTussOperadoraSchema = z.object({
  aceito: z.boolean().optional(),
  observacoes: z.string().optional().nullable(),
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

  if (session.user.tipo !== TipoUsuario.ADMIN_CLINICA) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado. Apenas Admin Clínica." },
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

// PATCH /api/admin-clinica/tuss-operadoras/[id]
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
    const validation = updateTussOperadoraSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verificar se regra existe
    const tussOperadoraExistente = await prisma.tussOperadora.findUnique({
      where: { id },
    });

    if (!tussOperadoraExistente) {
      return NextResponse.json(
        { error: "Regra de aceitação TUSS não encontrada" },
        { status: 404 }
      );
    }

    // Verificar se operadora pertence à clínica (se houver)
    if (tussOperadoraExistente.operadoraId) {
      const operadora = await prisma.operadora.findFirst({
        where: {
          id: tussOperadoraExistente.operadoraId,
          clinicaId: auth.clinicaId,
        },
      });

      if (!operadora) {
        return NextResponse.json(
          { error: "Operadora não pertence à clínica" },
          { status: 403 }
        );
      }
    }

    // Atualizar regra
    const updateData: any = {};
    if (data.aceito !== undefined) updateData.aceito = data.aceito;
    if (data.observacoes !== undefined) updateData.observacoes = data.observacoes;

    const tussOperadora = await prisma.tussOperadora.update({
      where: { id },
      data: updateData,
      include: {
        codigoTuss: true,
        operadora: true,
        planoSaude: true,
      },
    });

    return NextResponse.json({ tussOperadora });
  } catch (error) {
    console.error("Erro ao atualizar aceitação TUSS:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar aceitação TUSS" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin-clinica/tuss-operadoras/[id]
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

    // Verificar se regra existe
    const tussOperadoraExistente = await prisma.tussOperadora.findUnique({
      where: { id },
    });

    if (!tussOperadoraExistente) {
      return NextResponse.json(
        { error: "Regra de aceitação TUSS não encontrada" },
        { status: 404 }
      );
    }

    // Verificar se operadora pertence à clínica (se houver)
    if (tussOperadoraExistente.operadoraId) {
      const operadora = await prisma.operadora.findFirst({
        where: {
          id: tussOperadoraExistente.operadoraId,
          clinicaId: auth.clinicaId,
        },
      });

      if (!operadora) {
        return NextResponse.json(
          { error: "Operadora não pertence à clínica" },
          { status: 403 }
        );
      }
    }

    await prisma.tussOperadora.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Regra de aceitação TUSS removida com sucesso" });
  } catch (error) {
    console.error("Erro ao remover aceitação TUSS:", error);
    return NextResponse.json(
      { error: "Erro ao remover aceitação TUSS" },
      { status: 500 }
    );
  }
}














