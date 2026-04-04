import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth, checkClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { zodValidationErrorPayload } from "@/lib/zod-validation-error";

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
    const limit = parseInt(searchParams.get("limit") || "50");
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
      return NextResponse.json(zodValidationErrorPayload(validation.error.issues), { status: 400 });
    }
    const data = validation.data;

    // Verificar se estoque existe e pertence à clínica
    let estoque: any;
    let estoqueMedicamentoId: string | undefined;
    let estoqueInsumoId: string | undefined;

    if (data.tipoEstoque === "MEDICAMENTO") {
      // Tenta pelo ID do estoque
      estoque = await prisma.estoqueMedicamento.findFirst({
        where: { id: data.estoqueId, clinicaId: auth.clinicaId! },
      });

      // Se não encontrou, tenta pelo medicamentoId (catálogo global)
      if (!estoque) {
        estoque = await prisma.estoqueMedicamento.findFirst({
          where: { medicamentoId: data.estoqueId, clinicaId: auth.clinicaId! },
        });
      }

      // Se ainda não existe estoque, cria automaticamente
      if (!estoque) {
        const medicamento = await prisma.medicamento.findFirst({
          where: { id: data.estoqueId },
        });
        if (!medicamento) {
          return NextResponse.json({ error: "Medicamento não encontrado" }, { status: 404 });
        }
        estoque = await prisma.estoqueMedicamento.create({
          data: {
            clinicaId: auth.clinicaId!,
            medicamentoId: medicamento.id,
            quantidadeAtual: 0,
            quantidadeMinima: 0,
            unidade: medicamento.unidade || "UN",
          },
        });
      }
      estoqueMedicamentoId = estoque.id;
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

    // Executar validação e atualização em transação interativa para evitar race condition
    const resultado = await prisma.$transaction(async (tx) => {
      // Re-ler estoque dentro da transação para garantir consistência
      let estoqueAtual: any;
      if (data.tipoEstoque === "MEDICAMENTO") {
        estoqueAtual = await tx.estoqueMedicamento.findUniqueOrThrow({ where: { id: estoqueMedicamentoId } });
      } else {
        estoqueAtual = await tx.estoqueInsumo.findUniqueOrThrow({ where: { id: estoqueInsumoId } });
      }

      let novaQuantidade = estoqueAtual.quantidadeAtual;
      if (data.tipo === "ENTRADA") {
        novaQuantidade += data.quantidade;
        // Validar quantidade máxima
        if (estoqueAtual.quantidadeMaxima !== null && novaQuantidade > estoqueAtual.quantidadeMaxima) {
          throw new Error(
            `Quantidade máxima excedida. Máximo permitido: ${estoqueAtual.quantidadeMaxima}, resultado da entrada: ${novaQuantidade}`
          );
        }
      } else if (data.tipo === "SAIDA") {
        if (estoqueAtual.quantidadeAtual < data.quantidade) {
          throw new Error("Quantidade insuficiente em estoque");
        }
        novaQuantidade -= data.quantidade;
      } else if (data.tipo === "AJUSTE") {
        novaQuantidade = data.quantidade;
      }

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

      const movimentacao = await tx.movimentacaoEstoque.create({ data: movimentacaoData });

      if (data.tipoEstoque === "MEDICAMENTO") {
        await tx.estoqueMedicamento.update({
          where: { id: estoqueMedicamentoId },
          data: { quantidadeAtual: novaQuantidade },
        });
      } else {
        await tx.estoqueInsumo.update({
          where: { id: estoqueInsumoId },
          data: { quantidadeAtual: novaQuantidade },
        });
      }

      // Verificar alerta de estoque mínimo
      const abaixoDoMinimo = novaQuantidade <= estoqueAtual.quantidadeMinima && estoqueAtual.quantidadeMinima > 0;

      return { movimentacao, novaQuantidade, abaixoDoMinimo, quantidadeMinima: estoqueAtual.quantidadeMinima };
    });

    const response: any = { movimentacao: resultado.movimentacao };
    if (resultado.abaixoDoMinimo) {
      response.alerta = `Atenção: estoque abaixo do mínimo! Quantidade atual: ${resultado.novaQuantidade}, mínimo configurado: ${resultado.quantidadeMinima}`;
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar movimentação:", error);
    const message = error?.message || "";
    if (message.includes("insuficiente") || message.includes("máxima excedida")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao criar movimentação" }, { status: 500 });
  }
}















