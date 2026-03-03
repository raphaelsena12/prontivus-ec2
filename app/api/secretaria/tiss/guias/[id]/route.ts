import { NextRequest, NextResponse } from "next/server";
import { checkSecretariaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["RASCUNHO", "VALIDADA", "LOTE", "GERADA", "ENVIADA"]).optional(),
  observacoes: z.string().optional().nullable(),
  numeroCarteirinha: z.string().optional(),
  dataAtendimento: z.string().transform((s) => new Date(s)).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkSecretariaAuth();
  if (!auth.authorized) return auth.response!;
  const clinicaId = auth.clinicaId!;
  const { id } = await params;

  const guia = await prisma.guiaTiss.findFirst({
    where: { id, clinicaId },
    include: {
      paciente: { select: { id: true, nome: true, cpf: true } },
      operadora: { select: { id: true, codigoAns: true, razaoSocial: true } },
      planoSaude: { select: { id: true, nome: true } },
      lote: { select: { id: true, numeroLote: true, status: true } },
      procedimentos: {
        include: {
          codigoTuss: { select: { id: true, codigoTuss: true, descricao: true } },
        },
      },
    },
  });

  if (!guia) {
    return NextResponse.json({ error: "Guia não encontrada" }, { status: 404 });
  }

  return NextResponse.json(guia);
}

export async function PUT(
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
    return NextResponse.json({ error: "Guia já enviada não pode ser editada" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.guiaTiss.update({
    where: { id },
    data: parsed.data,
    include: {
      paciente: { select: { id: true, nome: true } },
      operadora: { select: { id: true, razaoSocial: true } },
      procedimentos: { include: { codigoTuss: { select: { id: true, codigoTuss: true, descricao: true } } } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
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

  if (guia.status === "LOTE" || guia.status === "GERADA" || guia.status === "ENVIADA") {
    return NextResponse.json({ error: "Guia em lote ou enviada não pode ser excluída" }, { status: 400 });
  }

  await prisma.guiaTiss.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
