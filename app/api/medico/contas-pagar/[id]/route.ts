import { NextRequest, NextResponse } from "next/server";
import { checkMedicoAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateContaPagarSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória").optional(),
  fornecedor: z.string().optional(),
  valor: z.number().min(0, "Valor deve ser maior ou igual a zero").optional(),
  dataVencimento: z.string().transform((str) => new Date(str)).optional(),
  dataPagamento: z.string().transform((str) => new Date(str)).optional().or(z.literal("")),
  status: z.enum(["PENDENTE", "PAGO", "VENCIDO", "CANCELADO"]).optional(),
  formaPagamentoId: z.string().uuid().optional(),
  observacoes: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) return auth.response;
    const { id } = await params;
    const conta = await prisma.contaPagar.findFirst({ where: { id, clinicaId: auth.clinicaId } });
    if (!conta) return NextResponse.json({ error: "Conta a pagar não encontrada" }, { status: 404 });
    return NextResponse.json({ conta });
  } catch (error) {
    console.error("Erro ao buscar conta a pagar:", error);
    return NextResponse.json({ error: "Erro ao buscar conta a pagar" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) return auth.response;
    const { id } = await params;
    const contaExistente = await prisma.contaPagar.findFirst({ where: { id, clinicaId: auth.clinicaId } });
    if (!contaExistente) return NextResponse.json({ error: "Conta a pagar não encontrada" }, { status: 404 });
    const body = await request.json();
    const validation = updateContaPagarSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Dados inválidos", details: validation.error.issues }, { status: 400 });
    }
    const data: any = { ...validation.data };
    if (data.dataPagamento === "") data.dataPagamento = null;
    const conta = await prisma.contaPagar.update({ where: { id }, data });
    return NextResponse.json({ conta });
  } catch (error) {
    console.error("Erro ao atualizar conta a pagar:", error);
    return NextResponse.json({ error: "Erro ao atualizar conta a pagar" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkMedicoAuth();
    if (!auth.authorized) return auth.response;
    const { id } = await params;
    const conta = await prisma.contaPagar.findFirst({ where: { id, clinicaId: auth.clinicaId } });
    if (!conta) return NextResponse.json({ error: "Conta a pagar não encontrada" }, { status: 404 });
    await prisma.contaPagar.delete({ where: { id } });
    return NextResponse.json({ message: "Conta a pagar excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar conta a pagar:", error);
    return NextResponse.json({ error: "Erro ao deletar conta a pagar" }, { status: 500 });
  }
}
