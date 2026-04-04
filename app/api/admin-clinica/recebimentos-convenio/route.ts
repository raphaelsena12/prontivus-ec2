import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { zodValidationErrorPayload } from "@/lib/zod-validation-error";

const createRecebimentoSchema = z.object({
  operadoraId: z.string().uuid("operadoraId inválido"),
  loteId: z.string().uuid("loteId inválido").optional(),
  valorRecebido: z.number().min(0, "Valor deve ser maior ou igual a zero"),
  dataRecebimento: z.string().transform((str) => new Date(str)),
  dataPrevista: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  numeroDocumento: z.string().optional(),
  metodoPagamento: z.string().optional(),
  observacoes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const operadoraId = searchParams.get("operadoraId");
    const loteId = searchParams.get("loteId");
    const dataInicio = searchParams.get("dataInicio");
    const dataFim = searchParams.get("dataFim");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where: any = {
      clinicaId: auth.clinicaId!,
      ...(operadoraId && { operadoraId }),
      ...(loteId && { loteId }),
      ...(dataInicio || dataFim
        ? {
            dataRecebimento: {
              ...(dataInicio && { gte: new Date(dataInicio) }),
              ...(dataFim && { lte: new Date(dataFim) }),
            },
          }
        : {}),
    };

    const [recebimentos, total] = await Promise.all([
      prisma.recebimentoConvenio.findMany({
        where,
        include: {
          operadora: {
            select: { id: true, razaoSocial: true, codigoAns: true },
          },
          lote: { select: { id: true, numeroLote: true } },
        },
        skip,
        take: limit,
        orderBy: { dataRecebimento: "desc" },
      }),
      prisma.recebimentoConvenio.count({ where }),
    ]);

    return NextResponse.json({
      recebimentos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao listar recebimentos de convênio:", error);
    return NextResponse.json(
      { error: "Erro ao listar recebimentos de convênio" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const validation = createRecebimentoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        zodValidationErrorPayload(validation.error.issues),
        { status: 400 }
      );
    }

    const { operadoraId, loteId, ...rest } = validation.data;

    // Validate operadora is accepted by this clinic
    const vinculo = await prisma.tenantOperadora.findUnique({
      where: {
        tenantId_operadoraId: {
          tenantId: auth.clinicaId!,
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

    // Validate lote belongs to clinic if provided
    if (loteId) {
      const lote = await prisma.loteTiss.findFirst({
        where: { id: loteId, clinicaId: auth.clinicaId! },
      });
      if (!lote) {
        return NextResponse.json(
          { error: "Lote não encontrado" },
          { status: 404 }
        );
      }
    }

    const recebimento = await prisma.recebimentoConvenio.create({
      data: {
        ...rest,
        operadoraId,
        loteId: loteId || null,
        clinicaId: auth.clinicaId!,
      },
      include: {
        operadora: {
          select: { id: true, razaoSocial: true, codigoAns: true },
        },
        lote: { select: { id: true, numeroLote: true } },
      },
    });

    return NextResponse.json({ recebimento }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar recebimento de convênio:", error);
    return NextResponse.json(
      { error: "Erro ao criar recebimento de convênio" },
      { status: 500 }
    );
  }
}
