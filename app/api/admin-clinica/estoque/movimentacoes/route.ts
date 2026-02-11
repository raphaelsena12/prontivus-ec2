import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const movimentacaoSchema = z.object({
  estoqueId: z.string().uuid(),
  tipo: z.enum(["ENTRADA", "SAIDA", "AJUSTE"]),
  quantidade: z.number().int().min(1, "Quantidade deve ser maior que zero"),
  motivo: z.string().optional(),
  observacoes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;
    const { searchParams } = new URL(request.url);
    const estoqueId = searchParams.get("estoqueId");
    const tipo = searchParams.get("tipo");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    const where: any = {
      clinicaId: auth.clinicaId!,
      ...(estoqueId && { estoqueId }),
      ...(tipo && { tipo }),
    };
    const [movimentacoes, total] = await Promise.all([
      prisma.movimentacaoEstoque.findMany({
        where,
        include: { estoque: { include: { medicamento: true } } },
        skip,
        take: limit,
        orderBy: { data: "desc" },
      }),
      prisma.movimentacaoEstoque.count({ where }),
    ]);
    return NextResponse.json({ movimentacoes, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Erro ao listar movimentações:", error);
    return NextResponse.json({ error: "Erro ao listar movimentações" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;
    const body = await request.json();
    const validation = movimentacaoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Dados inválidos", details: validation.error.issues }, { status: 400 });
    }
    const data = validation.data;

    // Verificar se estoque existe e pertence à clínica
    const estoque = await prisma.estoqueMedicamento.findFirst({
      where: { id: data.estoqueId, clinicaId: auth.clinicaId! },
    });
    if (!estoque) {
      return NextResponse.json({ error: "Estoque não encontrado" }, { status: 404 });
    }

    // Atualizar quantidade do estoque
    let novaQuantidade = estoque.quantidadeAtual;
    if (data.tipo === "ENTRADA") {
      novaQuantidade += data.quantidade;
    } else if (data.tipo === "SAIDA") {
      if (estoque.quantidadeAtual < data.quantidade) {
        return NextResponse.json({ error: "Quantidade insuficiente em estoque" }, { status: 400 });
      }
      novaQuantidade -= data.quantidade;
    } else if (data.tipo === "AJUSTE") {
      novaQuantidade = data.quantidade;
    }

    // Criar movimentação e atualizar estoque em transação
    const [movimentacao] = await prisma.$transaction([
      prisma.movimentacaoEstoque.create({
        data: { ...data, clinicaId: auth.clinicaId! },
      }),
      prisma.estoqueMedicamento.update({
        where: { id: data.estoqueId },
        data: { quantidadeAtual: novaQuantidade },
      }),
    ]);

    return NextResponse.json({ movimentacao }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar movimentação:", error);
    return NextResponse.json({ error: "Erro ao criar movimentação" }, { status: 500 });
  }
}















