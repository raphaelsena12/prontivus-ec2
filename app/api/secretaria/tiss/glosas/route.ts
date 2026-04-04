import { NextRequest, NextResponse } from "next/server";
import { checkSecretariaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await checkSecretariaAuth();
  if (!auth.authorized) return auth.response!;
  const clinicaId = auth.clinicaId!;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const guiaId = searchParams.get("guiaId");
  const operadoraId = searchParams.get("operadoraId");
  const retornoLoteId = searchParams.get("retornoLoteId");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { clinicaId };
  if (status) where.status = status;
  if (guiaId) where.guiaId = guiaId;
  if (retornoLoteId) where.retornoLoteId = retornoLoteId;
  if (operadoraId) {
    where.guia = { operadoraId };
  }

  const [glosas, total] = await Promise.all([
    prisma.glosa.findMany({
      where,
      include: {
        guia: {
          select: {
            id: true,
            numeroGuia: true,
            tipoGuia: true,
            status: true,
            paciente: { select: { id: true, nome: true } },
            operadora: { select: { id: true, codigoAns: true, razaoSocial: true } },
          },
        },
        procedimento: {
          include: {
            codigoTuss: { select: { id: true, codigoTuss: true, descricao: true } },
          },
        },
        retornoLote: { select: { id: true, numeroProtocolo: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.glosa.count({ where }),
  ]);

  return NextResponse.json({ glosas, total, page, limit });
}
