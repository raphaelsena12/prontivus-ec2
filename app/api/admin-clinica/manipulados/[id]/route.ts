import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateManipuladoSchema = z.object({
  medicoId: z.string().min(1, "Médico é obrigatório").optional(),
  descricao: z.string().min(1, "Descrição é obrigatória").optional(),
  informacoes: z.string().optional(),
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

    const manipulado = await prisma.manipulado.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId!,
      },
      include: {
        medico: {
          include: {
            usuario: {
              select: {
                nome: true,
              },
            },
          },
        },
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
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    const manipuladoExistente = await prisma.manipulado.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId!,
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

    // Se médicoId foi alterado, verificar se o novo médico pertence à clínica
    if (validation.data.medicoId && validation.data.medicoId !== manipuladoExistente.medicoId) {
      const medico = await prisma.medico.findFirst({
        where: {
          id: validation.data.medicoId,
          clinicaId: auth.clinicaId!,
        },
      });

      if (!medico) {
        return NextResponse.json(
          { error: "Médico não encontrado ou não pertence à clínica" },
          { status: 404 }
        );
      }
    }

    const manipulado = await prisma.manipulado.update({
      where: { id },
      data: validation.data,
      include: {
        medico: {
          include: {
            usuario: {
              select: {
                nome: true,
              },
            },
          },
        },
      },
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
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;

    const manipulado = await prisma.manipulado.findFirst({
      where: {
        id,
        clinicaId: auth.clinicaId!,
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
