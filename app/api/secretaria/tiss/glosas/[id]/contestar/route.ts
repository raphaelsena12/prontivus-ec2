import { NextRequest, NextResponse } from "next/server";
import { checkSecretariaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const contestarSchema = z.object({
  justificativaContestacao: z.string().min(1, "Justificativa é obrigatória"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkSecretariaAuth();
  if (!auth.authorized) return auth.response!;
  const clinicaId = auth.clinicaId!;
  const { id } = await params;

  const glosa = await prisma.glosa.findFirst({
    where: { id, clinicaId },
  });

  if (!glosa) {
    return NextResponse.json({ error: "Glosa não encontrada" }, { status: 404 });
  }

  if (glosa.status !== "GLOSADA") {
    return NextResponse.json({ error: "Apenas glosas com status GLOSADA podem ser contestadas" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = contestarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.glosa.update({
    where: { id },
    data: {
      status: "CONTESTADA",
      justificativaContestacao: parsed.data.justificativaContestacao,
      dataContestacao: new Date(),
    },
    include: {
      guia: {
        select: {
          id: true,
          numeroGuia: true,
          status: true,
          paciente: { select: { id: true, nome: true } },
          operadora: { select: { id: true, razaoSocial: true } },
        },
      },
      procedimento: {
        include: {
          codigoTuss: { select: { id: true, codigoTuss: true, descricao: true } },
        },
      },
    },
  });

  return NextResponse.json(updated);
}
