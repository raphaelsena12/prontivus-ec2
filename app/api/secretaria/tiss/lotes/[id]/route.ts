import { NextRequest, NextResponse } from "next/server";
import { checkSecretariaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkSecretariaAuth();
  if (!auth.authorized) return auth.response!;
  const clinicaId = auth.clinicaId!;
  const { id } = await params;

  const lote = await prisma.loteTiss.findFirst({
    where: { id, clinicaId },
    include: {
      operadora: { select: { id: true, codigoAns: true, razaoSocial: true, cnpj: true } },
      guias: {
        include: {
          paciente: { select: { id: true, nome: true, cpf: true } },
          procedimentos: {
            include: {
              codigoTuss: { select: { id: true, codigoTuss: true, descricao: true } },
            },
          },
        },
      },
    },
  });

  if (!lote) {
    return NextResponse.json({ error: "Lote não encontrado" }, { status: 404 });
  }

  return NextResponse.json(lote);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkSecretariaAuth();
  if (!auth.authorized) return auth.response!;
  const clinicaId = auth.clinicaId!;
  const { id } = await params;

  const lote = await prisma.loteTiss.findFirst({
    where: { id, clinicaId },
    include: { guias: { select: { id: true } } },
  });

  if (!lote) {
    return NextResponse.json({ error: "Lote não encontrado" }, { status: 404 });
  }

  if (lote.status === "XML_GERADO") {
    return NextResponse.json({ error: "Lote com XML gerado não pode ser excluído" }, { status: 400 });
  }

  // Return guias to VALIDADA
  const guiaIds = lote.guias.map((g) => g.id);
  if (guiaIds.length > 0) {
    await prisma.guiaTiss.updateMany({
      where: { id: { in: guiaIds } },
      data: { status: "VALIDADA", loteId: null },
    });
  }

  await prisma.loteTiss.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
