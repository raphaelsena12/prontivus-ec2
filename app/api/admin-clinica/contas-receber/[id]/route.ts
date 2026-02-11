import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateContaReceberSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória").optional(),
  pacienteId: z.string().uuid().optional(),
  valor: z.number().min(0, "Valor deve ser maior ou igual a zero").optional(),
  dataVencimento: z.string().transform((str) => new Date(str)).optional(),
  dataRecebimento: z.string().transform((str) => new Date(str)).optional().or(z.literal("")),
  status: z.enum(["PENDENTE", "RECEBIDO", "VENCIDO", "CANCELADO"]).optional(),
  formaPagamentoId: z.string().uuid().optional(),
  observacoes: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;
    const { id } = await params;
    const conta = await prisma.contaReceber.findFirst({
      where: { id, clinicaId: auth.clinicaId! },
      include: { paciente: { select: { id: true, nome: true } } },
    });
    if (!conta) return NextResponse.json({ error: "Conta a receber não encontrada" }, { status: 404 });
    return NextResponse.json({ conta });
  } catch (error) {
    console.error("Erro ao buscar conta a receber:", error);
    return NextResponse.json({ error: "Erro ao buscar conta a receber" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;
    const { id } = await params;
    const contaExistente = await prisma.contaReceber.findFirst({ where: { id, clinicaId: auth.clinicaId! } });
    if (!contaExistente) return NextResponse.json({ error: "Conta a receber não encontrada" }, { status: 404 });
    const body = await request.json();
    const validation = updateContaReceberSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Dados inválidos", details: validation.error.issues }, { status: 400 });
    }
    const data: any = { ...validation.data };
    if (data.dataRecebimento === "") data.dataRecebimento = null;
    const conta = await prisma.contaReceber.update({ where: { id }, data });
    return NextResponse.json({ conta });
  } catch (error) {
    console.error("Erro ao atualizar conta a receber:", error);
    return NextResponse.json({ error: "Erro ao atualizar conta a receber" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;
    const { id } = await params;
    const conta = await prisma.contaReceber.findFirst({ where: { id, clinicaId: auth.clinicaId! } });
    if (!conta) return NextResponse.json({ error: "Conta a receber não encontrada" }, { status: 404 });
    await prisma.contaReceber.delete({ where: { id } });
    return NextResponse.json({ message: "Conta a receber excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar conta a receber:", error);
    return NextResponse.json({ error: "Erro ao deletar conta a receber" }, { status: 500 });
  }
}















