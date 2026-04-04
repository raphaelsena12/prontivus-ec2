import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { zodValidationErrorPayload } from "@/lib/zod-validation-error";

const updateRecebimentoSchema = z.object({
  valorRecebido: z
    .number()
    .min(0, "Valor deve ser maior ou igual a zero")
    .optional(),
  dataRecebimento: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  dataPrevista: z
    .string()
    .transform((str) => new Date(str))
    .optional()
    .or(z.literal("")),
  numeroDocumento: z.string().optional(),
  metodoPagamento: z.string().optional(),
  observacoes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;

    const { id } = await params;

    const recebimento = await prisma.recebimentoConvenio.findFirst({
      where: { id, clinicaId: auth.clinicaId! },
      include: {
        operadora: {
          select: { id: true, razaoSocial: true, codigoAns: true },
        },
        lote: { select: { id: true, numeroLote: true } },
      },
    });

    if (!recebimento) {
      return NextResponse.json(
        { error: "Recebimento não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ recebimento });
  } catch (error) {
    console.error("Erro ao buscar recebimento de convênio:", error);
    return NextResponse.json(
      { error: "Erro ao buscar recebimento de convênio" },
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
    if (!auth.authorized) return auth.response;

    const { id } = await params;

    const existente = await prisma.recebimentoConvenio.findFirst({
      where: { id, clinicaId: auth.clinicaId! },
    });
    if (!existente) {
      return NextResponse.json(
        { error: "Recebimento não encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = updateRecebimentoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        zodValidationErrorPayload(validation.error.issues),
        { status: 400 }
      );
    }

    const data: any = { ...validation.data };
    if (data.dataPrevista === "") data.dataPrevista = null;

    const recebimento = await prisma.recebimentoConvenio.update({
      where: { id },
      data,
      include: {
        operadora: {
          select: { id: true, razaoSocial: true, codigoAns: true },
        },
        lote: { select: { id: true, numeroLote: true } },
      },
    });

    return NextResponse.json({ recebimento });
  } catch (error) {
    console.error("Erro ao atualizar recebimento de convênio:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar recebimento de convênio" },
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
    if (!auth.authorized) return auth.response;

    const { id } = await params;

    const recebimento = await prisma.recebimentoConvenio.findFirst({
      where: { id, clinicaId: auth.clinicaId! },
    });
    if (!recebimento) {
      return NextResponse.json(
        { error: "Recebimento não encontrado" },
        { status: 404 }
      );
    }

    await prisma.recebimentoConvenio.delete({ where: { id } });

    return NextResponse.json({
      message: "Recebimento de convênio excluído com sucesso",
    });
  } catch (error) {
    console.error("Erro ao deletar recebimento de convênio:", error);
    return NextResponse.json(
      { error: "Erro ao deletar recebimento de convênio" },
      { status: 500 }
    );
  }
}
