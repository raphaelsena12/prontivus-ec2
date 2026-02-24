import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateExameSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").optional(),
  descricao: z.string().min(1, "Descrição é obrigatória").optional(),
  tipo: z.enum(["LABORATORIAL", "IMAGEM", "OUTROS"]).optional(),
  codigoTussId: z.string().uuid("Código TUSS inválido").optional(),
  ativo: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    const exame = await prisma.exame.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId!,
      },
      include: {
        codigoTuss: {
          select: {
            id: true,
            codigoTuss: true,
            descricao: true,
            tipoProcedimento: true,
          },
        },
      },
    });

    if (!exame) {
      return NextResponse.json(
        { error: "Exame não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ exame });
  } catch (error) {
    console.error("Erro ao buscar exame:", error);
    return NextResponse.json(
      { error: "Erro ao buscar exame" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    const exameExistente = await prisma.exame.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId!,
      },
    });

    if (!exameExistente) {
      return NextResponse.json(
        { error: "Exame não encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = updateExameSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const exame = await prisma.exame.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json({ exame });
  } catch (error) {
    console.error("Erro ao atualizar exame:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar exame" },
      { status: 500 }
    );
  }
}

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

    const exame = await prisma.exame.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId!,
      },
    });

    if (!exame) {
      return NextResponse.json(
        { error: "Exame não encontrado" },
        { status: 404 }
      );
    }

    await prisma.exame.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Exame excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar exame:", error);
    return NextResponse.json(
      { error: "Erro ao deletar exame" },
      { status: 500 }
    );
  }
}















