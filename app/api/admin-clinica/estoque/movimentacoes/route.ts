import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth, checkClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const movimentacaoSchema = z.object({
  tipoEstoque: z.enum(["MEDICAMENTO", "INSUMO"]),
  estoqueId: z.string().uuid(),
  tipo: z.enum(["ENTRADA", "SAIDA", "AJUSTE"]),
  quantidade: z.number().int().min(1, "Quantidade deve ser maior que zero"),
  motivo: z.string().optional(),
  observacoes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Permitir acesso para Admin Clínica, Médico e Secretária
    const auth = await checkClinicaAuth();
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
        include: { 
          estoqueMedicamento: { include: { medicamento: true } },
          estoqueInsumo: { include: { insumo: true } }
        },
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
    // Permitir acesso para Admin Clínica, Médico e Secretária
    const auth = await checkClinicaAuth();
    if (!auth.authorized) return auth.response;
    const body = await request.json();
    const validation = movimentacaoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Dados inválidos", details: validation.error.issues }, { status: 400 });
    }
    const data = validation.data;

    // Verificar se estoque existe e pertence à clínica
    let estoque: any;
    let estoqueMedicamentoId: string | undefined;
    let estoqueInsumoId: string | undefined;

    if (data.tipoEstoque === "MEDICAMENTO") {
      estoque = await prisma.estoqueMedicamento.findFirst({
        where: { id: data.estoqueId, clinicaId: auth.clinicaId! },
      });
      if (!estoque) {
        return NextResponse.json({ error: "Estoque de medicamento não encontrado" }, { status: 404 });
      }
      estoqueMedicamentoId = data.estoqueId;
    } else {
      // INSUMO - o estoqueId pode ser o ID do insumo ou do estoque
      // Primeiro tenta buscar pelo ID do estoque
      estoque = await prisma.estoqueInsumo.findFirst({
        where: { id: data.estoqueId, clinicaId: auth.clinicaId! },
      });
      
      // Se não encontrou, tenta buscar pelo insumoId (o estoqueId pode ser o ID do insumo)
      if (!estoque) {
        estoque = await prisma.estoqueInsumo.findFirst({
          where: { insumoId: data.estoqueId, clinicaId: auth.clinicaId! },
        });
      }
      
      if (!estoque) {
        // Se não existe estoque, buscar o insumo e criar o estoque
        const insumo = await prisma.insumo.findFirst({
          where: { id: data.estoqueId, clinicaId: auth.clinicaId! },
        });
        if (!insumo) {
          return NextResponse.json({ error: "Insumo não encontrado" }, { status: 404 });
        }
        // Criar estoque de insumo se não existir
        estoque = await prisma.estoqueInsumo.create({
          data: {
            clinicaId: auth.clinicaId!,
            insumoId: insumo.id,
            quantidadeAtual: 0,
            quantidadeMinima: 0,
            unidade: insumo.unidade || "UN",
          },
        });
      }
      estoqueInsumoId = estoque.id;
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
    const movimentacaoData: any = {
      clinicaId: auth.clinicaId!,
      tipoEstoque: data.tipoEstoque,
      tipo: data.tipo,
      quantidade: data.quantidade,
      motivo: data.motivo || null,
      observacoes: data.observacoes || null,
    };

    if (estoqueMedicamentoId) {
      movimentacaoData.estoqueMedicamentoId = estoqueMedicamentoId;
    } else if (estoqueInsumoId) {
      movimentacaoData.estoqueInsumoId = estoqueInsumoId;
    }

    const updateData: any = { quantidadeAtual: novaQuantidade };

    if (data.tipoEstoque === "MEDICAMENTO") {
      const [movimentacao] = await prisma.$transaction([
        prisma.movimentacaoEstoque.create({ data: movimentacaoData }),
        prisma.estoqueMedicamento.update({
          where: { id: data.estoqueId },
          data: updateData,
        }),
      ]);
      return NextResponse.json({ movimentacao }, { status: 201 });
    } else {
      const [movimentacao] = await prisma.$transaction([
        prisma.movimentacaoEstoque.create({ data: movimentacaoData }),
        prisma.estoqueInsumo.update({
          where: { id: estoqueInsumoId },
          data: updateData,
        }),
      ]);
      return NextResponse.json({ movimentacao }, { status: 201 });
    }
  } catch (error) {
    console.error("Erro ao criar movimentação:", error);
    return NextResponse.json({ error: "Erro ao criar movimentação" }, { status: 500 });
  }
}















