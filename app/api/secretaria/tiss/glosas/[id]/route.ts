import { NextRequest, NextResponse } from "next/server";
import { checkSecretariaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["ACEITA"]).optional(),
  observacoes: z.string().optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkSecretariaAuth();
  if (!auth.authorized) return auth.response!;
  const clinicaId = auth.clinicaId!;
  const { id } = await params;

  const glosa = await prisma.glosa.findFirst({
    where: { id, clinicaId },
    include: {
      guia: {
        include: {
          paciente: { select: { id: true, nome: true, cpf: true } },
          operadora: { select: { id: true, codigoAns: true, razaoSocial: true } },
          lote: { select: { id: true, numeroLote: true, status: true } },
        },
      },
      procedimento: {
        include: {
          codigoTuss: { select: { id: true, codigoTuss: true, descricao: true } },
        },
      },
      retornoLote: {
        select: { id: true, numeroProtocolo: true, status: true, dataRecebimento: true },
      },
    },
  });

  if (!glosa) {
    return NextResponse.json({ error: "Glosa não encontrada" }, { status: 404 });
  }

  return NextResponse.json(glosa);
}

export async function PATCH(
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

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (parsed.data.status === "ACEITA") {
    if (glosa.status !== "GLOSADA") {
      return NextResponse.json({ error: "Apenas glosas com status GLOSADA podem ser aceitas" }, { status: 400 });
    }
    data.status = "ACEITA";
    data.dataResolucao = new Date();
  }

  if (parsed.data.observacoes !== undefined) {
    data.observacoes = parsed.data.observacoes;
  }

  const updated = await prisma.glosa.update({
    where: { id },
    data,
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
