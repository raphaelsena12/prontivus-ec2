import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateFormaPagamentoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").optional(),
  descricao: z.string().optional(),
  tipo: z.enum(["DINHEIRO", "CARTAO_CREDITO", "CARTAO_DEBITO", "PIX", "BOLETO", "TRANSFERENCIA"]).optional(),
  bandeiraCartao: z.string().optional(),
  ativo: z.boolean().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;
    const { id } = await params;
    const formaPagamento = await prisma.formaPagamento.findFirst({ where: { id, clinicaId: auth.clinicaId! } });
    if (!formaPagamento) return NextResponse.json({ error: "Forma de pagamento não encontrada" }, { status: 404 });
    return NextResponse.json({ formaPagamento });
  } catch (error) {
    console.error("Erro ao buscar forma de pagamento:", error);
    return NextResponse.json({ error: "Erro ao buscar forma de pagamento" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;
    const { id } = await params;
    const formaPagamentoExistente = await prisma.formaPagamento.findFirst({ where: { id, clinicaId: auth.clinicaId! } });
    if (!formaPagamentoExistente) return NextResponse.json({ error: "Forma de pagamento não encontrada" }, { status: 404 });
    const body = await request.json();
    const validation = updateFormaPagamentoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Dados inválidos", details: validation.error.issues }, { status: 400 });
    }
    const formaPagamento = await prisma.formaPagamento.update({ where: { id }, data: validation.data });
    return NextResponse.json({ formaPagamento });
  } catch (error) {
    console.error("Erro ao atualizar forma de pagamento:", error);
    return NextResponse.json({ error: "Erro ao atualizar forma de pagamento" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;
    const { id } = await params;
    const formaPagamento = await prisma.formaPagamento.findFirst({ where: { id, clinicaId: auth.clinicaId! } });
    if (!formaPagamento) return NextResponse.json({ error: "Forma de pagamento não encontrada" }, { status: 404 });
    await prisma.formaPagamento.delete({ where: { id } });
    return NextResponse.json({ message: "Forma de pagamento excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar forma de pagamento:", error);
    return NextResponse.json({ error: "Erro ao deletar forma de pagamento" }, { status: 500 });
  }
}















