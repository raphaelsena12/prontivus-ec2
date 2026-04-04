import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { zodValidationErrorPayload } from "@/lib/zod-validation-error";

const updateEstoqueSchema = z.object({
  quantidadeAtual: z.number().min(0, "Quantidade deve ser maior ou igual a zero").optional(),
  quantidadeMinima: z.number().min(0, "Quantidade mínima deve ser maior ou igual a zero").optional(),
  quantidadeMaxima: z.number().min(0, "Quantidade máxima deve ser maior ou igual a zero").optional().or(z.null()),
  localizacao: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;
    const { id } = await params;

    const estoqueMedicamento = await prisma.estoqueMedicamento.findFirst({
      where: { id, clinicaId: auth.clinicaId! },
      include: { medicamento: true },
    });

    if (estoqueMedicamento) {
      return NextResponse.json({ estoque: estoqueMedicamento, tipoEstoque: "MEDICAMENTO" });
    }

    const estoqueInsumo = await prisma.estoqueInsumo.findFirst({
      where: { id, clinicaId: auth.clinicaId! },
      include: { insumo: true },
    });

    if (estoqueInsumo) {
      return NextResponse.json({ estoque: estoqueInsumo, tipoEstoque: "INSUMO" });
    }

    return NextResponse.json({ error: "Estoque não encontrado" }, { status: 404 });
  } catch (error) {
    console.error("Erro ao buscar estoque:", error);
    return NextResponse.json({ error: "Erro ao buscar estoque" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;
    const { id } = await params;
    const body = await request.json();
    const validation = updateEstoqueSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(zodValidationErrorPayload(validation.error.issues), { status: 400 });
    }

    const estoqueMedicamento = await prisma.estoqueMedicamento.findFirst({ where: { id, clinicaId: auth.clinicaId! } });
    if (estoqueMedicamento) {
      const novaQuantidade = validation.data.quantidadeAtual;
      const quantidadeMudou = novaQuantidade !== undefined && novaQuantidade !== estoqueMedicamento.quantidadeAtual;

      const [estoque] = await prisma.$transaction(async (tx) => {
        const updated = await tx.estoqueMedicamento.update({ where: { id }, data: validation.data });

        if (quantidadeMudou) {
          await tx.movimentacaoEstoque.create({
            data: {
              clinicaId: auth.clinicaId!,
              tipoEstoque: "MEDICAMENTO",
              estoqueMedicamentoId: id,
              tipo: "AJUSTE",
              quantidade: novaQuantidade!,
              motivo: "Ajuste manual via edição de estoque",
              observacoes: `Quantidade anterior: ${estoqueMedicamento.quantidadeAtual} → Nova: ${novaQuantidade}`,
            },
          });
        }

        return [updated];
      });

      return NextResponse.json({ estoque, tipoEstoque: "MEDICAMENTO" });
    }

    const estoqueInsumo = await prisma.estoqueInsumo.findFirst({ where: { id, clinicaId: auth.clinicaId! } });
    if (estoqueInsumo) {
      const novaQuantidade = validation.data.quantidadeAtual;
      const quantidadeMudou = novaQuantidade !== undefined && novaQuantidade !== estoqueInsumo.quantidadeAtual;

      const [estoque] = await prisma.$transaction(async (tx) => {
        const updated = await tx.estoqueInsumo.update({ where: { id }, data: validation.data });

        if (quantidadeMudou) {
          await tx.movimentacaoEstoque.create({
            data: {
              clinicaId: auth.clinicaId!,
              tipoEstoque: "INSUMO",
              estoqueInsumoId: id,
              tipo: "AJUSTE",
              quantidade: novaQuantidade!,
              motivo: "Ajuste manual via edição de estoque",
              observacoes: `Quantidade anterior: ${estoqueInsumo.quantidadeAtual} → Nova: ${novaQuantidade}`,
            },
          });
        }

        return [updated];
      });

      return NextResponse.json({ estoque, tipoEstoque: "INSUMO" });
    }

    return NextResponse.json({ error: "Estoque não encontrado" }, { status: 404 });
  } catch (error) {
    console.error("Erro ao atualizar estoque:", error);
    return NextResponse.json({ error: "Erro ao atualizar estoque" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;
    const { id } = await params;

    const estoqueMedicamento = await prisma.estoqueMedicamento.findFirst({
      where: { id, clinicaId: auth.clinicaId! },
      include: { medicamento: true },
    });
    if (estoqueMedicamento) {
      // Verificar se medicamento está vinculado a procedimentos ativos
      const procedimentosVinculados = await prisma.procedimentoMedicamento.count({
        where: {
          medicamentoId: estoqueMedicamento.medicamentoId,
          procedimento: { clinicaId: auth.clinicaId!, ativo: true },
        },
      });
      if (procedimentosVinculados > 0) {
        return NextResponse.json(
          { error: `Não é possível deletar: ${estoqueMedicamento.medicamento.nome} está vinculado a ${procedimentosVinculados} procedimento(s) ativo(s)` },
          { status: 400 }
        );
      }

      await prisma.estoqueMedicamento.delete({ where: { id } });
      return NextResponse.json({ message: "Estoque deletado com sucesso", tipoEstoque: "MEDICAMENTO" });
    }

    const estoqueInsumo = await prisma.estoqueInsumo.findFirst({
      where: { id, clinicaId: auth.clinicaId! },
      include: { insumo: true },
    });
    if (estoqueInsumo) {
      // Verificar se insumo está vinculado a procedimentos ativos
      const procedimentosVinculados = await prisma.procedimentoInsumo.count({
        where: {
          insumoId: estoqueInsumo.insumoId,
          procedimento: { clinicaId: auth.clinicaId!, ativo: true },
        },
      });
      if (procedimentosVinculados > 0) {
        return NextResponse.json(
          { error: `Não é possível deletar: ${estoqueInsumo.insumo.nome} está vinculado a ${procedimentosVinculados} procedimento(s) ativo(s)` },
          { status: 400 }
        );
      }

      await prisma.estoqueInsumo.delete({ where: { id } });
      return NextResponse.json({ message: "Estoque deletado com sucesso", tipoEstoque: "INSUMO" });
    }

    return NextResponse.json({ error: "Estoque não encontrado" }, { status: 404 });
  } catch (error) {
    console.error("Erro ao deletar estoque:", error);
    return NextResponse.json({ error: "Erro ao deletar estoque" }, { status: 500 });
  }
}





