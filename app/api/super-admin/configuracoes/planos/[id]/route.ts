import { NextRequest, NextResponse } from "next/server";
import { getSession, isSuperAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updatePlanoSchema = z.object({
  tokensMensais: z.number().int().positive().optional(),
  preco: z.number().positive().optional(),
  telemedicineHabilitada: z.boolean().optional(),
  descricao: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
});

// PUT /api/super-admin/configuracoes/planos/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const admin = await isSuperAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updatePlanoSchema.parse(body);

    // Verificar se plano existe
    const planoExistente = await prisma.plano.findUnique({
      where: { id },
    });

    if (!planoExistente) {
      return NextResponse.json(
        { error: "Plano não encontrado" },
        { status: 404 }
      );
    }

    const plano = await prisma.plano.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json({
      plano,
      message: "Plano atualizado com sucesso",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Erro ao atualizar plano:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar plano" },
      { status: 500 }
    );
  }
}








