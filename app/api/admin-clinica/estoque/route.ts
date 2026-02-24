import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth, checkClinicaAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const estoqueSchema = z.object({
  medicamentoId: z.string().uuid("ID do medicamento inválido"),
  quantidadeAtual: z.number().int().min(0).default(0),
  quantidadeMinima: z.number().int().min(0).default(0),
  quantidadeMaxima: z.number().int().min(0).optional().nullable(),
  unidade: z.string().default("UN"),
  localizacao: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    // Permitir acesso para Admin Clínica, Médico e Secretária
    const auth = await checkClinicaAuth();
    if (!auth.authorized) return auth.response;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    
    // Buscar estoques de medicamentos
    const whereMedicamentos = {
      clinicaId: auth.clinicaId!,
      ...(search && {
        OR: [
          { medicamento: { nome: { contains: search, mode: "insensitive" as const } } },
          { medicamento: { principioAtivo: { contains: search, mode: "insensitive" as const } } },
        ],
      }),
    };
    
    // Buscar estoques de insumos
    const whereInsumos = {
      clinicaId: auth.clinicaId!,
      ...(search && {
        insumo: {
          OR: [
            { nome: { contains: search, mode: "insensitive" as const } },
            { descricao: { contains: search, mode: "insensitive" as const } },
          ],
        },
      }),
    };
    
    const [estoquesMedicamentos, estoquesInsumos, totalMedicamentos, totalInsumos] = await Promise.all([
      prisma.estoqueMedicamento.findMany({
        where: whereMedicamentos,
        include: { medicamento: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.estoqueInsumo.findMany({
        where: whereInsumos,
        include: { insumo: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.estoqueMedicamento.count({ where: whereMedicamentos }),
      prisma.estoqueInsumo.count({ where: whereInsumos }),
    ]);
    
    // Combinar e formatar os estoques
    const estoques = [
      ...estoquesMedicamentos.map(e => ({
        id: e.id,
        tipo: "MEDICAMENTO" as const,
        medicamento: {
          id: e.medicamento.id,
          nome: e.medicamento.nome,
          principioAtivo: e.medicamento.principioAtivo,
        },
        insumo: null,
        quantidadeAtual: e.quantidadeAtual,
        quantidadeMinima: e.quantidadeMinima,
        quantidadeMaxima: e.quantidadeMaxima,
        unidade: e.unidade,
        localizacao: e.localizacao,
        createdAt: e.createdAt,
      })),
      ...estoquesInsumos.map(e => ({
        id: e.id,
        tipo: "INSUMO" as const,
        medicamento: null,
        insumo: {
          id: e.insumo.id,
          nome: e.insumo.nome,
          descricao: e.insumo.descricao,
        },
        quantidadeAtual: e.quantidadeAtual,
        quantidadeMinima: e.quantidadeMinima,
        quantidadeMaxima: e.quantidadeMaxima,
        unidade: e.unidade,
        localizacao: e.localizacao,
        createdAt: e.createdAt,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    const total = totalMedicamentos + totalInsumos;
    const paginatedEstoques = estoques.slice(skip, skip + limit);
    
    return NextResponse.json({ 
      estoques: paginatedEstoques, 
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } 
    });
  } catch (error) {
    console.error("Erro ao listar estoque:", error);
    return NextResponse.json({ error: "Erro ao listar estoque" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;
    const body = await request.json();
    const data = estoqueSchema.parse(body);
    const medicamento = await prisma.medicamento.findFirst({
      where: { id: data.medicamentoId, clinicaId: auth.clinicaId! },
    });
    if (!medicamento) {
      return NextResponse.json({ error: "Medicamento não encontrado" }, { status: 404 });
    }
    const estoqueExistente = await prisma.estoqueMedicamento.findUnique({
      where: { medicamentoId: data.medicamentoId },
    });
    if (estoqueExistente) {
      return NextResponse.json({ error: "Já existe um estoque para este medicamento" }, { status: 400 });
    }
    const estoque = await prisma.estoqueMedicamento.create({
      data: {
        ...data,
        clinicaId: auth.clinicaId!,
      },
      include: { medicamento: true },
    });
    return NextResponse.json(estoque, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 });
    }
    console.error("Erro ao criar estoque:", error);
    return NextResponse.json({ error: "Erro ao criar estoque" }, { status: 500 });
  }
}

