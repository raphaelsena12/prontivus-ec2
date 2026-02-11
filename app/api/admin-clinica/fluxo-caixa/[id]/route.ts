import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateFluxoCaixaSchema = z.object({
  tipo: z.enum(["ENTRADA", "SAIDA"]).optional(),
  descricao: z.string().min(1, "Descrição é obrigatória").optional(),
  valor: z.number().min(0, "Valor deve ser maior ou igual a zero").optional(),
  data: z.string().transform((str) => new Date(str)).optional(),
  formaPagamentoId: z.string().uuid().optional(),
  observacoes: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;
    const { id } = await params;
    const movimentacao = await prisma.fluxoCaixa.findFirst({
      where: { id, clinicaId: auth.clinicaId! },
      include: { formaPagamento: { select: { id: true, nome: true } } },
    });
    if (!movimentacao) return NextResponse.json({ error: "Movimentação não encontrada" }, { status: 404 });
    return NextResponse.json({ movimentacao });
  } catch (error) {
    console.error("Erro ao buscar movimentação:", error);
    return NextResponse.json({ error: "Erro ao buscar movimentação" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;
    const { id } = await params;
    const movimentacaoExistente = await prisma.fluxoCaixa.findFirst({ where: { id, clinicaId: auth.clinicaId! } });
    if (!movimentacaoExistente) return NextResponse.json({ error: "Movimentação não encontrada" }, { status: 404 });
    const body = await request.json();
    const validation = updateFluxoCaixaSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Dados inválidos", details: validation.error.issues }, { status: 400 });
    }
    const movimentacao = await prisma.fluxoCaixa.update({ where: { id }, data: validation.data });
    return NextResponse.json({ movimentacao });
  } catch (error) {
    console.error("Erro ao atualizar movimentação:", error);
    return NextResponse.json({ error: "Erro ao atualizar movimentação" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;
    const { id } = await params;
    const movimentacao = await prisma.fluxoCaixa.findFirst({ where: { id, clinicaId: auth.clinicaId! } });
    if (!movimentacao) return NextResponse.json({ error: "Movimentação não encontrada" }, { status: 404 });
    await prisma.fluxoCaixa.delete({ where: { id } });
    return NextResponse.json({ message: "Movimentação deletada com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar movimentação:", error);
    return NextResponse.json({ error: "Erro ao deletar movimentação" }, { status: 500 });
  }
}















