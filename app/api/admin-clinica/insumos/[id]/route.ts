import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateInsumoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").optional(),
  descricao: z.string().optional(),
  unidade: z.string().optional(),
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

    const insumo = await prisma.insumo.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId!,
      },
    });

    if (!insumo) {
      return NextResponse.json(
        { error: "Insumo não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ insumo });
  } catch (error) {
    console.error("Erro ao buscar insumo:", error);
    return NextResponse.json(
      { error: "Erro ao buscar insumo" },
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

    const insumoExistente = await prisma.insumo.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId!,
      },
    });

    if (!insumoExistente) {
      return NextResponse.json(
        { error: "Insumo não encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = updateInsumoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const insumo = await prisma.insumo.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json({ insumo });
  } catch (error) {
    console.error("Erro ao atualizar insumo:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar insumo" },
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

    const insumo = await prisma.insumo.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId!,
      },
    });

    if (!insumo) {
      return NextResponse.json(
        { error: "Insumo não encontrado" },
        { status: 404 }
      );
    }

    await prisma.insumo.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Insumo excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar insumo:", error);
    return NextResponse.json(
      { error: "Erro ao deletar insumo" },
      { status: 500 }
    );
  }
}

