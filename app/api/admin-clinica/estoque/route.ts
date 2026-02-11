import { NextRequest, NextResponse } from "next/server";
import { checkAdminClinicaAuth } from "@/lib/api-helpers";
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
    const auth = await checkAdminClinicaAuth();
    if (!auth.authorized) return auth.response;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    const where = {
      clinicaId: auth.clinicaId!,
      ...(search && {
        OR: [
          { medicamento: { nome: { contains: search, mode: "insensitive" as const } } },
          { medicamento: { principioAtivo: { contains: search, mode: "insensitive" as const } } },
        ],
      }),
    };
    const [estoques, total] = await Promise.all([
      prisma.estoqueMedicamento.findMany({
        where,
        include: { medicamento: true },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.estoqueMedicamento.count({ where }),
    ]);
    return NextResponse.json({ estoques, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
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

