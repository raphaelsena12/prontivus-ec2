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

  const retorno = await prisma.retornoLote.findFirst({
    where: { id, clinicaId },
    include: {
      lote: {
        select: {
          id: true,
          numeroLote: true,
          status: true,
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
      },
      operadora: { select: { id: true, codigoAns: true, razaoSocial: true } },
      glosas: {
        include: {
          guia: {
            select: {
              id: true,
              numeroGuia: true,
              tipoGuia: true,
              status: true,
              paciente: { select: { id: true, nome: true } },
            },
          },
          procedimento: {
            include: {
              codigoTuss: { select: { id: true, codigoTuss: true, descricao: true } },
            },
          },
        },
      },
    },
  });

  if (!retorno) {
    return NextResponse.json({ error: "Retorno não encontrado" }, { status: 404 });
  }

  return NextResponse.json(retorno);
}

export async function DELETE(
  _req: NextRequest,
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

  if (retorno.status !== "RECEBIDO") {
    return NextResponse.json({ error: "Apenas retornos com status RECEBIDO podem ser excluídos" }, { status: 400 });
  }

  await prisma.retornoLote.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
