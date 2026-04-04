import { NextRequest, NextResponse } from "next/server";
import { checkSecretariaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const retornoSchema = z.object({
  operadoraId: z.string().uuid(),
  loteId: z.string().uuid().optional().nullable(),
  numeroProtocolo: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  xmlRetorno: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const auth = await checkSecretariaAuth();
  if (!auth.authorized) return auth.response!;
  const clinicaId = auth.clinicaId!;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const operadoraId = searchParams.get("operadoraId");
  const loteId = searchParams.get("loteId");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { clinicaId };
  if (status) where.status = status;
  if (operadoraId) where.operadoraId = operadoraId;
  if (loteId) where.loteId = loteId;

  const [retornos, total] = await Promise.all([
    prisma.retornoLote.findMany({
      where,
      include: {
        lote: { select: { id: true, numeroLote: true, status: true } },
        operadora: { select: { id: true, codigoAns: true, razaoSocial: true } },
        _count: { select: { glosas: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.retornoLote.count({ where }),
  ]);

  return NextResponse.json({ retornos, total, page, limit });
}

export async function POST(req: NextRequest) {
  const auth = await checkSecretariaAuth();
  if (!auth.authorized) return auth.response!;
  const clinicaId = auth.clinicaId!;

  const body = await req.json();
  const parsed = retornoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { operadoraId, loteId, numeroProtocolo, observacoes, xmlRetorno } = parsed.data;

  // Verify operadora belongs to clinica
  const operadora = await prisma.operadora.findFirst({
    where: {
      id: operadoraId,
      tenantsAceitacao: { some: { tenantId: clinicaId, aceita: true } },
    },
    select: { id: true },
  });
  if (!operadora) {
    return NextResponse.json({ error: "Operadora não encontrada" }, { status: 404 });
  }

  // If loteId provided, verify it belongs to clinica
  if (loteId) {
    const lote = await prisma.loteTiss.findFirst({
      where: { id: loteId, clinicaId },
      select: { id: true },
    });
    if (!lote) {
      return NextResponse.json({ error: "Lote não encontrado" }, { status: 404 });
    }
  }

  const retorno = await prisma.retornoLote.create({
    data: {
      clinicaId,
      operadoraId,
      loteId: loteId ?? null,
      numeroProtocolo: numeroProtocolo ?? null,
      observacoes: observacoes ?? null,
      xmlRetorno: xmlRetorno ?? null,
      status: "RECEBIDO",
    },
    include: {
      lote: { select: { id: true, numeroLote: true, status: true } },
      operadora: { select: { id: true, codigoAns: true, razaoSocial: true } },
    },
  });

  return NextResponse.json(retorno, { status: 201 });
}
