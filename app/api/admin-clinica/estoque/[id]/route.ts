import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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
    const estoque = await prisma.estoqueMedicamento.findFirst({
      where: { id, clinicaId: auth.clinicaId! },
      include: { medicamento: true },
    });
    if (!estoque) return NextResponse.json({ error: "Estoque não encontrado" }, { status: 404 });
    return NextResponse.json({ estoque });
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
    const estoqueExistente = await prisma.estoqueMedicamento.findFirst({ where: { id, clinicaId: auth.clinicaId! } });
    if (!estoqueExistente) return NextResponse.json({ error: "Estoque não encontrado" }, { status: 404 });
    const body = await request.json();
    const validation = updateEstoqueSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Dados inválidos", details: validation.error.issues }, { status: 400 });
    }
    const estoque = await prisma.estoqueMedicamento.update({ where: { id }, data: validation.data });
    return NextResponse.json({ estoque });
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
    const estoque = await prisma.estoqueMedicamento.findFirst({ where: { id, clinicaId: auth.clinicaId! } });
    if (!estoque) return NextResponse.json({ error: "Estoque não encontrado" }, { status: 404 });
    await prisma.estoqueMedicamento.delete({ where: { id } });
    return NextResponse.json({ message: "Estoque deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar estoque:", error);
    return NextResponse.json({ error: "Erro ao deletar estoque" }, { status: 500 });
  }
}





