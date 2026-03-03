import { NextRequest, NextResponse } from "next/server";
import { checkSecretariaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const procedimentoSchema = z.object({
  codigoTussId: z.string().uuid(),
  quantidade: z.number().int().min(1).default(1),
  valorUnitario: z.number().min(0),
  valorTotal: z.number().min(0),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkSecretariaAuth();
  if (!auth.authorized) return auth.response!;
  const clinicaId = auth.clinicaId!;
  const { id } = await params;

  const guia = await prisma.guiaTiss.findFirst({ where: { id, clinicaId } });
  if (!guia) {
    return NextResponse.json({ error: "Guia não encontrada" }, { status: 404 });
  }

  const procedimentos = await prisma.guiaTissProcedimento.findMany({
    where: { guiaId: id },
    include: {
      codigoTuss: { select: { id: true, codigoTuss: true, descricao: true, tipoProcedimento: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(procedimentos);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkSecretariaAuth();
  if (!auth.authorized) return auth.response!;
  const clinicaId = auth.clinicaId!;
  const { id } = await params;

  const guia = await prisma.guiaTiss.findFirst({ where: { id, clinicaId } });
  if (!guia) {
    return NextResponse.json({ error: "Guia não encontrada" }, { status: 404 });
  }

  if (guia.status === "ENVIADA") {
    return NextResponse.json({ error: "Guia enviada não pode ser alterada" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = procedimentoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { codigoTussId, quantidade, valorUnitario, valorTotal } = parsed.data;

  // Verify TUSS code exists and is active
  const codigoTuss = await prisma.codigoTuss.findFirst({
    where: { id: codigoTussId, ativo: true },
  });
  if (!codigoTuss) {
    return NextResponse.json({ error: "Código TUSS não encontrado ou inativo" }, { status: 404 });
  }

  const procedimento = await prisma.guiaTissProcedimento.create({
    data: {
      clinicaId,
      guiaId: id,
      codigoTussId,
      quantidade,
      valorUnitario,
      valorTotal,
    },
    include: {
      codigoTuss: { select: { id: true, codigoTuss: true, descricao: true } },
    },
  });

  // Move to RASCUNHO if it was something else (so user must re-validate)
  if (guia.status !== "RASCUNHO") {
    await prisma.guiaTiss.update({ where: { id }, data: { status: "RASCUNHO" } });
  }

  return NextResponse.json(procedimento, { status: 201 });
}
