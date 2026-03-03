import { NextRequest, NextResponse } from "next/server";
import { checkSecretariaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const loteSchema = z.object({
  operadoraId: z.string().uuid(),
  guiaIds: z.array(z.string().uuid()).min(1),
  observacoes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const auth = await checkSecretariaAuth();
  if (!auth.authorized) return auth.response!;
  const clinicaId = auth.clinicaId!;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const operadoraId = searchParams.get("operadoraId");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { clinicaId };
  if (status) where.status = status;
  if (operadoraId) where.operadoraId = operadoraId;

  const [lotes, total] = await Promise.all([
    prisma.loteTiss.findMany({
      where,
      include: {
        operadora: { select: { id: true, codigoAns: true, razaoSocial: true } },
        guias: {
          select: { id: true, numeroGuia: true, tipoGuia: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.loteTiss.count({ where }),
  ]);

  return NextResponse.json({ lotes, total, page, limit });
}

export async function POST(req: NextRequest) {
  const auth = await checkSecretariaAuth();
  if (!auth.authorized) return auth.response!;
  const clinicaId = auth.clinicaId!;

  const body = await req.json();
  const parsed = loteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { operadoraId, guiaIds, observacoes } = parsed.data;

  // Verify operadora
  const operadora = await prisma.operadora.findFirst({ where: { id: operadoraId, clinicaId } });
  if (!operadora) {
    return NextResponse.json({ error: "Operadora não encontrada" }, { status: 404 });
  }

  // Verify all guias are VALIDADA and belong to this clinic and operadora
  const guias = await prisma.guiaTiss.findMany({
    where: {
      id: { in: guiaIds },
      clinicaId,
      operadoraId,
      status: "VALIDADA",
    },
  });

  if (guias.length !== guiaIds.length) {
    return NextResponse.json({
      error: "Uma ou mais guias não foram encontradas, não pertencem à operadora selecionada ou não estão validadas",
    }, { status: 400 });
  }

  // Generate lote number
  const count = await prisma.loteTiss.count({ where: { clinicaId } });
  const numeroLote = String(count + 1).padStart(8, "0");

  const lote = await prisma.loteTiss.create({
    data: {
      clinicaId,
      operadoraId,
      numeroLote,
      observacoes: observacoes ?? null,
      status: "ABERTO",
      guias: {
        connect: guiaIds.map((id) => ({ id })),
      },
    },
    include: {
      operadora: { select: { id: true, codigoAns: true, razaoSocial: true } },
      guias: { select: { id: true, numeroGuia: true, tipoGuia: true } },
    },
  });

  // Update guias status to LOTE
  await prisma.guiaTiss.updateMany({
    where: { id: { in: guiaIds } },
    data: { status: "LOTE", loteId: lote.id },
  });

  return NextResponse.json(lote, { status: 201 });
}
