import { NextRequest, NextResponse } from "next/server";
import { checkSecretariaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; procId: string }> }
) {
  const auth = await checkSecretariaAuth();
  if (!auth.authorized) return auth.response!;
  const clinicaId = auth.clinicaId!;
  const { id, procId } = await params;

  const guia = await prisma.guiaTiss.findFirst({ where: { id, clinicaId } });
  if (!guia) {
    return NextResponse.json({ error: "Guia não encontrada" }, { status: 404 });
  }

  if (guia.status === "ENVIADA") {
    return NextResponse.json({ error: "Guia enviada não pode ser alterada" }, { status: 400 });
  }

  const proc = await prisma.guiaTissProcedimento.findFirst({
    where: { id: procId, guiaId: id },
  });
  if (!proc) {
    return NextResponse.json({ error: "Procedimento não encontrado" }, { status: 404 });
  }

  await prisma.guiaTissProcedimento.delete({ where: { id: procId } });

  // Reset status to RASCUNHO
  if (guia.status !== "RASCUNHO") {
    await prisma.guiaTiss.update({ where: { id }, data: { status: "RASCUNHO" } });
  }

  return NextResponse.json({ success: true });
}
