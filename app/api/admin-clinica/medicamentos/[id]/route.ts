import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateMedicamentoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").optional(),
  principioAtivo: z.string().optional(),
  laboratorio: z.string().optional(),
  apresentacao: z.string().optional(),
  concentracao: z.string().optional(),
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

    const medicamento = await prisma.medicamento.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId!,
      },
    });

    if (!medicamento) {
      return NextResponse.json(
        { error: "Medicamento não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ medicamento });
  } catch (error) {
    console.error("Erro ao buscar medicamento:", error);
    return NextResponse.json(
      { error: "Erro ao buscar medicamento" },
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

    const medicamentoExistente = await prisma.medicamento.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId!,
      },
    });

    if (!medicamentoExistente) {
      return NextResponse.json(
        { error: "Medicamento não encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = updateMedicamentoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.issues },
        { status: 400 }
      );
    }

    const medicamento = await prisma.medicamento.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json({ medicamento });
  } catch (error) {
    console.error("Erro ao atualizar medicamento:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar medicamento" },
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

    const medicamento = await prisma.medicamento.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId!,
      },
    });

    if (!medicamento) {
      return NextResponse.json(
        { error: "Medicamento não encontrado" },
        { status: 404 }
      );
    }

    await prisma.medicamento.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Medicamento excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar medicamento:", error);
    return NextResponse.json(
      { error: "Erro ao deletar medicamento" },
      { status: 500 }
    );
  }
}















