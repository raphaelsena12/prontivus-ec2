import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { zodValidationErrorPayload } from "@/lib/zod-validation-error";

const updateMedicamentoClinicaSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").optional(),
  principioAtivo: z.string().optional().nullable(),
  laboratorio: z.string().optional().nullable(),
  apresentacao: z.string().optional().nullable(),
  concentracao: z.string().optional().nullable(),
  unidade: z.string().optional().nullable(),
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

    // Busca primeiro entre os medicamentos da clínica
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

    const existente = await prisma.medicamento.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId!,
      },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Medicamento não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = updateMedicamentoClinicaSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        zodValidationErrorPayload(validation.error.issues),
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

    const existente = await prisma.medicamento.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId!,
      },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Medicamento não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    await prisma.medicamento.delete({ where: { id } });

    return NextResponse.json({ message: "Medicamento excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar medicamento:", error);
    return NextResponse.json(
      { error: "Erro ao deletar medicamento" },
      { status: 500 }
    );
  }
}
