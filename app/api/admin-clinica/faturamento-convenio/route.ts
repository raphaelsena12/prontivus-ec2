import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { zodValidationErrorPayload } from "@/lib/zod-validation-error";

const fecharFaturamentoSchema = z.object({
  operadoraId: z.string().uuid("operadoraId inválido"),
  mesReferencia: z.string().transform((str) => new Date(str)),
});

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const operadoraId = searchParams.get("operadoraId");
    const mesReferencia = searchParams.get("mesReferencia");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where: any = {
      clinicaId: auth.clinicaId!,
      ...(operadoraId && { operadoraId }),
      ...(status && { status }),
      ...(mesReferencia && { mesReferencia: new Date(mesReferencia) }),
    };

    const [faturamentos, total] = await Promise.all([
      prisma.faturamentoConvenio.findMany({
        where,
        include: {
          operadora: {
            select: { id: true, razaoSocial: true, codigoAns: true },
          },
        },
        skip,
        take: limit,
        orderBy: { mesReferencia: "desc" },
      }),
      prisma.faturamentoConvenio.count({ where }),
    ]);

    return NextResponse.json({
      faturamentos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao listar faturamentos de convênio:", error);
    return NextResponse.json(
      { error: "Erro ao listar faturamentos de convênio" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const validation = fecharFaturamentoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        zodValidationErrorPayload(validation.error.issues),
        { status: 400 }
      );
    }

    const { operadoraId, mesReferencia } = validation.data;
    const clinicaId = auth.clinicaId!;

    // Validate operadora is accepted by this clinic
    const vinculo = await prisma.tenantOperadora.findUnique({
      where: {
        tenantId_operadoraId: {
          tenantId: clinicaId,
          operadoraId,
        },
      },
    });

    if (!vinculo || !vinculo.aceita) {
      return NextResponse.json(
        { error: "Operadora não aceita por esta clínica" },
        { status: 400 }
      );
    }

    const inicioMes = startOfMonth(mesReferencia);
    const fimMes = endOfMonth(mesReferencia);

    // Normalize mesReferencia to the first day of the month for storage
    const mesReferenciaNormalizado = startOfMonth(mesReferencia);

    // Statuses that count for billing
    const statusGuias = ["APROVADA", "ENVIADA", "GLOSADA", "PARCIAL_GLOSA"];

    // Sum valorTotal from GuiaTissProcedimento for matching GuiaTiss
    const valorFaturadoResult = await prisma.guiaTissProcedimento.aggregate({
      _sum: { valorTotal: true },
      where: {
        clinicaId,
        guia: {
          clinicaId,
          operadoraId,
          status: { in: statusGuias },
          dataAtendimento: { gte: inicioMes, lte: fimMes },
        },
      },
    });

    const valorFaturado = valorFaturadoResult._sum.valorTotal ?? 0;

    // Sum valorGlosado from Glosa where the related guia matches criteria
    const valorGlosadoResult = await prisma.glosa.aggregate({
      _sum: { valorGlosado: true },
      where: {
        clinicaId,
        guia: {
          clinicaId,
          operadoraId,
          status: { in: statusGuias },
          dataAtendimento: { gte: inicioMes, lte: fimMes },
        },
      },
    });

    const valorGlosado = valorGlosadoResult._sum.valorGlosado ?? 0;

    const faturamento = await prisma.faturamentoConvenio.upsert({
      where: {
        clinicaId_operadoraId_mesReferencia: {
          clinicaId,
          operadoraId,
          mesReferencia: mesReferenciaNormalizado,
        },
      },
      create: {
        clinicaId,
        operadoraId,
        mesReferencia: mesReferenciaNormalizado,
        valorFaturado,
        valorGlosado,
        status: "FECHADO",
      },
      update: {
        valorFaturado,
        valorGlosado,
        status: "FECHADO",
      },
      include: {
        operadora: {
          select: { id: true, razaoSocial: true, codigoAns: true },
        },
      },
    });

    return NextResponse.json({ faturamento }, { status: 201 });
  } catch (error) {
    console.error("Erro ao fechar faturamento de convênio:", error);
    return NextResponse.json(
      { error: "Erro ao fechar faturamento de convênio" },
      { status: 500 }
    );
  }
}
