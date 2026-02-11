import { NextRequest, NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateManipuladoSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória").optional(),
  informacoes: z.string().optional(),
  ativo: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    const manipulado = await prisma.manipulado.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId!,
        medicoId: auth.medicoId!,
      },
    });

    if (!manipulado) {
      return NextResponse.json(
        { error: "Manipulado não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ manipulado });
  } catch (error) {
    console.error("Erro ao buscar manipulado:", error);
    return NextResponse.json(
      { error: "Erro ao buscar manipulado" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    const manipuladoExistente = await prisma.manipulado.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId!,
        medicoId: auth.medicoId!,
      },
    });

    if (!manipuladoExistente) {
      return NextResponse.json(
        { error: "Manipulado não encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = updateManipuladoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const manipulado = await prisma.manipulado.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json({ manipulado });
  } catch (error) {
    console.error("Erro ao atualizar manipulado:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar manipulado" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    const manipulado = await prisma.manipulado.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId!,
        medicoId: auth.medicoId!,
      },
    });

    if (!manipulado) {
      return NextResponse.json(
        { error: "Manipulado não encontrado" },
        { status: 404 }
      );
    }

    await prisma.manipulado.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Manipulado excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar manipulado:", error);
    return NextResponse.json(
      { error: "Erro ao deletar manipulado" },
      { status: 500 }
    );
  }
}
