import { NextRequest, NextResponse } from "next/server";
import { checkSecretariaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { z } from "zod";

const glosaItemSchema = z.object({
  procedimentoId: z.string().uuid().optional().nullable(),
  codigoGlosa: z.string().optional().nullable(),
  descricaoGlosa: z.string().optional().nullable(),
  valorGlosado: z.number().positive(),
});

const guiaItemSchema = z.object({
  guiaId: z.string().uuid(),
  status: z.enum(["APROVADA", "GLOSADA", "PARCIAL_GLOSA"]),
  glosas: z.array(glosaItemSchema).optional(),
});

const processarSchema = z.object({
  guias: z.array(guiaItemSchema).min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkSecretariaAuth();
  if (!auth.authorized) return auth.response!;
  const clinicaId = auth.clinicaId!;
  const { id } = await params;

  const retorno = await prisma.retornoLote.findFirst({
    where: { id, clinicaId },
  });

  if (!retorno) {
    return NextResponse.json({ error: "Retorno não encontrado" }, { status: 404 });
  }

  if (retorno.status === "PROCESSADO") {
    return NextResponse.json({ error: "Retorno já foi processado" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = processarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { guias } = parsed.data;
  const now = new Date();

  // Verify all guias belong to clinica and fetch their procedures for financial calculation
  const guiaIds = guias.map((g) => g.guiaId);
  const existingGuias = await prisma.guiaTiss.findMany({
    where: { id: { in: guiaIds }, clinicaId },
    select: {
      id: true,
      procedimentos: {
        select: { valorTotal: true },
      },
    },
  });

  if (existingGuias.length !== guiaIds.length) {
    return NextResponse.json({ error: "Uma ou mais guias não foram encontradas" }, { status: 400 });
  }

  // Calculate financial values
  let valorTotalFaturado = new Prisma.Decimal(0);
  let valorTotalGlosado = new Prisma.Decimal(0);

  for (const guiaItem of guias) {
    const guiaDb = existingGuias.find((g) => g.id === guiaItem.guiaId);
    if (!guiaDb) continue;

    // Sum all procedure values for this guia
    const valorGuia = guiaDb.procedimentos.reduce(
      (acc, p) => acc.add(p.valorTotal),
      new Prisma.Decimal(0)
    );
    valorTotalFaturado = valorTotalFaturado.add(valorGuia);

    // Sum glosa values
    if (guiaItem.glosas && guiaItem.glosas.length > 0) {
      const glosasGuia = guiaItem.glosas.reduce(
        (acc, gl) => acc + gl.valorGlosado,
        0
      );
      valorTotalGlosado = valorTotalGlosado.add(new Prisma.Decimal(glosasGuia));
    }
  }

  const valorAprovado = valorTotalFaturado.sub(valorTotalGlosado);

  await prisma.$transaction(async (tx) => {
    for (const guiaItem of guias) {
      // Update guia status and dataResposta
      await tx.guiaTiss.update({
        where: { id: guiaItem.guiaId },
        data: {
          status: guiaItem.status,
          dataResposta: now,
        },
      });

      // Create glosa records for GLOSADA or PARCIAL_GLOSA
      if (
        (guiaItem.status === "GLOSADA" || guiaItem.status === "PARCIAL_GLOSA") &&
        guiaItem.glosas &&
        guiaItem.glosas.length > 0
      ) {
        await tx.glosa.createMany({
          data: guiaItem.glosas.map((glosa) => ({
            clinicaId,
            guiaId: guiaItem.guiaId,
            retornoLoteId: id,
            procedimentoId: glosa.procedimentoId ?? null,
            codigoGlosa: glosa.codigoGlosa ?? null,
            descricaoGlosa: glosa.descricaoGlosa ?? null,
            valorGlosado: glosa.valorGlosado,
            status: "GLOSADA",
            dataGlosa: now,
          })),
        });
      }
    }

    // Update retorno status to PROCESSADO
    await tx.retornoLote.update({
      where: { id },
      data: { status: "PROCESSADO" },
    });

    // ── Financial integration ──────────────────────────────────────
    const operadoraId = retorno.operadoraId;
    const loteId = retorno.loteId;

    // 1. Create RecebimentoConvenio (expected payment from operator)
    if (valorAprovado.gt(0)) {
      await tx.recebimentoConvenio.create({
        data: {
          clinicaId,
          operadoraId,
          loteId,
          valorRecebido: valorAprovado,
          dataRecebimento: now,
          numeroDocumento: retorno.numeroProtocolo ?? undefined,
          observacoes: `Gerado automaticamente pelo processamento do retorno${retorno.numeroProtocolo ? ` (protocolo ${retorno.numeroProtocolo})` : ""}. Valor faturado: R$ ${valorTotalFaturado.toFixed(2)}, Valor glosado: R$ ${valorTotalGlosado.toFixed(2)}.`,
        },
      });
    }

    // 2. Upsert FaturamentoConvenio for the reference month
    const mesRef = new Date(now.getFullYear(), now.getMonth(), 1);

    const existing = await tx.faturamentoConvenio.findUnique({
      where: {
        clinicaId_operadoraId_mesReferencia: {
          clinicaId,
          operadoraId,
          mesReferencia: mesRef,
        },
      },
    });

    if (existing) {
      await tx.faturamentoConvenio.update({
        where: { id: existing.id },
        data: {
          valorFaturado: existing.valorFaturado.add(valorTotalFaturado),
          valorGlosado: existing.valorGlosado.add(valorTotalGlosado),
          valorRecebido: existing.valorRecebido.add(valorAprovado),
        },
      });
    } else {
      await tx.faturamentoConvenio.create({
        data: {
          clinicaId,
          operadoraId,
          mesReferencia: mesRef,
          valorFaturado: valorTotalFaturado,
          valorGlosado: valorTotalGlosado,
          valorRecebido: valorAprovado,
          status: "ABERTO",
        },
      });
    }
  });

  const updated = await prisma.retornoLote.findFirst({
    where: { id, clinicaId },
    include: {
      lote: { select: { id: true, numeroLote: true, status: true } },
      operadora: { select: { id: true, codigoAns: true, razaoSocial: true } },
      glosas: {
        include: {
          guia: { select: { id: true, numeroGuia: true, status: true } },
          procedimento: {
            include: {
              codigoTuss: { select: { id: true, codigoTuss: true, descricao: true } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(updated);
}
