import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { zodValidationErrorPayload } from "@/lib/zod-validation-error";

const updateFaturamentoSchema = z.object({
  valorRecebido: z
    .number()
    .min(0, "Valor deve ser maior ou igual a zero")
    .optional(),
  observacoes: z.string().optional(),
  status: z.enum(["CONCILIADO"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;

    const { id } = await params;

    const faturamento = await prisma.faturamentoConvenio.findFirst({
      where: { id, clinicaId: auth.clinicaId! },
      include: {
        operadora: {
          select: { id: true, razaoSocial: true, codigoAns: true },
        },
      },
    });

    if (!faturamento) {
      return NextResponse.json(
        { error: "Faturamento não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ faturamento });
  } catch (error) {
    console.error("Erro ao buscar faturamento de convênio:", error);
    return NextResponse.json(
      { error: "Erro ao buscar faturamento de convênio" },
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

    const existente = await prisma.faturamentoConvenio.findFirst({
      where: { id, clinicaId: auth.clinicaId! },
    });
    if (!existente) {
      return NextResponse.json(
        { error: "Faturamento não encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = updateFaturamentoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        zodValidationErrorPayload(validation.error.issues),
        { status: 400 }
      );
    }

    const { status, ...rest } = validation.data;

    // Only allow transition to CONCILIADO from FECHADO
    if (status === "CONCILIADO" && existente.status !== "FECHADO") {
      return NextResponse.json(
        {
          error:
            "Somente faturamentos com status FECHADO podem ser conciliados",
        },
        { status: 400 }
      );
    }

    const faturamento = await prisma.faturamentoConvenio.update({
      where: { id },
      data: {
        ...rest,
        ...(status && { status }),
      },
      include: {
        operadora: {
          select: { id: true, razaoSocial: true, codigoAns: true },
        },
      },
    });

    return NextResponse.json({ faturamento });
  } catch (error) {
    console.error("Erro ao atualizar faturamento de convênio:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar faturamento de convênio" },
      { status: 500 }
    );
  }
}
