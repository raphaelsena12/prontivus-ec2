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
    select: { id: true, numeroLote: true, xmlLote: true, status: true },
  });

  if (!lote) {
    return NextResponse.json({ error: "Lote não encontrado" }, { status: 404 });
  }

  if (!lote.xmlLote) {
    return NextResponse.json({ error: "XML ainda não foi gerado para este lote" }, { status: 400 });
  }

  const filename = `TISS_lote_${lote.numeroLote}.xml`;

  return new NextResponse(lote.xmlLote, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
